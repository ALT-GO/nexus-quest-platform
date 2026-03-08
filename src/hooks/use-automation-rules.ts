import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type TriggerType = "ticket_created" | "status_changed" | "priority_changed" | "sla_near";
export type ActionType = "move_to_status" | "assign_to" | "change_priority" | "send_notification";

export interface AutomationRule {
  id: string;
  name: string;
  trigger_type: TriggerType;
  trigger_config: Record<string, any>;
  action_type: ActionType;
  action_config: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const triggerLabels: Record<TriggerType, string> = {
  ticket_created: "Novo chamado criado via formulário",
  status_changed: "Status alterado",
  priority_changed: "Prioridade alterada",
  sla_near: "Data de vencimento próxima",
};

export const actionLabels: Record<ActionType, string> = {
  move_to_status: "Mover para a coluna X",
  assign_to: "Atribuir ao técnico Y",
  change_priority: "Alterar prioridade para Z",
  send_notification: "Enviar notificação",
};

export function useAutomationRules() {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRules = useCallback(async () => {
    const { data, error } = await supabase
      .from("automation_rules")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching automation rules:", error);
      return;
    }
    setRules((data as unknown as AutomationRule[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  useEffect(() => {
    const channel = supabase
      .channel("automation-rules-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "automation_rules" }, () => {
        fetchRules();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchRules]);

  const addRule = useCallback(async (rule: Omit<AutomationRule, "id" | "created_at" | "updated_at">) => {
    const { error } = await supabase.from("automation_rules").insert({
      name: rule.name,
      trigger_type: rule.trigger_type,
      trigger_config: rule.trigger_config,
      action_type: rule.action_type,
      action_config: rule.action_config,
      is_active: rule.is_active,
    } as any);

    if (error) {
      toast.error("Erro ao criar regra");
      return false;
    }
    toast.success(`Regra "${rule.name}" criada`);
    return true;
  }, []);

  const updateRule = useCallback(async (id: string, updates: Partial<AutomationRule>) => {
    const { error } = await supabase
      .from("automation_rules")
      .update({ ...updates, updated_at: new Date().toISOString() } as any)
      .eq("id", id as any);

    if (error) {
      toast.error("Erro ao atualizar regra");
      return false;
    }
    return true;
  }, []);

  const deleteRule = useCallback(async (id: string) => {
    const { error } = await supabase
      .from("automation_rules")
      .delete()
      .eq("id", id as any);

    if (error) {
      toast.error("Erro ao excluir regra");
      return false;
    }
    toast.success("Regra excluída");
    return true;
  }, []);

  const toggleRule = useCallback(async (id: string, is_active: boolean) => {
    await updateRule(id, { is_active } as any);
  }, [updateRule]);

  // Execute automation rules for a given trigger
  const executeRules = useCallback(
    async (
      triggerType: TriggerType,
      context: { ticketId: string; category?: string; oldValue?: string; newValue?: string },
      callbacks: {
        onMoveToStatus?: (ticketId: string, statusId: string) => Promise<void>;
        onAssignTo?: (ticketId: string, assignee: string) => Promise<void>;
        onChangePriority?: (ticketId: string, priority: string) => Promise<void>;
      }
    ) => {
      const activeRules = rules.filter(r => r.is_active && r.trigger_type === triggerType);

      for (const rule of activeRules) {
        let shouldExecute = false;

        switch (triggerType) {
          case "ticket_created":
            // Check if category matches trigger config
            if (rule.trigger_config.category) {
              shouldExecute = context.category === rule.trigger_config.category;
            } else {
              shouldExecute = true; // No category filter = match all
            }
            break;
          case "status_changed":
            if (rule.trigger_config.from_status) {
              shouldExecute = context.oldValue === rule.trigger_config.from_status;
            } else {
              shouldExecute = true;
            }
            break;
          case "priority_changed":
            if (rule.trigger_config.from_priority) {
              shouldExecute = context.oldValue === rule.trigger_config.from_priority;
            } else {
              shouldExecute = true;
            }
            break;
          case "sla_near":
            shouldExecute = true;
            break;
        }

        if (!shouldExecute) continue;

        // Execute the action
        switch (rule.action_type) {
          case "move_to_status":
            if (rule.action_config.status_id && callbacks.onMoveToStatus) {
              await callbacks.onMoveToStatus(context.ticketId, rule.action_config.status_id);
              console.log(`[AUTOMAÇÃO] "${rule.name}" executada: moveu chamado para status ${rule.action_config.status_id}`);
            }
            break;
          case "assign_to":
            if (rule.action_config.assignee && callbacks.onAssignTo) {
              await callbacks.onAssignTo(context.ticketId, rule.action_config.assignee);
              console.log(`[AUTOMAÇÃO] "${rule.name}" executada: atribuiu a ${rule.action_config.assignee}`);
            }
            break;
          case "change_priority":
            if (rule.action_config.priority && callbacks.onChangePriority) {
              await callbacks.onChangePriority(context.ticketId, rule.action_config.priority);
              console.log(`[AUTOMAÇÃO] "${rule.name}" executada: prioridade alterada para ${rule.action_config.priority}`);
            }
            break;
          case "send_notification":
            toast.info(`🔔 ${rule.action_config.message || "Notificação de automação"}`);
            console.log(`[AUTOMAÇÃO] "${rule.name}" executada: notificação enviada`);
            break;
        }
      }
    },
    [rules]
  );

  return {
    rules,
    loading,
    addRule,
    updateRule,
    deleteRule,
    toggleRule,
    executeRules,
    refetch: fetchRules,
  };
}
