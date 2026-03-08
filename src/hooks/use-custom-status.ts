import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type StatusType = "todo" | "in_progress" | "done";

export interface StatusCustom {
  id: string;
  nome: string;
  ordem: number;
  cor: string;
  ativo: boolean;
  isFinal?: boolean;
  statusType: StatusType;
}

export interface StatusChangeLog {
  ticketId: string;
  fromStatusId: string;
  toStatusId: string;
  timestamp: string;
  user: string;
}

export function useCustomStatuses() {
  const [statuses, setStatuses] = useState<StatusCustom[]>([]);
  const [changelog, setChangelog] = useState<StatusChangeLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStatuses = useCallback(async () => {
    const { data, error } = await supabase
      .from("status_config")
      .select("*")
      .order("ordem", { ascending: true });

    if (error) {
      console.error("Error fetching statuses:", error);
      return;
    }

    if (data) {
      setStatuses(
        data.map((s: any) => ({
          id: s.id,
          nome: s.nome,
          ordem: s.ordem,
          cor: s.cor,
          ativo: s.ativo,
          isFinal: s.is_final,
          statusType: (s.status_type as StatusType) || "todo",
        }))
      );
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchStatuses();
  }, [fetchStatuses]);

  useEffect(() => {
    const channel = supabase
      .channel("status-config-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "status_config" }, () => {
        fetchStatuses();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchStatuses]);

  const activeStatuses = statuses.filter((s) => s.ativo).sort((a, b) => a.ordem - b.ordem);

  const getStatus = useCallback(
    (id: string) => statuses.find((s) => s.id === id),
    [statuses]
  );

  const isFinalStatus = useCallback(
    (statusId: string) => {
      const s = statuses.find((st) => st.id === statusId);
      return s?.isFinal ?? false;
    },
    [statuses]
  );

  const getDoneStatusId = useCallback(() => {
    const done = statuses.find((s) => s.statusType === "done" && s.ativo);
    return done?.id ?? "completed";
  }, [statuses]);

  const addStatus = useCallback(
    async (nome: string, cor: string, statusType: StatusType = "todo") => {
      const maxOrdem = Math.max(...statuses.map((s) => s.ordem), 0);
      const id = `custom_${Date.now()}`;
      const isFinal = statusType === "done";
      const { error } = await supabase.from("status_config").insert({
        id,
        nome,
        cor,
        ordem: maxOrdem + 1,
        ativo: true,
        is_final: isFinal,
        status_type: statusType,
      } as any);

      if (error) {
        toast.error("Erro ao criar status");
        return null;
      }
      toast.success(`Status "${nome}" criado`);
      return { id, nome, cor, ordem: maxOrdem + 1, ativo: true, statusType };
    },
    [statuses]
  );

  const updateStatus = useCallback(
    async (id: string, updates: Partial<Pick<StatusCustom, "nome" | "cor" | "ativo" | "ordem" | "statusType">>) => {
      const dbUpdates: any = {};
      if (updates.nome !== undefined) dbUpdates.nome = updates.nome;
      if (updates.cor !== undefined) dbUpdates.cor = updates.cor;
      if (updates.ativo !== undefined) dbUpdates.ativo = updates.ativo;
      if (updates.ordem !== undefined) dbUpdates.ordem = updates.ordem;
      if (updates.statusType !== undefined) {
        dbUpdates.status_type = updates.statusType;
        dbUpdates.is_final = updates.statusType === "done";
      }

      const { error } = await supabase
        .from("status_config")
        .update(dbUpdates)
        .eq("id", id as any);

      if (error) {
        console.error("Error updating status:", error);
        toast.error("Erro ao atualizar status");
        return;
      }
      setStatuses((prev) =>
        prev.map((s) => {
          if (s.id !== id) return s;
          const updated = { ...s, ...updates };
          if (updates.statusType !== undefined) {
            updated.isFinal = updates.statusType === "done";
          }
          return updated;
        })
      );
    },
    []
  );

  const reorderStatuses = useCallback(async (orderedIds: string[]) => {
    setStatuses((prev) =>
      prev.map((s) => {
        const newIndex = orderedIds.indexOf(s.id);
        return newIndex >= 0 ? { ...s, ordem: newIndex + 1 } : s;
      })
    );
    const updates = orderedIds.map((id, index) =>
      supabase.from("status_config").update({ ordem: index + 1 } as any).eq("id", id as any)
    );
    await Promise.all(updates);
  }, []);

  const logStatusChange = useCallback(
    (ticketId: string, fromStatusId: string, toStatusId: string) => {
      const entry: StatusChangeLog = {
        ticketId,
        fromStatusId,
        toStatusId,
        timestamp: new Date().toISOString(),
        user: "Admin",
      };
      setChangelog((prev) => [entry, ...prev]);
    },
    []
  );

  return {
    statuses,
    activeStatuses,
    changelog,
    loading,
    getStatus,
    isFinalStatus,
    getDoneStatusId,
    addStatus,
    updateStatus,
    reorderStatuses,
    logStatusChange,
  };
}
