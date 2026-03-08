import { useState, useEffect, useMemo } from "react";
import { fetchTimesheetTotals, formatDuration } from "@/hooks/use-timesheet";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  Monitor,
  Wrench,
  Users,
  BarChart3,
  RefreshCw,
  CalendarIcon,
  Ticket,
  Loader2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { slaByCategory } from "@/hooks/use-sla";
import { useTickets } from "@/hooks/use-tickets";
import { cn } from "@/lib/utils";

type PeriodFilter = "today" | "7d" | "30d" | "custom";

const periodOptions: { value: PeriodFilter; label: string }[] = [
  { value: "today", label: "Hoje" },
  { value: "7d", label: "Últimos 7 dias" },
  { value: "30d", label: "Últimos 30 dias" },
  { value: "custom", label: "Personalizado" },
];

const chartColors = [
  "hsl(var(--primary))",
  "hsl(var(--success))",
  "hsl(var(--warning))",
  "hsl(var(--info))",
  "hsl(var(--chart-4))",
  "hsl(var(--destructive))",
];

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
};

// Mock assets (kept local since assets aren't persisted yet)
const mockAssets = [
  { id: "HW-001", status: "Em uso", type: "Notebook", costCenter: "Comercial" },
  { id: "HW-002", status: "Em uso", type: "Notebook", costCenter: "TI" },
  { id: "HW-003", status: "Em uso", type: "Tablet", costCenter: "Marketing" },
  { id: "HW-004", status: "Disponível", type: "Notebook", costCenter: "" },
  { id: "HW-005", status: "Disponível", type: "Tablet", costCenter: "" },
  { id: "HW-006", status: "Disponível", type: "Celular", costCenter: "" },
  { id: "HW-007", status: "Disponível", type: "Notebook", costCenter: "" },
  { id: "HW-008", status: "Manutenção", type: "Monitor", costCenter: "Financeiro" },
  { id: "HW-009", status: "Manutenção", type: "Notebook", costCenter: "RH" },
];

export default function DashboardTI() {
  const { tickets: allTickets, loading, fetchTickets } = useTickets();
  const [period, setPeriod] = useState<PeriodFilter>("30d");
  const [customFrom, setCustomFrom] = useState<Date | undefined>();
  const [customTo, setCustomTo] = useState<Date | undefined>();
  const [techFilter, setTechFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [timesheetTotals, setTimesheetTotals] = useState<Record<string, number>>({});

  // Fetch timesheet totals when tickets change
  useEffect(() => {
    const ids = allTickets.filter((t) => t.completed_at).map((t) => t.id);
    if (ids.length > 0) {
      fetchTimesheetTotals(ids).then(setTimesheetTotals);
    }
  }, [allTickets]);

  // Date range from period
  const dateRange = useMemo(() => {
    const end = new Date();
    let start: Date;
    if (period === "today") {
      start = new Date();
      start.setHours(0, 0, 0, 0);
    } else if (period === "7d") {
      start = new Date(end.getTime() - 7 * 86400000);
    } else if (period === "custom" && customFrom) {
      start = customFrom;
      if (customTo) {
        const customEnd = new Date(customTo);
        customEnd.setHours(23, 59, 59, 999);
        return { start, end: customEnd };
      }
    } else {
      start = new Date(end.getTime() - 30 * 86400000);
    }
    return { start: start!, end };
  }, [period, customFrom, customTo]);

  // Filtered tickets
  const filtered = useMemo(() => {
    return allTickets.filter((t) => {
      const created = new Date(t.created_at);
      if (created < dateRange.start || created > dateRange.end) return false;
      if (techFilter !== "all" && t.assignee !== techFilter) return false;
      if (categoryFilter !== "all" && t.category !== categoryFilter) return false;
      return true;
    });
  }, [allTickets, dateRange, techFilter, categoryFilter]);

  // Metrics
  const completedTickets = filtered.filter((t) => t.completed_at);

  // Use real timesheet data when available, fallback to created→completed diff
  const avgResolutionHours = useMemo(() => {
    if (completedTickets.length === 0) return 0;
    const totalSeconds = completedTickets.reduce((sum, t) => {
      const timesheetSecs = timesheetTotals[t.id];
      if (timesheetSecs && timesheetSecs > 0) {
        return sum + timesheetSecs;
      }
      // Fallback: use created_at → completed_at diff
      return sum + (new Date(t.completed_at!).getTime() - new Date(t.created_at).getTime()) / 1000;
    }, 0);
    return Math.round((totalSeconds / completedTickets.length / 3600) * 10) / 10;
  }, [completedTickets, timesheetTotals]);

  const slaCumprido = useMemo(() => {
    if (completedTickets.length === 0) return 100;
    const withinSla = completedTickets.filter((t) => {
      return new Date(t.completed_at!).getTime() <= new Date(t.sla_deadline).getTime();
    });
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
      name,
      total: data.total,
      completed: data.completed,
      pending: data.total - data.completed,
    }));
  }, [filtered]);

  const ticketsByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach((t) => {
      map[t.category] = (map[t.category] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, value], i) => ({
        name: name.length > 25 ? name.slice(0, 22) + "…" : name,
        fullName: name,
        value,
        color: chartColors[i % chartColors.length],
      }))
      .sort((a, b) => b.value - a.value);
  }, [filtered]);

  const assetsDisponivel = mockAssets.filter((a) => a.status === "Disponível").length;
  const assetsManutencao = mockAssets.filter((a) => a.status === "Manutenção").length;

  const assetsByCostCenter = useMemo(() => {
    const map: Record<string, number> = {};
    mockAssets.forEach((a) => {
      const cc = a.costCenter || "Sem centro";
      map[cc] = (map[cc] || 0) + 1;
    });
    return Object.entries(map).map(([name, value], i) => ({
      name,
      value,
      color: chartColors[i % chartColors.length],
    }));
  }, []);

  const categories = useMemo(() => [...new Set(allTickets.map((t) => t.category))], [allTickets]);

  return (
    <AppLayout>
      <PageHeader
        title="Dashboard TI"
        description="Métricas operacionais em tempo real"
      >
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchTickets()}
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Atualizar
        </Button>
      </PageHeader>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground">Período</span>
          <Select value={period} onValueChange={(v) => setPeriod(v as PeriodFilter)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {periodOptions.map((p) => (
                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {period === "custom" && (
          <>
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">De</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-[140px] justify-start text-left font-normal", !customFrom && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {customFrom ? format(customFrom, "dd/MM/yyyy") : "Início"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={customFrom} onSelect={setCustomFrom} className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Até</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-[140px] justify-start text-left font-normal", !customTo && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {customTo ? format(customTo, "dd/MM/yyyy") : "Fim"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={customTo} onSelect={setCustomTo} className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
          </>
        )}

        <div className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground">Técnico</span>
          <Select value={techFilter} onValueChange={setTechFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {technicians.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground">Categoria</span>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[220px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Stat Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            <StatCard title="Chamados no período" value={filtered.length} icon={Ticket} description={`${completedTickets.length} concluídos`} />
            <StatCard title="Tempo Médio Resolução" value={`${avgResolutionHours}h`} icon={Clock} description="Média em horas" />
            <StatCard
              title="SLA Cumprido"
              value={`${slaCumprido}%`}
              icon={CheckCircle2}
              description="No período"
              trend={slaCumprido >= 90 ? { value: slaCumprido - 90, isPositive: true } : { value: 90 - slaCumprido, isPositive: false }}
            />
            <StatCard title="Ativos Disponíveis" value={assetsDisponivel} icon={Monitor} description="Prontos para uso" />
            <StatCard title="Em Manutenção" value={assetsManutencao} icon={Wrench} description="Ativos parados" />
            <StatCard title="Técnicos Ativos" value={technicians.length} icon={Users} description="No período" />
            <StatCard title="Chamados Abertos" value={filtered.filter((t) => !t.completed_at).length} icon={AlertTriangle} description="Sem conclusão" />
          </div>

          {/* Charts Row 1 */}
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  Chamados por Técnico
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[280px]">
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
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  Chamados por Tipo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex h-[280px] items-center justify-center gap-6">
                  <div className="h-[220px] w-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={ticketsByCategory} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                          {ticketsByCategory.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} formatter={(value: number, _: string, props: any) => [value, props.payload.fullName]} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="max-h-[280px] space-y-2 overflow-y-auto pr-2">
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

          {/* Charts Row 2 */}
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                  Taxa de SLA Cumprido
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center gap-4 py-4">
                  <div className="relative flex h-40 w-40 items-center justify-center">
                    <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
                      <circle
                        cx="50" cy="50" r="42" fill="none"
                        stroke={slaCumprido >= 90 ? "hsl(var(--success))" : slaCumprido >= 70 ? "hsl(var(--warning))" : "hsl(var(--destructive))"}
                        strokeWidth="8"
                        strokeDasharray={`${(slaCumprido / 100) * 264} 264`}
                        strokeLinecap="round"
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
                  <Monitor className="h-4 w-4 text-muted-foreground" />
                  Ativos por Centro de Custo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={assetsByCostCenter}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                      <YAxis tick={{ fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="value" name="Ativos" radius={[4, 4, 0, 0]}>
                        {assetsByCostCenter.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <p className="mt-4 text-xs text-muted-foreground text-center">
            Última atualização: {format(new Date(), "HH:mm:ss")}
          </p>
        </>
      )}
    </AppLayout>
  );
}
