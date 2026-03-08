import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import type { CustomFieldDef } from "@/hooks/use-inventory";

interface NewAssetDialogProps {
  category: string;
  fields: CustomFieldDef[];
  onSave: (data: Record<string, string>, fieldValues: Record<string, string>) => Promise<void>;
}

const statusOptions = ["Disponível", "Em uso", "Manutenção", "Reservado", "Baixado"];

const typeOptions: Record<string, string[]> = {
  hardware: ["Notebook", "Tablet", "Monitor", "Teclado", "Mouse", "Celular", "Outros"],
  telecom: ["Corporativo", "Pessoal"],
  licenses: ["Microsoft 365 E1", "Microsoft 365 E3", "Microsoft 365 E5", "Outros"],
  passwords: [],
};

export function NewAssetDialog({ category, fields, onSave }: NewAssetDialogProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [customValues, setCustomValues] = useState<Record<string, string>>({});

  const set = (key: string, val: string) => setForm(p => ({ ...p, [key]: val }));

  const handleSave = async () => {
    if (!form.model?.trim()) return;
    setSaving(true);
    await onSave(form, customValues);
    setSaving(false);
    setForm({});
    setCustomValues({});
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Novo Ativo
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Ativo — {category.charAt(0).toUpperCase() + category.slice(1)}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label>Modelo / Nome *</Label>
            <Input value={form.model || ""} onChange={e => set("model", e.target.value)} placeholder="Ex: Dell Latitude 5520" />
          </div>
          {typeOptions[category]?.length > 0 && (
            <div className="grid gap-2">
              <Label>Tipo</Label>
              <Select value={form.asset_type || ""} onValueChange={v => set("asset_type", v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {typeOptions[category].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Status</Label>
              <Select value={form.status || "Disponível"} onValueChange={v => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {statusOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Service Tag</Label>
              <Input value={form.service_tag || ""} onChange={e => set("service_tag", e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Colaborador</Label>
              <Input value={form.collaborator || ""} onChange={e => set("collaborator", e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Centro de Custo</Label>
              <Input value={form.cost_center || ""} onChange={e => set("cost_center", e.target.value)} />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Setor</Label>
            <Input value={form.sector || ""} onChange={e => set("sector", e.target.value)} />
          </div>

          {/* Dynamic custom fields */}
          {fields.length > 0 && (
            <div className="space-y-3 border-t pt-4">
              <Label className="text-sm font-semibold text-muted-foreground">Campos Personalizados</Label>
              {fields.map(field => (
                <div key={field.id} className="grid gap-1">
                  <Label className="text-sm">{field.name}</Label>
                  {field.field_type === "seleção" && field.options ? (
                    <Select value={customValues[field.id] || ""} onValueChange={v => setCustomValues(p => ({ ...p, [field.id]: v }))}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {field.options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      type={field.field_type === "número" ? "number" : field.field_type === "data" ? "date" : "text"}
                      value={customValues[field.id] || ""}
                      onChange={e => setCustomValues(p => ({ ...p, [field.id]: e.target.value }))}
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="grid gap-2">
            <Label>Observações</Label>
            <Textarea value={form.notes || ""} onChange={e => set("notes", e.target.value)} rows={2} />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || !form.model?.trim()}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
