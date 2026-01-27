import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Filter, Eye, Clock } from "lucide-react";

interface Request {
  id: string;
  title: string;
  type: string;
  requester: string;
  status: "pending" | "inProgress" | "waitingApproval" | "completed" | "cancelled";
  priority: "low" | "medium" | "high";
  sla: string;
  createdAt: string;
  dueDate: string;
}

const slaByType: Record<string, string> = {
  "Assinatura de e-mail": "2 dias úteis",
  "Capa de proposta/relatório": "3 dias úteis",
  "Criação de arte": "5 dias úteis",
  "Materiais impressos": "7 dias úteis",
  "Materiais digitais": "4 dias úteis",
  "Outros": "5 dias úteis",
};

const requests: Request[] = [
  {
    id: "MKT-2024-001",
    title: "Assinatura de e-mail - João Pedro",
    type: "Assinatura de e-mail",
    requester: "RH",
    status: "completed",
    priority: "low",
    sla: "2 dias úteis",
    createdAt: "2024-11-01",
    dueDate: "2024-11-03",
  },
  {
    id: "MKT-2024-002",
    title: "Arte Campanha Black Friday",
    type: "Criação de arte",
    requester: "Comercial",
    status: "inProgress",
    priority: "high",
    sla: "5 dias úteis",
    createdAt: "2024-11-05",
    dueDate: "2024-11-12",
  },
  {
    id: "MKT-2024-003",
    title: "Folder Institucional 2024",
    type: "Materiais impressos",
    requester: "Diretoria",
    status: "waitingApproval",
    priority: "medium",
    sla: "7 dias úteis",
    createdAt: "2024-11-08",
    dueDate: "2024-11-18",
  },
  {
    id: "MKT-2024-004",
    title: "Capa Proposta Comercial - Cliente ABC",
    type: "Capa de proposta/relatório",
    requester: "Vendas",
    status: "pending",
    priority: "high",
    sla: "3 dias úteis",
    createdAt: "2024-11-10",
    dueDate: "2024-11-13",
  },
  {
    id: "MKT-2024-005",
    title: "Banner Newsletter",
    type: "Materiais digitais",
    requester: "Marketing",
    status: "inProgress",
    priority: "medium",
    sla: "4 dias úteis",
    createdAt: "2024-11-11",
    dueDate: "2024-11-15",
  },
];

const statusLabels: Record<string, string> = {
  pending: "Pendente",
  inProgress: "Em Andamento",
  waitingApproval: "Aguardando Aprovação",
  completed: "Concluído",
  cancelled: "Cancelado",
};

export default function Solicitacoes() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const filteredRequests = requests.filter((request) => {
    const matchesSearch =
      request.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || request.type === filterType;
    const matchesStatus =
      filterStatus === "all" || request.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <AppLayout>
      <PageHeader
        title="Solicitações"
        description="Gerencie todas as solicitações de marketing"
      />

      {/* SLA Reference */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Clock className="h-5 w-5 text-primary" />
            SLA por Tipo de Solicitação
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {Object.entries(slaByType).map(([type, sla]) => (
              <div
                key={type}
                className="flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2"
              >
                <span className="text-sm font-medium">{type}:</span>
                <span className="text-sm text-muted-foreground">{sla}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

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
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Tipos</SelectItem>
            {Object.keys(slaByType).map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Status</SelectItem>
            <SelectItem value="pending">Pendente</SelectItem>
            <SelectItem value="inProgress">Em Andamento</SelectItem>
            <SelectItem value="waitingApproval">Aguardando Aprovação</SelectItem>
            <SelectItem value="completed">Concluído</SelectItem>
            <SelectItem value="cancelled">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Solicitante</TableHead>
                <TableHead>SLA</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Prioridade</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRequests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell className="font-mono text-sm">
                    {request.id}
                  </TableCell>
                  <TableCell className="font-medium">{request.title}</TableCell>
                  <TableCell>
                    <span className="rounded-full bg-secondary px-2 py-1 text-xs">
                      {request.type}
                    </span>
                  </TableCell>
                  <TableCell>{request.requester}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {request.sla}
                  </TableCell>
                  <TableCell>
                    <StatusBadge variant={request.status}>
                      {statusLabels[request.status]}
                    </StatusBadge>
                  </TableCell>
                  <TableCell>
                    <StatusBadge variant={request.priority}>
                      {request.priority === "high"
                        ? "Alta"
                        : request.priority === "medium"
                        ? "Média"
                        : "Baixa"}
                    </StatusBadge>
                  </TableCell>
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
