import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Monitor, Ticket, TrendingUp, Loader2, Laptop, Smartphone, Phone, KeyRound, Package } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { CostCenterFilter } from "@/pages/CentralInteligencia";

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
  sla_deadline: string;
  created_at: string;
  department: string | null;
}

interface InventoryRow {
  id: string;
  category: string;
  status: string;
  cost_center_eng: string | null;
  cost_center_man: string | null;
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

interface GeralTabProps {
  costCenter: CostCenterFilter;
}

export function GeralTab({ costCenter }: GeralTabProps) {
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [inventory, setInventory] = useState<InventoryRow[]>([]);
  const [statusConfigs, setStatusConfigs] = useState<{ id: string; is_final: boolean }[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTickets = async () => {
    const { data } = await supabase
      .from("tickets")
      .select("id, ticket_number, title, category, status_id, priority, completed_at, sla_deadline, created_at, department")
      .is("parent_ticket_id", null)
      .order("created_at", { ascending: false });
    if (data) setTickets(data as TicketRow[]);
  };

  const fetchInventory = async () => {
    const { data } = await supabase
      .from("inventory")
      .select("id, category, status, cost_center_eng, cost_center_man");
    if (data) setInventory(data as InventoryRow[]);
  };

  useEffect(() => {
    async function fetchAll() {
      const [, , statusRes] = await Promise.all([
        fetchTickets(),
        fetchInventory(),
        supabase.from("status_config").select("id, is_final"),
      ]);
      setStatusConfigs((statusRes.data as any[]) || []);
      setLoading(false);
    }
    fetchAll();
  }, []);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel("geral-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "tickets" }, () => fetchTickets())
      .on("postgres_changes", { event: "*", schema: "public", table: "inventory" }, () => fetchInventory())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // Filter inventory by cost center
  const filteredInventory = useMemo(() => {
    if (costCenter === "all") return inventory;
    if (costCenter === "eng") return inventory.filter((i) => i.cost_center_eng && i.cost_center_eng.trim() !== "");
    return inventory.filter((i) => i.cost_center_man && i.cost_center_man.trim() !== "");
  }, [inventory, costCenter]);

  const finalStatusIds = useMemo(() => new Set(statusConfigs.filter((s) => s.is_final).map((s) => s.id)), [statusConfigs]);

  const openCount = useMemo(() => tickets.filter((t) => !t.completed_at && !finalStatusIds.has(t.status_id)).length, [tickets, finalStatusIds]);
  const completedCount = useMemo(() => tickets.filter((t) => finalStatusIds.has(t.status_id) || !!t.completed_at).length, [tickets, finalStatusIds]);

  const slaPercent = useMemo(() => {
    const completed = tickets.filter((t) => !!t.completed_at);
    if (completed.length === 0) return 100;
    const withinSla = completed.filter((t) => new Date(t.completed_at!).getTime() <= new Date(t.sla_deadline).getTime());
    return Math.round((withinSla.length / completed.length) * 100);
  }, [tickets]);

  // Ticket status distribution
  const ticketStatusData = useMemo(() => {
    const completed = tickets.filter((t) => finalStatusIds.has(t.status_id) || !!t.completed_at).length;
    const inProgress = tickets.filter((t) => !t.completed_at && !finalStatusIds.has(t.status_id) && t.status_id !== "pending").length;
    const pending = tickets.filter((t) => !t.completed_at && t.status_id === "pending").length;
    return [
      { name: "Pendentes", value: pending, color: "hsl(var(--warning))" },
      { name: "Em andamento", value: inProgress, color: "hsl(var(--info))" },
      { name: "Concluídos", value: completed, color: "hsl(var(--success))" },
    ].filter((d) => d.value > 0);
  }, [tickets, finalStatusIds]);

  // Tickets by month
  const ticketsByMonth = useMemo(() => {
    const months: { key: string; label: string }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ key: format(d, "yyyy-MM"), label: format(d, "MMM", { locale: ptBR }) });
    }
    return months.map((m) => ({
      name: m.label.charAt(0).toUpperCase() + m.label.slice(1),
      ti: tickets.filter((t) => t.created_at.startsWith(m.key)).length,
    }));
  }, [tickets]);

  const recentTickets = useMemo(() => tickets.slice(0, 5), [tickets]);

  // Detailed inventory per category
  const inventoryDetails = useMemo(() => {
    const cats = ["notebooks", "celulares", "linhas", "licencas"] as const;
    return cats.map((cat) => {
      const items = filteredInventory.filter((i) => i.category === cat);
      const total = items.length;
      const available = items.filter((i) => i.status === "Disponível").length;

      if (cat === "linhas") {
        const active = items.filter((i) => i.status === "Em uso" || i.status === "Ativo").length;
        const vacant = items.filter((i) => i.status === "Disponível").length;
        return { category: cat, total, available, detail: `${active} ativos · ${vacant} vagos` };
      }
      if (cat === "licencas") {
        const idle = items.filter((i) => i.status === "Desligado").length;
        return { category: cat, total, available, detail: `${idle} ociosas (Desligado)` };
      }
      return { category: cat, total, available, detail: `${available} disponíveis` };
    });
  }, [filteredInventory]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Chamados abertos" value={openCount} description="Tempo real" icon={Ticket} />
        <StatCard title="Chamados concluídos" value={completedCount} description="Total geral (todos os módulos)" icon={TrendingUp} />
        <StatCard title="Ativos cadastrados" value={filteredInventory.length} description={costCenter === "all" ? "Inventário total" : `Filtro: ${costCenter.toUpperCase()}`} icon={Monitor} />
        <StatCard
          title="SLA cumprido"
          value={`${slaPercent}%`}
          description="Todos os chamados"
          icon={TrendingUp}
          trend={slaPercent >= 90 ? { value: slaPercent - 90, isPositive: true } : { value: 90 - slaPercent, isPositive: false }}
        />
      </div>

      {/* Painel de Ativos de TI */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Package className="h-4 w-4 text-muted-foreground" />
            Painel de Ativos de TI
            {costCenter !== "all" && (
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                (Filtro: Centro de Custo {costCenter.toUpperCase()})
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {inventoryDetails.map((item) => {
              const Icon = categoryIcons[item.category] || Monitor;
              return (
                <div key={item.category} className="flex flex-col items-center gap-2 rounded-xl border bg-muted/30 p-5 transition-colors hover:bg-muted/50">
                  <Icon className={`h-9 w-9 ${categoryColors[item.category] || "text-muted-foreground"}`} />
                  <span className="text-3xl font-bold">{item.total}</span>
                  <span className="text-sm font-medium">{categoryLabels[item.category]}</span>
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-success" />
                    <span className="text-xs text-muted-foreground">{item.detail}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
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
