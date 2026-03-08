import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchTimesheetTotals, formatDuration } from "@/hooks/use-timesheet";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Clock, CheckCircle2, AlertTriangle, Monitor, Wrench, Users, BarChart3, Ticket, Loader2,
  Laptop, Smartphone, Phone, KeyRound,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import { useTickets } from "@/hooks/use-tickets";
import { format } from "date-fns";

interface OperacionalTITabProps {
  dateRange: { start: Date; end: Date };
}

const chartColors = [
  "hsl(var(--primary))", "hsl(var(--success))", "hsl(var(--warning))",
  "hsl(var(--info))", "hsl(var(--chart-4))", "hsl(var(--destructive))",
];

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
};

interface InventoryItem {
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

const categoryColorClasses: Record<string, string> = {
  notebooks: "text-primary",
  celulares: "text-info",
  linhas: "text-warning",
  licencas: "text-chart-4",
};

export function OperacionalTITab({ dateRange }: OperacionalTITabProps) {
  const { tickets: allTickets, loading } = useTickets();
  const [techFilter, setTechFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [timesheetTotals, setTimesheetTotals] = useState<Record<string, number>>({});
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);

  // Fetch inventory from Supabase
  useEffect(() => {
    supabase.from("inventory").select("id, category, status").then(({ data }) => {
      if (data) setInventoryItems(data as InventoryItem[]);
    });
    const channel = supabase
      .channel("operacional-inventory-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "inventory" }, () => {
        supabase.from("inventory").select("id, category, status").then(({ data }) => {
          if (data) setInventoryItems(data as InventoryItem[]);
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    const ids = allTickets.filter((t) => t.completed_at).map((t) => t.id);
    if (ids.length > 0) fetchTimesheetTotals(ids).then(setTimesheetTotals);
  }, [allTickets]);

  const filtered = useMemo(() => {
    return allTickets.filter((t) => {
      const created = new Date(t.created_at);
      if (created < dateRange.start || created > dateRange.end) return false;
      if (techFilter !== "all" && t.assignee !== techFilter) return false;
      if (categoryFilter !== "all" && t.category !== categoryFilter) return false;
      return true;
    });
  }, [allTickets, dateRange, techFilter, categoryFilter]);

  const completedTickets = filtered.filter((t) => t.completed_at);

  const avgResolutionHours = useMemo(() => {
    if (completedTickets.length === 0) return 0;
    const totalSeconds = completedTickets.reduce((sum, t) => {
      const ts = timesheetTotals[t.id];
      if (ts && ts > 0) return sum + ts;
      return sum + (new Date(t.completed_at!).getTime() - new Date(t.created_at).getTime()) / 1000;
    }, 0);
    return Math.round((totalSeconds / completedTickets.length / 3600) * 10) / 10;
  }, [completedTickets, timesheetTotals]);

  const slaCumprido = useMemo(() => {
    if (completedTickets.length === 0) return 100;
    const withinSla = completedTickets.filter((t) => new Date(t.completed_at!).getTime() <= new Date(t.sla_deadline).getTime());
    return Math.round((withinSla.length / completedTickets.length) * 100);
  }, [completedTickets]);

  const technicians = useMemo(() => {
    const set = new Set<string>();
    allTickets.forEach((t) => { if (t.assignee) set.add(t.assignee); });
    return [...set];
  }, [allTickets]);

  const ticketsByTech = useMemo(() => {
    const map: Record<string, { total: number; completed: number }> = {};
    filtered.forEach((t) => {
      const name = t.assignee || "Sem atribuição";
      if (!map[name]) map[name] = { total: 0, completed: 0 };
      map[name].total++;
      if (t.completed_at) map[name].completed++;
    });
    return Object.entries(map).map(([name, data]) => ({
      name, total: data.total, completed: data.completed, pending: data.total - data.completed,
    }));
  }, [filtered]);

  const ticketsByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach((t) => { map[t.category] = (map[t.category] || 0) + 1; });
    return Object.entries(map)
      .map(([name, value], i) => ({
        name: name.length > 25 ? name.slice(0, 22) + "…" : name,
        fullName: name, value, color: chartColors[i % chartColors.length],
      }))
      .sort((a, b) => b.value - a.value);
  }, [filtered]);

  const assetsDisponivel = inventoryItems.filter((a) => a.status === "Disponível").length;
  const assetsManutencao = inventoryItems.filter((a) => a.status === "Manutenção").length;
  const inventoryByCategory = useMemo(() => {
    const cats = ["notebooks", "celulares", "linhas", "licencas"];
    return cats.map((cat) => ({
      category: cat,
      available: inventoryItems.filter((i) => i.category === cat && i.status === "Disponível").length,
      total: inventoryItems.filter((i) => i.category === cat).length,
    }));
  }, [inventoryItems]);
  const categories = useMemo(() => [...new Set(allTickets.map((t) => t.category))], [allTickets]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sub-filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground">Técnico</span>
          <Select value={techFilter} onValueChange={setTechFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {technicians.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground">Categoria</span>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Chamados no período" value={filtered.length} icon={Ticket} description={`${completedTickets.length} concluídos`} />
        <StatCard title="Tempo Médio Resolução" value={`${avgResolutionHours}h`} icon={Clock} description="Média em horas" />
        <StatCard
          title="SLA Cumprido" value={`${slaCumprido}%`} icon={CheckCircle2} description="No período"
          trend={slaCumprido >= 90 ? { value: slaCumprido - 90, isPositive: true } : { value: 90 - slaCumprido, isPositive: false }}
        />
        <StatCard title="Chamados Abertos" value={filtered.filter((t) => !t.completed_at).length} icon={AlertTriangle} description="Sem conclusão" />
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Users className="h-4 w-4 text-muted-foreground" />Chamados por Técnico
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ticketsByTech} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis dataKey="name" type="category" width={120} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="completed" name="Concluídos" fill="hsl(var(--success))" radius={[0, 4, 4, 0]} stackId="a" />
                  <Bar dataKey="pending" name="Pendentes" fill="hsl(var(--warning))" radius={[0, 4, 4, 0]} stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />Chamados por Tipo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-[300px] items-center justify-center gap-6">
              <div className="h-[220px] w-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={ticketsByCategory} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                      {ticketsByCategory.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} formatter={(value: number, _: string, props: any) => [value, props.payload.fullName]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="max-h-[300px] space-y-2 overflow-y-auto pr-2">
                {ticketsByCategory.map((item) => (
                  <div key={item.fullName} className="flex items-center gap-2 text-sm">
                    <div className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-muted-foreground truncate max-w-[140px]" title={item.fullName}>{item.name}</span>
                    <span className="ml-auto font-medium">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SLA Gauge */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />Taxa de SLA Cumprido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center gap-4 py-4">
              <div className="relative flex h-40 w-40 items-center justify-center">
                <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
                  <circle cx="50" cy="50" r="42" fill="none"
                    stroke={slaCumprido >= 90 ? "hsl(var(--success))" : slaCumprido >= 70 ? "hsl(var(--warning))" : "hsl(var(--destructive))"}
                    strokeWidth="8" strokeDasharray={`${(slaCumprido / 100) * 264} 264`} strokeLinecap="round"
                  />
                </svg>
                <span className="absolute text-3xl font-bold">{slaCumprido}%</span>
              </div>
              <div className="flex gap-6 text-sm text-muted-foreground">
                <span>Dentro do SLA: <strong className="text-foreground">{completedTickets.filter((t) => new Date(t.completed_at!).getTime() <= new Date(t.sla_deadline).getTime()).length}</strong></span>
                <span>Fora do SLA: <strong className="text-foreground">{completedTickets.filter((t) => new Date(t.completed_at!).getTime() > new Date(t.sla_deadline).getTime()).length}</strong></span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Monitor className="h-4 w-4 text-muted-foreground" />Resumo de Ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="flex flex-col items-center gap-2 rounded-lg border p-4">
                <Monitor className="h-8 w-8 text-primary" />
                <span className="text-2xl font-bold">{assetsDisponivel}</span>
                <span className="text-sm text-muted-foreground">Disponíveis</span>
              </div>
              <div className="flex flex-col items-center gap-2 rounded-lg border p-4">
                <Wrench className="h-8 w-8 text-warning" />
                <span className="text-2xl font-bold">{assetsManutencao}</span>
                <span className="text-sm text-muted-foreground">Em Manutenção</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
