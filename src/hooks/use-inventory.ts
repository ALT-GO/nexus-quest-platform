import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logAuditEvent } from "@/lib/audit";
import { toast } from "sonner";

export interface InventoryItem {
  id: string;
  category: string;
  asset_code: string;
  status: string;
  collaborator: string;
  cost_center: string;
  sector: string;
  model: string;
  asset_type: string;
  service_tag: string;
  notes: string;
  reserved_by_ticket_id: string | null;
  delivered_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomFieldDef {
  id: string;
  name: string;
  field_type: string;
  category: string;
  options: string[] | null;
  created_at: string;
}

export interface CustomFieldVal {
  id: string;
  asset_id: string;
  field_id: string;
  value: string;
}

export function useInventory(category: string) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [fields, setFields] = useState<CustomFieldDef[]>([]);
  const [fieldValues, setFieldValues] = useState<CustomFieldVal[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    const { data, error } = await supabase
      .from("inventory")
      .select("*")
      .eq("category", category)
      .order("created_at", { ascending: false });
    if (!error && data) setItems(data as InventoryItem[]);
  }, [category]);

  const fetchFields = useCallback(async () => {
    const { data, error } = await supabase
      .from("custom_fields")
      .select("*")
      .eq("category", category)
      .order("created_at", { ascending: true });
    if (!error && data) setFields(data as CustomFieldDef[]);
  }, [category]);

  const fetchFieldValues = useCallback(async () => {
    // Get all values for items in this category
    const { data: inv } = await supabase
      .from("inventory")
      .select("id")
      .eq("category", category);
    if (!inv || inv.length === 0) { setFieldValues([]); return; }

    const ids = inv.map((i: any) => i.id);
    const { data, error } = await supabase
      .from("custom_field_values")
      .select("*")
      .in("asset_id", ids);
    if (!error && data) setFieldValues(data as CustomFieldVal[]);
  }, [category]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchItems(), fetchFields(), fetchFieldValues()]);
    setLoading(false);
  }, [fetchItems, fetchFields, fetchFieldValues]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Realtime for inventory
  useEffect(() => {
    const channel = supabase
      .channel(`inventory-${category}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "inventory" }, () => {
        fetchItems();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "custom_fields" }, () => {
        fetchFields();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [category, fetchItems, fetchFields]);

  // CRUD operations
  const addItem = useCallback(async (data: Partial<InventoryItem>) => {
    const { error } = await supabase.from("inventory").insert({
      category,
      status: data.status || "Disponível",
      collaborator: data.collaborator || "",
      cost_center: data.cost_center || "",
      sector: data.sector || "",
      model: data.model || "",
      asset_type: data.asset_type || "",
      service_tag: data.service_tag || "",
      notes: data.notes || "",
      asset_code: "TEMP", // trigger will override
    });
    if (error) { toast.error("Erro ao criar ativo"); return null; }
    toast.success("Ativo criado com sucesso");
    await loadAll();
    return true;
  }, [category, loadAll]);

  const updateItem = useCallback(async (id: string, updates: Partial<InventoryItem>) => {
    const { error } = await supabase.from("inventory").update({
      ...updates,
      updated_at: new Date().toISOString(),
    }).eq("id", id);
    if (error) { toast.error("Erro ao atualizar"); return; }
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
  }, []);

  const deleteItem = useCallback(async (id: string) => {
    const item = items.find(i => i.id === id);
    const { error } = await supabase.from("inventory").delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir"); return; }
    setItems(prev => prev.filter(i => i.id !== id));
    toast.success("Ativo excluído");
    logAuditEvent({
      action: "Exclusão de ativo",
      entityType: "inventory",
      entityId: id,
      details: `Excluiu o ativo "${item?.model || item?.asset_code || id}"`,
    });
  }, [items]);

  // Custom field CRUD
  const addField = useCallback(async (name: string, field_type: string, options?: string[]) => {
    const { error } = await supabase.from("custom_fields").insert({
      name,
      field_type,
      category,
      options: options || null,
    });
    if (error) { toast.error("Erro ao criar campo"); return; }
    toast.success(`Campo "${name}" criado`);
    await fetchFields();
  }, [category, fetchFields]);

  const updateField = useCallback(async (id: string, updates: { name?: string; options?: string[] }) => {
    const { error } = await supabase.from("custom_fields").update(updates).eq("id", id);
    if (error) { toast.error("Erro ao atualizar campo"); return; }
    toast.success("Campo atualizado");
    await fetchFields();
  }, [fetchFields]);

  const deleteField = useCallback(async (id: string) => {
    const { error } = await supabase.from("custom_fields").delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir campo"); return; }
    toast.success("Campo excluído");
    await fetchFields();
  }, [fetchFields]);

  // Field values
  const getFieldValue = useCallback((assetId: string, fieldId: string) => {
    return fieldValues.find(v => v.asset_id === assetId && v.field_id === fieldId)?.value ?? "";
  }, [fieldValues]);

  const setFieldValue = useCallback(async (assetId: string, fieldId: string, value: string) => {
    const existing = fieldValues.find(v => v.asset_id === assetId && v.field_id === fieldId);
    if (existing) {
      await supabase.from("custom_field_values").update({ value }).eq("id", existing.id);
    } else {
      await supabase.from("custom_field_values").insert({ asset_id: assetId, field_id: fieldId, value });
    }
    setFieldValues(prev => {
      const idx = prev.findIndex(v => v.asset_id === assetId && v.field_id === fieldId);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], value };
        return copy;
      }
      return [...prev, { id: "temp", asset_id: assetId, field_id: fieldId, value }];
    });
  }, [fieldValues]);

  // Save custom field values for a new asset (after creation)
  const saveFieldValues = useCallback(async (assetId: string, values: Record<string, string>) => {
    const entries = Object.entries(values).filter(([, v]) => v.trim() !== "");
    if (entries.length === 0) return;
    const rows = entries.map(([fieldId, value]) => ({ asset_id: assetId, field_id: fieldId, value }));
    await supabase.from("custom_field_values").insert(rows);
    await fetchFieldValues();
  }, [fetchFieldValues]);

  return {
    items,
    fields,
    fieldValues,
    loading,
    addItem,
    updateItem,
    deleteItem,
    addField,
    updateField,
    deleteField,
    getFieldValue,
    setFieldValue,
    saveFieldValues,
    refetch: loadAll,
  };
}
