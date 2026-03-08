import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface InlineCellEditorProps {
  value: string;
  onSave: (value: string) => void;
  type?: "text" | "select" | "number" | "date";
  options?: string[];
  displayRender?: (value: string) => React.ReactNode;
}

export function InlineCellEditor({ value, onSave, type = "text", options, displayRender }: InlineCellEditorProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus();
  }, [editing]);

  const handleSave = () => {
    if (draft !== value) onSave(draft);
    setEditing(false);
  };

  if (!editing) {
    return (
      <span
        className="cursor-pointer rounded px-1 py-0.5 text-sm transition-colors hover:bg-muted min-w-[2rem] inline-block"
        onDoubleClick={() => { setDraft(value); setEditing(true); }}
        title="Clique duplo para editar"
      >
        {displayRender ? displayRender(value) : (value || <span className="text-muted-foreground italic">—</span>)}
      </span>
    );
  }

  if (type === "select" && options) {
    return (
      <Select value={draft} onValueChange={v => { setDraft(v); onSave(v); setEditing(false); }}>
        <SelectTrigger className="h-7 text-xs w-full"><SelectValue /></SelectTrigger>
        <SelectContent>
          {options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
        </SelectContent>
      </Select>
    );
  }

  return (
    <Input
      ref={inputRef}
      type={type === "number" ? "number" : type === "date" ? "date" : "text"}
      value={draft}
      onChange={e => setDraft(e.target.value)}
      className="h-7 text-xs"
      onBlur={handleSave}
      onKeyDown={e => {
        if (e.key === "Enter") handleSave();
        if (e.key === "Escape") { setDraft(value); setEditing(false); }
      }}
    />
  );
}
