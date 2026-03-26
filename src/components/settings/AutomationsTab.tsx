import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  useAutomationRules,
  triggerLabels,
  actionLabels,
  TriggerType,
  ActionType,
} from "@/hooks/use-automation-rules";
import { useCustomStatuses } from "@/hooks/use-custom-status";
import { supabase } from "@/integrations/supabase/client";
import {
  Plus,
  Zap,
  Trash2,
  ArrowRight,
  Loader2,
  Play,
  Pause,
} from "lucide-react";
import { cn } from "@/lib/utils";

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

const triggerIcons: Record<TriggerType, string> = {
  ticket_created: "📩",
  status_changed: "🔄",
  priority_changed: "⚡",
  sla_near: "⏰",
};

const actionIcons: Record<ActionType, string> = {
  move_to_status: "📋",
  assign_to: "👤",
  change_priority: "🔺",
  send_notification: "🔔",
};

export function AutomationsTab() {
  const { rules, loading, addRule, deleteRule, toggleRule } = useAutomationRules();
  const { activeStatuses } = useCustomStatuses();
  const [dialogOpen, setDialogOpen] = useState(false);

  // New rule form state
  const [name, setName] = useState("");
  const [triggerType, setTriggerType] = useState<TriggerType>("ticket_created");
  const [triggerCategory, setTriggerCategory] = useState("");
  const [triggerFromStatus, setTriggerFromStatus] = useState("");
  const [triggerFromPriority, setTriggerFromPriority] = useState("");
  const [actionType, setActionType] = useState<ActionType>("move_to_status");
  const [actionStatusId, setActionStatusId] = useState("");
  const [actionAssignee, setActionAssignee] = useState("");
  const [actionPriority, setActionPriority] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  const resetForm = () => {
    setName("");
    setTriggerType("ticket_created");
    setTriggerCategory("");
    setTriggerFromStatus("");
    setTriggerFromPriority("");
    setActionType("move_to_status");
    setActionStatusId("");
    setActionAssignee("");
    setActionPriority("");
    setActionMessage("");
  };

  const buildTriggerConfig = () => {
    switch (triggerType) {
      case "ticket_created":
        return triggerCategory ? { category: triggerCategory } : {};
      case "status_changed":
        return triggerFromStatus ? { from_status: triggerFromStatus } : {};
      case "priority_changed":
        return triggerFromPriority ? { from_priority: triggerFromPriority } : {};
      case "sla_near":
        return {};
      default:
        return {};
    }
  };

  const buildActionConfig = () => {
    switch (actionType) {
      case "move_to_status":
        return { status_id: actionStatusId };
      case "assign_to":
        return { assignee: actionAssignee };
      case "change_priority":
        return { priority: actionPriority };
      case "send_notification":
        return { message: actionMessage };
      default:
        return {};
    }
  };

  const isFormValid = () => {
    if (!name.trim()) return false;
    switch (actionType) {
      case "move_to_status": return !!actionStatusId;
      case "assign_to": return !!actionAssignee;
      case "change_priority": return !!actionPriority;
      case "send_notification": return !!actionMessage.trim();
      default: return false;
    }
  };

  const handleCreate = async () => {
    const success = await addRule({
      name: name.trim(),
      trigger_type: triggerType,
      trigger_config: buildTriggerConfig(),
      action_type: actionType,
      action_config: buildActionConfig(),
      is_active: true,
    });
    if (success) {
      resetForm();
      setDialogOpen(false);
    }
  };

  const getStatusName = (id: string) => activeStatuses.find(s => s.id === id)?.nome ?? id;

  const describeTrigger = (rule: typeof rules[0]) => {
    let desc = triggerLabels[rule.trigger_type as TriggerType];
    if (rule.trigger_type === "ticket_created" && rule.trigger_config.category) {
      desc += ` (Categoria: ${rule.trigger_config.category})`;
    }
    if (rule.trigger_type === "status_changed" && rule.trigger_config.from_status) {
      desc += ` (De: ${getStatusName(rule.trigger_config.from_status)})`;
    }
    if (rule.trigger_type === "priority_changed" && rule.trigger_config.from_priority) {
      desc += ` (De: ${rule.trigger_config.from_priority})`;
    }
    return desc;
  };

  const describeAction = (rule: typeof rules[0]) => {
    switch (rule.action_type) {
      case "move_to_status":
        return `Mover para "${getStatusName(rule.action_config.status_id)}"`;
      case "assign_to":
        return `Atribuir a "${rule.action_config.assignee}"`;
      case "change_priority":
        return `Alterar prioridade para "${rule.action_config.priority === "high" ? "Alta" : rule.action_config.priority === "medium" ? "Média" : "Baixa"}"`;
      case "send_notification":
        return `Notificar: "${rule.action_config.message}"`;
      default:
        return actionLabels[rule.action_type as ActionType];
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500" />
              Regras de Automação
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Configure regras automáticas no formato "Quando [Gatilho], então [Ação]"
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Nova Regra
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-amber-500" />
                  Criar Regra de Automação
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-5 py-2">
                {/* Rule name */}
                <div className="space-y-2">
                  <Label>Nome da Regra</Label>
                  <Input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Ex: Triagem automática de celulares"
                  />
                </div>

                {/* Trigger section */}
                <div className="space-y-3 rounded-lg border p-4">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-xs font-bold text-amber-600">QUANDO</span>
                    Gatilho
                  </Label>
                  <Select value={triggerType} onValueChange={(v: TriggerType) => setTriggerType(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(triggerLabels) as TriggerType[]).map(t => (
                        <SelectItem key={t} value={t}>
                          {triggerIcons[t]} {triggerLabels[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Trigger-specific config */}
                  {triggerType === "ticket_created" && (
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Filtrar por categoria (opcional)</Label>
                      <Select value={triggerCategory} onValueChange={setTriggerCategory}>
                        <SelectTrigger><SelectValue placeholder="Qualquer categoria" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__all__">Qualquer categoria</SelectItem>
                          {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {triggerType === "status_changed" && (
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Quando sair do status (opcional)</Label>
                      <Select value={triggerFromStatus} onValueChange={setTriggerFromStatus}>
                        <SelectTrigger><SelectValue placeholder="Qualquer status" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__all__">Qualquer status</SelectItem>
                          {activeStatuses.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {triggerType === "priority_changed" && (
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Quando sair da prioridade (opcional)</Label>
                      <Select value={triggerFromPriority} onValueChange={setTriggerFromPriority}>
                        <SelectTrigger><SelectValue placeholder="Qualquer prioridade" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__all__">Qualquer prioridade</SelectItem>
                          <SelectItem value="low">Baixa</SelectItem>
                          <SelectItem value="medium">Média</SelectItem>
                          <SelectItem value="high">Alta</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {/* Arrow */}
                <div className="flex justify-center">
                  <ArrowRight className="h-5 w-5 text-muted-foreground rotate-90" />
                </div>

                {/* Action section */}
                <div className="space-y-3 rounded-lg border p-4">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-xs font-bold text-emerald-600">ENTÃO</span>
                    Ação
                  </Label>
                  <Select value={actionType} onValueChange={(v: ActionType) => setActionType(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(actionLabels) as ActionType[]).map(a => (
                        <SelectItem key={a} value={a}>
                          {actionIcons[a]} {actionLabels[a]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Action-specific config */}
                  {actionType === "move_to_status" && (
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Mover para o status</Label>
                      <Select value={actionStatusId} onValueChange={setActionStatusId}>
                        <SelectTrigger><SelectValue placeholder="Selecione o status" /></SelectTrigger>
                        <SelectContent>
                          {activeStatuses.map(s => (
                            <SelectItem key={s.id} value={s.id}>
                              <span className="flex items-center gap-2">
                                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: `hsl(${s.cor})` }} />
                                {s.nome}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {actionType === "assign_to" && (
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Atribuir ao técnico</Label>
                      <Select value={actionAssignee} onValueChange={setActionAssignee}>
                        <SelectTrigger><SelectValue placeholder="Selecione o técnico" /></SelectTrigger>
                        <SelectContent>
                          {technicians.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {actionType === "change_priority" && (
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Alterar para a prioridade</Label>
                      <Select value={actionPriority} onValueChange={setActionPriority}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Baixa</SelectItem>
                          <SelectItem value="medium">Média</SelectItem>
                          <SelectItem value="high">Alta</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {actionType === "send_notification" && (
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Mensagem da notificação</Label>
                      <Input
                        value={actionMessage}
                        onChange={e => setActionMessage(e.target.value)}
                        placeholder="Ex: Novo chamado de celular recebido!"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => { resetForm(); setDialogOpen(false); }}>Cancelar</Button>
                <Button onClick={handleCreate} disabled={!isFormValid()}>
                  <Zap className="mr-2 h-4 w-4" />
                  Criar Regra
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>

        <CardContent>
          {rules.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Zap className="mx-auto h-10 w-10 mb-3 opacity-30" />
              <p className="font-medium">Nenhuma regra criada</p>
              <p className="text-sm mt-1">Crie sua primeira regra de automação clicando em "Nova Regra"</p>
            </div>
          ) : (
            <div className="space-y-3">
              {rules.map(rule => (
                <div
                  key={rule.id}
                  className={cn(
                    "flex items-center gap-4 rounded-lg border p-4 transition-opacity",
                    !rule.is_active && "opacity-50"
                  )}
                >
                  {/* Toggle */}
                  <Switch
                    checked={rule.is_active}
                    onCheckedChange={(checked) => toggleRule(rule.id, checked)}
                  />

                  {/* Rule info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-sm truncate">{rule.name}</p>
                      {rule.is_active ? (
                        <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-600">
                          <Play className="h-2.5 w-2.5" /> Ativa
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                          <Pause className="h-2.5 w-2.5" /> Inativa
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                      <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-amber-600 font-medium">
                        {triggerIcons[rule.trigger_type as TriggerType]} {describeTrigger(rule)}
                      </span>
                      <ArrowRight className="h-3 w-3 flex-shrink-0" />
                      <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-emerald-600 font-medium">
                        {actionIcons[rule.action_type as ActionType]} {describeAction(rule)}
                      </span>
                    </div>
                  </div>

                  {/* Delete */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive flex-shrink-0"
                    onClick={() => deleteRule(rule.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick tips */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">💡 Dicas de Automação</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>• <strong>Triagem automática:</strong> Crie regras com gatilho "Novo chamado criado" filtrado por categoria para mover automaticamente para a coluna correta.</p>
          <p>• <strong>Atribuição automática:</strong> Combine o gatilho "Novo chamado criado" com a ação "Atribuir ao técnico" para distribuir chamados automaticamente.</p>
          <p>• <strong>Escalonamento:</strong> Use "Status alterado" + "Alterar prioridade" para escalar chamados que mudam de status.</p>
        </CardContent>
      </Card>
    </div>
  );
}
