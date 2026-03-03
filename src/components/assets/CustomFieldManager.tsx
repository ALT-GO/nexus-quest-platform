import { useState } from "react";
import { CustomField, FieldType, AssetCategory } from "@/hooks/use-custom-fields";
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
import { toast } from "sonner";

interface CustomFieldManagerProps {
  category: AssetCategory;
  categoryLabel: string;
  fields: CustomField[];
  onAdd: (nome: string, tipo: FieldType, categoria: AssetCategory, opcoes?: string[]) => void;
  onUpdate: (id: string, updates: Partial<Pick<CustomField, "nome" | "tipo" | "opcoes">>) => void;
  onDelete: (id: string) => void;
}

export function CustomFieldManager({
  category,
  categoryLabel,
  fields,
  onAdd,
  onUpdate,
  onDelete,
}: CustomFieldManagerProps) {
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<FieldType>("texto");
  const [newOptions, setNewOptions] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const handleAdd = () => {
    if (!newName.trim()) return;
    const opcoes = newType === "seleção" ? newOptions.split(",").map((o) => o.trim()).filter(Boolean) : undefined;
    onAdd(newName.trim(), newType, category, opcoes);
    setNewName("");
    setNewType("texto");
    setNewOptions("");
    toast.success(`Campo "${newName}" criado`);
  };

  const handleSaveEdit = (id: string) => {
    if (!editName.trim()) return;
    onUpdate(id, { nome: editName.trim() });
    setEditingId(null);
    toast.success("Campo atualizado");
  };

  const categoryFields = fields.filter((f) => f.categoria === category);

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
          {/* Existing fields */}
          {categoryFields.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Campos Existentes</Label>
              <div className="space-y-2">
                {categoryFields.map((field) => (
                  <div key={field.id} className="flex items-center gap-2 rounded-lg border p-3">
                    {editingId === field.id ? (
                      <>
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="h-8 flex-1"
                          onKeyDown={(e) => e.key === "Enter" && handleSaveEdit(field.id)}
                        />
                        <Button size="sm" variant="ghost" onClick={() => handleSaveEdit(field.id)}>
                          Salvar
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 text-sm font-medium">{field.nome}</span>
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
                          {field.tipo}
                        </span>
                        {field.opcoes && (
                          <span className="text-xs text-muted-foreground">
                            ({field.opcoes.join(", ")})
                          </span>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingId(field.id);
                            setEditName(field.nome);
                          }}
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            onDelete(field.id);
                            toast.success(`Campo "${field.nome}" excluído`);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add new field */}
          <div className="space-y-3 rounded-lg border border-dashed p-4">
            <Label className="text-sm font-medium">Adicionar Novo Campo</Label>
            <div className="grid gap-3">
              <div className="flex gap-2">
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Nome do campo"
                  className="flex-1"
                  onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                />
                <Select value={newType} onValueChange={(v: FieldType) => setNewType(v)}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="texto">Texto</SelectItem>
                    <SelectItem value="número">Número</SelectItem>
                    <SelectItem value="data">Data</SelectItem>
                    <SelectItem value="seleção">Seleção</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={handleAdd} disabled={!newName.trim()}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {newType === "seleção" && (
                <Input
                  value={newOptions}
                  onChange={(e) => setNewOptions(e.target.value)}
                  placeholder="Opções separadas por vírgula (Ex: Novo, Bom, Regular)"
                  className="text-sm"
                />
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
