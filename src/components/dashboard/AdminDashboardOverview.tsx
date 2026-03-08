import { useState, useEffect } from "react";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import {
  Megaphone,
  Monitor,
  Ticket,
  TrendingUp,
  Loader2,
  Laptop,
  Smartphone,
  Phone,
  FileText,
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

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
};

interface AssetCounts {
  total: number;
  available: number;
  inUse: number;
  maintenance: number;
  byCategory: Record<string, number>;
}

interface TicketCounts {
  open: number;
  inProgress: number;
  completed: number;
  slaCompliance: number;
}

export function AdminDashboardOverview() {
  const [assetCounts, setAssetCounts] = useState<AssetCounts>({
    total: 0, available: 0, inUse: 0, maintenance: 0, byCategory: {},
  });
  const [ticketCounts, setTicketCounts] = useState<TicketCounts>({
    open: 0, inProgress: 0, completed: 0, slaCompliance: 100,
  });
  const [recentTickets, setRecentTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      // Fetch asset counts from inventory
      const { data: inventory } = await supabase
        .from("inventory")
        .select("status, category");

      if (inventory) {
        const total = inventory.length;
        const available = inventory.filter((i) => i.status === "Disponível").length;
        const inUse = inventory.filter((i) => i.status === "Em uso" || i.status === "Ativo").length;
        const maintenance = inventory.filter((i) => i.status === "Manutenção").length;
        const byCategory: Record<string, number> = {};
        inventory.forEach((i) => {
          byCategory[i.category] = (byCategory[i.category] || 0) + 1;
        });
        setAssetCounts({ total, available, inUse, maintenance, byCategory });
      }

      // Fetch ticket counts
      const { data: tickets } = await supabase
        .from("tickets")
        .select("status_id, completed_at, sla_expired, sla_deadline, parent_ticket_id")
        .is("parent_ticket_id", null);

      const { data: statusConfig } = await supabase
        .from("status_config")
        .select("id, status_type, is_final");

      if (tickets && statusConfig) {
        const finalIds = new Set(statusConfig.filter((s) => s.is_final).map((s) => s.id));
        const todoIds = new Set(statusConfig.filter((s) => s.status_type === "todo").map((s) => s.id));
        const inProgressIds = new Set(statusConfig.filter((s) => s.status_type === "in_progress").map((s) => s.id));

        const open = tickets.filter((t) => todoIds.has(t.status_id)).length;
        const inProgress = tickets.filter((t) => inProgressIds.has(t.status_id)).length;
        const completed = tickets.filter((t) => finalIds.has(t.status_id)).length;
        const completedTickets = tickets.filter((t) => t.completed_at);
        const withinSla = completedTickets.filter((t) =>
          new Date(t.completed_at!).getTime() <= new Date(t.sla_deadline).getTime()
        );
        const slaCompliance = completedTickets.length > 0
          ? Math.round((withinSla.length / completedTickets.length) * 100)
          : 100;

        setTicketCounts({ open, inProgress, completed, slaCompliance });
      }

      // Recent tickets
      const { data: recent } = await supabase
        .from("tickets")
        .select("*")
        .is("parent_ticket_id", null)
        .order("created_at", { ascending: false })
        .limit(5);

      if (recent) setRecentTickets(recent);

      setLoading(false);
    };

    fetchData();
  }, []);

  const ticketStatusData = [
    { name: "Abertos", value: ticketCounts.open, color: "hsl(var(--warning))" },
    { name: "Em andamento", value: ticketCounts.inProgress, color: "hsl(var(--info))" },
    { name: "Concluídos", value: ticketCounts.completed, color: "hsl(var(--success))" },
  ];

  const assetCategoryData = [
    { name: "Notebooks", value: assetCounts.byCategory["notebooks"] || 0, color: "hsl(var(--primary))" },
    { name: "Celulares", value: assetCounts.byCategory["celulares"] || 0, color: "hsl(var(--chart-2))" },
    { name: "Linhas", value: assetCounts.byCategory["linhas"] || 0, color: "hsl(var(--chart-3))" },
    { name: "Licenças", value: assetCounts.byCategory["licencas"] || 0, color: "hsl(var(--chart-4))" },
  ].filter((d) => d.value > 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Chamados abertos"
          value={ticketCounts.open + ticketCounts.inProgress}
          description={`${ticketCounts.open} pendentes, ${ticketCounts.inProgress} em andamento`}
          icon={Ticket}
        />
        <StatCard
          title="Ativos cadastrados"
          value={assetCounts.total}
          description={`${assetCounts.available} disponíveis`}
          icon={Monitor}
        />
        <StatCard
          title="Ativos em uso"
          value={assetCounts.inUse}
          description={`${assetCounts.maintenance} em manutenção`}
          icon={Laptop}
        />
        <StatCard
          title="SLA cumprido"
          value={`${ticketCounts.slaCompliance}%`}
          description="Chamados concluídos dentro do prazo"
          icon={TrendingUp}
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Status dos chamados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-[280px] items-center justify-center gap-8">
              <div className="h-[200px] w-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={ticketStatusData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={4} dataKey="value">
                      {ticketStatusData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
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

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Ativos por categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-[280px] items-center justify-center gap-8">
              <div className="h-[200px] w-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={assetCategoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={4} dataKey="value">
                      {assetCategoryData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3">
                {assetCategoryData.map((item) => (
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

      {/* Recent Tickets */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold">Chamados recentes</CardTitle>
          <a href="/ti/service-desk" className="text-sm font-medium text-primary hover:underline">Ver todos</a>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentTickets.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum chamado encontrado</p>
            ) : (
              recentTickets.map((ticket) => (
                <div key={ticket.id} className="flex items-center gap-4 rounded-lg border p-3 transition-colors hover:bg-muted/50">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                    <Monitor className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{ticket.title}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      <span className="font-mono">{ticket.ticket_number}</span>
                      <span>•</span>
                      <span>{ticket.requester}</span>
                    </div>
                  </div>
                  <StatusBadge variant={ticket.priority as any}>
                    {ticket.priority === "high" ? "Alta" : ticket.priority === "medium" ? "Média" : "Baixa"}
                  </StatusBadge>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
