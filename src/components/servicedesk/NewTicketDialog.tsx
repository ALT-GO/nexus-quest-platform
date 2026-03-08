import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { createTicket, runTicketCreatedAutomations } from "@/hooks/use-tickets";

const baseCategories = [
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
  "Desligamento",
  "Contratação",
];

interface DesligamentoFields {
  colaborador: string;
  gestor: string;
  contrato: string;
  celular: boolean;
  chip: boolean;
  notebook: boolean;
  modem: boolean;
  email: boolean;
  dataDesligamento: string;
}

interface ContratacaoFields {
  colaborador: string;
  centroCusto: string;
  celular: boolean;
  chip: boolean;
  notebook: boolean;
  email: boolean;
}

const defaultDesligamento: DesligamentoFields = {
  colaborador: "",
  gestor: "",
  contrato: "",
  celular: false,
  chip: false,
  notebook: false,
  modem: false,
  email: false,
  dataDesligamento: "",
};

const defaultContratacao: ContratacaoFields = {
  colaborador: "",
  centroCusto: "",
  celular: false,
  chip: false,
  notebook: false,
  email: false,
};

export function NewTicketDialog() {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [category, setCategory] = useState("");
  const [requester, setRequester] = useState("");
  const [emailField, setEmailField] = useState("");
  const [department, setDepartment] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [desligamento, setDesligamento] = useState<DesligamentoFields>(defaultDesligamento);
  const [contratacao, setContratacao] = useState<ContratacaoFields>(defaultContratacao);

  const isDesligamento = category === "Desligamento";
  const isContratacao = category === "Contratação";

  const buildDescription = () => {
    if (isDesligamento) {
      const items = [
        desligamento.celular && "Celular",
        desligamento.chip && "Chip",
        desligamento.notebook && "Notebook",
        desligamento.modem && "Modem",
        desligamento.email && "E-mail",
      ].filter(Boolean);
      return [
        `Colaborador: ${desligamento.colaborador}`,
        `Gestor: ${desligamento.gestor}`,
        `Contrato: ${desligamento.contrato}`,
        `Itens para devolução: ${items.length > 0 ? items.join(", ") : "Nenhum"}`,
        `Data do Desligamento: ${desligamento.dataDesligamento}`,
        description && `Observações: ${description}`,
      ].filter(Boolean).join("\n");
    }
    if (isContratacao) {
      const items = [
        `Celular: ${contratacao.celular ? "Sim" : "Não"}`,
        `Chip: ${contratacao.chip ? "Sim" : "Não"}`,
        `Notebook: ${contratacao.notebook ? "Sim" : "Não"}`,
        `E-mail: ${contratacao.email ? "Sim" : "Não"}`,
      ];
      return [
        `Colaborador: ${contratacao.colaborador}`,
        `Centro de Custo: ${contratacao.centroCusto}`,
        ...items,
        description && `Observações: ${description}`,
      ].filter(Boolean).join("\n");
    }
    return description;
  };

  const handleSubmit = async () => {
    if (!category) {
      toast.error("Selecione uma categoria.");
      return;
    }

    const finalRequester = isDesligamento
      ? desligamento.colaborador || requester
      : isContratacao
      ? contratacao.colaborador || requester
      : requester;

    if (!finalRequester) {
      toast.error("Informe o nome do solicitante/colaborador.");
      return;
    }

    const finalDescription = buildDescription();
    if (!finalDescription) {
      toast.error("Preencha a descrição ou os campos obrigatórios.");
      return;
    }

    setSubmitting(true);

    const result = await createTicket({
      title: category,
      category,
      description: finalDescription,
      requester: finalRequester,
      email: emailField || "interno@empresa.com",
      department: department || undefined,
      priority,
    });

    if (result.success) {
      if (result.ticketId) {
        await runTicketCreatedAutomations(result.ticketId, category);
      }
      toast.success(`Chamado ${result.ticketNumber} criado com sucesso!`);
      resetForm();
      setOpen(false);
    } else {
      toast.error("Erro ao criar chamado.");
    }
    setSubmitting(false);
  };

  const resetForm = () => {
    setCategory("");
    setRequester("");
    setEmailField("");
    setDepartment("");
    setDescription("");
    setPriority("medium");
    setDesligamento(defaultDesligamento);
    setContratacao(defaultContratacao);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger asChild>
        <Button className="gap-1.5">
          <Plus className="h-4 w-4" />
          Novo Chamado Manual
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Novo Chamado Manual</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Category */}
          <div className="space-y-2">
            <Label>Categoria <span className="text-destructive">*</span></Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a categoria" />
              </SelectTrigger>
              <SelectContent>
                {baseCategories.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label>Prioridade</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Baixa</SelectItem>
                <SelectItem value="medium">Média</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* ── Desligamento ── */}
          {isDesligamento && (
            <div className="space-y-4 rounded-lg border p-4">
              <p className="text-sm font-semibold text-muted-foreground">Dados do Desligamento</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label>Nome do Colaborador <span className="text-destructive">*</span></Label>
                  <Input
                    value={desligamento.colaborador}
                    onChange={(e) => setDesligamento({ ...desligamento, colaborador: e.target.value })}
                    placeholder="Buscar colaborador..."
                  />
                </div>
                <div className="space-y-1">
                  <Label>Gestor</Label>
                  <Input
                    value={desligamento.gestor}
                    onChange={(e) => setDesligamento({ ...desligamento, gestor: e.target.value })}
                    placeholder="Nome do gestor"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Contrato</Label>
                  <Input
                    value={desligamento.contrato}
                    onChange={(e) => setDesligamento({ ...desligamento, contrato: e.target.value })}
                    placeholder="Tipo de contrato"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Data do Desligamento</Label>
                  <Input
                    type="date"
                    value={desligamento.dataDesligamento}
                    onChange={(e) => setDesligamento({ ...desligamento, dataDesligamento: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Itens para devolução</Label>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {(["celular", "chip", "notebook", "modem", "email"] as const).map((key) => (
                    <label key={key} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={desligamento[key]}
                        onCheckedChange={(v) => setDesligamento({ ...desligamento, [key]: !!v })}
                      />
                      {key === "email" ? "E-mail" : key.charAt(0).toUpperCase() + key.slice(1)}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Contratação ── */}
          {isContratacao && (
            <div className="space-y-4 rounded-lg border p-4">
              <p className="text-sm font-semibold text-muted-foreground">Dados da Contratação</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label>Nome do Colaborador <span className="text-destructive">*</span></Label>
                  <Input
                    value={contratacao.colaborador}
                    onChange={(e) => setContratacao({ ...contratacao, colaborador: e.target.value })}
                    placeholder="Nome completo"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Centro de Custo</Label>
                  <Input
                    value={contratacao.centroCusto}
                    onChange={(e) => setContratacao({ ...contratacao, centroCusto: e.target.value })}
                    placeholder="Ex: 1001"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Necessidades</Label>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {(["celular", "chip", "notebook", "email"] as const).map((key) => (
                    <label key={key} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={contratacao[key]}
                        onCheckedChange={(v) => setContratacao({ ...contratacao, [key]: !!v })}
                      />
                      {key === "email" ? "E-mail" : key.charAt(0).toUpperCase() + key.slice(1)}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Common fields for non-special categories */}
          {!isDesligamento && !isContratacao && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Solicitante <span className="text-destructive">*</span></Label>
                <Input value={requester} onChange={(e) => setRequester(e.target.value)} placeholder="Nome" />
              </div>
              <div className="space-y-1">
                <Label>E-mail</Label>
                <Input value={emailField} onChange={(e) => setEmailField(e.target.value)} placeholder="email@empresa.com" />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label>Departamento</Label>
                <Input value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="Ex: RH, Financeiro..." />
              </div>
            </div>
          )}

          {/* Description */}
          <div className="space-y-1">
            <Label>{isDesligamento || isContratacao ? "Observações" : "Descrição"} {!isDesligamento && !isContratacao && <span className="text-destructive">*</span>}</Label>
            <Textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={isDesligamento || isContratacao ? "Observações adicionais..." : "Descreva o problema ou solicitação..."}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { setOpen(false); resetForm(); }}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            {submitting ? "Criando..." : "Criar Chamado"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
