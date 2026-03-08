import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Megaphone, Monitor, Ticket, TrendingUp, Loader2, Laptop, Smartphone, Phone, KeyRound } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
};

interface TicketRow {
  id: string;
  ticket_number: string;
  title: string;
  category: string;
  status_id: string;
  priority: string;
  completed_at: string | null;
  created_at: string;
  department: string | null;
}

interface InventoryRow {
  id: string;
  category: string;
  status: string;
}

const categoryLabels: Record<string, string> = {
  notebooks: "Notebooks",
  celulares: "Celulares",
  linhas: "Linhas",
  licencas: "Licenças",
};

const categoryIcons: Record<string, React.ElementType> = {
  notebooks: Laptop,
  celulares: Smartphone,
  linhas: Phone,
  licencas: KeyRound,
};

const categoryColors: Record<string, string> = {
  notebooks: "text-primary",
  celulares: "text-info",
  linhas: "text-warning",
  licencas: "text-chart-4",
};

export function GeralTab() {
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [inventory, setInventory] = useState<InventoryRow[]>([]);
  const [statusConfigs, setStatusConfigs] = useState<{ id: string; is_final: boolean }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAll() {
      const [ticketsRes, inventoryRes, statusRes] = await Promise.all([
        supabase.from("tickets").select("id, ticket_number, title, category, status_id, priority, completed_at, created_at, department").order("created_at", { ascending: false }),
        supabase.from("inventory").select("id, category, status"),
        supabase.from("status_config").select("id, is_final"),
      ]);
      setTickets((ticketsRes.data as TicketRow[]) || []);
      setInventory((inventoryRes.data as InventoryRow[]) || []);
      setStatusConfigs((statusRes.data as any[]) || []);
      setLoading(false);
    }
    fetchAll();
  }, []);

  // Realtime for tickets
  useEffect(() => {
    const channel = supabase
      .channel("geral-tickets-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "tickets" }, () => {
        supabase.from("tickets").select("id, ticket_number, title, category, status_id, priority, completed_at, created_at, department").order("created_at", { ascending: false })
          .then(({ data }) => { if (data) setTickets(data as TicketRow[]); });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "inventory" }, () => {
        supabase.from("inventory").select("id, category, status")
          .then(({ data }) => { if (data) setInventory(data as InventoryRow[]); });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const finalStatusIds = useMemo(() => new Set(statusConfigs.filter((s) => s.is_final).map((s) => s.id)), [statusConfigs]);

  const openCount = useMemo(() => tickets.filter((t) => !t.completed_at && !finalStatusIds.has(t.status_id)).length, [tickets, finalStatusIds]);
  const completedCount = useMemo(() => tickets.filter((t) => !!t.completed_at).length, [tickets]);
  const totalAssets = inventory.length;

  const slaCumprido = useMemo(() => {
    const completed = tickets.filter((t) => !!t.completed_at);
    if (completed.length === 0) return 100;
    // We don't have sla_deadline in the select, let's use completed_at presence as proxy
    // Actually let's fetch it properly
    return 0; // placeholder, will calculate below
  }, [tickets]);

  // Better SLA calc — fetch sla_deadline for completed tickets
  const [slaPercent, setSlaPercent] = useState<number | null>(null);
  useEffect(() => {
    async function calcSla() {
      const { data } = await supabase
        .from("tickets")
        .select("completed_at, sla_deadline")
        .not("completed_at", "is", null);
      if (!data || data.length === 0) { setSlaPercent(100); return; }
      const withinSla = data.filter((t: any) => new Date(t.completed_at).getTime() <= new Date(t.sla_deadline).getTime());
      setSlaPercent(Math.round((withinSla.length / data.length) * 100));
    }
    calcSla();
  }, [tickets]);

  // Ticket status distribution (real)
  const ticketStatusData = useMemo(() => {
    const open = tickets.filter((t) => !t.completed_at && !finalStatusIds.has(t.status_id)).length;
    const completed = tickets.filter((t) => !!t.completed_at).length;
    // In progress: has assignee but not completed and not final
    const inProgress = tickets.filter((t) => !t.completed_at && !finalStatusIds.has(t.status_id) && t.status_id !== "pending").length;
    const pending = open - inProgress;
    return [
      { name: "Pendentes", value: Math.max(0, pending), color: "hsl(var(--warning))" },
      { name: "Em andamento", value: inProgress, color: "hsl(var(--info))" },
      { name: "Concluídos", value: completed, color: "hsl(var(--success))" },
    ].filter((d) => d.value > 0);
  }, [tickets, finalStatusIds]);

  // Tickets by month (last 6 months, real data)
  const ticketsByMonth = useMemo(() => {
    const months: { key: string; label: string }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ key: format(d, "yyyy-MM"), label: format(d, "MMM", { locale: ptBR }) });
    }
    return months.map((m) => {
      const monthTickets = tickets.filter((t) => t.created_at.startsWith(m.key));
      return {
        name: m.label.charAt(0).toUpperCase() + m.label.slice(1),
        ti: monthTickets.length,
      };
    });
  }, [tickets]);

  // Recent tickets (last 5)
  const recentTickets = useMemo(() => tickets.slice(0, 5), [tickets]);

  // Inventory per category (Disponível)
  const inventoryByCategory = useMemo(() => {
    const cats = ["notebooks", "celulares", "linhas", "licencas"];
    return cats.map((cat) => ({
      category: cat,
      available: inventory.filter((i) => i.category === cat && i.status === "Disponível").length,
      total: inventory.filter((i) => i.category === cat).length,
    }));
  }, [inventory]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Chamados abertos" value={openCount} description="Todos os módulos" icon={Ticket} />
        <StatCard title="Chamados concluídos" value={completedCount} description="Total geral" icon={TrendingUp} />
        <StatCard title="Ativos cadastrados" value={totalAssets} description="Inventário total" icon={Monitor} />
        <StatCard
          title="SLA cumprido"
          value={slaPercent !== null ? `${slaPercent}%` : "—"}
          description="Todos os chamados"
          icon={TrendingUp}
          trend={slaPercent !== null && slaPercent >= 90 ? { value: slaPercent - 90, isPositive: true } : slaPercent !== null ? { value: 90 - slaPercent, isPositive: false } : undefined}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base font-semibold">Chamados por mês</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ticketsByMonth}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="ti" name="Chamados" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base font-semibold">Status dos chamados</CardTitle></CardHeader>
          <CardContent>
            <div className="flex h-[300px] items-center justify-center gap-8">
              <div className="h-[220px] w-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={ticketStatusData} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={4} dataKey="value">
                      {ticketStatusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3">
                {ticketStatusData.map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-sm text-muted-foreground">{item.name}</span>
                    <span className="ml-auto font-medium">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Inventory per category */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Estoque disponível por categoria</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {inventoryByCategory.map((item) => {
              const Icon = categoryIcons[item.category] || Monitor;
              return (
                <div key={item.category} className="flex flex-col items-center gap-2 rounded-lg border p-4">
                  <Icon className={`h-8 w-8 ${categoryColors[item.category] || "text-muted-foreground"}`} />
                  <span className="text-2xl font-bold">{item.available}</span>
                  <span className="text-sm text-muted-foreground">{categoryLabels[item.category] || item.category}</span>
                  <span className="text-xs text-muted-foreground">de {item.total} total</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent tickets */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold">Chamados recentes</CardTitle>
          <a href="/ti/service-desk" className="text-sm font-medium text-primary hover:underline">Ver todos</a>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentTickets.length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">Nenhum chamado encontrado</p>
            )}
            {recentTickets.map((ticket) => (
              <div key={ticket.id} className="flex items-center gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Monitor className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{ticket.title}</span>
                    <StatusBadge variant={ticket.priority === "high" ? "high" : ticket.priority === "medium" ? "medium" : "low"}>
                      {ticket.priority === "high" ? "Alta" : ticket.priority === "medium" ? "Média" : "Baixa"}
                    </StatusBadge>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
                    <span>{ticket.ticket_number}</span>
                    <span>•</span>
                    <span>{format(new Date(ticket.created_at), "dd/MM/yyyy HH:mm")}</span>
                  </div>
                </div>
                <StatusBadge variant={ticket.completed_at ? "completed" : "pending"}>
                  {ticket.completed_at ? "Concluído" : "Aberto"}
                </StatusBadge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
