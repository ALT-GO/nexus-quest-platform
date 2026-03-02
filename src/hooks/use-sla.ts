import { useState, useEffect, useCallback } from "react";

export type SlaStatus = "ok" | "warning" | "expired";

export interface SlaInfo {
  prazoSlaEmHoras: number;
  dataLimiteSla: Date;
  slaVencido: boolean;
  slaStatus: SlaStatus;
  remainingMs: number;
  remainingLabel: string;
  percentRemaining: number;
}

export const slaByCategory: Record<string, number> = {
  "Acesso e permissões": 4,
  "Problemas com Computador/Notebook": 8,
  "Problemas com Celular/Tablet": 8,
  "Rede e Internet": 4,
  "E-mail e Comunicação": 4,
  "Serviços de Impressão": 8,
  "Sistemas Corporativos": 8,
  "Solicitação de novo Computador/Notebook": 72,
  "Solicitação de novo Celular": 72,
  "Solicitação de Tablet": 72,
  "Gerais/Outros": 24,
};

export function calcSlaDeadline(createdAt: string, category: string): Date {
  const hours = slaByCategory[category] ?? 24;
  const created = new Date(createdAt);
  return new Date(created.getTime() + hours * 60 * 60 * 1000);
}

export function calcSlaInfo(
  createdAt: string,
  category: string,
  isCompleted: boolean
): SlaInfo {
  const prazoSlaEmHoras = slaByCategory[category] ?? 24;
  const dataLimiteSla = calcSlaDeadline(createdAt, category);
  const totalMs = prazoSlaEmHoras * 60 * 60 * 1000;
  const now = new Date();
  const remainingMs = dataLimiteSla.getTime() - now.getTime();
  const percentRemaining = Math.max(0, (remainingMs / totalMs) * 100);
  const slaVencido = !isCompleted && remainingMs <= 0;

  let slaStatus: SlaStatus;
  if (isCompleted) {
    slaStatus = "ok";
  } else if (remainingMs <= 0) {
    slaStatus = "expired";
  } else if (percentRemaining <= 25) {
    slaStatus = "warning";
  } else {
    slaStatus = "ok";
  }

  let remainingLabel: string;
  if (isCompleted) {
    remainingLabel = "Concluído";
  } else if (remainingMs <= 0) {
    const overMs = Math.abs(remainingMs);
    const overH = Math.floor(overMs / (1000 * 60 * 60));
    const overM = Math.floor((overMs % (1000 * 60 * 60)) / (1000 * 60));
    remainingLabel = `Vencido há ${overH}h${overM > 0 ? ` ${overM}m` : ""}`;
  } else {
    const h = Math.floor(remainingMs / (1000 * 60 * 60));
    const m = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
    remainingLabel = `${h}h ${m}m restantes`;
  }

  return {
    prazoSlaEmHoras,
    dataLimiteSla,
    slaVencido,
    slaStatus,
    remainingMs,
    remainingLabel,
    percentRemaining,
  };
}

/** Hook that recalculates SLA every 30s */
export function useSlaTimer() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(interval);
  }, []);

  const getSlaInfo = useCallback(
    (createdAt: string, category: string, isCompleted: boolean) =>
      calcSlaInfo(createdAt, category, isCompleted),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tick]
  );

  return { getSlaInfo, tick };
}
