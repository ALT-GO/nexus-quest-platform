import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Collaborator {
  name: string;
  assetCount: number;
  categories: string[];
}

export interface CollaboratorAsset {
  id: string;
  asset_code: string;
  category: string;
  status: string;
  model: string;
  asset_type: string;
  service_tag: string;
  service_tag_2: string;
  sector: string;
  cost_center: string;
  cost_center_eng: string;
  cost_center_man: string;
  notes: string;
  delivered_at: string | null;
  created_at: string;
  collaborator: string;
  cargo: string;
  marca: string;
  contrato: string;
  gestor: string;
  email_address: string;
  operadora: string;
  numero: string;
  imei1: string;
  imei2: string;
  licenca: string;
}

export function useCollaborators() {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCollaborators = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("inventory")
      .select("collaborator, category")
      .neq("collaborator", "")
      .not("collaborator", "is", null);

    if (!error && data) {
      const map = new Map<string, Set<string>>();
      const countMap = new Map<string, number>();
      for (const row of data) {
        const name = (row.collaborator as string).trim();
        if (!name) continue;
        if (!map.has(name)) map.set(name, new Set());
        map.get(name)!.add(row.category);
        countMap.set(name, (countMap.get(name) || 0) + 1);
      }
      const list: Collaborator[] = Array.from(map.entries())
        .map(([name, cats]) => ({
          name,
          assetCount: countMap.get(name) || 0,
          categories: Array.from(cats),
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
      setCollaborators(list);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCollaborators();
    const channel = supabase
      .channel("collaborators-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "inventory" }, () => fetchCollaborators())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchCollaborators]);

  return { collaborators, loading, refetch: fetchCollaborators };
}

export function useCollaboratorDetail(name: string) {
  const [assets, setAssets] = useState<CollaboratorAsset[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDetail = useCallback(async () => {
    if (!name) return;
    setLoading(true);

    const { data: items } = await supabase
      .from("inventory")
      .select("*")
      .eq("collaborator", name)
      .order("category")
      .order("created_at", { ascending: false });

    if (items) {
      setAssets(items as unknown as CollaboratorAsset[]);
    }
    setLoading(false);
  }, [name]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const updateAsset = useCallback(async (id: string, updates: Partial<CollaboratorAsset>) => {
    await supabase.from("inventory").update({
      ...updates,
      updated_at: new Date().toISOString(),
    } as any).eq("id", id);
    setAssets((prev) => prev.map((a) => (a.id === id ? { ...a, ...updates } : a)));
  }, []);

  const deleteAsset = useCallback(async (id: string) => {
    await supabase.from("inventory").delete().eq("id", id);
    setAssets((prev) => prev.filter((a) => a.id !== id));
  }, []);

  return { assets, loading, refetch: fetchDetail, updateAsset, deleteAsset };
}

export function useAvailableStock() {
  const [items, setItems] = useState<CollaboratorAsset[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStock = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("inventory")
      .select("*")
      .or("collaborator.eq.,collaborator.is.null")
      .order("category")
      .order("created_at", { ascending: false });

    if (data) {
      // Also include items with status "Disponível" regardless of collaborator
      const { data: available } = await supabase
        .from("inventory")
        .select("*")
        .eq("status", "Disponível")
        .order("category")
        .order("created_at", { ascending: false });

      // Merge and deduplicate
      const allItems = [...(data || []), ...(available || [])];
      const unique = Array.from(new Map(allItems.map((i: any) => [i.id, i])).values());
      setItems(unique as unknown as CollaboratorAsset[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchStock();
  }, [fetchStock]);

  const assignToCollaborator = useCallback(async (assetId: string, collaboratorName: string) => {
    await supabase.from("inventory").update({
      collaborator: collaboratorName,
      status: "Em uso",
      updated_at: new Date().toISOString(),
    }).eq("id", assetId);
    await fetchStock();
  }, [fetchStock]);

  return { items, loading, refetch: fetchStock, assignToCollaborator };
}
