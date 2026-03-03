import { useState, useEffect, useMemo } from "react";
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
import { cn } from "@/lib/utils";

// ── Mock data (same source as ServiceDesk) ──────────────────────────

interface DashTicket {
  id: string;
  title: string;
  category: string;
  statusId: string;
  priority: "low" | "medium" | "high";
  assignee?: string;
  createdAt: string;
  completedAt?: string;
  slaDeadline: string;
}

function buildDashTicket(
  t: Omit<DashTicket, "slaDeadline">
): DashTicket {
  const prazo = slaByCategory[t.category] ?? 24;
  const deadline = new Date(
    new Date(t.createdAt).getTime() + prazo * 3600000
  ).toISOString();
  return { ...t, slaDeadline: deadline };
}

const now = Date.now();

const allTickets: DashTicket[] = [
  buildDashTicket({ id: "TI-2024-001", title: "VPN não conecta", category: "Rede e Internet", statusId: "inProgress", priority: "high", assignee: "Carlos TI", createdAt: new Date(now - 3 * 3600000).toISOString() }),
  buildDashTicket({ id: "TI-2024-002", title: "Novo notebook para colaborador", category: "Solicitação de novo Computador/Notebook", statusId: "pending", priority: "medium", createdAt: new Date(now - 48 * 3600000).toISOString() }),
  buildDashTicket({ id: "TI-2024-003", title: "Reset de senha ERP", category: "Acesso e permissões", statusId: "completed", priority: "low", assignee: "Carlos TI", createdAt: new Date(now - 6 * 3600000).toISOString(), completedAt: new Date(now - 4 * 3600000).toISOString() }),
  buildDashTicket({ id: "TI-2024-004", title: "Impressora 3º andar", category: "Serviços de Impressão", statusId: "inProgress", priority: "medium", assignee: "Pedro TI", createdAt: new Date(now - 7 * 3600000).toISOString() }),
  buildDashTicket({ id: "TI-2024-005", title: "Acesso sistema financeiro", category: "Acesso e permissões", statusId: "waitingUser", priority: "low", assignee: "Carlos TI", createdAt: new Date(now - 2 * 3600000).toISOString() }),
  // Extra tickets for richer data
  buildDashTicket({ id: "TI-2024-006", title: "Celular novo vendedor", category: "Solicitação de novo Celular", statusId: "completed", priority: "medium", assignee: "Pedro TI", createdAt: new Date(now - 96 * 3600000).toISOString(), completedAt: new Date(now - 72 * 3600000).toISOString() }),
  buildDashTicket({ id: "TI-2024-007", title: "E-mail fora do ar", category: "E-mail e Comunicação", statusId: "completed", priority: "high", assignee: "Carlos TI", createdAt: new Date(now - 120 * 3600000).toISOString(), completedAt: new Date(now - 117 * 3600000).toISOString() }),
  buildDashTicket({ id: "TI-2024-008", title: "ERP lento", category: "Sistemas Corporativos", statusId: "completed", priority: "medium", assignee: "Pedro TI", createdAt: new Date(now - 200 * 3600000).toISOString(), completedAt: new Date(now - 194 * 3600000).toISOString() }),
  buildDashTicket({ id: "TI-2024-009", title: "Wi-fi sala reunião", category: "Rede e Internet", statusId: "completed", priority: "low", assignee: "Carlos TI", createdAt: new Date(now - 300 * 3600000).toISOString(), completedAt: new Date(now - 298 * 3600000).toISOString() }),
  buildDashTicket({ id: "TI-2024-010", title: "Tablet para vendas", category: "Solicitação de Tablet", statusId: "inProgress", priority: "medium", assignee: "Pedro TI", createdAt: new Date(now - 24 * 3600000).toISOString() }),
];

// Mock assets (same as use-assets)
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

// ── Helpers ──────────────────────────────────────────────────────────

type PeriodFilter = "today" | "7d" | "30d" | "custom";

const periodOptions: { value: PeriodFilter; label: string }[] = [
  { value: "today", label: "Hoje" },
  { value: "7d", label: "Últimos 7 dias" },
  { value: "30d", label: "Últimos 30 dias" },
  { value: "custom", label: "Personalizado" },
];

const technicians = ["Carlos TI", "Pedro TI"];

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

// ── Component ────────────────────────────────────────────────────────

export default function DashboardTI() {
  const [period, setPeriod] = useState<PeriodFilter>("30d");
  const [customFrom, setCustomFrom] = useState<Date | undefined>();
  const [customTo, setCustomTo] = useState<Date | undefined>();
  const [techFilter, setTechFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [refreshKey, setRefreshKey] = useState(0);

  // Auto-refresh every 60s
  useEffect(() => {
    const interval = setInterval(() => setRefreshKey((k) => k + 1), 60_000);
    return () => clearInterval(interval);
  }, []);

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
  }, [period, customFrom, customTo, refreshKey]);

  // Filtered tickets
  const filtered = useMemo(() => {
    return allTickets.filter((t) => {
      const created = new Date(t.createdAt);
      if (created < dateRange.start || created > dateRange.end) return false;
      if (techFilter !== "all" && t.assignee !== techFilter) return false;
      if (categoryFilter !== "all" && t.category !== categoryFilter) return false;
      return true;
    });
  }, [dateRange, techFilter, categoryFilter]);

  // ── Metrics ──────────────────────────────────────────────────────

  const completedTickets = filtered.filter((t) => t.completedAt);

  const avgResolutionHours = useMemo(() => {
    if (completedTickets.length === 0) return 0;
    const totalMs = completedTickets.reduce((sum, t) => {
      return sum + (new Date(t.completedAt!).getTime() - new Date(t.createdAt).getTime());
    }, 0);
    return Math.round((totalMs / completedTickets.length / 3600000) * 10) / 10;
  }, [completedTickets]);

  const slaCumprido = useMemo(() => {
    if (completedTickets.length === 0) return 100;
    const withinSla = completedTickets.filter((t) => {
      return new Date(t.completedAt!).getTime() <= new Date(t.slaDeadline).getTime();
    });
    return Math.round((withinSla.length / completedTickets.length) * 100);
  }, [completedTickets]);

  // Tickets by technician
  const ticketsByTech = useMemo(() => {
    const map: Record<string, { total: number; completed: number }> = {};
    filtered.forEach((t) => {
      const name = t.assignee || "Sem atribuição";
      if (!map[name]) map[name] = { total: 0, completed: 0 };
      map[name].total++;
      if (t.completedAt) map[name].completed++;
    });
    return Object.entries(map).map(([name, data]) => ({
      name,
      total: data.total,
      completed: data.completed,
      pending: data.total - data.completed,
    }));
  }, [filtered]);

  // Tickets by category
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

  // Assets metrics
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

  const categories = [...new Set(allTickets.map((t) => t.category))];

  return (
    <AppLayout>
      <PageHeader
        title="Dashboard TI"
        description="Métricas operacionais em tempo real"
      >
        <Button
          variant="outline"
          size="sm"
          onClick={() => setRefreshKey((k) => k + 1)}
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Atualizar
        </Button>
      </PageHeader>

      {/* ── Filters ────────────────────────────────────────────── */}
      <div className="mb-6 flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground">Período</span>
          <Select value={period} onValueChange={(v) => setPeriod(v as PeriodFilter)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {periodOptions.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
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

      {/* ── Stat Cards ─────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        <StatCard
          title="Chamados no período"
          value={filtered.length}
          icon={Ticket}
          description={`${completedTickets.length} concluídos`}
        />
        <StatCard
          title="Tempo Médio Resolução"
          value={`${avgResolutionHours}h`}
          icon={Clock}
          description="Média em horas"
        />
        <StatCard
          title="SLA Cumprido"
          value={`${slaCumprido}%`}
          icon={CheckCircle2}
          description="No período"
          trend={slaCumprido >= 90 ? { value: slaCumprido - 90, isPositive: true } : { value: 90 - slaCumprido, isPositive: false }}
        />
        <StatCard
          title="Ativos Disponíveis"
          value={assetsDisponivel}
          icon={Monitor}
          description="Prontos para uso"
        />
        <StatCard
          title="Em Manutenção"
          value={assetsManutencao}
          icon={Wrench}
          description="Ativos parados"
        />
        <StatCard
          title="Técnicos Ativos"
          value={technicians.length}
          icon={Users}
          description="No período"
        />
        <StatCard
          title="Chamados Abertos"
          value={filtered.filter((t) => !t.completedAt).length}
          icon={AlertTriangle}
          description="Sem conclusão"
        />
      </div>

      {/* ── Charts Row 1 ───────────────────────────────────────── */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Chamados por Técnico */}
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

        {/* Chamados por Tipo (Categoria) */}
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
                    <Pie
                      data={ticketsByCategory}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                    >
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
                    <span className="text-muted-foreground truncate max-w-[140px]" title={item.fullName}>
                      {item.name}
                    </span>
                    <span className="ml-auto font-medium">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Charts Row 2 ───────────────────────────────────────── */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* SLA breakdown */}
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
                    cx="50"
                    cy="50"
                    r="42"
                    fill="none"
                    stroke={slaCumprido >= 90 ? "hsl(var(--success))" : slaCumprido >= 70 ? "hsl(var(--warning))" : "hsl(var(--destructive))"}
                    strokeWidth="8"
                    strokeDasharray={`${(slaCumprido / 100) * 264} 264`}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute text-3xl font-bold">{slaCumprido}%</span>
              </div>
              <div className="flex gap-6 text-sm text-muted-foreground">
                <span>Dentro do SLA: <strong className="text-foreground">{completedTickets.filter((t) => new Date(t.completedAt!).getTime() <= new Date(t.slaDeadline).getTime()).length}</strong></span>
                <span>Fora do SLA: <strong className="text-foreground">{completedTickets.filter((t) => new Date(t.completedAt!).getTime() > new Date(t.slaDeadline).getTime()).length}</strong></span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ativos por Centro de Custo */}
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

      {/* Auto-refresh indicator */}
      <p className="mt-4 text-xs text-muted-foreground text-center">
        Atualização automática a cada 60 segundos • Última: {format(new Date(), "HH:mm:ss")}
      </p>
    </AppLayout>
  );
}
