import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus } from "lucide-react";

interface FieldDef {
  id: string;
  label: string;
  type: "text" | "select" | "date";
  options?: string[];
}

const fieldsByCategory: Record<string, FieldDef[]> = {
  notebooks: [
    { id: "service_tag", label: "Service tag", type: "text" },
    { id: "collaborator", label: "Colaborador", type: "text" },
    { id: "cargo", label: "Cargo", type: "text" },
    { id: "marca", label: "Marca", type: "text" },
    { id: "model", label: "Modelo", type: "text" },
    { id: "cost_center", label: "Centro de custo", type: "text" },
    { id: "contrato", label: "Contrato", type: "text" },
    { id: "asset_type", label: "Tipo", type: "select", options: ["Administrativo", "Campo"] },
    { id: "notes", label: "Notas", type: "text" },
    { id: "service_tag_2", label: "Service tag 2", type: "text" },
  ],
  celulares: [
    { id: "service_tag", label: "Service tag", type: "text" },
    { id: "collaborator", label: "Colaborador", type: "text" },
    { id: "cargo", label: "Cargo", type: "text" },
    { id: "marca", label: "Marca", type: "text" },
    { id: "model", label: "Modelo", type: "text" },
    { id: "cost_center", label: "Centro de custo", type: "text" },
    { id: "contrato", label: "Contrato", type: "text" },
    { id: "asset_type", label: "Tipo", type: "text" },
    { id: "notes", label: "Notas", type: "text" },
    { id: "imei1", label: "Imei 1", type: "text" },
    { id: "imei2", label: "Imei 2", type: "text" },
  ],
  linhas: [
    { id: "numero", label: "Número", type: "text" },
    { id: "collaborator", label: "Colaborador", type: "text" },
    { id: "cargo", label: "Cargo", type: "text" },
    { id: "asset_type", label: "Tipo", type: "text" },
    { id: "gestor", label: "Gestor", type: "text" },
    { id: "operadora", label: "Operadora", type: "text" },
    { id: "contrato", label: "Contrato", type: "text" },
    { id: "cost_center_eng", label: "Centro de custo - Eng", type: "text" },
    { id: "cost_center_man", label: "Centro de custo - Man", type: "text" },
  ],
  licencas: [
    { id: "status", label: "Status", type: "select", options: ["Ativo", "Desligado"] },
    { id: "collaborator", label: "Colaborador", type: "text" },
    { id: "cargo", label: "Cargo", type: "text" },
    { id: "email_address", label: "E-mail", type: "text" },
    { id: "licenca", label: "Licença", type: "text" },
    { id: "gestor", label: "Gestor", type: "text" },
    { id: "contrato", label: "Contrato", type: "text" },
    { id: "cost_center_eng", label: "Centro de custo - Eng", type: "text" },
    { id: "cost_center_man", label: "Centro de custo - Man", type: "text" },
  ],
};

const categoryLabels: Record<string, string> = {
  notebooks: "Notebook",
  celulares: "Celular",
  linhas: "Linha",
  licencas: "Licença",
};

interface Props {
  category: string;
  onCreated: () => void;
}

export function AddStockItemDialog({ category, onCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});

  const fields = fieldsByCategory[category] || [];
  const label = categoryLabels[category] || "Item";

  const update = (id: string, val: string) => {
    setValues((prev) => ({ ...prev, [id]: val }));
  };

  const handleSave = async () => {
    setSaving(true);
    const collaborator = (values.collaborator || "").trim();
    const hasCollaborator = collaborator.length > 0;

    let status: string;
    if (category === "licencas") {
      status = values.status || (hasCollaborator ? "Ativo" : "Disponível");
    } else {
      status = hasCollaborator ? "Em uso" : "Disponível";
    }

    const payload: Record<string, any> = {
      category,
      asset_code: "TEMP",
      status,
      collaborator,
    };

    for (const f of fields) {
      if (f.id === "collaborator" || f.id === "status") continue;
      if (values[f.id]) payload[f.id] = values[f.id];
    }

    const { error } = await supabase.from("inventory").insert(payload as any);
    if (error) {
      toast.error("Erro ao cadastrar item");
    } else {
      toast.success(`${label} cadastrado com sucesso`);
      setValues({});
      setOpen(false);
      onCreated();
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setValues({}); }}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          Adicionar {label}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo {label}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 pt-2 sm:grid-cols-2">
          {fields.map((f) =>
            f.type === "select" ? (
              <div key={f.id} className="space-y-1.5">
                <label className="text-sm font-medium">{f.label}</label>
                <Select value={values[f.id] || ""} onValueChange={(v) => update(f.id, v)}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder={`Selecione ${f.label.toLowerCase()}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {f.options?.map((opt) => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div key={f.id} className="space-y-1.5">
                <label className="text-sm font-medium">{f.label}</label>
                <Input
                  value={values[f.id] || ""}
                  onChange={(e) => update(f.id, e.target.value)}
                  placeholder={f.label}
                  className="h-9 text-sm"
                />
              </div>
            )
          )}
        </div>
        <div className="flex justify-end gap-2 pt-3">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : "Cadastrar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
