import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Plus,
  Ticket,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  Eye,
  Paperclip,
} from "lucide-react";

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

const slaByCategory: Record<string, number> = {
  "Acesso e permissões": 4,
  "Problemas com Computador/Notebook": 8,
  "Problemas com Celular/Tablet": 8,
  "Rede e Internet": 4,
  "E-mail e Comunicação": 4,
  "Serviços de Impressão": 8,
  "Sistemas Corporativos": 8,
  "Solicitação de novo Computador/Notebook": 72,
  "Solicitação de novo Celular": 72,
  "Solicitação de Tablet": 72,
  "Gerais/Outros": 24,
};

const initialTickets: Ticket[] = [
  {
    id: "TI-2024-001",
    title: "VPN não conecta",
    category: "Rede e Internet",
    description: "Não consigo conectar na VPN desde ontem",
    status: "inProgress",
    priority: "high",
    requester: "Maria Silva",
    email: "maria.silva@empresa.com",
    createdAt: "2024-11-12T10:30:00",
    slaDeadline: "2024-11-12T14:30:00",
    assignee: "Carlos TI",
  },
  {
    id: "TI-2024-002",
    title: "Novo notebook para colaborador",
    category: "Solicitação de novo Computador/Notebook",
    description: "Solicitação de notebook para novo funcionário do comercial",
    status: "pending",
    priority: "medium",
    requester: "RH - Ana Costa",
    email: "ana.costa@empresa.com",
    createdAt: "2024-11-11T15:00:00",
    slaDeadline: "2024-11-14T15:00:00",
  },
  {
    id: "TI-2024-003",
    title: "Reset de senha do sistema ERP",
    category: "Acesso e permissões",
    description: "Preciso resetar a senha do sistema ERP",
    status: "completed",
    priority: "low",
    requester: "João Pedro",
    email: "joao.pedro@empresa.com",
    createdAt: "2024-11-10T09:00:00",
    slaDeadline: "2024-11-10T13:00:00",
    assignee: "Carlos TI",
  },
  {
    id: "TI-2024-004",
    title: "Impressora não funciona",
    category: "Serviços de Impressão",
    description: "Impressora do 3º andar está com erro",
    status: "inProgress",
    priority: "medium",
    requester: "Financeiro",
    email: "financeiro@empresa.com",
    createdAt: "2024-11-12T08:00:00",
    slaDeadline: "2024-11-12T16:00:00",
    assignee: "Pedro TI",
  },
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

  const pendingCount = tickets.filter((t) => t.status === "pending").length;
  const inProgressCount = tickets.filter((t) => t.status === "inProgress").length;
  const completedCount = tickets.filter((t) => t.status === "completed").length;

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
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
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
              {filteredTickets.map((ticket) => (
                <TableRow key={ticket.id}>
                  <TableCell className="font-mono text-sm">{ticket.id}</TableCell>
                  <TableCell className="font-medium">{ticket.title}</TableCell>
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
                    <div className="flex items-center gap-1 text-sm">
                      <Clock className="h-3 w-3" />
                      {slaByCategory[ticket.category]}h
                    </div>
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
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
