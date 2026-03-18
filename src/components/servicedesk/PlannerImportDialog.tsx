import { useState, useRef, useCallback } from "react";
import * as XLSX from "xlsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
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
  FileSpreadsheet,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { slaByCategory } from "@/hooks/use-sla";
import type { ChecklistItem } from "@/hooks/use-tickets";

// Planner CSV field → our DB field
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
  "progresso": "status_id",
  "progress": "status_id",
  "prioridade": "priority",
  "priority": "priority",
  "data de início": "start_date",
  "start date": "start_date",
  "data de conclusão": "completed_date",
  "due date": "completed_date",
  "data de vencimento": "completed_date",
  "lista de verificação": "checklist",
  "checklist": "checklist",
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
  { value: "bucket_name", label: "Bucket (Categoria)" },
  { value: "checklist", label: "Lista de Verificação" },
  { value: "external_notes", label: "Anotações" },
  { value: "start_date", label: "Data de Início" },
  { value: "completed_date", label: "Data de Conclusão" },
  { value: "status_id", label: "Progresso / Status" },
  { value: "category", label: "Rótulos / Categoria" },
];

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === "," || ch === ";") {
        result.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
  }
  result.push(current.trim());
  return result;
}

function mapPriority(val: string): "low" | "medium" | "high" {
  const v = val.toLowerCase().trim();
  if (v === "urgente" || v === "urgent" || v === "alta" || v === "high") return "high";
  if (v === "importante" || v === "important") return "high";
  if (v === "baixa" || v === "low") return "low";
  return "medium";
}

function parseChecklist(raw: string): ChecklistItem[] {
  if (!raw) return [];
  // Planner format: items separated by ; or newlines, may have [x] or [ ] prefixes
  const lines = raw.split(/[;\n]/).map((l) => l.trim()).filter(Boolean);
  return lines.map((line) => {
    const checked = /^\[x\]/i.test(line) || /^✓/.test(line);
    const text = line.replace(/^\[[ x]\]\s*/i, "").replace(/^✓\s*/, "").trim();
    return { text, checked };
  });
}

function tryParseDate(val: string): string | null {
  if (!val) return null;
  // Try common formats: dd/mm/yyyy, mm/dd/yyyy, yyyy-mm-dd
  const iso = Date.parse(val);
  if (!isNaN(iso)) return new Date(iso).toISOString();
  const parts = val.split(/[/\-\.]/);
  if (parts.length === 3) {
    const [a, b, c] = parts.map(Number);
    if (c > 1000) {
      // dd/mm/yyyy
      const d = new Date(c, b - 1, a);
      if (!isNaN(d.getTime())) return d.toISOString();
    }
    if (a > 1000) {
      // yyyy-mm-dd
      const d = new Date(a, b - 1, c);
      if (!isNaN(d.getTime())) return d.toISOString();
    }
  }
  return null;
}

interface ParsedRow {
  [key: string]: string;
}

export function PlannerImportDialog() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"upload" | "mapping" | "importing" | "done">("upload");
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<ParsedRow[]>([]);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState<{ success: number; errors: number }>({ success: 0, errors: 0 });
  const fileRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setStep("upload");
    setCsvHeaders([]);
    setCsvRows([]);
    setFieldMapping({});
    setImportProgress(0);
    setImportResults({ success: 0, errors: 0 });
  };

  const processData = useCallback((headers: string[], dataRows: string[][]) => {
    const rows: ParsedRow[] = [];
    for (const cols of dataRows) {
      const row: ParsedRow = {};
      headers.forEach((h, idx) => {
        row[h] = cols[idx] || "";
      });
      rows.push(row);
    }

    setCsvHeaders(headers);
    setCsvRows(rows);

    // Auto-map fields
    const mapping: Record<string, string> = {};
    headers.forEach((h) => {
      const normalized = h.toLowerCase().trim();
      mapping[h] = defaultFieldMap[normalized] || "__ignore__";
    });
    setFieldMapping(mapping);
    setStep("mapping");
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split(".").pop()?.toLowerCase();

    if (ext === "csv") {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        if (!text) return;
        const lines = text.split(/\r?\n/).filter((l) => l.trim());
        if (lines.length < 2) {
          toast.error("O arquivo precisa ter pelo menos um cabeçalho e uma linha de dados.");
          return;
        }
        const headers = parseCsvLine(lines[0]);
        const dataRows = lines.slice(1).map((l) => parseCsvLine(l));
        processData(headers, dataRows);
      };
      reader.readAsText(file, "UTF-8");
    } else if (ext === "xlsx" || ext === "xls") {
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = new Uint8Array(ev.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const json: string[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

          if (json.length < 2) {
            toast.error("A planilha precisa ter pelo menos um cabeçalho e uma linha de dados.");
            return;
          }

          const headers = json[0].map((h) => String(h).trim());
          const dataRows = json.slice(1).filter((r) => r.some((c) => String(c).trim())).map((r) => r.map((c) => String(c)));
          processData(headers, dataRows);
        } catch (err) {
          console.error("Excel parse error:", err);
          toast.error("Erro ao ler o arquivo Excel. Verifique se o formato está correto.");
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      toast.error("Formato não suportado. Use CSV (.csv) ou Excel (.xlsx, .xls).");
    }

    e.target.value = "";
  }, [processData]);

  const handleUpdateMapping = (csvCol: string, targetField: string) => {
    setFieldMapping((prev) => ({ ...prev, [csvCol]: targetField }));
  };

  const getMappedValue = (row: ParsedRow, targetField: string): string => {
    const entry = Object.entries(fieldMapping).find(([, v]) => v === targetField);
    if (!entry) return "";
    return row[entry[0]] || "";
  };

  const handleImport = async () => {
    setStep("importing");
    let success = 0;
    let errors = 0;

    for (let i = 0; i < csvRows.length; i++) {
      const row = csvRows[i];
      try {
        const title = getMappedValue(row, "title") || "Tarefa importada";
        const description = getMappedValue(row, "description") || "";
        const assignee = getMappedValue(row, "assignee") || null;
        const requester = getMappedValue(row, "requester") || assignee || "Importação Planner";
        const priorityRaw = getMappedValue(row, "priority");
        const priority = mapPriority(priorityRaw);
        const bucketName = getMappedValue(row, "bucket_name") || "";
        const checklistRaw = getMappedValue(row, "checklist");
        const checklist = parseChecklist(checklistRaw);
        const externalNotes = getMappedValue(row, "external_notes") || "";
        const categoryRaw = getMappedValue(row, "category");
        const category = categoryRaw || bucketName || "Gerais/Outros";
        const startDateRaw = getMappedValue(row, "start_date");
        const completedDateRaw = getMappedValue(row, "completed_date");
        const completedDate = tryParseDate(completedDateRaw);
        const progressRaw = getMappedValue(row, "status_id").toLowerCase();

        const now = new Date();
        const slaHours = slaByCategory[category] ?? 24;
        const slaDeadline = completedDate
          ? new Date(completedDate)
          : new Date(now.getTime() + slaHours * 3600000);

        // Map Planner progress to status_id
        let statusId = "pending";
        if (progressRaw.includes("concluíd") || progressRaw.includes("completed") || progressRaw.includes("100")) {
          statusId = "done";
        } else if (progressRaw.includes("andamento") || progressRaw.includes("progress") || progressRaw.includes("50")) {
          statusId = "in_progress";
        }

        const { error } = await supabase.from("tickets").insert({
          title,
          category,
          description: [description, externalNotes ? `\n--- Anotações do Planner ---\n${externalNotes}` : ""].filter(Boolean).join(""),
          requester,
          email: "planner-import@empresa.com",
          assignee,
          priority,
          status_id: statusId,
          sla_hours: slaHours,
          sla_deadline: slaDeadline.toISOString(),
          ticket_number: "",
          completed_at: statusId === "done" ? (completedDate || now.toISOString()) : null,
          checklist: checklist.length > 0 ? JSON.stringify(checklist) : "[]",
          external_notes: externalNotes,
          bucket_name: bucketName,
        } as any);

        if (error) {
          console.error("Import row error:", error);
          errors++;
        } else {
          success++;
        }
      } catch (err) {
        console.error("Row parse error:", err);
        errors++;
      }

      setImportProgress(Math.round(((i + 1) / csvRows.length) * 100));
    }

    setImportResults({ success, errors });
    setStep("done");
    if (success > 0) toast.success(`${success} chamado(s) importado(s) com sucesso!`);
    if (errors > 0) toast.error(`${errors} linha(s) com erro na importação.`);
  };

  const mappedCount = Object.values(fieldMapping).filter((v) => v !== "__ignore__").length;
  const previewRows = csvRows.slice(0, 3);

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetState(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-1.5">
          <FileSpreadsheet className="h-4 w-4" />
          Importar do Planner
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Importar Chamados do Microsoft Planner
          </DialogTitle>
        </DialogHeader>

        {step === "upload" && (
          <div className="flex flex-col items-center justify-center gap-4 py-10">
            <div className="rounded-full bg-primary/10 p-4">
              <Upload className="h-8 w-8 text-primary" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-medium">Selecione o arquivo exportado do Planner</p>
              <p className="text-xs text-muted-foreground">Formatos aceitos: .csv, .xlsx, .xls</p>
            </div>
            <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileSelect} />
            <Button onClick={() => fileRef.current?.click()} className="gap-2">
              <Upload className="h-4 w-4" />
              Escolher Arquivo
            </Button>
          </div>
        )}

        {step === "mapping" && (
          <div className="flex flex-col gap-4 flex-1 min-h-0">
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <span className="font-medium">{csvRows.length}</span> linhas encontradas •{" "}
                <span className="font-medium">{mappedCount}</span> de {csvHeaders.length} colunas mapeadas
              </div>
              <Badge variant="secondary">{csvHeaders.length} colunas</Badge>
            </div>

            {/* Mapping table */}
            <ScrollArea className="flex-1 max-h-[50vh] border rounded-lg">
              <div className="divide-y">
                {csvHeaders.map((header) => (
                  <div key={header} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{header}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        Ex: {previewRows.map((r) => r[header]).filter(Boolean).slice(0, 2).join(" | ") || "—"}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <Select
                      value={fieldMapping[header] || "__ignore__"}
                      onValueChange={(v) => handleUpdateMapping(header, v)}
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {targetFields.map((f) => (
                          <SelectItem key={f.value} value={f.value}>
                            {f.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Preview */}
            {previewRows.length > 0 && (
              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="text-xs font-medium text-muted-foreground mb-2">Pré-visualização (primeiras {previewRows.length} linhas)</p>
                <div className="space-y-2">
                  {previewRows.map((row, idx) => {
                    const title = getMappedValue(row, "title");
                    const assignee = getMappedValue(row, "assignee");
                    const priority = getMappedValue(row, "priority");
                    const bucket = getMappedValue(row, "bucket_name");
                    return (
                      <div key={idx} className="flex items-center gap-2 text-xs bg-background rounded px-2 py-1.5">
                        <span className="font-medium truncate flex-1">{title || "—"}</span>
                        {assignee && <Badge variant="outline" className="text-[10px]">{assignee}</Badge>}
                        {priority && <Badge variant="secondary" className="text-[10px]">{priority}</Badge>}
                        {bucket && <Badge className="text-[10px] bg-primary/10 text-primary">{bucket}</Badge>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="ghost" onClick={resetState}>Cancelar</Button>
              <Button onClick={handleImport} disabled={mappedCount === 0} className="gap-1.5">
                <CheckCircle2 className="h-4 w-4" />
                Importar {csvRows.length} Chamados
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "importing" && (
          <div className="flex flex-col items-center gap-4 py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium">Importando chamados...</p>
            <div className="w-full max-w-xs space-y-1">
              <Progress value={importProgress} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">{importProgress}%</p>
            </div>
          </div>
        )}

        {step === "done" && (
          <div className="flex flex-col items-center gap-4 py-10">
            <div className="rounded-full bg-success/10 p-4">
              <CheckCircle2 className="h-8 w-8 text-success" />
            </div>
            <p className="text-sm font-medium">Importação concluída!</p>
            <div className="flex gap-4 text-sm">
              <span className="text-success font-medium">{importResults.success} importados</span>
              {importResults.errors > 0 && (
                <span className="text-destructive font-medium">{importResults.errors} erros</span>
              )}
            </div>
            <Button onClick={() => { setOpen(false); resetState(); }}>Fechar</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
