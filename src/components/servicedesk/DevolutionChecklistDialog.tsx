import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trash2, Loader2, Package, FileText } from "lucide-react";
import type { CollaboratorAsset } from "@/hooks/use-collaborators";
import { PrintableTermDialog } from "@/components/collaborators/PrintableTermDialog";

type Decision = "delete" | "stock";

const catLabel: Record<string, string> = {
  notebooks: "Notebook", celulares: "Celular", linhas: "Linha", licencas: "Licença",
  hardware: "Notebook", telecom: "Linha", licenses: "Licença",
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collaboratorName: string;
  onDone?: () => void;
}

export function DevolutionChecklistDialog({ open, onOpenChange, collaboratorName, onDone }: Props) {
  const [assets, setAssets] = useState<CollaboratorAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [bulkDecision, setBulkDecision] = useState<Decision | "">("");
  const [showTerm, setShowTerm] = useState(false);
  const [processedAssets, setProcessedAssets] = useState<CollaboratorAsset[]>([]);

  useEffect(() => {
    if (!open || !collaboratorName) return;
    setLoading(true);
    setBulkDecision("");
    setShowTerm(false);
    setProcessedAssets([]);
    supabase
      .from("inventory")
      .select("*")
      .eq("collaborator", collaboratorName)
      .then(({ data }) => {
        const items = (data || []) as unknown as CollaboratorAsset[];
        setAssets(items);
        const d: Record<string, Decision> = {};
        items.forEach((a) => (d[a.id] = "stock"));
        setDecisions(d);
        setLoading(false);
      });
  }, [open, collaboratorName]);

  const applyBulk = (val: Decision) => {
    setBulkDecision(val);
    setDecisions((prev) => {
      const next = { ...prev };
      assets.forEach((a) => (next[a.id] = val));
      return next;
    });
  };

  const handleConfirmAndPrint = async () => {
    setSaving(true);
    try {
      // Save the full list for the PDF before processing
      setProcessedAssets([...assets]);

      for (const asset of assets) {
        const decision = decisions[asset.id] || "stock";
        if (decision === "delete") {
          await supabase.from("inventory").delete().eq("id", asset.id);
        } else {
          const isLinhaLicenca = ["linhas", "licencas", "telecom", "licenses"].includes(asset.category);
          const isNotebookCelular = ["notebooks", "celulares", "hardware"].includes(asset.category);
          const updates: any = {
            collaborator: "",
            status: asset.category === "licencas" || asset.category === "licenses" ? "Inativo" : "Disponível",
            updated_at: new Date().toISOString(),
          };
          if (isNotebookCelular) {
            updates.cost_center = "9018";
          }
          if (isLinhaLicenca) {
            updates.cost_center_eng = "9018";
            updates.cost_center_man = "9065";
          }
          await supabase.from("inventory").update(updates).eq("id", asset.id);
        }
      }

      toast.success("Ativos processados com sucesso");
      setShowTerm(true);
      onDone?.();
    } catch {
      toast.error("Erro ao processar ativos");
    }
    setSaving(false);
  };

  const label = (a: CollaboratorAsset) =>
    a.asset_code + " — " + (a.model || a.licenca || a.numero || a.service_tag || "Sem descrição");

  const stockCount = assets.filter((a) => decisions[a.id] === "stock").length;
  const deleteCount = assets.filter((a) => decisions[a.id] === "delete").length;

  return (
    <>
      <Dialog open={open && !showTerm} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col p-4 sm:p-6 gap-3">
          <DialogHeader className="shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Termo de Devolução — {collaboratorName}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              Escolha o destino de cada ativo antes de gerar o termo de devolução.
            </p>
          </DialogHeader>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : assets.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">Nenhum ativo vinculado a este colaborador.</p>
          ) : (
            <>
              {/* Bulk actions */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-medium text-muted-foreground">Ação em massa:</span>
                <Button
                  size="sm" variant={bulkDecision === "stock" ? "default" : "outline"}
                  className="h-7 text-xs gap-1" onClick={() => applyBulk("stock")}
                >
                  <Package className="h-3 w-3" /> Todos ao estoque
                </Button>
                <Button
                  size="sm" variant={bulkDecision === "delete" ? "destructive" : "outline"}
                  className="h-7 text-xs gap-1" onClick={() => applyBulk("delete")}
                >
                  <Trash2 className="h-3 w-3" /> Excluir todos
                </Button>
              </div>

              {/* Asset list */}
              <div className="flex-1 min-h-0 max-h-[400px] overflow-y-auto border rounded-lg divide-y scrollbar-thin scrollbar-thumb-border">
                {assets.map((a) => (
                  <div key={a.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{label(a)}</p>
                      <Badge variant="outline" className="text-[10px] mt-0.5">
                        {catLabel[a.category] || a.category}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        size="sm"
                        variant={decisions[a.id] === "stock" ? "default" : "outline"}
                        className="h-7 text-xs"
                        onClick={() => setDecisions((p) => ({ ...p, [a.id]: "stock" }))}
                      >
                        Estoque
                      </Button>
                      <Button
                        size="sm"
                        variant={decisions[a.id] === "delete" ? "destructive" : "outline"}
                        className="h-7 text-xs"
                        onClick={() => setDecisions((p) => ({ ...p, [a.id]: "delete" }))}
                      >
                        Excluir
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary */}
              <div className="text-xs text-muted-foreground flex gap-4 shrink-0">
                <span>📦 Estoque: {stockCount}</span>
                <span>🗑️ Excluir: {deleteCount}</span>
                <span>Total: {assets.length} itens</span>
              </div>
            </>
          )}

          <DialogFooter className="shrink-0">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmAndPrint}
              disabled={saving || assets.length === 0}
              className="gap-1.5"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
              {saving ? "Processando..." : "Confirmar e Gerar Termo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PrintableTermDialog opens after processing */}
      <PrintableTermDialog
        open={showTerm}
        onOpenChange={(v) => {
          setShowTerm(v);
          if (!v) onOpenChange(false);
        }}
        collaboratorName={collaboratorName}
        assets={processedAssets}
        type="devolucao"
      />
    </>
  );
}
