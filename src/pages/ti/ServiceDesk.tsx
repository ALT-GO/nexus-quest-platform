import { useState, useEffect, useRef } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { SlaIndicator } from "@/components/sla/SlaIndicator";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  Eye,
  AlertTriangle,
} from "lucide-react";
import { useSlaTimer, slaByCategory, calcSlaInfo } from "@/hooks/use-sla";
import { toast } from "sonner";

interface Ticket {
  id: string;
  title: string;
  category: string;
  description: string;
  status: "pending" | "inProgress" | "completed" | "cancelled";
  priority: "low" | "medium" | "high";
  requester: string;
  email: string;
  createdAt: string;
  slaDeadline: string;
  prazoSlaEmHoras: number;
  slaVencido: boolean;
  assignee?: string;
}

const categories = [
  "Acesso e permissões",
  "Problemas com Computador/Notebook",
  "Problemas com Celular/Tablet",
  "Rede e Internet",
  "E-mail e Comunicação",
  "Serviços de Impressão",
  "Sistemas Corporativos",
  "Solicitação de novo Computador/Notebook",
  "Solicitação de novo Celular",
  "Solicitação de Tablet",
  "Gerais/Outros",
];

function buildTicket(
  partial: Omit<Ticket, "prazoSlaEmHoras" | "slaDeadline" | "slaVencido">
): Ticket {
  const prazo = slaByCategory[partial.category] ?? 24;
  const created = new Date(partial.createdAt);
  const deadline = new Date(created.getTime() + prazo * 3600000);
  return {
    ...partial,
    prazoSlaEmHoras: prazo,
    slaDeadline: deadline.toISOString(),
    slaVencido: false,
  };
}

const initialTickets: Ticket[] = [
  buildTicket({
    id: "TI-2024-001",
    title: "VPN não conecta",
    category: "Rede e Internet",
    description: "Não consigo conectar na VPN desde ontem",
    status: "inProgress",
    priority: "high",
    requester: "Maria Silva",
    email: "maria.silva@empresa.com",
    createdAt: new Date(Date.now() - 3 * 3600000).toISOString(), // 3h ago
    assignee: "Carlos TI",
  }),
  buildTicket({
    id: "TI-2024-002",
    title: "Novo notebook para colaborador",
    category: "Solicitação de novo Computador/Notebook",
    description: "Solicitação de notebook para novo funcionário do comercial",
    status: "pending",
    priority: "medium",
    requester: "RH - Ana Costa",
    email: "ana.costa@empresa.com",
    createdAt: new Date(Date.now() - 48 * 3600000).toISOString(), // 48h ago
  }),
  buildTicket({
    id: "TI-2024-003",
    title: "Reset de senha do sistema ERP",
    category: "Acesso e permissões",
    description: "Preciso resetar a senha do sistema ERP",
    status: "completed",
    priority: "low",
    requester: "João Pedro",
    email: "joao.pedro@empresa.com",
    createdAt: new Date(Date.now() - 6 * 3600000).toISOString(),
    assignee: "Carlos TI",
  }),
  buildTicket({
    id: "TI-2024-004",
    title: "Impressora não funciona",
    category: "Serviços de Impressão",
    description: "Impressora do 3º andar está com erro",
    status: "inProgress",
    priority: "medium",
    requester: "Financeiro",
    email: "financeiro@empresa.com",
    createdAt: new Date(Date.now() - 7 * 3600000).toISOString(), // 7h ago, SLA 8h → warning
    assignee: "Pedro TI",
  }),
];

const statusLabels: Record<string, string> = {
  pending: "Pendente",
  inProgress: "Em Andamento",
  completed: "Concluído",
  cancelled: "Cancelado",
};

export default function ServiceDesk() {
  const [tickets, setTickets] = useState<Ticket[]>(initialTickets);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const { getSlaInfo, tick } = useSlaTimer();
  const loggedExpired = useRef<Set<string>>(new Set());

  // Update slaVencido flags and log when SLA is breached
  useEffect(() => {
    setTickets((prev) =>
      prev.map((ticket) => {
        if (ticket.status === "completed" || ticket.status === "cancelled")
          return ticket;

        const sla = getSlaInfo(ticket.createdAt, ticket.category, false);

        if (sla.slaVencido && !ticket.slaVencido) {
          // Log SLA breach
          if (!loggedExpired.current.has(ticket.id)) {
            loggedExpired.current.add(ticket.id);
            console.warn(
              `[SLA VENCIDO] ${new Date().toISOString()} | Chamado ${ticket.id} - "${ticket.title}" | Categoria: ${ticket.category} | Prazo: ${ticket.prazoSlaEmHoras}h | Limite: ${ticket.slaDeadline}`
            );
            toast.error(`SLA vencido: ${ticket.id} - ${ticket.title}`, {
              description: `O prazo de ${ticket.prazoSlaEmHoras}h foi ultrapassado.`,
              duration: 8000,
            });
          }
          return { ...ticket, slaVencido: true };
        }
        return ticket;
      })
    );
  }, [tick, getSlaInfo]);

  const pendingCount = tickets.filter((t) => t.status === "pending").length;
  const inProgressCount = tickets.filter((t) => t.status === "inProgress").length;
  const completedCount = tickets.filter((t) => t.status === "completed").length;
  const slaExpiredCount = tickets.filter(
    (t) => t.slaVencido && t.status !== "completed" && t.status !== "cancelled"
  ).length;

  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch =
      ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      filterCategory === "all" || ticket.category === filterCategory;
    const matchesStatus =
      filterStatus === "all" || ticket.status === filterStatus;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <AppLayout>
      <PageHeader
        title="Service Desk"
        description="Central de atendimento e suporte de TI"
      >
        <Button variant="outline" asChild>
          <a href="/chamado-publico" target="_blank">
            Ver Formulário Público
          </a>
        </Button>
      </PageHeader>

      {/* Stats */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Chamados Pendentes"
          value={pendingCount}
          icon={AlertCircle}
          className="border-l-4 border-l-warning"
        />
        <StatCard
          title="Em Andamento"
          value={inProgressCount}
          icon={Clock}
          className="border-l-4 border-l-info"
        />
        <StatCard
          title="SLA Vencido"
          value={slaExpiredCount}
          icon={AlertTriangle}
          className="border-l-4 border-l-destructive"
        />
        <StatCard
          title="Concluídos (Mês)"
          value={completedCount}
          icon={CheckCircle2}
          className="border-l-4 border-l-success"
        />
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por ID ou título..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-full sm:w-[250px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Categorias</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Status</SelectItem>
            <SelectItem value="pending">Pendente</SelectItem>
            <SelectItem value="inProgress">Em Andamento</SelectItem>
            <SelectItem value="completed">Concluído</SelectItem>
            <SelectItem value="cancelled">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tickets Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Solicitante</TableHead>
                <TableHead>SLA</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Prioridade</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTickets.map((ticket) => {
                const isCompleted =
                  ticket.status === "completed" ||
                  ticket.status === "cancelled";
                const sla = getSlaInfo(
                  ticket.createdAt,
                  ticket.category,
                  isCompleted
                );

                return (
                  <TableRow
                    key={ticket.id}
                    className={
                      sla.slaVencido && !isCompleted
                        ? "bg-destructive/5"
                        : undefined
                    }
                  >
                    <TableCell className="font-mono text-sm">
                      {ticket.id}
                    </TableCell>
                    <TableCell className="font-medium">
                      {ticket.title}
                    </TableCell>
                    <TableCell>
                      <span className="rounded-full bg-secondary px-2 py-1 text-xs">
                        {ticket.category}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm">{ticket.requester}</p>
                        <p className="text-xs text-muted-foreground">
                          {ticket.email}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <SlaIndicator sla={sla} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge variant={ticket.status}>
                        {statusLabels[ticket.status]}
                      </StatusBadge>
                    </TableCell>
                    <TableCell>
                      <StatusBadge variant={ticket.priority}>
                        {ticket.priority === "high"
                          ? "Alta"
                          : ticket.priority === "medium"
                          ? "Média"
                          : "Baixa"}
                      </StatusBadge>
                    </TableCell>
                    <TableCell>{ticket.assignee || "-"}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
