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
  Loader2,
} from "lucide-react";
import { useSlaTimer, slaByCategory } from "@/hooks/use-sla";
import { useCustomStatuses } from "@/hooks/use-custom-status";
import { useAssets, assetRequestCategories } from "@/hooks/use-assets";
import { useTickets } from "@/hooks/use-tickets";
import { StatusManagerDialog } from "@/components/servicedesk/StatusManagerDialog";
import { KanbanBoard } from "@/components/servicedesk/KanbanBoard";
import { TicketTable } from "@/components/servicedesk/TicketTable";
import { TicketDetailSheet } from "@/components/servicedesk/TicketDetailSheet";
import { toast } from "sonner";

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

type ViewMode = "list" | "kanban";

export default function ServiceDesk() {
  const { tickets, loading, fetchTickets, updateTicket } = useTickets();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const { getSlaInfo, tick } = useSlaTimer();
  const {
    statuses,
    activeStatuses,
    isFinalStatus,
    getDoneStatusId,
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

  // SLA expiry check — update in DB when expired
  useEffect(() => {
    tickets.forEach((ticket) => {
      if (isFinalStatus(ticket.status_id)) return;
      if (ticket.sla_expired) return;

      const sla = getSlaInfo(ticket.created_at, ticket.category, false);
      if (sla.slaVencido && !loggedExpired.current.has(ticket.id)) {
        loggedExpired.current.add(ticket.id);
        updateTicket(ticket.id, { sla_expired: true });
        toast.error(`SLA vencido: ${ticket.ticket_number} - ${ticket.title}`, {
          description: `O prazo de ${ticket.sla_hours}h foi ultrapassado.`,
          duration: 8000,
        });
      }
    });
  }, [tick, tickets, getSlaInfo, isFinalStatus, updateTicket]);

  // Link an asset to a ticket
  const handleLinkAsset = useCallback(
    async (ticketId: string, assetId: string) => {
      // Find the ticket by ticket_number or id
      const ticket = tickets.find((t) => t.ticket_number === ticketId || t.id === ticketId);
      if (!ticket) return;

      reserveAsset(assetId, ticket.ticket_number);
      await updateTicket(ticket.id, { asset_id: assetId });

      console.log(
        `[VINCULAÇÃO] ${new Date().toISOString()} | Ativo ${assetId} vinculado ao chamado ${ticket.ticket_number}`
      );
    },
    [tickets, reserveAsset, updateTicket]
  );

  // Handle status change
  const handleStatusChange = useCallback(
    async (ticketId: string, newStatusId: string) => {
      const ticket = tickets.find((t) => t.ticket_number === ticketId || t.id === ticketId);
      if (!ticket) return;

      const oldStatusId = ticket.status_id;
      if (oldStatusId === newStatusId) return;

      logStatusChange(ticket.ticket_number, oldStatusId, newStatusId);

      const oldName = statuses.find((s) => s.id === oldStatusId)?.nome ?? oldStatusId;
      const newName = statuses.find((s) => s.id === newStatusId)?.nome ?? newStatusId;
      toast.info(`${ticket.ticket_number}: ${oldName} → ${newName}`);

      const isFinal = isFinalStatus(newStatusId);
      const completedAt = isFinal ? new Date().toISOString() : null;

      await updateTicket(ticket.id, {
        status_id: newStatusId,
        completed_at: completedAt,
      });

      if (isFinal && ticket.asset_id) {
        deliverAsset(ticket.asset_id, ticket.ticket_number, ticket.requester);
        toast.success(
          `Ativo ${ticket.asset_id} entregue para ${ticket.requester}`,
          { description: "Status do ativo alterado para Em uso" }
        );
      }
    },
    [tickets, logStatusChange, isFinalStatus, statuses, deliverAsset, updateTicket]
  );

  // Quick complete - moves ticket to the first "done" status
  const handleQuickComplete = useCallback(
    (ticketIdOrNumber: string) => {
      const doneStatusId = getDoneStatusId();
      handleStatusChange(ticketIdOrNumber, doneStatusId);
    },
    [getDoneStatusId, handleStatusChange]
  );

  // Open detail sheet
  const handleTicketClick = useCallback(
    (ticketIdOrNumber: string) => {
      const ticket = tickets.find((t) => t.ticket_number === ticketIdOrNumber || t.id === ticketIdOrNumber);
      if (ticket) {
        setSelectedTicketId(ticket.id);
        setDetailOpen(true);
      }
    },
    [tickets]
  );

  const selectedTicket = tickets.find((t) => t.id === selectedTicketId) ?? null;

  // Stats
  const pendingCount = tickets.filter((t) => t.status_id === "pending").length;
  const inProgressCount = tickets.filter((t) => t.status_id === "inProgress").length;
  const completedCount = tickets.filter((t) => isFinalStatus(t.status_id)).length;
  const slaExpiredCount = tickets.filter(
    (t) => t.sla_expired && !isFinalStatus(t.status_id)
  ).length;

  // Filters
  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch =
      ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.ticket_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      filterCategory === "all" || ticket.category === filterCategory;
    const matchesStatus =
      filterStatus === "all" || ticket.status_id === filterStatus;
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
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
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
              <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>

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

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : viewMode === "kanban" ? (
        <KanbanBoard
          tickets={filteredTickets.map((t) => ({
            id: t.ticket_number,
            title: t.title,
            category: t.category,
            statusId: t.status_id,
            priority: t.priority,
            requester: t.requester,
            assignee: t.assignee ?? undefined,
            createdAt: t.created_at,
            ativoId: t.asset_id ?? undefined,
          }))}
          statuses={activeStatuses}
          getSlaInfo={getSlaInfo}
          isFinalStatus={isFinalStatus}
          onStatusChange={handleStatusChange}
          onQuickComplete={handleQuickComplete}
          getAvailableForCategory={getAvailableForCategory}
          getAsset={getAsset}
          onLinkAsset={handleLinkAsset}
          onTicketClick={handleTicketClick}
        />
      ) : (
        <TicketTable
          tickets={filteredTickets.map((t) => ({
            id: t.ticket_number,
            title: t.title,
            category: t.category,
            statusId: t.status_id,
            priority: t.priority,
            requester: t.requester,
            email: t.email,
            createdAt: t.created_at,
            slaVencido: t.sla_expired,
            assignee: t.assignee ?? undefined,
            ativoId: t.asset_id ?? undefined,
          }))}
          statuses={activeStatuses}
          getSlaInfo={getSlaInfo}
          isFinalStatus={isFinalStatus}
          getAvailableForCategory={getAvailableForCategory}
          getAsset={getAsset}
          onLinkAsset={handleLinkAsset}
          onTicketClick={handleTicketClick}
        />
      )}

      <TicketDetailSheet
        ticket={selectedTicket}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        statuses={activeStatuses}
        isFinalStatus={isFinalStatus}
        getSlaInfo={getSlaInfo}
        getAvailableForCategory={getAvailableForCategory}
        getAsset={getAsset}
        onLinkAsset={handleLinkAsset}
        onStatusChange={handleStatusChange}
        onUpdateTicket={async (id, updates) => updateTicket(id, updates as any)}
      />
    </AppLayout>
  );
}
