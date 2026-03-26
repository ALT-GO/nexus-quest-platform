import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface VaultEntry {
  id: string;
  account_name: string;
  username: string;
  password_value: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export function usePasswordVault() {
  const [entries, setEntries] = useState<VaultEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("password_vault")
      .select("*")
      .order("account_name", { ascending: true });
    if (error) {
      if (error.code === "42501") toast.error("Sem permissão para acessar o cofre");
      else toast.error("Erro ao carregar senhas");
    }
    setEntries((data as VaultEntry[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const addEntry = useCallback(async (entry: Omit<VaultEntry, "id" | "created_at" | "updated_at">) => {
    const { error } = await (supabase as any).from("password_vault").insert(entry);
    if (error) { toast.error("Erro ao salvar"); return false; }
    toast.success("Senha adicionada");
    await fetch();
    return true;
  }, [fetch]);

  const updateEntry = useCallback(async (id: string, updates: Partial<VaultEntry>) => {
    const { error } = await (supabase as any)
      .from("password_vault")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) { toast.error("Erro ao atualizar"); return false; }
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...updates } : e)));
    return true;
  }, []);

  const deleteEntry = useCallback(async (id: string) => {
    const { error } = await (supabase as any).from("password_vault").delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir"); return; }
    setEntries((prev) => prev.filter((e) => e.id !== id));
    toast.success("Senha excluída");
  }, []);

  return { entries, loading, addEntry, updateEntry, deleteEntry, refetch: fetch };
}
