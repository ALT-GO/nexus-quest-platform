import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { slaByCategory } from "@/hooks/use-sla";
import { toast } from "sonner";

export interface Ticket {
  id: string;
  ticket_number: string;
  title: string;
  category: string;
  description: string;
  status_id: string;
  priority: "low" | "medium" | "high";
  requester: string;
  email: string;
  department: string | null;
  assignee: string | null;
  asset_id: string | null;
  parent_ticket_id: string | null;
  sla_hours: number;
  sla_deadline: string;
  sla_expired: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("tickets")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching tickets:", error);
      toast.error("Erro ao carregar chamados");
    } else {
      setTickets((data as unknown as Ticket[]) || []);
    }
    setLoading(false);
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("tickets-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tickets" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newTicket = payload.new as unknown as Ticket;
            setTickets((prev) => {
              if (prev.some((t) => t.id === newTicket.id)) return prev;
              return [newTicket, ...prev];
            });
            toast.info(`Novo chamado: ${newTicket.ticket_number} - ${newTicket.title}`);
          } else if (payload.eventType === "UPDATE") {
            const updated = payload.new as unknown as Ticket;
            setTickets((prev) =>
              prev.map((t) => (t.id === updated.id ? updated : t))
            );
          } else if (payload.eventType === "DELETE") {
            const deleted = payload.old as { id: string };
            setTickets((prev) => prev.filter((t) => t.id !== deleted.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const updateTicket = useCallback(
    async (id: string, updates: Partial<Pick<Ticket, "status_id" | "assignee" | "asset_id" | "completed_at" | "sla_expired" | "priority">>) => {
      const { error } = await supabase
        .from("tickets")
        .update({ ...updates, updated_at: new Date().toISOString() } as any)
        .eq("id", id as any);

      if (error) {
        console.error("Error updating ticket:", error);
        toast.error("Erro ao atualizar chamado");
        return false;
      }
      return true;
    },
    []
  );

  return { tickets, loading, fetchTickets, updateTicket };
}

export async function createTicket(data: {
  title: string;
  category: string;
  description: string;
  requester: string;
  email: string;
  department?: string;
  priority?: "low" | "medium" | "high";
}): Promise<{ success: boolean; ticketNumber?: string; ticketId?: string }> {
  const slaHours = slaByCategory[data.category] ?? 24;
  const now = new Date();
  const slaDeadline = new Date(now.getTime() + slaHours * 3600000);

  const { data: result, error } = await supabase
    .from("tickets")
    .insert({
      title: data.title || data.category,
      category: data.category,
      description: data.description,
      requester: data.requester,
      email: data.email,
      department: data.department || null,
      priority: data.priority || "medium",
      status_id: "pending",
      sla_hours: slaHours,
      sla_deadline: slaDeadline.toISOString(),
      ticket_number: "",
    } as any)
    .select("id, ticket_number")
    .single();

  if (error) {
    console.error("Error creating ticket:", error);
    return { success: false };
  }

  return {
    success: true,
    ticketNumber: (result as any)?.ticket_number,
    ticketId: (result as any)?.id,
  };
}

// Run automations for a newly created ticket
export async function runTicketCreatedAutomations(
  ticketId: string,
  category: string
) {
  // Fetch active automation rules for ticket_created trigger
  const { data: rules } = await supabase
    .from("automation_rules")
    .select("*")
    .eq("is_active", true)
    .eq("trigger_type", "ticket_created");

  if (!rules || rules.length === 0) return;

  for (const rule of rules) {
    const config = rule.trigger_config as Record<string, any>;
    // Check if category matches
    if (config.category && config.category !== "__all__" && config.category !== category) continue;

    const actionConfig = rule.action_config as Record<string, any>;

    switch (rule.action_type) {
      case "move_to_status":
        if (actionConfig.status_id) {
          await supabase
            .from("tickets")
            .update({ status_id: actionConfig.status_id, updated_at: new Date().toISOString() } as any)
            .eq("id", ticketId as any);
          console.log(`[AUTOMAÇÃO] "${rule.name}": chamado movido para status ${actionConfig.status_id}`);
        }
        break;
      case "assign_to":
        if (actionConfig.assignee) {
          await supabase
            .from("tickets")
            .update({ assignee: actionConfig.assignee, updated_at: new Date().toISOString() } as any)
            .eq("id", ticketId as any);
          console.log(`[AUTOMAÇÃO] "${rule.name}": chamado atribuído a ${actionConfig.assignee}`);
        }
        break;
      case "change_priority":
        if (actionConfig.priority) {
          await supabase
            .from("tickets")
            .update({ priority: actionConfig.priority, updated_at: new Date().toISOString() } as any)
            .eq("id", ticketId as any);
          console.log(`[AUTOMAÇÃO] "${rule.name}": prioridade alterada para ${actionConfig.priority}`);
        }
        break;
      case "send_notification":
        console.log(`[AUTOMAÇÃO] "${rule.name}": notificação - ${actionConfig.message}`);
        break;
    }
  }
}
