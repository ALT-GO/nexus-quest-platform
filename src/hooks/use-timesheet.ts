import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface TimesheetLog {
  id: string;
  ticket_id: string;
  start_time: string;
  end_time: string | null;
  duration_seconds: number;
  created_at: string;
}

export function useTimesheet(ticketId: string | null) {
  const [logs, setLogs] = useState<TimesheetLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [activeLogId, setActiveLogId] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0); // total seconds including current run
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch logs for a ticket
  const fetchLogs = useCallback(async () => {
    if (!ticketId) { setLogs([]); return; }
    setLoading(true);
    const { data } = await supabase
      .from("timesheet_logs")
      .select("*")
      .eq("ticket_id", ticketId as any)
      .order("start_time", { ascending: true });

    const fetched = (data as unknown as TimesheetLog[]) || [];
    setLogs(fetched);

    // Check if there's an active (no end_time) log
    const active = fetched.find((l) => !l.end_time);
    if (active) {
      setActiveLogId(active.id);
      setRunning(true);
    } else {
      setActiveLogId(null);
      setRunning(false);
    }
    setLoading(false);
  }, [ticketId]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Calculate total elapsed every second
  useEffect(() => {
    const calc = () => {
      let total = 0;
      logs.forEach((l) => {
        if (l.end_time) {
          total += l.duration_seconds;
        } else {
          // Currently running
          total += l.duration_seconds + Math.floor(
            (Date.now() - new Date(l.start_time).getTime()) / 1000
          );
        }
      });
      setElapsed(total);
    };

    calc();

    if (running) {
      intervalRef.current = setInterval(calc, 1000);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [logs, running]);

  // Start timer
  const start = useCallback(async () => {
    if (!ticketId || running) return;

    const { data, error } = await supabase
      .from("timesheet_logs")
      .insert({ ticket_id: ticketId, start_time: new Date().toISOString(), duration_seconds: 0 } as any)
      .select("*")
      .single();

    if (!error && data) {
      const newLog = data as unknown as TimesheetLog;
      setLogs((prev) => [...prev, newLog]);
      setActiveLogId(newLog.id);
      setRunning(true);
    }
  }, [ticketId, running]);

  // Pause timer
  const pause = useCallback(async () => {
    if (!activeLogId || !running) return;

    const activeLog = logs.find((l) => l.id === activeLogId);
    if (!activeLog) return;

    const now = new Date();
    const durationSeconds = Math.floor(
      (now.getTime() - new Date(activeLog.start_time).getTime()) / 1000
    );

    await supabase
      .from("timesheet_logs")
      .update({ end_time: now.toISOString(), duration_seconds: durationSeconds } as any)
      .eq("id", activeLogId as any);

    setLogs((prev) =>
      prev.map((l) =>
        l.id === activeLogId
          ? { ...l, end_time: now.toISOString(), duration_seconds: durationSeconds }
          : l
      )
    );
    setActiveLogId(null);
    setRunning(false);
  }, [activeLogId, running, logs]);

  // Stop (pause if running) — used when completing a ticket
  const stop = useCallback(async () => {
    if (running) await pause();
  }, [running, pause]);

  const totalSeconds = elapsed;

  return { logs, loading, running, totalSeconds, start, pause, stop, fetchLogs };
}

// Utility: format seconds to HH:mm:ss
export function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// Fetch total timesheet seconds for a list of ticket IDs (for dashboard)
export async function fetchTimesheetTotals(
  ticketIds: string[]
): Promise<Record<string, number>> {
  if (ticketIds.length === 0) return {};

  const { data } = await supabase
    .from("timesheet_logs")
    .select("ticket_id, duration_seconds")
    .in("ticket_id", ticketIds as any)
    .not("end_time", "is", null);

  const totals: Record<string, number> = {};
  ((data as unknown as { ticket_id: string; duration_seconds: number }[]) || []).forEach((row) => {
    totals[row.ticket_id] = (totals[row.ticket_id] || 0) + row.duration_seconds;
  });
  return totals;
}
