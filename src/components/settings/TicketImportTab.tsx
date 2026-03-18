import { useState, useRef, useCallback } from "react";
import * as XLSX from "xlsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Upload,
  Ticket,
  ArrowRight,
  CheckCircle2,
  Loader2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { slaByCategory } from "@/hooks/use-sla";
import type { ChecklistItem } from "@/hooks/use-tickets";
import { cn } from "@/lib/utils";

const defaultFieldMap: Record<string, string> = {
  "nome da tarefa": "title",
  "task name": "title",
  "titulo": "title",
  "atribuído a": "assignee",
  "assigned to": "assignee",
  "responsável": "assignee",
  "responsavel": "assignee",
  "nome do bucket": "bucket_name",
  "bucket name": "bucket_name",
  "bucket": "bucket_name",
  "progresso": "progress",
  "progress": "progress",
  "prioridade": "priority",
  "priority": "priority",
  "data de início": "start_date",
  "start date": "start_date",
  "data de conclusão": "completed_date",
  "due date": "completed_date",
  "data de vencimento": "completed_date",
  "lista de verificação": "checklist",
  "itens da lista de verificação": "checklist",
  "checklist": "checklist",
  "checklist items": "checklist",
  "anotações": "external_notes",
  "notes": "external_notes",
  "notas": "external_notes",
  "descrição": "description",
  "description": "description",
  "rótulos": "category",
  "labels": "category",
  "criado por": "requester",
  "created by": "requester",
};

const targetFields = [
  { value: "__ignore__", label: "— Ignorar —" },
  { value: "title", label: "Título" },
  { value: "description", label: "Descrição" },
  { value: "assignee", label: "Responsável" },
  { value: "requester", label: "Solicitante" },
  { value: "priority", label: "Prioridade" },
  { value: "bucket_name", label: "Bucket (Etapa Kanban)" },
  { value: "checklist", label: "Lista de Verificação" },
  { value: "external_notes", label: "Anotações" },
  { value: "start_date", label: "Data de Início" },
  { value: "completed_date", label: "Data de Conclusão" },
  { value: "progress", label: "Progresso" },
  { value: "category", label: "Rótulos / Categoria" },
];

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { current += '"'; i++; }
      else if (ch === '"') inQuotes = false;
      else current += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === "," || ch === ";") { result.push(current.trim()); current = ""; }
      else current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function mapPriority(val: string): "low" | "medium" | "high" {
  const v = val.toLowerCase().trim();
  if (["urgente", "urgent", "alta", "high", "importante", "important"].includes(v)) return "high";
  if (["baixa", "low"].includes(v)) return "low";
  return "medium";
}

function parseChecklist(raw: string): ChecklistItem[] {
  if (!raw) return [];
  // Split by ";", newline, or ":" (Planner uses ":" as separator for "Itens da lista de verificação")
  return raw.split(/[:;\n]/).map(l => l.trim()).filter(Boolean).map(line => ({
    text: line.replace(/^\[[ x]\]\s*/i, "").replace(/^✓\s*/, "").trim(),
    checked: /^\[x\]/i.test(line) || /^✓/.test(line),
  }));
}

function tryParseDate(val: string): string | null {
  if (!val) return null;
  const iso = Date.parse(val);
  if (!isNaN(iso)) return new Date(iso).toISOString();
  const parts = val.split(/[/\-\.]/);
  if (parts.length === 3) {
    const [a, b, c] = parts.map(Number);
    if (c > 1000) { const d = new Date(c, b - 1, a); if (!isNaN(d.getTime())) return d.toISOString(); }
    if (a > 1000) { const d = new Date(a, b - 1, c); if (!isNaN(d.getTime())) return d.toISOString(); }
  }
  return null;
}

interface ParsedRow { [key: string]: string; }

export function TicketImportTab() {
  const [step, setStep] = useState<"upload" | "mapping" | "importing" | "done">("upload");
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<ParsedRow[]>([]);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState<{ success: number; errors: number }>({ success: 0, errors: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStep("upload");
    setCsvHeaders([]);
    setCsvRows([]);
    setFieldMapping({});
    setImportProgress(0);
    setImportResults({ success: 0, errors: 0 });
  };

  const processData = useCallback((headers: string[], dataRows: string[][]) => {
    const rows: ParsedRow[] = dataRows.map(cols => {
      const row: ParsedRow = {};
      headers.forEach((h, idx) => { row[h] = cols[idx] || ""; });
      return row;
    });
    setCsvHeaders(headers);
    setCsvRows(rows);
    const mapping: Record<string, string> = {};
    headers.forEach(h => { mapping[h] = defaultFieldMap[h.toLowerCase().trim()] || "__ignore__"; });
    setFieldMapping(mapping);
    setStep("mapping");
  }, []);

  const handleFile = useCallback((file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext === "csv") {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        if (!text) return;
        const lines = text.split(/\r?\n/).filter(l => l.trim());
        if (lines.length < 2) { toast.error("Arquivo precisa ter cabeçalho e dados."); return; }
        processData(parseCsvLine(lines[0]), lines.slice(1).map(l => parseCsvLine(l)));
      };
      reader.readAsText(file, "UTF-8");
    } else if (ext === "xlsx" || ext === "xls") {
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = new Uint8Array(ev.target?.result as ArrayBuffer);
          const wb = XLSX.read(data, { type: "array" });
          const json: string[][] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: "" });
          if (json.length < 2) { toast.error("Planilha precisa ter cabeçalho e dados."); return; }
          const headers = json[0].map(h => String(h).trim());
          const dataRows = json.slice(1).filter(r => r.some(c => String(c).trim())).map(r => r.map(c => String(c)));
          processData(headers, dataRows);
        } catch { toast.error("Erro ao ler o arquivo Excel."); }
      };
      reader.readAsArrayBuffer(file);
    } else {
      toast.error("Formato não suportado. Use CSV (.csv) ou Excel (.xlsx, .xls).");
    }
  }, [processData]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  }, [handleFile]);

  const getMappedValue = (row: ParsedRow, targetField: string): string => {
    const entry = Object.entries(fieldMapping).find(([, v]) => v === targetField);
    return entry ? (row[entry[0]] || "") : "";
  };

  // Ensure a kanban status exists for a given bucket name, return its id
  const ensureBucketStatus = async (bucketName: string): Promise<string | null> => {
    if (!bucketName.trim()) return null;

    // Check if a status with this name already exists
    const { data: existing } = await supabase
      .from("status_config")
      .select("id")
      .ilike("nome", bucketName.trim());

    if (existing && existing.length > 0) {
      return (existing[0] as any).id;
    }

    // Create new kanban stage for this bucket
    const id = `bucket_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const { data: maxOrdem } = await supabase
      .from("status_config")
      .select("ordem")
      .order("ordem", { ascending: false })
      .limit(1);

    const newOrdem = maxOrdem && maxOrdem.length > 0 ? (maxOrdem[0] as any).ordem + 1 : 10;

    const { error } = await supabase.from("status_config").insert({
      id,
      nome: bucketName.trim(),
      cor: `${Math.floor(Math.random() * 360)} 70% 50%`,
      ordem: newOrdem,
      ativo: true,
      is_final: false,
      status_type: "in_progress",
    } as any);

    if (error) {
      console.error("Error creating bucket status:", error);
      return null;
    }

    toast.info(`Etapa "${bucketName}" criada no Kanban`);
    return id;
  };

  const handleImport = async () => {
    setStep("importing");
    let success = 0, errors = 0;

    // Pre-create all bucket statuses
    const bucketStatusCache: Record<string, string | null> = {};
    const uniqueBuckets = new Set<string>();
    for (const row of csvRows) {
      const bucket = getMappedValue(row, "bucket_name")?.trim();
      if (bucket) uniqueBuckets.add(bucket);
    }
    for (const bucket of uniqueBuckets) {
      bucketStatusCache[bucket] = await ensureBucketStatus(bucket);
    }

    for (let i = 0; i < csvRows.length; i++) {
      const row = csvRows[i];
      try {
        const title = getMappedValue(row, "title") || "Tarefa importada";
        const description = getMappedValue(row, "description") || "";
        const assignee = getMappedValue(row, "assignee") || null;
        const requester = getMappedValue(row, "requester") || assignee || "Importação Planner";
        const priority = mapPriority(getMappedValue(row, "priority"));
        const bucketName = getMappedValue(row, "bucket_name") || "";
        const checklist = parseChecklist(getMappedValue(row, "checklist"));
        const externalNotes = getMappedValue(row, "external_notes") || "";
        const category = getMappedValue(row, "category") || "Gerais/Outros";
        const completedDate = tryParseDate(getMappedValue(row, "completed_date"));
        const progressRaw = getMappedValue(row, "progress").toLowerCase();

        const now = new Date();
        const slaHours = slaByCategory[category] ?? 24;
        const slaDeadline = completedDate ? new Date(completedDate) : new Date(now.getTime() + slaHours * 3600000);

        // Map progress: Não iniciado / Em andamento / Concluída
        let progress = "not_started";
        if (progressRaw.includes("concluíd") || progressRaw.includes("completed") || progressRaw.includes("100")) progress = "completed";
        else if (progressRaw.includes("andamento") || progressRaw.includes("progress") || progressRaw.includes("50")) progress = "in_progress";

        // Use bucket status if available for kanban column
        const statusId = bucketStatusCache[bucketName] || "pending";
        const isDone = progress === "completed";

        const { error } = await supabase.from("tickets").insert({
          title, category,
          description: [description, externalNotes ? `\n--- Anotações do Planner ---\n${externalNotes}` : ""].filter(Boolean).join(""),
          requester, email: "planner-import@empresa.com", assignee, priority,
          status_id: statusId, progress, sla_hours: slaHours, sla_deadline: slaDeadline.toISOString(),
          ticket_number: "",
          completed_at: isDone ? (completedDate || now.toISOString()) : null,
          checklist: checklist.length > 0 ? JSON.stringify(checklist) : "[]",
          external_notes: externalNotes, bucket_name: bucketName,
        } as any);

        if (error) { console.error("Import row error:", error); errors++; }
        else success++;
      } catch (err) { console.error("Row parse error:", err); errors++; }
      setImportProgress(Math.round(((i + 1) / csvRows.length) * 100));
    }

    setImportResults({ success, errors });
    setStep("done");
    if (success > 0) toast.success(`${success} chamado(s) importado(s) com sucesso!`);
    if (errors > 0) toast.error(`${errors} linha(s) com erro na importação.`);
  };

  const mappedCount = Object.values(fieldMapping).filter(v => v !== "__ignore__").length;
  const previewRows = csvRows.slice(0, 3);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Ticket className="h-5 w-5 text-muted-foreground" />
          Importação de Chamados de TI
        </CardTitle>
        <p className="text-sm text-muted-foreground">Importe chamados a partir de CSV ou Excel (padrão Microsoft Planner)</p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Upload */}
        {step === "upload" && (
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className={cn(
              "flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed p-12 cursor-pointer transition-colors",
              isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30"
            )}
          >
            <Upload className={cn("h-12 w-12", isDragging ? "text-primary" : "text-muted-foreground/50")} />
            <div className="text-center">
              <p className="font-medium">Arraste seu arquivo aqui</p>
              <p className="text-sm text-muted-foreground mt-1">Formatos aceitos: .csv, .xlsx, .xls</p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
            />
          </div>
        )}

        {/* Mapping */}
        {step === "mapping" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <span className="font-medium">{csvRows.length}</span> linhas encontradas •{" "}
                <span className="font-medium">{mappedCount}</span> de {csvHeaders.length} colunas mapeadas
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{csvHeaders.length} colunas</Badge>
                <Button variant="ghost" size="sm" onClick={reset}><X className="h-4 w-4" /></Button>
              </div>
            </div>

            <div className="rounded-lg border divide-y max-h-[400px] overflow-y-auto">
              {csvHeaders.map((header) => (
                <div key={header} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{header}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      Ex: {previewRows.map(r => r[header]).filter(Boolean).slice(0, 2).join(" | ") || "—"}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <Select value={fieldMapping[header] || "__ignore__"} onValueChange={(v) => setFieldMapping(prev => ({ ...prev, [header]: v }))}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {targetFields.map(f => (
                        <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldMapping[header] && fieldMapping[header] !== "__ignore__" && (
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  )}
                </div>
              ))}
            </div>

            {/* Preview */}
            {previewRows.length > 0 && (
              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="text-xs font-medium text-muted-foreground mb-2">Pré-visualização (primeiras {previewRows.length} linhas)</p>
                <div className="space-y-2">
                  {previewRows.map((row, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs bg-background rounded px-2 py-1.5">
                      <span className="font-medium truncate flex-1">{getMappedValue(row, "title") || "—"}</span>
                      {getMappedValue(row, "assignee") && <Badge variant="outline" className="text-[10px]">{getMappedValue(row, "assignee")}</Badge>}
                      {getMappedValue(row, "priority") && <Badge variant="secondary" className="text-[10px]">{getMappedValue(row, "priority")}</Badge>}
                      {getMappedValue(row, "bucket_name") && <Badge className="text-[10px] bg-primary/10 text-primary">{getMappedValue(row, "bucket_name")}</Badge>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-muted-foreground">
                {mappedCount} de {csvHeaders.length} colunas mapeadas
              </p>
              <Button onClick={handleImport} disabled={mappedCount === 0}>
                <Upload className="mr-2 h-4 w-4" />
                Importar {csvRows.length} Chamados
              </Button>
            </div>
          </div>
        )}

        {/* Importing */}
        {step === "importing" && (
          <div className="space-y-4 py-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="font-medium">Importando chamados...</p>
            <Progress value={importProgress} className="h-3 max-w-xs mx-auto" />
            <p className="text-xs text-muted-foreground">{importProgress}%</p>
          </div>
        )}

        {/* Done */}
        {step === "done" && (
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-center gap-3 mb-4">
              <CheckCircle2 className="h-10 w-10 text-primary" />
              <p className="text-xl font-bold">Importação concluída!</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 max-w-sm mx-auto">
              <div className="rounded-lg border p-4 text-center">
                <p className="text-2xl font-bold text-primary">{importResults.success}</p>
                <p className="text-sm text-muted-foreground">Importados</p>
              </div>
              {importResults.errors > 0 && (
                <div className="rounded-lg border p-4 text-center">
                  <p className="text-2xl font-bold text-destructive">{importResults.errors}</p>
                  <p className="text-sm text-muted-foreground">Erros</p>
                </div>
              )}
            </div>
            <div className="flex justify-center pt-4">
              <Button onClick={reset} variant="outline">
                <Upload className="mr-2 h-4 w-4" />
                Nova importação
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
