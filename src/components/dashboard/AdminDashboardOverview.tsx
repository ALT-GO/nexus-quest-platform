import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Megaphone,
  Monitor,
  Ticket,
  TrendingUp,
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

const ticketData = [
  { name: "Jan", marketing: 12, ti: 28 },
  { name: "Fev", marketing: 19, ti: 35 },
  { name: "Mar", marketing: 15, ti: 42 },
  { name: "Abr", marketing: 22, ti: 38 },
  { name: "Mai", marketing: 18, ti: 45 },
  { name: "Jun", marketing: 25, ti: 52 },
];

const ticketStatusData = [
  { name: "Abertos", value: 15, color: "hsl(var(--warning))" },
  { name: "Em Andamento", value: 28, color: "hsl(var(--info))" },
  { name: "Concluídos", value: 45, color: "hsl(var(--success))" },
  { name: "Aguardando", value: 12, color: "hsl(var(--chart-4))" },
];

const recentTickets = [
  { id: "TI-2024-001", title: "Problema com VPN", status: "inProgress" as const, priority: "high" as const, department: "TI", date: "Hoje, 14:30" },
  { id: "MKT-2024-015", title: "Arte para campanha Black Friday", status: "waitingApproval" as const, priority: "medium" as const, department: "Marketing", date: "Hoje, 11:20" },
  { id: "TI-2024-002", title: "Novo notebook para colaborador", status: "pending" as const, priority: "low" as const, department: "TI", date: "Ontem, 16:45" },
  { id: "MKT-2024-016", title: "Assinatura de e-mail nova", status: "completed" as const, priority: "low" as const, department: "Marketing", date: "Ontem, 09:00" },
];

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
};

export function AdminDashboardOverview() {
  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Chamados Abertos" value={43} description="TI + Marketing" icon={Ticket} trend={{ value: 12, isPositive: false }} />
        <StatCard title="Projetos Marketing" value={8} description="Em andamento" icon={Megaphone} trend={{ value: 8, isPositive: true }} />
        <StatCard title="Ativos de TI" value={156} description="Dispositivos cadastrados" icon={Monitor} />
        <StatCard title="SLA Cumprido" value="94%" description="Últimos 30 dias" icon={TrendingUp} trend={{ value: 3, isPositive: true }} />
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Solicitações por Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ticketData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="marketing" name="Marketing" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="ti" name="TI" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Status dos Chamados</CardTitle>
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
      </div>

      {/* Recent Tickets */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold">Solicitações Recentes</CardTitle>
          <a href="/ti/service-desk" className="text-sm font-medium text-primary hover:underline">Ver todas</a>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentTickets.map((ticket) => (
              <div key={ticket.id} className="flex items-center gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${ticket.department === "TI" ? "bg-primary/10" : "bg-chart-4/10"}`}>
                  {ticket.department === "TI" ? <Monitor className="h-5 w-5 text-primary" /> : <Megaphone className="h-5 w-5 text-chart-4" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{ticket.title}</span>
                    <StatusBadge variant={ticket.priority}>
                      {ticket.priority === "high" ? "Alta" : ticket.priority === "medium" ? "Média" : "Baixa"}
                    </StatusBadge>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
                    <span>{ticket.id}</span>
                    <span>•</span>
                    <span>{ticket.date}</span>
                  </div>
                </div>
                <StatusBadge variant={ticket.status}>
                  {ticket.status === "pending" ? "Pendente" : ticket.status === "inProgress" ? "Em Andamento" : ticket.status === "completed" ? "Concluído" : "Aguardando Aprovação"}
                </StatusBadge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
