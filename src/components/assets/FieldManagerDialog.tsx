import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Settings, Plus, Edit, Trash2, X } from "lucide-react";
import type { CustomFieldDef } from "@/hooks/use-inventory";

interface FieldManagerDialogProps {
  categoryLabel: string;
  fields: CustomFieldDef[];
  onAdd: (name: string, fieldType: string, options?: string[]) => Promise<void>;
  onUpdate: (id: string, updates: { name?: string; options?: string[] }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

type FieldType = "texto" | "número" | "data" | "seleção";

export function FieldManagerDialog({ categoryLabel, fields, onAdd, onUpdate, onDelete }: FieldManagerDialogProps) {
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<FieldType>("texto");
  const [newOptions, setNewOptions] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const handleAdd = async () => {
    if (!newName.trim()) return;
    const opts = newType === "seleção" ? newOptions.split(",").map(o => o.trim()).filter(Boolean) : undefined;
    await onAdd(newName.trim(), newType, opts);
    setNewName("");
    setNewType("texto");
    setNewOptions("");
  };

  const handleSaveEdit = async (id: string) => {
    if (!editName.trim()) return;
    await onUpdate(id, { name: editName.trim() });
    setEditingId(null);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="mr-2 h-4 w-4" />
          Campos
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Campos Personalizados — {categoryLabel}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {fields.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Campos Existentes</Label>
              {fields.map(field => (
                <div key={field.id} className="flex items-center gap-2 rounded-lg border p-3">
                  {editingId === field.id ? (
                    <>
                      <Input value={editName} onChange={e => setEditName(e.target.value)} className="h-8 flex-1"
                        onKeyDown={e => e.key === "Enter" && handleSaveEdit(field.id)} />
                      <Button size="sm" variant="ghost" onClick={() => handleSaveEdit(field.id)}>Salvar</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}><X className="h-4 w-4" /></Button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-sm font-medium">{field.name}</span>
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">{field.field_type}</span>
                      {field.options && <span className="text-xs text-muted-foreground">({field.options.join(", ")})</span>}
                      <Button size="sm" variant="ghost" onClick={() => { setEditingId(field.id); setEditName(field.name); }}>
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => onDelete(field.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
          <div className="space-y-3 rounded-lg border border-dashed p-4">
            <Label className="text-sm font-medium">Adicionar Novo Campo</Label>
            <div className="grid gap-3">
              <div className="flex gap-2">
                <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nome do campo" className="flex-1"
                  onKeyDown={e => e.key === "Enter" && handleAdd()} />
                <Select value={newType} onValueChange={(v: FieldType) => setNewType(v)}>
                  <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="texto">Texto</SelectItem>
                    <SelectItem value="número">Número</SelectItem>
                    <SelectItem value="data">Data</SelectItem>
                    <SelectItem value="seleção">Seleção</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={handleAdd} disabled={!newName.trim()}><Plus className="h-4 w-4" /></Button>
              </div>
              {newType === "seleção" && (
                <Input value={newOptions} onChange={e => setNewOptions(e.target.value)}
                  placeholder="Opções separadas por vírgula (Ex: Novo, Bom, Regular)" className="text-sm" />
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
