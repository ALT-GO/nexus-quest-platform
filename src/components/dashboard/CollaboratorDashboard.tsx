import { useMemo, useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useTickets } from "@/hooks/use-tickets";
import { fetchTimesheetTotals, formatDuration } from "@/hooks/use-timesheet";
import { supabase } from "@/integrations/supabase/client";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Ticket, CheckCircle2, Clock, AlertTriangle, Timer, Loader2 } from "lucide-react";
import { format, isToday, differenceInHours } from "date-fns";
import { ptBR } from "date-fns/locale";

export function CollaboratorDashboard() {
  const { user } = useAuth();
  const { tickets: allTickets, loading } = useTickets();
  const [todayTimesheetSeconds, setTodayTimesheetSeconds] = useState(0);

  const userEmail = user?.email || "";
  const userName = user?.user_metadata?.full_name || "";

  // Filter tickets belonging to the current user (by email or requester name)
  const myTickets = useMemo(() => {
    return allTickets.filter(
      (t) =>
        t.email === userEmail ||
        t.requester === userName ||
        t.assignee === userName
    );
  }, [allTickets, userEmail, userName]);

  const openTickets = useMemo(() => myTickets.filter((t) => !t.completed_at), [myTickets]);
  const completedTickets = useMemo(() => myTickets.filter((t) => t.completed_at), [myTickets]);

  // Near-deadline tickets (within 8 hours)
  const nearDeadline = useMemo(() => {
    const now = new Date();
    return openTickets
      .filter((t) => {
        const deadline = new Date(t.sla_deadline);
        const hoursLeft = differenceInHours(deadline, now);
        return hoursLeft >= 0 && hoursLeft <= 8;
      })
      .sort((a, b) => new Date(a.sla_deadline).getTime() - new Date(b.sla_deadline).getTime());
  }, [openTickets]);

  // Fetch today's timesheet total
  useEffect(() => {
    async function fetchTodayTimesheet() {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      // Get all ticket ids for the user
      const ticketIds = myTickets.map((t) => t.id);
      if (ticketIds.length === 0) return;

      const { data } = await supabase
        .from("timesheet_logs")
        .select("start_time, duration_seconds, end_time")
        .in("ticket_id", ticketIds as any)
        .gte("start_time", todayStart.toISOString());

      let total = 0;
      ((data as any[]) || []).forEach((row) => {
        if (row.end_time) {
          total += row.duration_seconds || 0;
        } else {
          total += Math.floor((Date.now() - new Date(row.start_time).getTime()) / 1000);
        }
      });
      setTodayTimesheetSeconds(total);
    }

    if (!loading) fetchTodayTimesheet();
  }, [myTickets, loading]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Meus Chamados Abertos"
          value={openTickets.length}
          icon={Ticket}
          description="Aguardando resolução"
        />
        <StatCard
          title="Concluídos"
          value={completedTickets.length}
          icon={CheckCircle2}
          description="Total concluídos"
        />
        <StatCard
          title="Timesheet Hoje"
          value={formatDuration(todayTimesheetSeconds)}
          icon={Timer}
          description="Tempo registrado hoje"
        />
        <StatCard
          title="Perto do Vencimento"
          value={nearDeadline.length}
          icon={AlertTriangle}
          description="Nas próximas 8 horas"
        />
      </div>

      {/* Near deadline tickets */}
      {nearDeadline.length > 0 && (
        <Card className="border-warning/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-warning">
              <AlertTriangle className="h-4 w-4" />
              Tarefas Próximas do Vencimento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {nearDeadline.map((ticket) => {
                const hoursLeft = differenceInHours(new Date(ticket.sla_deadline), new Date());
                return (
                  <div
                    key={ticket.id}
                    className="flex items-center gap-4 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{ticket.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {ticket.ticket_number} • {ticket.category}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold text-warning">
                        {hoursLeft}h restantes
                      </span>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(ticket.sla_deadline), "dd/MM HH:mm")}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* My open tickets */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Ticket className="h-4 w-4 text-muted-foreground" />
            Meus Chamados Abertos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {openTickets.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Nenhum chamado aberto no momento.
            </p>
          ) : (
            <div className="space-y-3">
              {openTickets.slice(0, 10).map((ticket) => (
                <div
                  key={ticket.id}
                  className="flex items-center gap-4 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                >
                  <div className="flex-1">
                    <p className="font-medium">{ticket.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {ticket.ticket_number} • {ticket.category}
                    </p>
                  </div>
                  <StatusBadge variant={ticket.priority as any}>
                    {ticket.priority === "high" ? "Alta" : ticket.priority === "medium" ? "Média" : "Baixa"}
                  </StatusBadge>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(ticket.created_at), "dd/MM", { locale: ptBR })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent completed */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            Últimos Concluídos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {completedTickets.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Nenhum chamado concluído ainda.
            </p>
          ) : (
            <div className="space-y-3">
              {completedTickets.slice(0, 5).map((ticket) => (
                <div
                  key={ticket.id}
                  className="flex items-center gap-4 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                >
                  <div className="flex-1">
                    <p className="font-medium">{ticket.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {ticket.ticket_number} • {ticket.category}
                    </p>
                  </div>
                  <StatusBadge variant="completed">Concluído</StatusBadge>
                  <span className="text-xs text-muted-foreground">
                    {ticket.completed_at && format(new Date(ticket.completed_at), "dd/MM", { locale: ptBR })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
