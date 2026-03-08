import { useState } from "react";
import { StatusCustom } from "@/hooks/use-custom-status";
import { HardwareAsset } from "@/hooks/use-assets";
import { SlaIndicator } from "@/components/sla/SlaIndicator";
import { AssetLinkerCompact } from "@/components/servicedesk/AssetLinker";
import { SlaInfo } from "@/hooks/use-sla";
import { User, GripVertical, CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

interface KanbanTicket {
  id: string;
  title: string;
  category: string;
  statusId: string;
  priority: "low" | "medium" | "high";
  requester: string;
  assignee?: string;
  createdAt: string;
  ativoId?: string;
  subtaskAssetIds?: string[];
}

interface KanbanBoardProps {
  tickets: KanbanTicket[];
  statuses: StatusCustom[];
  getSlaInfo: (createdAt: string, category: string, isCompleted: boolean) => SlaInfo;
  isFinalStatus: (statusId: string) => boolean;
  onStatusChange: (ticketId: string, newStatusId: string) => void;
  onQuickComplete: (ticketId: string) => void;
  getAvailableForCategory: (category: string) => HardwareAsset[];
  getAsset: (id: string) => HardwareAsset | undefined;
  onLinkAsset: (ticketId: string, assetId: string) => void;
  onTicketClick?: (ticketId: string) => void;
}

const priorityConfig: Record<string, { label: string; dot: string }> = {
  high: { label: "Alta", dot: "bg-destructive" },
  medium: { label: "Média", dot: "bg-warning" },
  low: { label: "Baixa", dot: "bg-success" },
};

export function KanbanBoard({
  tickets,
  statuses,
  getSlaInfo,
  isFinalStatus,
  onStatusChange,
  onQuickComplete,
  getAvailableForCategory,
  getAsset,
  onLinkAsset,
  onTicketClick,
}: KanbanBoardProps) {
  const [draggedTicketId, setDraggedTicketId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, ticketId: string) => {
    setDraggedTicketId(ticketId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", ticketId);
  };

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverColumn(columnId);
  };

  const handleDragLeave = () => setDragOverColumn(null);

  const handleDrop = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    setDragOverColumn(null);
    const ticketId = draggedTicketId || e.dataTransfer.getData("text/plain");
    if (!ticketId) return;
    const ticket = tickets.find((t) => t.id === ticketId);
    if (ticket && ticket.statusId !== columnId) {
      onStatusChange(ticketId, columnId);
    }
    setDraggedTicketId(null);
  };

  const handleDragEnd = () => {
    setDraggedTicketId(null);
    setDragOverColumn(null);
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin">
      {statuses.map((status) => {
        const columnTickets = tickets.filter((t) => t.statusId === status.id);

        return (
          <div
            key={status.id}
            className="min-w-[280px] flex-1"
            onDragOver={(e) => handleDragOver(e, status.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, status.id)}
          >
            {/* Column Header */}
            <div
              className={cn(
                "mb-3 flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors",
                dragOverColumn === status.id ? "ring-2 ring-ring ring-offset-2" : ""
              )}
              style={{
                backgroundColor: `hsl(${status.cor} / 0.15)`,
                borderLeft: `3px solid hsl(${status.cor})`,
              }}
            >
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: `hsl(${status.cor})` }} />
                <h3 className="text-sm font-semibold">{status.nome}</h3>
                {status.statusType && (
                  <span className={cn(
                    "text-[10px] rounded px-1.5 py-0.5 font-medium",
                    status.statusType === "todo" ? "bg-muted text-muted-foreground" :
                    status.statusType === "in_progress" ? "bg-blue-500/15 text-blue-600" :
                    "bg-emerald-500/15 text-emerald-600"
                  )}>
                    {status.statusType === "todo" ? "To Do" : status.statusType === "in_progress" ? "In Progress" : "Done"}
                  </span>
                )}
              </div>
              <span
                className="flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-xs font-medium"
                style={{ backgroundColor: `hsl(${status.cor} / 0.2)`, color: `hsl(${status.cor})` }}
              >
                {columnTickets.length}
              </span>
            </div>

            {/* Cards */}
            <div className="space-y-2.5">
              {columnTickets.map((ticket) => {
                const isCompleted = isFinalStatus(ticket.statusId);
                const sla = getSlaInfo(ticket.createdAt, ticket.category, isCompleted);
                const priority = priorityConfig[ticket.priority];
                const linkedAsset = ticket.ativoId ? getAsset(ticket.ativoId) : undefined;
                const availableAssets = getAvailableForCategory(ticket.category);
                const subtaskAssets = (ticket.subtaskAssetIds || []).map(getAsset).filter(Boolean) as HardwareAsset[];
                return (
                  <div
                    key={ticket.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, ticket.id)}
                    onDragEnd={handleDragEnd}
                    className={cn(
                      "group cursor-grab rounded-lg border bg-card p-3.5 shadow-sm transition-all hover:shadow-md active:cursor-grabbing",
                      draggedTicketId === ticket.id ? "opacity-40 scale-95" : "",
                      isCompleted ? "opacity-60" : ""
                    )}
                  >
                    {/* Header with check button */}
                    <div className="mb-2 flex items-start gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!isCompleted) onQuickComplete(ticket.id);
                        }}
                        className={cn(
                          "mt-0.5 flex-shrink-0 transition-colors",
                          isCompleted
                            ? "text-emerald-500"
                            : "text-muted-foreground/40 hover:text-emerald-500"
                        )}
                        title={isCompleted ? "Concluído" : "Marcar como concluído"}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="h-5 w-5" />
                        ) : (
                          <Circle className="h-5 w-5 group-hover:hidden" />
                        )}
                        {!isCompleted && (
                          <CheckCircle2 className="h-5 w-5 hidden group-hover:block" />
                        )}
                      </button>
                      <div
                        className="flex-1 cursor-pointer"
                        onClick={() => onTicketClick?.(ticket.id)}
                      >
                        <p className="text-xs font-mono text-muted-foreground mb-1">{ticket.id}</p>
                        <p className={cn("font-medium text-sm leading-tight", isCompleted && "line-through")}>{ticket.title}</p>
                      </div>
                      <GripVertical className="h-4 w-4 flex-shrink-0 text-muted-foreground/40" />
                    </div>

                    {/* Category */}
                    <div onClick={() => onTicketClick?.(ticket.id)}>
                      <span className="inline-block rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground mb-2.5">
                        {ticket.category}
                      </span>

                      <div className="mb-2">
                        <AssetLinkerCompact
                          ticketCategory={ticket.category}
                          linkedAssetId={ticket.ativoId}
                          linkedAsset={linkedAsset}
                          availableCount={availableAssets.length}
                        />
                      </div>

                      {/* Subtask asset badges (Contratação) */}
                      {subtaskAssets.length > 0 && (
                        <div className="mb-2 space-y-1">
                          {subtaskAssets.map((asset) => (
                            <div key={asset.id} className="flex items-center gap-1.5 rounded bg-success/10 px-2 py-1 text-xs">
                              <CheckCircle2 className="h-3 w-3 text-success" />
                              <span className="font-medium text-success truncate">{asset.model}</span>
                              <span className="text-muted-foreground">({asset.type})</span>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="mb-2.5">
                        <SlaIndicator sla={sla} />
                      </div>

                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <div className={cn("h-2 w-2 rounded-full", priority.dot)} />
                          <span>{priority.label}</span>
                        </div>
                        {ticket.assignee ? (
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            <span>{ticket.assignee}</span>
                          </div>
                        ) : (
                          <span className="italic text-muted-foreground/60">Sem responsável</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {columnTickets.length === 0 && (
                <div
                  className={cn(
                    "flex min-h-[80px] items-center justify-center rounded-lg border border-dashed p-4 text-xs text-muted-foreground transition-colors",
                    dragOverColumn === status.id ? "border-ring bg-accent/50" : ""
                  )}
                >
                  Arraste chamados aqui
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
