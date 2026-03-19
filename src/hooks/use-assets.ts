import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type HardwareStatus = "Disponível" | "Em uso" | "Reservado" | "Manutenção";

export interface HardwareAsset {
  id: string;
  collaborator: string;
  costCenter: string;
  sector: string;
  model: string;
  type: string;
  serviceTag: string;
  notes: string;
  status: HardwareStatus;
  condition: string;
  reservedByTicketId?: string;
  deliveredAt?: string;
  category: string;
  assetCode: string;
}

export interface AssetHistoryEntry {
  id: string;
  action: string;
  ticketId?: string;
  timestamp: string;
  user: string;
  details: string;
}

// Map ticket categories to inventory categories
const categoryToInventoryCategory: Record<string, string> = {
  "Solicitação de novo Computador/Notebook": "notebooks",
  "Solicitação de novo Celular": "celulares",
  "Solicitação de Tablet": "notebooks",
};

export const assetRequestCategories = Object.keys(categoryToInventoryCategory);

export function getAssetTypeForCategory(category: string): string | null {
  const map: Record<string, string> = {
    "Solicitação de novo Computador/Notebook": "Notebook",
    "Solicitação de novo Celular": "Celular",
    "Solicitação de Tablet": "Tablet",
  };
  return map[category] ?? null;
}

function mapDbToAsset(row: any): HardwareAsset {
  return {
    id: row.id,
    collaborator: row.collaborator || "",
    costCenter: row.cost_center || "",
    sector: row.sector || "",
    model: row.model || "",
    type: row.asset_type || "",
    serviceTag: row.service_tag || "",
    notes: row.notes || "",
    status: row.status as HardwareStatus,
    reservedByTicketId: row.reserved_by_ticket_id || undefined,
    deliveredAt: row.delivered_at || undefined,
    category: row.category,
    assetCode: row.asset_code,
  };
}

export function useAssets() {
  const [assets, setAssets] = useState<HardwareAsset[]>([]);

  const fetchAssets = useCallback(async () => {
    const { data } = await supabase
      .from("inventory")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) {
      setAssets(data.map(mapDbToAsset));
    }
  }, []);

  useEffect(() => {
    fetchAssets();
    const channel = supabase
      .channel("assets-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "inventory" }, () => {
        fetchAssets();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchAssets]);

  const getAvailableByCategory = useCallback(
    (inventoryCategory: string) =>
      assets.filter((a) => a.category === inventoryCategory && a.status === "Disponível"),
    [assets]
  );

  const getAvailableForCategory = useCallback(
    (ticketCategory: string) => {
      const invCat = categoryToInventoryCategory[ticketCategory];
      if (!invCat) return [];
      return getAvailableByCategory(invCat);
    },
    [getAvailableByCategory]
  );

  const reserveAsset = useCallback(
    async (assetId: string, ticketId: string) => {
      await supabase.from("inventory").update({
        status: "Reservado",
        reserved_by_ticket_id: ticketId,
        updated_at: new Date().toISOString(),
      }).eq("id", assetId);
      setAssets((prev) =>
        prev.map((a) =>
          a.id === assetId ? { ...a, status: "Reservado" as HardwareStatus, reservedByTicketId: ticketId } : a
        )
      );
    },
    []
  );

  const deliverAsset = useCallback(
    async (assetId: string, ticketId: string, collaborator: string) => {
      const now = new Date().toISOString();
      await supabase.from("inventory").update({
        status: "Em uso",
        collaborator,
        delivered_at: now,
        updated_at: now,
      }).eq("id", assetId);
      setAssets((prev) =>
        prev.map((a) =>
          a.id === assetId ? { ...a, status: "Em uso" as HardwareStatus, collaborator, deliveredAt: now } : a
        )
      );
    },
    []
  );

  const getAsset = useCallback(
    (id: string) => assets.find((a) => a.id === id),
    [assets]
  );

  return {
    assets,
    setAssets,
    getAvailableForCategory,
    reserveAsset,
    deliverAsset,
    getAsset,
    refetch: fetchAssets,
  };
}
