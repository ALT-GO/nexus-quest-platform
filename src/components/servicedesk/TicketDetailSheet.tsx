import { useState, useEffect, useRef, useCallback } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { SlaIndicator } from "@/components/sla/SlaIndicator";
import { AssetLinker } from "@/components/servicedesk/AssetLinker";
import { supabase } from "@/integrations/supabase/client";
import { useTimesheet, formatDuration } from "@/hooks/use-timesheet";
import { useTicketComments } from "@/hooks/use-ticket-comments";
import { useTicketHistory } from "@/hooks/use-ticket-history";
import { StatusCustom } from "@/hooks/use-custom-status";
import { HardwareAsset } from "@/hooks/use-assets";
import { SlaInfo } from "@/hooks/use-sla";
import { Ticket } from "@/hooks/use-tickets";
import {
  CheckCircle2,
  X,
  Send,
  Clock,
  User,
  Tag,
  MessageSquare,
  History,
  AlertTriangle,
  CalendarDays,
  Loader2,
  Play,
  Pause,
  Timer,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
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

const technicians = ["Alvaro", "Carlos", "Mariana", "Pedro", "Julia"];

interface TicketDetailSheetProps {
  ticket: Ticket | null;
  subtasks?: Ticket[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  statuses: StatusCustom[];
  isFinalStatus: (statusId: string) => boolean;
  getSlaInfo: (createdAt: string, category: string, isCompleted: boolean) => SlaInfo;
  getAvailableForCategory: (category: string) => HardwareAsset[];
  getAsset: (id: string) => HardwareAsset | undefined;
  onLinkAsset: (ticketId: string, assetId: string) => void;
  onStatusChange: (ticketId: string, newStatusId: string) => void;
  onUpdateTicket: (id: string, updates: Partial<Pick<Ticket, "title" | "description" | "assignee" | "priority" | "category">>) => Promise<boolean>;
}

export function TicketDetailSheet({
  ticket,
  subtasks = [],
  open,
  onOpenChange,
  statuses,
  isFinalStatus,
  getSlaInfo,
  getAvailableForCategory,
  getAsset,
  onLinkAsset,
  onStatusChange,
  onUpdateTicket,
}: TicketDetailSheetProps) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<"comments" | "history">("comments");
  const commentsEndRef = useRef<HTMLDivElement>(null);

  const { comments, loading: commentsLoading, addComment } = useTicketComments(ticket?.id ?? null);
  const { history, loading: historyLoading, logHistory } = useTicketHistory(ticket?.id ?? null);
  const { running: timerRunning, totalSeconds, start: startTimer, pause: pauseTimer, stop: stopTimer } = useTimesheet(ticket?.id ?? null);

  useEffect(() => {
    if (ticket) {
      setTitle(ticket.title);
      setDescription(ticket.description);
      setEditingTitle(false);
      setEditingDesc(false);
      setNewComment("");
    }
  }, [ticket]);

  useEffect(() => {
    if (commentsEndRef.current) {
      commentsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [comments]);

  // Parse asset IDs from desligamento description
  const parseDesligamentoAssetIds = useCallback((): string[] => {
    if (!ticket || ticket.category !== "Desligamento") return [];
    const match = ticket.description.match(/\[ASSET_IDS_DEVOLUCAO:([^\]]+)\]/);
    if (!match) return [];
    return match[1].split(",").filter(Boolean);
  }, [ticket]);

  if (!ticket) return null;

  const isCompleted = !!ticket.completed_at;
  const sla = getSlaInfo(ticket.created_at, ticket.category, isCompleted);
  const currentStatus = statuses.find((s) => s.id === ticket.status_id);
  const linkedAsset = ticket.asset_id ? getAsset(ticket.asset_id) : undefined;
  const availableAssets = getAvailableForCategory(ticket.category);

  // Handle play/pause toggle
  const handleTimerToggle = async () => {
    if (isCompleted) return;

    if (timerRunning) {
      await pauseTimer();
      await logHistory("timesheet", "Cronômetro pausado", "Admin");
    } else {
      await startTimer();
      // Auto-move to "In Progress" on first play if still in a "todo" status
      const currentSt = statuses.find((s) => s.id === ticket.status_id);
      if (currentSt?.statusType === "todo") {
        const inProgressStatus = statuses.find((s) => s.statusType === "in_progress" && s.ativo);
        if (inProgressStatus) {
          onStatusChange(ticket.ticket_number, inProgressStatus.id);
          await logHistory("status_change", `Status alterado automaticamente para ${inProgressStatus.nome} (cronômetro iniciado)`, "Admin");
        }
      }
      await logHistory("timesheet", "Cronômetro iniciado", "Admin");
    }
  };

  const handleComplete = async () => {
    const finalStatus = statuses.find((s) => s.isFinal && s.id !== "cancelled");
    if (!finalStatus) return;

    // Stop timer automatically
    await stopTimer();

    // Handle Desligamento asset release
    const assetIds = parseDesligamentoAssetIds();
    if (ticket.category === "Desligamento") {
      // Release specific marked assets
      if (assetIds.length > 0) {
        for (const assetId of assetIds) {
          // Check if it's a licença
          const { data: assetRow } = await supabase
            .from("inventory")
            .select("category")
            .eq("id", assetId as any)
            .single();

          if (assetRow && assetRow.category === "licencas") {
            // Licenças: just change status to Desligado, keep collaborator
            await supabase.from("inventory").update({
              status: "Desligado",
              updated_at: new Date().toISOString(),
            } as any).eq("id", assetId as any);
          } else {
            // Others: clear collaborator and set to Disponível
            await supabase.from("inventory").update({
              status: "Disponível",
              collaborator: "",
              reserved_by_ticket_id: null,
              updated_at: new Date().toISOString(),
            } as any).eq("id", assetId as any);
          }
        }
        await logHistory(
          "asset_release",
          `${assetIds.length} ativo(s) processado(s) no desligamento`,
          "Admin"
        );
        toast.success(`${assetIds.length} ativo(s) processado(s)`);
      }

      // Also process all assets of the requester not in the explicit list
      const { data: allRequesterAssets } = await supabase
        .from("inventory")
        .select("id, category")
        .eq("collaborator", ticket.requester);

      if (allRequesterAssets) {
        const explicitIds = new Set(assetIds);
        const remaining = allRequesterAssets.filter((a: any) => !explicitIds.has(a.id));
        for (const asset of remaining) {
          if (asset.category === "licencas") {
            await supabase.from("inventory").update({
              status: "Desligado",
              updated_at: new Date().toISOString(),
            } as any).eq("id", asset.id);
          } else {
            await supabase.from("inventory").update({
              status: "Disponível",
              collaborator: "",
              reserved_by_ticket_id: null,
              updated_at: new Date().toISOString(),
            } as any).eq("id", asset.id);
          }
        }
        if (remaining.length > 0) {
          await logHistory(
            "asset_release",
            `${remaining.length} ativo(s) adicional(is) do colaborador processado(s)`,
            "Admin"
          );
        }
      }
    }

    // Handle Contratação: deliver subtask-linked assets
    if (ticket.category === "Contratação" && subtasks.length > 0) {
      let deliveredCount = 0;
      for (const sub of subtasks) {
        if (sub.asset_id) {
          await supabase
            .from("inventory")
            .update({
              status: "Em uso",
              collaborator: ticket.requester,
              delivered_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            } as any)
            .eq("id", sub.asset_id as any);
          deliveredCount++;
        }
        // Also complete the subtask
        if (!isFinalStatus(sub.status_id)) {
          await supabase
            .from("tickets")
            .update({ status_id: finalStatus.id, completed_at: new Date().toISOString(), updated_at: new Date().toISOString() } as any)
            .eq("id", sub.id as any);
        }
      }
      if (deliveredCount > 0) {
        await logHistory("asset_delivery", `${deliveredCount} ativo(s) entregue(s) para ${ticket.requester}`, "Admin");
        toast.success(`${deliveredCount} ativo(s) entregue(s) para ${ticket.requester}`);
      }
    }

    onStatusChange(ticket.ticket_number, finalStatus.id);
    await logHistory("status_change", `Status alterado para ${finalStatus.nome}`, "Admin");
    await logHistory("timesheet", `Cronômetro finalizado. Tempo total: ${formatDuration(totalSeconds)}`, "Admin");
    toast.success(`Chamado ${ticket.ticket_number} concluído!`);
    onOpenChange(false);
  };

  const handleSaveTitle = async () => {
    if (title.trim() && title !== ticket.title) {
      await onUpdateTicket(ticket.id, { title: title.trim() });
      await logHistory("field_change", `Título alterado para "${title.trim()}"`, "Admin");
    }
    setEditingTitle(false);
  };

  const handleSaveDescription = async () => {
    if (description !== ticket.description) {
      await onUpdateTicket(ticket.id, { description });
      await logHistory("field_change", "Descrição atualizada", "Admin");
    }
    setEditingDesc(false);
  };

  const handleFieldChange = async (field: string, value: string, label: string) => {
    await onUpdateTicket(ticket.id, { [field]: value } as any);
    await logHistory("field_change", `${label} alterado para "${value}"`, "Admin");
  };

  const handleStatusChange = async (newStatusId: string) => {
    const newStatus = statuses.find((s) => s.id === newStatusId);
    onStatusChange(ticket.ticket_number, newStatusId);
    await logHistory("status_change", `Status alterado para ${newStatus?.nome ?? newStatusId}`, "Admin");
  };

  const handleSendComment = async () => {
    if (!newComment.trim()) return;
    setSubmitting(true);
    const success = await addComment("Admin", newComment.trim());
    if (success) {
      setNewComment("");
      await logHistory("comment", `Comentário adicionado`, "Admin");
    }
    setSubmitting(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendComment();
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[560px] p-0 flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 border-b px-5 py-4">
          <button
            onClick={handleComplete}
            disabled={isCompleted}
            className={cn(
              "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 transition-all",
              isCompleted
                ? "border-success bg-success text-success-foreground"
                : "border-muted-foreground/40 text-muted-foreground hover:border-success hover:text-success"
            )}
          >
            <CheckCircle2 className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-mono text-muted-foreground">{ticket.ticket_number}</p>
            {editingTitle ? (
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleSaveTitle}
                onKeyDown={(e) => e.key === "Enter" && handleSaveTitle()}
                autoFocus
                className="mt-1 h-8 text-base font-semibold"
              />
            ) : (
              <h2
                className="text-base font-semibold truncate cursor-pointer hover:text-primary transition-colors"
                onClick={() => !isCompleted && setEditingTitle(true)}
              >
                {ticket.title}
              </h2>
            )}
          </div>

          {/* Timer button */}
          {!isCompleted && (
            <button
              onClick={handleTimerToggle}
              className={cn(
                "flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-all",
                timerRunning
                  ? "bg-warning/15 text-warning border border-warning/30 hover:bg-warning/25"
                  : "bg-success/15 text-success border border-success/30 hover:bg-success/25"
              )}
            >
              {timerRunning ? (
                <>
                  <Pause className="h-4 w-4" />
                  <span className={cn("font-mono tabular-nums", timerRunning && "animate-pulse")}>
                    {formatDuration(totalSeconds)}
                  </span>
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  <span className="font-mono tabular-nums">
                    {totalSeconds > 0 ? formatDuration(totalSeconds) : "Iniciar"}
                  </span>
                </>
              )}
            </button>
          )}

          {isCompleted && totalSeconds > 0 && (
            <div className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs text-muted-foreground">
              <Timer className="h-3.5 w-3.5" />
              <span className="font-mono">{formatDuration(totalSeconds)}</span>
            </div>
          )}
        </div>

        <ScrollArea className="flex-1">
          <div className="p-5 space-y-5">
            {/* Status badge */}
            {currentStatus && (
              <div className="flex items-center gap-2">
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
                  style={{
                    backgroundColor: `hsl(${currentStatus.cor} / 0.15)`,
                    color: `hsl(${currentStatus.cor})`,
                  }}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: `hsl(${currentStatus.cor})` }}
                  />
                  {currentStatus.nome}
                </span>
                {sla.slaVencido && !isCompleted && (
                  <Badge variant="destructive" className="gap-1 text-xs">
                    <AlertTriangle className="h-3 w-3" />
                    SLA Vencido
                  </Badge>
                )}
              </div>
            )}

            {/* SLA - hide when completed */}
            {!isCompleted && (
              <div>
                <SlaIndicator sla={sla} />
              </div>
            )}

            {/* Fields grid */}
            <div className="grid grid-cols-2 gap-4">
              {/* Status */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Tag className="h-3 w-3" /> Status
                </label>
                <Select
                  value={ticket.status_id}
                  onValueChange={handleStatusChange}
                  disabled={isCompleted}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statuses.filter((s) => s.ativo).map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Assignee */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <User className="h-3 w-3" /> Responsável
                </label>
                <Select
                  value={ticket.assignee || "unassigned"}
                  onValueChange={(v) => handleFieldChange("assignee", v === "unassigned" ? "" : v, "Responsável")}
                  disabled={isCompleted}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Selecionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Sem responsável</SelectItem>
                    {technicians.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Priority */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> Prioridade
                </label>
                <Select
                  value={ticket.priority}
                  onValueChange={(v) => handleFieldChange("priority", v, "Prioridade")}
                  disabled={isCompleted}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baixa</SelectItem>
                    <SelectItem value="medium">Média</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Tag className="h-3 w-3" /> Tipo
                </label>
                <Select
                  value={ticket.category}
                  onValueChange={(v) => handleFieldChange("category", v, "Categoria")}
                  disabled={isCompleted}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Deadline */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <CalendarDays className="h-3 w-3" /> Vencimento SLA
                </label>
                <p className="text-sm py-1.5">
                  {format(new Date(ticket.sla_deadline), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                </p>
              </div>

              {/* Requester */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <User className="h-3 w-3" /> Solicitante
                </label>
                <p className="text-sm py-1.5">{ticket.requester}</p>
                <p className="text-xs text-muted-foreground">{ticket.email}</p>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Descrição</label>
              {editingDesc ? (
                <div className="space-y-2">
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    autoFocus
                    className="text-sm"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveDescription}>Salvar</Button>
                    <Button size="sm" variant="ghost" onClick={() => { setDescription(ticket.description); setEditingDesc(false); }}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  className="rounded-md border bg-muted/30 p-3 text-sm whitespace-pre-wrap cursor-pointer hover:bg-muted/50 transition-colors min-h-[60px]"
                  onClick={() => !isCompleted && setEditingDesc(true)}
                >
                  {ticket.description || "Clique para adicionar descrição..."}
                </div>
              )}
            </div>

            {/* Asset Section */}
            <div>
              <AssetLinker
                ticketId={ticket.ticket_number}
                ticketCategory={ticket.category}
                linkedAssetId={ticket.asset_id ?? undefined}
                linkedAsset={linkedAsset}
                availableAssets={availableAssets}
                onLink={(assetId) => onLinkAsset(ticket.ticket_number, assetId)}
                requesterName={ticket.requester}
              />
            </div>

            {/* Subtask Assets (Contratação) */}
            {ticket.category === "Contratação" && subtasks.length > 0 && (
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Tag className="h-3 w-3" /> Subtarefas de Ativos
                </label>
                <div className="space-y-2">
                  {subtasks.map((sub) => {
                    const subAsset = sub.asset_id ? getAsset(sub.asset_id) : undefined;
                    const subAvailable = getAvailableForCategory(sub.category);
                    return (
                      <div key={sub.id} className="rounded-lg border p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">{sub.title}</p>
                            <p className="text-xs text-muted-foreground font-mono">{sub.ticket_number}</p>
                          </div>
                          {isFinalStatus(sub.status_id) && (
                            <CheckCircle2 className="h-4 w-4 text-success" />
                          )}
                        </div>
                        <AssetLinker
                          ticketId={sub.ticket_number}
                          ticketCategory={sub.category}
                          linkedAssetId={sub.asset_id ?? undefined}
                          linkedAsset={subAsset}
                          availableAssets={subAvailable}
                          onLink={(assetId) => onLinkAsset(sub.id, assetId)}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <Separator />

            {/* Tabs: Comments / History */}
            <div className="flex border-b">
              <button
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                  activeTab === "comments"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setActiveTab("comments")}
              >
                <MessageSquare className="h-4 w-4" />
                Comentários
                {comments.length > 0 && (
                  <span className="ml-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
                    {comments.length}
                  </span>
                )}
              </button>
              <button
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                  activeTab === "history"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setActiveTab("history")}
              >
                <History className="h-4 w-4" />
                Histórico
                {history.length > 0 && (
                  <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-xs">
                    {history.length}
                  </span>
                )}
              </button>
            </div>

            {/* Comments */}
            {activeTab === "comments" && (
              <div className="space-y-3">
                {commentsLoading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : comments.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum comentário ainda. Seja o primeiro!
                  </p>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3">
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {comment.author.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm font-medium">{comment.author}</span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(comment.created_at), "dd/MM HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                        <p className="text-sm text-foreground/90 mt-0.5 whitespace-pre-wrap">
                          {comment.content}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={commentsEndRef} />
              </div>
            )}

            {/* History */}
            {activeTab === "history" && (
              <div className="space-y-2">
                {historyLoading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : history.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhuma alteração registrada.
                  </p>
                ) : (
                  history.map((entry) => (
                    <div key={entry.id} className="flex items-start gap-2 text-sm border-l-2 border-muted pl-3 py-1.5">
                      <Clock className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <span className="text-foreground">{entry.details}</span>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                          <span>{entry.author}</span>
                          <span>•</span>
                          <span>{format(new Date(entry.created_at), "dd/MM HH:mm", { locale: ptBR })}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Comment input - always visible */}
        <div className="border-t p-4">
          <div className="flex gap-2">
            <Textarea
              placeholder="Escreva um comentário..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={2}
              className="text-sm resize-none flex-1"
            />
            <Button
              size="icon"
              onClick={handleSendComment}
              disabled={!newComment.trim() || submitting}
              className="self-end h-9 w-9"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
