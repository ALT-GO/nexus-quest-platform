import { useState, useCallback } from "react";

export interface StatusCustom {
  id: string;
  nome: string;
  ordem: number;
  cor: string; // HSL string like "221 83% 53%"
  ativo: boolean;
  isFinal?: boolean; // marks "completed" type statuses
}

export interface StatusChangeLog {
  ticketId: string;
  fromStatusId: string;
  toStatusId: string;
  timestamp: string;
  user: string;
}

const defaultStatuses: StatusCustom[] = [
  { id: "pending", nome: "Pendente", ordem: 1, cor: "38 92% 50%", ativo: true },
  { id: "inProgress", nome: "Em Andamento", ordem: 2, cor: "199 89% 48%", ativo: true },
  { id: "waitingUser", nome: "Aguardando Usuário", ordem: 3, cor: "280 67% 60%", ativo: true },
  { id: "completed", nome: "Concluído", ordem: 4, cor: "142 76% 36%", ativo: true, isFinal: true },
  { id: "cancelled", nome: "Cancelado", ordem: 5, cor: "0 84% 60%", ativo: true, isFinal: true },
];

export function useCustomStatuses() {
  const [statuses, setStatuses] = useState<StatusCustom[]>(defaultStatuses);
  const [changelog, setChangelog] = useState<StatusChangeLog[]>([]);

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

  const addStatus = useCallback(
    (nome: string, cor: string) => {
      const maxOrdem = Math.max(...statuses.map((s) => s.ordem), 0);
      const newStatus: StatusCustom = {
        id: `custom_${Date.now()}`,
        nome,
        ordem: maxOrdem + 1,
        cor,
        ativo: true,
      };
      setStatuses((prev) => [...prev, newStatus]);
      return newStatus;
    },
    [statuses]
  );

  const updateStatus = useCallback(
    (id: string, updates: Partial<Pick<StatusCustom, "nome" | "cor" | "ativo" | "ordem">>) => {
      setStatuses((prev) =>
        prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
      );
    },
    []
  );

  const reorderStatuses = useCallback((orderedIds: string[]) => {
    setStatuses((prev) =>
      prev.map((s) => {
        const newIndex = orderedIds.indexOf(s.id);
        return newIndex >= 0 ? { ...s, ordem: newIndex + 1 } : s;
      })
    );
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

      const fromName = statuses.find((s) => s.id === fromStatusId)?.nome ?? fromStatusId;
      const toName = statuses.find((s) => s.id === toStatusId)?.nome ?? toStatusId;

      console.log(
        `[STATUS CHANGE] ${entry.timestamp} | Chamado ${ticketId} | "${fromName}" → "${toName}" | Usuário: ${entry.user}`
      );
    },
    [statuses]
  );

  return {
    statuses,
    activeStatuses,
    changelog,
    getStatus,
    isFinalStatus,
    addStatus,
    updateStatus,
    reorderStatuses,
    logStatusChange,
  };
}
