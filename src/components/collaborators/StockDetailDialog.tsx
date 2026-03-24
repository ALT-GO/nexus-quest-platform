import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Eye } from "lucide-react";
import { CollaboratorAsset } from "@/hooks/use-collaborators";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { getConditionLabel } from "./StockTab";
import { cn } from "@/lib/utils";

interface Props {
  asset: CollaboratorAsset;
  onUpdated: () => void;
}

interface DetailRow {
  label: string;
  value: string | null | undefined;
}

function getDetails(a: CollaboratorAsset): DetailRow[] {
  const base: DetailRow[] = [
    { label: "Código", value: a.asset_code },
    { label: "Categoria", value: a.category },
    { label: "Status", value: a.status },
    { label: "Colaborador", value: a.collaborator },
  ];

  if (a.category === "notebooks" || a.category === "hardware") {
    base.push(
      { label: "Marca", value: a.marca },
      { label: "Modelo", value: a.model },
      { label: "Service Tag", value: a.service_tag },
      { label: "Service Tag 2", value: a.service_tag_2 },
      { label: "Tipo", value: a.asset_type },
      { label: "Centro de Custo", value: a.cost_center },
      { label: "Contrato", value: a.contrato },
    );
  } else if (a.category === "celulares") {
    base.push(
      { label: "Marca", value: a.marca },
      { label: "Modelo", value: a.model },
      { label: "Service Tag", value: a.service_tag },
      { label: "IMEI 1", value: a.imei1 },
      { label: "IMEI 2", value: a.imei2 },
      { label: "Centro de Custo", value: a.cost_center },
      { label: "Contrato", value: a.contrato },
    );
  } else if (a.category === "linhas" || a.category === "telecom") {
    base.push(
      { label: "Número", value: a.numero },
      { label: "Operadora", value: a.operadora },
      { label: "Gestor", value: a.gestor },
      { label: "CC Eng", value: a.cost_center_eng },
      { label: "CC Man", value: a.cost_center_man },
      { label: "Contrato", value: a.contrato },
    );
  } else if (a.category === "licencas" || a.category === "licenses") {
    base.push(
      { label: "E-mail", value: a.email_address },
      { label: "Licença", value: a.licenca },
      { label: "Gestor", value: a.gestor },
      { label: "CC Eng", value: a.cost_center_eng },
      { label: "CC Man", value: a.cost_center_man },
      { label: "Contrato", value: a.contrato },
      { label: "Data de Bloqueio", value: (a as any).data_bloqueio ? format(new Date((a as any).data_bloqueio), "dd/MM/yyyy") : "" },
    );
  }

  base.push({ label: "Criado em", value: a.created_at ? format(new Date(a.created_at), "dd/MM/yyyy HH:mm") : "" });

  return base;
}

export function StockDetailDialog({ asset, onUpdated }: Props) {
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState(asset.notes || (asset as any).comments || "");
  const [saving, setSaving] = useState(false);

  const handleSaveComments = async () => {
    setSaving(true);
    await supabase.from("inventory").update({
      notes: comments,
      comments,
      updated_at: new Date().toISOString(),
    } as any).eq("id", asset.id);
    toast.success("Comentários salvos");
    setSaving(false);
    onUpdated();
  };

  const details = getDetails(asset);
  const condition = getConditionLabel(asset.condition || "ready");

  return (
    <>
      <Button
        variant="ghost" size="sm"
        className="h-7 w-7 p-0"
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        title="Ver detalhes"
      >
        <Eye className="h-3.5 w-3.5 text-muted-foreground" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {asset.asset_code}
              <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", condition.color)}>
                {condition.label}
              </span>
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            {details.map((d) => (
              <div key={d.label}>
                <p className="text-[11px] text-muted-foreground font-medium">{d.label}</p>
                <p className="text-sm">{d.value || "—"}</p>
              </div>
            ))}
          </div>

          <div className="space-y-2 pt-2 border-t">
            <p className="text-sm font-medium">Comentários</p>
            <Textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Adicione comentários sobre este item..."
              rows={3}
            />
            <div className="flex justify-end">
              <Button size="sm" onClick={handleSaveComments} disabled={saving}>
                {saving ? "Salvando..." : "Salvar comentários"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
