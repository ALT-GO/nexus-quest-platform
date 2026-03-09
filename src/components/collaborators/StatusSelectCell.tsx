import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Check, Loader2 } from "lucide-react";

const statusStyles: Record<string, string> = {
  Ativo: "bg-success/15 text-success",
  Inativo: "bg-muted text-muted-foreground",
};

function StatusBadgeInline({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        statusStyles[status] || "bg-secondary text-secondary-foreground"
      )}
    >
      {status || "—"}
    </span>
  );
}

interface StatusSelectCellProps {
  value: string;
  onSave: (value: string) => Promise<void>;
}

export function StatusSelectCell({ value, onSave }: StatusSelectCellProps) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleChange = async (newValue: string) => {
    if (newValue === value) return;
    setSaving(true);
    setSaved(false);
    try {
      await onSave(newValue);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      <Select value={value || "Ativo"} onValueChange={handleChange}>
        <SelectTrigger className="h-7 w-auto min-w-[100px] border-none bg-transparent p-0 shadow-none hover:bg-muted/50 focus:ring-0 [&>svg]:ml-1">
          <SelectValue>
            <StatusBadgeInline status={value} />
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="Ativo">
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-success" />
              Ativo
            </span>
          </SelectItem>
          <SelectItem value="Inativo">
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-muted-foreground" />
              Inativo
            </span>
          </SelectItem>
        </SelectContent>
      </Select>
      {saving && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
      {saved && <Check className="h-3 w-3 text-success" />}
    </div>
  );
}
