import { useState } from "react";
import { CustomField } from "@/hooks/use-custom-fields";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface InlineFieldEditorProps {
  field: CustomField;
  value: string;
  onSave: (value: string) => void;
}

export function InlineFieldEditor({ field, value, onSave }: InlineFieldEditorProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const handleSave = () => {
    onSave(draft);
    setEditing(false);
  };

  const handleCancel = () => {
    setDraft(value);
    setEditing(false);
  };

  if (!editing) {
    return (
      <span
        className="cursor-pointer rounded px-1 py-0.5 text-sm transition-colors hover:bg-muted"
        onClick={() => {
          setDraft(value);
          setEditing(true);
        }}
        title="Clique para editar"
      >
        {value ? formatDisplay(field, value) : <span className="text-muted-foreground italic">—</span>}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-1">
      {field.tipo === "seleção" && field.opcoes ? (
        <Select value={draft} onValueChange={(v) => setDraft(v)}>
          <SelectTrigger className="h-7 w-full text-xs">
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent>
            {field.opcoes.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <Input
          type={field.tipo === "número" ? "number" : field.tipo === "data" ? "date" : "text"}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="h-7 text-xs"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") handleCancel();
          }}
        />
      )}
      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={handleSave}>
        <Check className="h-3 w-3 text-success" />
      </Button>
      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={handleCancel}>
        <X className="h-3 w-3 text-destructive" />
      </Button>
    </div>
  );
}

function formatDisplay(field: CustomField, value: string): string {
  if (field.tipo === "data" && value) {
    try {
      return new Date(value).toLocaleDateString("pt-BR");
    } catch {
      return value;
    }
  }
  if (field.tipo === "número" && value) {
    const num = parseFloat(value);
    if (!isNaN(num)) return num.toLocaleString("pt-BR");
  }
  return value;
}
