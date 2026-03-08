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
  sector: string;
  cost_center: string;
  notes: string;
  delivered_at: string | null;
  created_at: string;
}

export interface CollaboratorCustomField {
  asset_id: string;
  field_name: string;
  field_type: string;
  value: string;
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
  }, [fetchCollaborators]);

  return { collaborators, loading, refetch: fetchCollaborators };
}

export function useCollaboratorDetail(name: string) {
  const [assets, setAssets] = useState<CollaboratorAsset[]>([]);
  const [customFields, setCustomFields] = useState<CollaboratorCustomField[]>([]);
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
      setAssets(items as CollaboratorAsset[]);

      // Fetch custom field values for these assets
      const ids = items.map((i: any) => i.id);
      if (ids.length > 0) {
        const { data: vals } = await supabase
          .from("custom_field_values")
          .select("asset_id, field_id, value")
          .in("asset_id", ids);

        const { data: fields } = await supabase
          .from("custom_fields")
          .select("id, name, field_type");

        if (vals && fields) {
          const fieldMap = new Map(fields.map((f: any) => [f.id, f]));
          const mapped: CollaboratorCustomField[] = vals
            .filter((v: any) => v.value && fieldMap.has(v.field_id))
            .map((v: any) => ({
              asset_id: v.asset_id,
              field_name: fieldMap.get(v.field_id)!.name,
              field_type: fieldMap.get(v.field_id)!.field_type,
              value: v.value,
            }));
          setCustomFields(mapped);
        }
      }
    }
    setLoading(false);
  }, [name]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  return { assets, customFields, loading, refetch: fetchDetail };
}
