import { useState, useEffect, useCallback, useRef } from "react";
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
import { Plus, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface FieldDef {
  id: string;
  label: string;
  type: "text" | "select" | "date" | "autocomplete";
  options?: string[];
  dbColumn?: string; // column to fetch suggestions from
}

const fieldsByCategory: Record<string, FieldDef[]> = {
  notebooks: [
    { id: "service_tag", label: "Service tag", type: "text" },
    { id: "marca", label: "Marca", type: "autocomplete", dbColumn: "marca" },
    { id: "model", label: "Modelo", type: "autocomplete", dbColumn: "model" },
    { id: "cost_center", label: "Centro de custo", type: "text" },
    { id: "contrato", label: "Contrato", type: "autocomplete", dbColumn: "contrato" },
    { id: "asset_type", label: "Tipo", type: "select", options: ["Administrativo", "Campo"] },
    { id: "notes", label: "Notas", type: "text" },
    { id: "service_tag_2", label: "Service tag 2", type: "text" },
  ],
  celulares: [
    { id: "service_tag", label: "Service tag", type: "text" },
    { id: "marca", label: "Marca", type: "autocomplete", dbColumn: "marca" },
    { id: "model", label: "Modelo", type: "autocomplete", dbColumn: "model" },
    { id: "cost_center", label: "Centro de custo", type: "text" },
    { id: "contrato", label: "Contrato", type: "autocomplete", dbColumn: "contrato" },
    { id: "asset_type", label: "Tipo", type: "select", options: ["Administrativo", "Campo"] },
    { id: "notes", label: "Notas", type: "text" },
    { id: "imei1", label: "Imei 1", type: "text" },
    { id: "imei2", label: "Imei 2", type: "text" },
  ],
  linhas: [
    { id: "numero", label: "Número", type: "text" },
    { id: "asset_type", label: "Tipo", type: "select", options: ["Administrativo", "Campo"] },
    { id: "gestor", label: "Gestor", type: "autocomplete", dbColumn: "gestor" },
    { id: "operadora", label: "Operadora", type: "autocomplete", dbColumn: "operadora" },
    { id: "contrato", label: "Contrato", type: "autocomplete", dbColumn: "contrato" },
    { id: "cost_center_eng", label: "Centro de custo - Eng", type: "text" },
    { id: "cost_center_man", label: "Centro de custo - Man", type: "text" },
  ],
  licencas: [
    { id: "status", label: "Status", type: "select", options: ["Ativo", "Desligado"] },
    { id: "collaborator", label: "Colaborador", type: "text" },
    { id: "cargo", label: "Cargo", type: "text" },
    { id: "email_address", label: "E-mail", type: "text" },
    { id: "created_at", label: "Data criação", type: "date" },
    { id: "licenca", label: "Licença", type: "text" },
    { id: "gestor", label: "Gestor", type: "autocomplete", dbColumn: "gestor" },
    { id: "contrato", label: "Contrato", type: "autocomplete", dbColumn: "contrato" },
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

/* ── Generic autocomplete for any inventory column ─────────── */
function FieldAutocomplete({
  value,
  onChange,
  dbColumn,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  dbColumn: string;
  placeholder: string;
}) {
  const [allValues, setAllValues] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showList, setShowList] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (supabase
      .from("inventory")
      .select(dbColumn) as any)
      .neq(dbColumn, "")
      .not(dbColumn, "is", null)
      .then(({ data }: { data: any[] | null }) => {
        if (data) {
          const unique = [...new Set(
            data
              .map((r: any) => (r[dbColumn] as string).trim())
              .filter((v: string) => v && v !== "-" && v !== "—")
          )].sort();
          setAllValues(unique);
        }
      });
  }, [dbColumn]);

  useEffect(() => {
    if (!value.trim()) { setSuggestions([]); return; }
    const q = value.toLowerCase();
    setSuggestions(allValues.filter((v) => v.toLowerCase().includes(q)).slice(0, 8));
  }, [value, allValues]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setShowList(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={wrapperRef} className="relative">
      <Input
        value={value}
        onChange={(e) => { onChange(e.target.value); setShowList(true); }}
        onFocus={() => setShowList(true)}
        placeholder={placeholder}
        className="h-9 text-sm"
      />
      {showList && suggestions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md max-h-[160px] overflow-y-auto">
          {suggestions.map((name) => (
            <button
              key={name}
              type="button"
              className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent truncate"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { onChange(name); setShowList(false); }}
            >
              {name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Collaborator autocomplete (from existing collaborators) ── */
function CollaboratorAutocomplete({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [allNames, setAllNames] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showList, setShowList] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase
      .from("inventory")
      .select("collaborator")
      .neq("collaborator", "")
      .not("collaborator", "is", null)
      .then(({ data }) => {
        if (data) {
          const unique = [...new Set(
            data
              .map((r: any) => (r.collaborator as string).trim())
              .filter((n) => n && n !== "-" && n !== "—")
          )].sort();
          setAllNames(unique);
        }
      });
  }, []);

  useEffect(() => {
    if (!value.trim()) { setSuggestions([]); return; }
    const q = value.toLowerCase();
    setSuggestions(allNames.filter((n) => n.toLowerCase().includes(q)).slice(0, 8));
  }, [value, allNames]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setShowList(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={wrapperRef} className="relative">
      <Input
        value={value}
        onChange={(e) => { onChange(e.target.value); setShowList(true); }}
        onFocus={() => setShowList(true)}
        placeholder="Colaborador"
        className="h-9 text-sm"
      />
      {showList && suggestions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md max-h-[160px] overflow-y-auto">
          {suggestions.map((name) => (
            <button
              key={name}
              type="button"
              className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent truncate"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { onChange(name); setShowList(false); }}
            >
              {name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Uniqueness validation rules ───────────────────────────── */
const uniqueFieldByCategory: Record<string, { field: string; label: string; dbColumn: string }> = {
  notebooks: { field: "service_tag", label: "Service tag", dbColumn: "service_tag" },
  celulares: { field: "imei1", label: "Imei 1", dbColumn: "imei1" },
};

interface Props {
  category: string;
  onCreated: () => void;
}

export function AddStockItemDialog({ category, onCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [dupError, setDupError] = useState("");

  const fields = fieldsByCategory[category] || [];
  const label = categoryLabels[category] || "Item";
  const uniqueRule = uniqueFieldByCategory[category];

  const resetForm = () => {
    const defaults: Record<string, string> = {};
    if (category === "licencas") {
      defaults.created_at = format(new Date(), "yyyy-MM-dd");
    }
    setValues(defaults);
    setDupError("");
  };

  const update = (id: string, val: string) => {
    setValues((prev) => ({ ...prev, [id]: val }));
    if (uniqueRule && id === uniqueRule.field) setDupError("");
  };

  const checkUnique = useCallback(async (): Promise<boolean> => {
    if (!uniqueRule) return true;
    const val = (values[uniqueRule.field] || "").trim();
    if (!val) return true;

    const { data: existing } = await (supabase
      .from("inventory")
      .select("id") as any)
      .eq(uniqueRule.dbColumn, val)
      .limit(1);

    if (existing && existing.length > 0) {
      setDupError(`Já existe um item com ${uniqueRule.label} "${val}"`);
      return false;
    }
    return true;
  }, [values, uniqueRule]);

  const handleSave = async () => {
    setSaving(true);

    const isUnique = await checkUnique();
    if (!isUnique) { setSaving(false); return; }

    const collaborator = (values.collaborator || "").trim();
    const hasCollaborator = collaborator.length > 0;

    let status: string;
    if (category === "licencas") {
      status = values.status || (hasCollaborator ? "Ativo" : "Disponível");
    } else {
      status = "Disponível";
    }

    const payload: Record<string, any> = {
      category,
      asset_code: "TEMP",
      status,
      collaborator: category === "licencas" ? collaborator : "",
    };

    for (const f of fields) {
      if (f.id === "collaborator" || f.id === "status") continue;
      if (values[f.id]) {
        if (f.id === "created_at") {
          payload[f.id] = new Date(values[f.id]).toISOString();
        } else {
          payload[f.id] = values[f.id];
        }
      }
    }

    const { error } = await supabase.from("inventory").insert(payload as any);
    if (error) {
      toast.error("Erro ao cadastrar item");
    } else {
      toast.success(`${label} cadastrado com sucesso`);
      resetForm();
      setOpen(false);
      onCreated();
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v) resetForm(); }}>
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
          {fields.map((f) => {
            const hasDupErr = uniqueRule?.field === f.id && dupError;

            if (f.id === "collaborator") {
              return (
                <div key={f.id} className="space-y-1.5">
                  <label className="text-sm font-medium">{f.label}</label>
                  <CollaboratorAutocomplete
                    value={values[f.id] || ""}
                    onChange={(v) => update(f.id, v)}
                  />
                </div>
              );
            }

            if (f.type === "autocomplete" && f.dbColumn) {
              return (
                <div key={f.id} className="space-y-1.5">
                  <label className="text-sm font-medium">{f.label}</label>
                  <FieldAutocomplete
                    value={values[f.id] || ""}
                    onChange={(v) => update(f.id, v)}
                    dbColumn={f.dbColumn}
                    placeholder={f.label}
                  />
                </div>
              );
            }

            if (f.type === "select") {
              return (
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
              );
            }

            if (f.type === "date") {
              return (
                <div key={f.id} className="space-y-1.5">
                  <label className="text-sm font-medium">{f.label}</label>
                  <Input
                    type="date"
                    value={values[f.id] || ""}
                    onChange={(e) => update(f.id, e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>
              );
            }

            return (
              <div key={f.id} className="space-y-1.5">
                <label className="text-sm font-medium">{f.label}</label>
                <Input
                  value={values[f.id] || ""}
                  onChange={(e) => update(f.id, e.target.value)}
                  placeholder={f.label}
                  className={cn("h-9 text-sm", hasDupErr && "border-destructive ring-1 ring-destructive")}
                />
                {hasDupErr && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {dupError}
                  </p>
                )}
              </div>
            );
          })}
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
