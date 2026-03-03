import { useState, useEffect, useRef, useCallback } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  AlertTriangle,
  LayoutList,
  Kanban,
} from "lucide-react";
import { useSlaTimer, slaByCategory } from "@/hooks/use-sla";
import { useCustomStatuses } from "@/hooks/use-custom-status";
import { useAssets, assetRequestCategories } from "@/hooks/use-assets";
import { StatusManagerDialog } from "@/components/servicedesk/StatusManagerDialog";
import { KanbanBoard } from "@/components/servicedesk/KanbanBoard";
import { TicketTable } from "@/components/servicedesk/TicketTable";
import { toast } from "sonner";

interface Ticket {
  id: string;
  title: string;
  category: string;
  description: string;
  statusId: string;
  priority: "low" | "medium" | "high";
  requester: string;
  email: string;
  createdAt: string;
  slaDeadline: string;
  prazoSlaEmHoras: number;
  slaVencido: boolean;
  completedAt?: string;
  assignee?: string;
  ativoId?: string;
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
    statusId: "inProgress",
    priority: "high",
    requester: "Maria Silva",
    email: "maria.silva@empresa.com",
    createdAt: new Date(Date.now() - 3 * 3600000).toISOString(),
    assignee: "Carlos TI",
  }),
  buildTicket({
    id: "TI-2024-002",
    title: "Novo notebook para colaborador",
    category: "Solicitação de novo Computador/Notebook",
    description: "Solicitação de notebook para novo funcionário do comercial",
    statusId: "pending",
    priority: "medium",
    requester: "RH - Ana Costa",
    email: "ana.costa@empresa.com",
    createdAt: new Date(Date.now() - 48 * 3600000).toISOString(),
  }),
  buildTicket({
    id: "TI-2024-003",
    title: "Reset de senha do sistema ERP",
    category: "Acesso e permissões",
    description: "Preciso resetar a senha do sistema ERP",
    statusId: "completed",
    priority: "low",
    requester: "João Pedro",
    email: "joao.pedro@empresa.com",
    createdAt: new Date(Date.now() - 6 * 3600000).toISOString(),
    assignee: "Carlos TI",
    completedAt: new Date(Date.now() - 4 * 3600000).toISOString(),
  }),
  buildTicket({
    id: "TI-2024-004",
    title: "Impressora não funciona",
    category: "Serviços de Impressão",
    description: "Impressora do 3º andar está com erro",
    statusId: "inProgress",
    priority: "medium",
    requester: "Financeiro",
    email: "financeiro@empresa.com",
    createdAt: new Date(Date.now() - 7 * 3600000).toISOString(),
    assignee: "Pedro TI",
  }),
  buildTicket({
    id: "TI-2024-005",
    title: "Acesso ao sistema financeiro",
    category: "Acesso e permissões",
    description: "Novo colaborador precisa de acesso ao sistema",
    statusId: "waitingUser",
    priority: "low",
    requester: "RH",
    email: "rh@empresa.com",
    createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    assignee: "Carlos TI",
  }),
];

type ViewMode = "list" | "kanban";

export default function ServiceDesk() {
  const [tickets, setTickets] = useState<Ticket[]>(initialTickets);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");

  const { getSlaInfo, tick } = useSlaTimer();
  const {
    statuses,
    activeStatuses,
    isFinalStatus,
    addStatus,
    updateStatus,
    reorderStatuses,
    logStatusChange,
  } = useCustomStatuses();

  const {
    assets,
    getAvailableForCategory,
    reserveAsset,
    deliverAsset,
    getAsset,
  } = useAssets();

  const loggedExpired = useRef<Set<string>>(new Set());

  // SLA expiry check
  useEffect(() => {
    setTickets((prev) =>
      prev.map((ticket) => {
        if (isFinalStatus(ticket.statusId)) return ticket;

        const sla = getSlaInfo(ticket.createdAt, ticket.category, false);

        if (sla.slaVencido && !ticket.slaVencido) {
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
  }, [tick, getSlaInfo, isFinalStatus]);

  // Link an asset to a ticket
  const handleLinkAsset = useCallback(
    (ticketId: string, assetId: string) => {
      reserveAsset(assetId, ticketId);
      setTickets((prev) =>
        prev.map((t) => (t.id === ticketId ? { ...t, ativoId: assetId } : t))
      );

      console.log(
        `[VINCULAÇÃO] ${new Date().toISOString()} | Ativo ${assetId} vinculado ao chamado ${ticketId}`
      );
    },
    [reserveAsset]
  );

  // Handle status change (from kanban drag-drop or any other source)
  const handleStatusChange = useCallback(
    (ticketId: string, newStatusId: string) => {
      setTickets((prev) =>
        prev.map((ticket) => {
          if (ticket.id !== ticketId) return ticket;

          const oldStatusId = ticket.statusId;
          if (oldStatusId === newStatusId) return ticket;

          // Log change
          logStatusChange(ticketId, oldStatusId, newStatusId);

          const oldName =
            statuses.find((s) => s.id === oldStatusId)?.nome ?? oldStatusId;
          const newName =
            statuses.find((s) => s.id === newStatusId)?.nome ?? newStatusId;
          toast.info(`${ticketId}: ${oldName} → ${newName}`);

          // Auto-fill completedAt when moved to a final status
          const isFinal = isFinalStatus(newStatusId);
          const completedAt = isFinal ? new Date().toISOString() : undefined;

          if (isFinal) {
            console.log(
              `[CONCLUSÃO] ${new Date().toISOString()} | Chamado ${ticketId} concluído | data_conclusao: ${completedAt}`
            );

            // If ticket has linked asset → deliver it
            if (ticket.ativoId) {
              deliverAsset(ticket.ativoId, ticketId, ticket.requester);
              toast.success(
                `Ativo ${ticket.ativoId} entregue para ${ticket.requester}`,
                {
                  description: "Status do ativo alterado para Em uso",
                }
              );
            }
          }

          return {
            ...ticket,
            statusId: newStatusId,
            completedAt,
          };
        })
      );
    },
    [logStatusChange, isFinalStatus, statuses, deliverAsset]
  );

  // Stats
  const pendingCount = tickets.filter((t) => t.statusId === "pending").length;
  const inProgressCount = tickets.filter(
    (t) => t.statusId === "inProgress"
  ).length;
  const completedCount = tickets.filter((t) =>
    isFinalStatus(t.statusId)
  ).length;
  const slaExpiredCount = tickets.filter(
    (t) => t.slaVencido && !isFinalStatus(t.statusId)
  ).length;

  // Filters
  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch =
      ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      filterCategory === "all" || ticket.category === filterCategory;
    const matchesStatus =
      filterStatus === "all" || ticket.statusId === filterStatus;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <AppLayout>
      <PageHeader
        title="Service Desk"
        description="Central de atendimento e suporte de TI"
      >
        <StatusManagerDialog
          statuses={statuses}
          onAdd={addStatus}
          onUpdate={updateStatus}
          onReorder={reorderStatuses}
        />
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
          title="Concluídos"
          value={completedCount}
          icon={CheckCircle2}
          className="border-l-4 border-l-success"
        />
      </div>

      {/* Filters + View Toggle */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
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
            {activeStatuses.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* View toggle */}
        <div className="flex rounded-lg border bg-muted p-1">
          <Button
            variant={viewMode === "kanban" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("kanban")}
            className="gap-1.5"
          >
            <Kanban className="h-4 w-4" />
            <span className="hidden sm:inline">Kanban</span>
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("list")}
            className="gap-1.5"
          >
            <LayoutList className="h-4 w-4" />
            <span className="hidden sm:inline">Lista</span>
          </Button>
        </div>
      </div>

      {/* Content */}
      {viewMode === "kanban" ? (
        <KanbanBoard
          tickets={filteredTickets.map((t) => ({
            id: t.id,
            title: t.title,
            category: t.category,
            statusId: t.statusId,
            priority: t.priority,
            requester: t.requester,
            assignee: t.assignee,
            createdAt: t.createdAt,
            ativoId: t.ativoId,
          }))}
          statuses={activeStatuses}
          getSlaInfo={getSlaInfo}
          isFinalStatus={isFinalStatus}
          onStatusChange={handleStatusChange}
          getAvailableForCategory={getAvailableForCategory}
          getAsset={getAsset}
          onLinkAsset={handleLinkAsset}
        />
      ) : (
        <TicketTable
          tickets={filteredTickets}
          statuses={activeStatuses}
          getSlaInfo={getSlaInfo}
          isFinalStatus={isFinalStatus}
          getAvailableForCategory={getAvailableForCategory}
          getAsset={getAsset}
          onLinkAsset={handleLinkAsset}
        />
      )}
    </AppLayout>
  );
}
