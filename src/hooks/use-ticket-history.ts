import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface TicketHistoryEntry {
  id: string;
  ticket_id: string;
  action: string;
  details: string;
  author: string;
  created_at: string;
}

export function useTicketHistory(ticketId: string | null) {
  const [history, setHistory] = useState<TicketHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchHistory = useCallback(async () => {
    if (!ticketId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("ticket_history")
      .select("*")
      .eq("ticket_id", ticketId as any)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching history:", error);
    } else {
      setHistory((data as unknown as TicketHistoryEntry[]) || []);
    }
    setLoading(false);
  }, [ticketId]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Realtime
  useEffect(() => {
    if (!ticketId) return;
    const channel = supabase
      .channel(`history-${ticketId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "ticket_history", filter: `ticket_id=eq.${ticketId}` },
        (payload) => {
          const entry = payload.new as unknown as TicketHistoryEntry;
          setHistory((prev) => {
            if (prev.some((h) => h.id === entry.id)) return prev;
            return [entry, ...prev];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ticketId]);

  const logHistory = useCallback(
    async (action: string, details: string, author: string = "Admin") => {
      if (!ticketId) return;
      await supabase.from("ticket_history").insert({
        ticket_id: ticketId,
        action,
        details,
        author,
      } as any);
    },
    [ticketId]
  );

  return { history, loading, logHistory };
}
