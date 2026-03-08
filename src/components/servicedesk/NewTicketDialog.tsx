import { useState, useEffect, useCallback } from "react";
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
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Loader2, Send, Search, Package, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
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

interface InventoryAsset {
  id: string;
  asset_code: string;
  model: string | null;
  asset_type: string | null;
  category: string;
  status: string;
  service_tag: string | null;
  collaborator: string | null;
}

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

  // Asset search state for Desligamento
  const [foundAssets, setFoundAssets] = useState<InventoryAsset[]>([]);
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(new Set());
  const [searchingAssets, setSearchingAssets] = useState(false);

  // Stock check state for Contratação
  const [stockNotebooks, setStockNotebooks] = useState<InventoryAsset[]>([]);
  const [stockCelulares, setStockCelulares] = useState<InventoryAsset[]>([]);
  const [checkingStock, setCheckingStock] = useState(false);

  const isDesligamento = category === "Desligamento";
  const isContratacao = category === "Contratação";

  // Real-time search for collaborator assets
  const searchCollaboratorAssets = useCallback(async (name: string) => {
    if (name.trim().length < 2) {
      setFoundAssets([]);
      setSelectedAssetIds(new Set());
      return;
    }

    setSearchingAssets(true);
    const { data, error } = await supabase
      .from("inventory")
      .select("id, asset_code, model, asset_type, category, status, service_tag, collaborator")
      .ilike("collaborator", `%${name.trim()}%`);

    if (error) {
      console.error("Error searching assets:", error);
    } else {
      setFoundAssets((data as InventoryAsset[]) || []);
      // Auto-select all found assets
      setSelectedAssetIds(new Set((data || []).map((a: any) => a.id)));
    }
    setSearchingAssets(false);
  }, []);

  // Debounced search when collaborador changes (only for Desligamento)
  useEffect(() => {
    if (!isDesligamento) return;

    const timer = setTimeout(() => {
      searchCollaboratorAssets(desligamento.colaborador);
    }, 400);

    return () => clearTimeout(timer);
  }, [desligamento.colaborador, isDesligamento, searchCollaboratorAssets]);

  // Stock check for Contratação when celular/notebook toggles change
  useEffect(() => {
    if (!isContratacao) {
      setStockNotebooks([]);
      setStockCelulares([]);
      return;
    }

    const checkStock = async () => {
      setCheckingStock(true);

      if (contratacao.notebook) {
        promises.push(
          supabase
            .from("inventory")
            .select("id, asset_code, model, asset_type, category, status, service_tag, collaborator")
            .eq("status", "Disponível")
            .ilike("asset_type", "%notebook%")
            .then(({ data }) => setStockNotebooks((data as InventoryAsset[]) || []))
        );
      } else {
        setStockNotebooks([]);
      }

      if (contratacao.celular) {
        promises.push(
          supabase
            .from("inventory")
            .select("id, asset_code, model, asset_type, category, status, service_tag, collaborator")
            .eq("status", "Disponível")
            .ilike("asset_type", "%celular%")
            .then(({ data }) => setStockCelulares((data as InventoryAsset[]) || []))
        );
      } else {
        setStockCelulares([]);
      }

      await Promise.all(promises);
      setCheckingStock(false);
    };

    checkStock();
  }, [isContratacao, contratacao.notebook, contratacao.celular]);

  const toggleAssetSelection = (assetId: string) => {
    setSelectedAssetIds((prev) => {
      const next = new Set(prev);
      if (next.has(assetId)) {
        next.delete(assetId);
      } else {
        next.add(assetId);
      }
      return next;
    });
  };

  const buildDescription = () => {
    if (isDesligamento) {
      const checkboxItems = [
        desligamento.celular && "Celular",
        desligamento.chip && "Chip",
        desligamento.notebook && "Notebook",
        desligamento.modem && "Modem",
        desligamento.email && "E-mail",
      ].filter(Boolean);

      const selectedAssets = foundAssets.filter((a) => selectedAssetIds.has(a.id));
      const assetLines = selectedAssets.map(
        (a) => `  - ${a.asset_code} | ${a.model || "Sem modelo"} (${a.asset_type || a.category}) [${a.status}]`
      );

      return [
        `Colaborador: ${desligamento.colaborador}`,
        `Gestor: ${desligamento.gestor}`,
        `Contrato: ${desligamento.contrato}`,
        `Itens para devolução: ${checkboxItems.length > 0 ? checkboxItems.join(", ") : "Nenhum"}`,
        `Data do Desligamento: ${desligamento.dataDesligamento}`,
        selectedAssets.length > 0
          ? `\nAtivos vinculados para devolução (${selectedAssets.length}):\n${assetLines.join("\n")}`
          : "",
        selectedAssets.length > 0
          ? `\n[ASSET_IDS_DEVOLUCAO:${selectedAssets.map((a) => a.id).join(",")}]`
          : "",
        description && `\nObservações: ${description}`,
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
    setFoundAssets([]);
    setSelectedAssetIds(new Set());
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Em uso": return "bg-info/10 text-info border-info/20";
      case "Disponível": return "bg-success/10 text-success border-success/20";
      case "Reservado": return "bg-warning/10 text-warning border-warning/20";
      case "Manutenção": return "bg-destructive/10 text-destructive border-destructive/20";
      default: return "bg-muted text-muted-foreground";
    }
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
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={desligamento.colaborador}
                      onChange={(e) => setDesligamento({ ...desligamento, colaborador: e.target.value })}
                      placeholder="Buscar colaborador..."
                      className="pl-9"
                    />
                  </div>
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

              {/* Found assets from inventory */}
              {desligamento.colaborador.trim().length >= 2 && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5 text-sm">
                    <Package className="h-4 w-4" />
                    Ativos Identificados
                    {foundAssets.length > 0 && (
                      <Badge variant="secondary" className="ml-1 text-xs">
                        {foundAssets.length}
                      </Badge>
                    )}
                  </Label>

                  {searchingAssets ? (
                    <div className="flex items-center gap-2 rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Buscando ativos...
                    </div>
                  ) : foundAssets.length === 0 ? (
                    <div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
                      Nenhum ativo encontrado para "{desligamento.colaborador}"
                    </div>
                  ) : (
                    <div className="space-y-2 rounded-md border p-3">
                      {foundAssets.map((asset) => (
                        <label
                          key={asset.id}
                          className="flex items-start gap-3 rounded-md border p-3 transition-colors hover:bg-muted/50 cursor-pointer"
                        >
                          <Checkbox
                            checked={selectedAssetIds.has(asset.id)}
                            onCheckedChange={() => toggleAssetSelection(asset.id)}
                            className="mt-0.5"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs text-muted-foreground">{asset.asset_code}</span>
                              <Badge variant="outline" className={`text-xs ${getStatusColor(asset.status)}`}>
                                {asset.status}
                              </Badge>
                            </div>
                            <p className="text-sm font-medium truncate">
                              {asset.model || "Sem modelo"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {asset.asset_type || asset.category}
                              {asset.service_tag && ` • ST: ${asset.service_tag}`}
                            </p>
                          </div>
                        </label>
                      ))}
                      <p className="text-xs text-muted-foreground pt-1">
                        {selectedAssetIds.size} de {foundAssets.length} selecionado(s) para devolução
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-sm">Itens adicionais para devolução</Label>
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
