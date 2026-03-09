import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, X, ArrowRight, ChevronDown, ChevronRight } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type ImportCategory = "notebooks" | "celulares" | "linhas" | "licencas" | "colaborador";

const categoryOptions: { value: ImportCategory; label: string }[] = [
  { value: "notebooks", label: "Notebook" },
  { value: "celulares", label: "Celular" },
  { value: "linhas", label: "Linha" },
  { value: "licencas", label: "Licença" },
  { value: "colaborador", label: "Colaborador" },
];

// Maps CSV header variants → inventory DB columns
const headerMappings: Record<string, string> = {
  // common
  "colaborador": "collaborator",
  "nome": "collaborator",
  "nome completo": "collaborator",
  "status": "status",
  "modelo": "model",
  "model": "model",
  "marca": "marca",
  "brand": "marca",
  "tipo": "asset_type",
  "type": "asset_type",
  "asset type": "asset_type",
  "setor": "sector",
  "sector": "sector",
  "departamento": "sector",
  "centro de custo": "cost_center",
  "cost center": "cost_center",
  "centro de custo eng": "cost_center_eng",
  "centro de custo - eng": "cost_center_eng",
  "cost center eng": "cost_center_eng",
  "centro de custo man": "cost_center_man",
  "centro de custo - man": "cost_center_man",
  "cost center man": "cost_center_man",
  "observações": "notes",
  "observacoes": "notes",
  "notas": "notes",
  "notes": "notes",
  "cargo": "cargo",
  "gestor": "gestor",
  "email": "email_address",
  "e-mail": "email_address",
  "contrato": "contrato",
  // notebook
  "service tag": "service_tag",
  "servicetag": "service_tag",
  "service_tag": "service_tag",
  "service tag 2": "service_tag_2",
  "service_tag_2": "service_tag_2",
  // celular
  "imei": "imei1",
  "imei 1": "imei1",
  "imei1": "imei1",
  "imei 2": "imei2",
  "imei2": "imei2",
  // linha
  "numero": "numero",
  "número": "numero",
  "numero da linha": "numero",
  "número da linha": "numero",
  "telefone": "numero",
  "operadora": "operadora",
  // licença
  "licença": "licenca",
  "licenca": "licenca",
  "license": "licenca",
  "chave": "licenca",
};

// Collaborator-specific mappings → we create inventory entries for assets linked to them
const collaboratorMappings: Record<string, string> = {
  "nome": "name",
  "nome completo": "name",
  "colaborador": "name",
  "cargo": "cargo",
  "departamento": "sector",
  "setor": "sector",
  "gestor": "gestor",
  "email": "email",
  "e-mail": "email",
};

type ImportStep = "upload" | "category" | "mapping" | "importing" | "done";

interface MappingEntry {
  csvHeader: string;
  dbColumn: string;
}

interface ErrorDetail {
  line: number;
  message: string;
  data: Record<string, string>;
}

interface ImportResult {
  inserted: number;
  updated: number;
  errors: number;
  collaboratorsCreated: number;
  errorDetails: ErrorDetail[];
}

function detectDelimiter(text: string): string {
  const firstLine = text.split(/\r?\n/)[0] || "";
  const semicolons = (firstLine.match(/;/g) || []).length;
  const commas = (firstLine.match(/,/g) || []).length;
  return semicolons >= commas ? ";" : ",";
}

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length === 0) return { headers: [], rows: [] };

  const delimiter = detectDelimiter(text);

  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === delimiter && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseLine(lines[0]).map((h) => h.trim());
  const rows = lines.slice(1).map(parseLine).filter((r) => r.some((c) => c.trim() !== ""));
  return { headers, rows };
}

function autoMapHeaders(csvHeaders: string[], category: ImportCategory): MappingEntry[] {
  const mappingSource = category === "colaborador" ? collaboratorMappings : headerMappings;
  return csvHeaders.map((h) => {
    const normalized = h.toLowerCase().trim();
    const dbCol = mappingSource[normalized] || "";
    return { csvHeader: h, dbColumn: dbCol };
  });
}

// All possible inventory columns for the dropdown
const inventoryColumns = [
  { value: "", label: "(Ignorar)" },
  { value: "collaborator", label: "Colaborador" },
  { value: "status", label: "Status" },
  { value: "model", label: "Modelo" },
  { value: "marca", label: "Marca" },
  { value: "asset_type", label: "Tipo" },
  { value: "sector", label: "Setor" },
  { value: "cost_center", label: "Centro de Custo" },
  { value: "cost_center_eng", label: "CC ENG" },
  { value: "cost_center_man", label: "CC MAN" },
  { value: "notes", label: "Observações" },
  { value: "cargo", label: "Cargo" },
  { value: "gestor", label: "Gestor" },
  { value: "email_address", label: "Email" },
  { value: "contrato", label: "Contrato" },
  { value: "service_tag", label: "Service Tag" },
  { value: "service_tag_2", label: "Service Tag 2" },
  { value: "imei1", label: "IMEI 1" },
  { value: "imei2", label: "IMEI 2" },
  { value: "numero", label: "Número" },
  { value: "operadora", label: "Operadora" },
  { value: "licenca", label: "Licença" },
];

const collaboratorColumns = [
  { value: "", label: "(Ignorar)" },
  { value: "name", label: "Nome" },
  { value: "cargo", label: "Cargo" },
  { value: "sector", label: "Departamento" },
  { value: "gestor", label: "Gestor" },
  { value: "email", label: "Email" },
];

function ErrorDetailRow({ error }: { error: ErrorDetail }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="text-sm">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full p-3 text-left hover:bg-muted/50 transition-colors"
      >
        {open ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
        <span className="font-mono text-destructive shrink-0">Linha {error.line}</span>
        <span className="text-muted-foreground truncate">{error.message}</span>
      </button>
      {open && (
        <div className="px-9 pb-3 grid grid-cols-2 gap-x-4 gap-y-1">
          {Object.entries(error.data).map(([key, val]) => (
            <div key={key} className="contents">
              <span className="text-muted-foreground font-mono text-xs">{key}</span>
              <span className="text-xs truncate">{val || <span className="italic text-muted-foreground/50">(vazio)</span>}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function CsvImportTab() {
  const [step, setStep] = useState<ImportStep>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<{ headers: string[]; rows: string[][] }>({ headers: [], rows: [] });
  const [category, setCategory] = useState<ImportCategory | "">("");
  const [mapping, setMapping] = useState<MappingEntry[]>([]);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const validCsvTypes = ["text/csv", "application/vnd.ms-excel", "text/plain"];

  const handleFile = useCallback((f: File) => {
    const nameOk = f.name.toLowerCase().endsWith(".csv");
    const typeOk = validCsvTypes.includes(f.type);
    if (!nameOk && !typeOk) {
      toast.error("Apenas arquivos CSV são aceitos (.csv, text/csv, text/plain)");
      return;
    }
    setFile(f);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseCSV(text);
      if (parsed.headers.length === 0) {
        toast.error("Arquivo CSV vazio ou inválido");
        return;
      }
      setCsvData(parsed);
      setStep("category");
    };
    reader.onerror = () => {
      toast.error("Erro ao ler o arquivo. Tente salvar como UTF-8.");
    };
    reader.readAsText(f, "UTF-8");
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const handleCategorySelect = (cat: ImportCategory) => {
    setCategory(cat);
    const autoMapped = autoMapHeaders(csvData.headers, cat);
    setMapping(autoMapped);
    setStep("mapping");
  };

  const updateMapping = (index: number, dbColumn: string) => {
    setMapping((prev) => prev.map((m, i) => (i === index ? { ...m, dbColumn } : m)));
  };

  const getExistingCollaborators = async (): Promise<Set<string>> => {
    const { data } = await supabase.from("inventory").select("collaborator").neq("collaborator", "");
    const names = new Set<string>();
    data?.forEach((r: any) => { if (r.collaborator) names.add(r.collaborator.toLowerCase().trim()); });
    return names;
  };

  const runImport = async () => {
    if (!category) return;
    setStep("importing");
    setProgress(0);

    const result: ImportResult = { inserted: 0, updated: 0, errors: 0, collaboratorsCreated: 0, errorDetails: [] };
    const total = csvData.rows.length;

    if (category === "colaborador") {
      await importCollaborators(result, total);
    } else {
      await importInventory(result, total);
    }

    setResult(result);
    setStep("done");
  };

  const importCollaborators = async (res: ImportResult, total: number) => {
    const existingCollabs = await getExistingCollaborators();

    for (let i = 0; i < csvData.rows.length; i++) {
      const row = csvData.rows[i];
      const record: Record<string, string> = {};
      mapping.forEach((m, idx) => {
        if (m.dbColumn && row[idx] !== undefined) record[m.dbColumn] = row[idx].trim();
      });

      const name = record.name;
      if (!name) {
        res.errors++;
        res.errorDetails.push({ line: i + 2, message: "Campo 'nome' está vazio ou não mapeado", data: record });
        continue;
      }

      // Check if collaborator already exists (has any inventory entry)
      if (existingCollabs.has(name.toLowerCase().trim())) {
        // Update existing items for this collaborator
        const updates: Record<string, string> = {};
        if (record.cargo) updates.cargo = record.cargo;
        if (record.sector) updates.sector = record.sector;
        if (record.gestor) updates.gestor = record.gestor;
        if (record.email) updates.email_address = record.email;

        if (Object.keys(updates).length > 0) {
          await supabase.from("inventory").update(updates).eq("collaborator", name);
        }
        res.updated++;
      } else {
        // Create a placeholder inventory entry for the collaborator
        await supabase.from("inventory").insert({
          category: "notebooks",
          asset_code: "TEMP",
          status: "Em uso",
          collaborator: name,
          cargo: record.cargo || "",
          sector: record.sector || "",
          gestor: record.gestor || "",
          email_address: record.email || "",
        });
        res.inserted++;
        res.collaboratorsCreated++;
        existingCollabs.add(name.toLowerCase().trim());
      }

      setProgress(Math.round(((i + 1) / total) * 100));
    }
  };

  const importInventory = async (res: ImportResult, total: number) => {
    // Determine unique key for upsert
    const uniqueKeyCol = category === "linhas" ? "numero" : "service_tag";
    const hasUniqueKey = mapping.some((m) => m.dbColumn === uniqueKeyCol);

    // Pre-fetch existing unique keys for duplicate detection
    const existingMap = new Map<string, string>(); // uniqueValue → id
    if (hasUniqueKey) {
      const { data } = await supabase
        .from("inventory")
        .select(`id, ${uniqueKeyCol}`)
        .eq("category", category as string);
      data?.forEach((r: any) => {
        const val = r[uniqueKeyCol];
        if (val && val.trim() !== "") existingMap.set(val.trim().toLowerCase(), r.id);
      });
    }

    // Also track existing collaborators for auto-creation
    const existingCollabs = await getExistingCollaborators();

    for (let i = 0; i < csvData.rows.length; i++) {
      const row = csvData.rows[i];
      const record: Record<string, string> = {};
      mapping.forEach((m, idx) => {
        if (m.dbColumn && row[idx] !== undefined) record[m.dbColumn] = row[idx].trim();
      });

      // Auto-create collaborator if doesn't exist
      const collabName = record.collaborator;
      if (collabName && !existingCollabs.has(collabName.toLowerCase().trim())) {
        // We don't create a separate inventory entry for the collab — they'll get one from this import
        existingCollabs.add(collabName.toLowerCase().trim());
        res.collaboratorsCreated++;
      }

      // Build the insert/update payload
      const payload: Record<string, any> = {
        category: category as string,
        ...record,
      };
      delete payload.dbColumn;

      // Auto-set status based on collaborator presence
      const collabValue = (payload.collaborator || "").trim();
      if (collabValue) {
        if (!payload.status) payload.status = "Em uso";
      } else {
        if (!payload.status) payload.status = "Disponível";
      }

      // Check for duplicate
      const uniqueVal = record[uniqueKeyCol];
      const existingId = uniqueVal ? existingMap.get(uniqueVal.trim().toLowerCase()) : null;

      try {
        if (existingId) {
          const updatePayload = { ...payload };
          delete updatePayload.category;
          updatePayload.updated_at = new Date().toISOString();
          const { error } = await supabase.from("inventory").update(updatePayload).eq("id", existingId);
          if (error) {
            console.error(`Erro ao atualizar linha ${i + 2}:`, error.message, record);
            res.errors++;
            res.errorDetails.push({ line: i + 2, message: `Atualização: ${error.message}`, data: record });
          } else { res.updated++; }
        } else {
          payload.asset_code = "TEMP";
          const { error } = await supabase.from("inventory").insert(payload as any);
          if (error) {
            console.error(`Erro ao inserir linha ${i + 2}:`, error.message, record);
            res.errors++;
            res.errorDetails.push({ line: i + 2, message: `Inserção: ${error.message}`, data: record });
          } else { res.inserted++; }
          if (uniqueVal) existingMap.set(uniqueVal.trim().toLowerCase(), "new");
        }
      } catch (err: any) {
        console.error(`Exceção na linha ${i + 2}:`, err?.message || err, record);
        res.errors++;
        res.errorDetails.push({ line: i + 2, message: `Exceção: ${err?.message || "Erro desconhecido"}`, data: record });
      }

      setProgress(Math.round(((i + 1) / total) * 100));
    }
  };

  const reset = () => {
    setStep("upload");
    setFile(null);
    setCsvData({ headers: [], rows: [] });
    setCategory("");
    setMapping([]);
    setProgress(0);
    setResult(null);
  };

  const columnOptions = category === "colaborador" ? collaboratorColumns : inventoryColumns;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
          Importação de Dados via CSV
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Step 1: Upload */}
        {step === "upload" && (
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed p-12 cursor-pointer transition-colors",
              isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30"
            )}
          >
            <Upload className={cn("h-12 w-12", isDragging ? "text-primary" : "text-muted-foreground/50")} />
            <div className="text-center">
              <p className="font-medium">Arraste seu arquivo CSV aqui</p>
              <p className="text-sm text-muted-foreground mt-1">ou clique para selecionar</p>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
            />
          </div>
        )}

        {/* Step 2: Category selection */}
        {step === "category" && file && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-4">
              <FileSpreadsheet className="h-8 w-8 text-primary" />
              <div className="flex-1">
                <p className="font-medium">{file.name}</p>
                <p className="text-sm text-muted-foreground">
                  {csvData.rows.length} registro(s) encontrado(s) · {csvData.headers.length} colunas
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={reset}><X className="h-4 w-4" /></Button>
            </div>

            <div>
              <p className="font-medium mb-3">Qual o tipo de dado deste arquivo?</p>
              <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
                {categoryOptions.map((opt) => (
                  <Button
                    key={opt.value}
                    variant="outline"
                    className="h-auto py-4 flex-col gap-1"
                    onClick={() => handleCategorySelect(opt.value)}
                  >
                    <span className="font-semibold">{opt.label}</span>
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Column mapping */}
        {step === "mapping" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Mapeamento de Colunas</p>
                <p className="text-sm text-muted-foreground">Verifique o mapeamento automático e ajuste se necessário</p>
              </div>
              <Button variant="ghost" size="sm" onClick={reset}>Cancelar</Button>
            </div>

            <div className="rounded-lg border divide-y max-h-[400px] overflow-y-auto">
              {mapping.map((m, i) => (
                <div key={i} className="flex items-center gap-3 p-3">
                  <span className="flex-1 text-sm font-mono truncate" title={m.csvHeader}>
                    {m.csvHeader}
                  </span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  <Select value={m.dbColumn} onValueChange={(v) => updateMapping(i, v)}>
                    <SelectTrigger className={cn("w-[180px]", m.dbColumn ? "" : "text-muted-foreground")}>
                      <SelectValue placeholder="(Ignorar)" />
                    </SelectTrigger>
                    <SelectContent>
                      {columnOptions.map((col) => (
                        <SelectItem key={col.value} value={col.value || "_ignore"}>{col.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {m.dbColumn && m.dbColumn !== "_ignore" && (
                    <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-muted-foreground">
                {mapping.filter((m) => m.dbColumn && m.dbColumn !== "_ignore").length} de {mapping.length} colunas mapeadas
              </p>
              <Button onClick={runImport} disabled={!mapping.some((m) => m.dbColumn && m.dbColumn !== "_ignore")}>
                <Upload className="mr-2 h-4 w-4" />
                Importar {csvData.rows.length} registros
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Progress */}
        {step === "importing" && (
          <div className="space-y-4 py-8">
            <div className="text-center">
              <p className="font-medium mb-2">Importando dados...</p>
              <p className="text-sm text-muted-foreground">{progress}% concluído</p>
            </div>
            <Progress value={progress} className="h-3" />
          </div>
        )}

        {/* Step 5: Result */}
        {step === "done" && result && (
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-center gap-3 mb-4">
              <CheckCircle2 className="h-10 w-10 text-success" />
              <p className="text-xl font-bold">Importação concluída!</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border p-4 text-center">
                <p className="text-2xl font-bold text-success">{result.inserted}</p>
                <p className="text-sm text-muted-foreground">Novos registros</p>
              </div>
              <div className="rounded-lg border p-4 text-center">
                <p className="text-2xl font-bold text-info">{result.updated}</p>
                <p className="text-sm text-muted-foreground">Atualizados</p>
              </div>
              {result.collaboratorsCreated > 0 && (
                <div className="rounded-lg border p-4 text-center">
                  <p className="text-2xl font-bold text-primary">{result.collaboratorsCreated}</p>
                  <p className="text-sm text-muted-foreground">Colaboradores criados</p>
                </div>
              )}
              {result.errors > 0 && (
                <div className="rounded-lg border p-4 text-center">
                  <p className="text-2xl font-bold text-destructive">{result.errors}</p>
                  <p className="text-sm text-muted-foreground">Erros</p>
                </div>
              )}
            </div>

            {/* Error Details Panel */}
            {result.errorDetails.length > 0 && (
              <Collapsible defaultOpen>
                <CollapsibleTrigger className="flex items-center gap-2 w-full rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-left hover:bg-destructive/10 transition-colors group">
                  <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
                  <span className="font-medium text-destructive flex-1">
                    {result.errorDetails.length} erro(s) encontrado(s) — clique para ver detalhes
                  </span>
                  <ChevronDown className="h-4 w-4 text-destructive transition-transform group-data-[state=closed]:rotate-[-90deg]" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-2 max-h-[350px] overflow-y-auto rounded-lg border divide-y">
                    {result.errorDetails.map((err, idx) => (
                      <ErrorDetailRow key={idx} error={err} />
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

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
