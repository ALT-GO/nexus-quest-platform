import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface InlineStockCellProps {
  value: string;
  onSave: (value: string) => Promise<void>;
}

export function InlineStockCell({ value, onSave }: InlineStockCellProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [flash, setFlash] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setDraft(value); }, [value]);
  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus();
  }, [editing]);

  const commit = async () => {
    setEditing(false);
    if (draft.trim() === value) return;
    await onSave(draft.trim());
    setFlash(true);
    setTimeout(() => setFlash(false), 800);
  };

  if (!editing) {
    return (
      <span
        className={cn(
          "cursor-pointer rounded px-1 py-0.5 text-sm transition-all min-w-[1.5rem] inline-block",
          "hover:bg-muted",
          flash && "ring-2 ring-emerald-400/60 bg-emerald-50 dark:bg-emerald-950/30"
        )}
        onDoubleClick={() => { setDraft(value); setEditing(true); }}
        title="Clique duplo para editar"
      >
        {value || <span className="text-muted-foreground italic">—</span>}
      </span>
    );
  }

  return (
    <Input
      ref={inputRef}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      className="h-7 text-xs min-w-[80px]"
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") { setDraft(value); setEditing(false); }
      }}
    />
  );
}
