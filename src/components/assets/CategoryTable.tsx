import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useInventory } from "@/hooks/use-inventory";
import { InlineCellEditor } from "@/components/assets/InlineCellEditor";
import { NewAssetDialog } from "@/components/assets/NewAssetDialog";
import { FieldManagerDialog } from "@/components/assets/FieldManagerDialog";
import { Trash2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const statusColors: Record<string, string> = {
  "Disponível": "bg-emerald-500/15 text-emerald-600",
  "Em uso": "bg-blue-500/15 text-blue-600",
  "Manutenção": "bg-amber-500/15 text-amber-600",
  "Baixado": "bg-muted text-muted-foreground",
  "Reservado": "bg-muted text-muted-foreground",
  "Ativo": "bg-emerald-500/15 text-emerald-600",
  "Desligado": "bg-red-500/15 text-red-600",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", statusColors[status] || "bg-secondary text-secondary-foreground")}>
      {status}
    </span>
  );
}

// Column definitions per category
interface ColDef {
  key: string;
  label: string;
  type?: "text" | "select" | "date" | "status" | "currency" | "readonly";
  options?: string[];
  mono?: boolean;
}

const statusOptionsDefault = ["Disponível", "Em uso", "Manutenção", "Reservado", "Baixado"];
const statusOptionsLicenca = ["Ativo", "Desligado"];
const tipoNotebook = ["Administrativo", "Campo"];

const columnsByCategory: Record<string, ColDef[]> = {
  notebooks: [
    { key: "asset_code", label: "Id", mono: true },
    { key: "service_tag", label: "Service tag" },
    { key: "collaborator", label: "Colaborador" },
    { key: "cargo", label: "Cargo" },
    { key: "marca", label: "Marca" },
    { key: "model", label: "Modelo" },
    { key: "cost_center", label: "Centro de custo" },
    { key: "contrato", label: "Contrato" },
    { key: "asset_type", label: "Tipo", type: "select", options: tipoNotebook },
    { key: "valor_pago", label: "Valor Pago", type: "currency" as any },
    { key: "notes", label: "Notas" },
    { key: "service_tag_2", label: "Service tag 2" },
  ],
  celulares: [
    { key: "asset_code", label: "Id", mono: true },
    { key: "service_tag", label: "Service tag" },
    { key: "collaborator", label: "Colaborador" },
    { key: "cargo", label: "Cargo" },
    { key: "marca", label: "Marca" },
    { key: "model", label: "Modelo" },
    { key: "cost_center", label: "Centro de custo" },
    { key: "contrato", label: "Contrato" },
    { key: "asset_type", label: "Tipo" },
    { key: "valor_pago", label: "Valor Pago", type: "currency" as any },
    { key: "notes", label: "Notas" },
    { key: "imei1", label: "Imei 1" },
    { key: "imei2", label: "Imei 2" },
  ],
  linhas: [
    { key: "asset_code", label: "Id", mono: true },
    { key: "numero", label: "Número" },
    { key: "collaborator", label: "Colaborador" },
    { key: "cargo", label: "Cargo" },
    { key: "asset_type", label: "Tipo" },
    { key: "gestor", label: "Gestor" },
    { key: "operadora", label: "Operadora" },
    { key: "contrato", label: "Contrato" },
    { key: "cost_center_eng", label: "Centro de custo - Eng" },
    { key: "cost_center_man", label: "Centro de custo - Man" },
    { key: "valor_pago", label: "Valor Pago", type: "readonly" as any },
  ],
  licencas: [
    { key: "asset_code", label: "Id", mono: true },
    { key: "status", label: "Status", type: "status" },
    { key: "collaborator", label: "Colaborador" },
    { key: "cargo", label: "Cargo" },
    { key: "email_address", label: "E-mail" },
    { key: "created_at", label: "Data criação", type: "date" },
    { key: "licenca", label: "Licença" },
    { key: "gestor", label: "Gestor" },
    { key: "contrato", label: "Contrato" },
    { key: "cost_center_eng", label: "Centro de custo - Eng" },
    { key: "cost_center_man", label: "Centro de custo - Man" },
    { key: "valor_pago", label: "Valor Pago", type: "readonly" as any },
  ],
};

interface Props {
  category: string;
  label: string;
}

export function CategoryTable({ category, label }: Props) {
  const {
    items, fields, loading,
    updateItem, deleteItem,
    addField, updateField, deleteField,
    getFieldValue, setFieldValue,
  } = useInventory(category);

  const columns = columnsByCategory[category] || [];

  // Bulk update dialog state
  const [bulkDialog, setBulkDialog] = useState<{
    open: boolean;
    model: string;
    value: string;
    count: number;
    itemId: string;
  }>({ open: false, model: "", value: "", count: 0, itemId: "" });

  const formatCurrency = (v: string | number | null | undefined): string => {
    if (v === null || v === undefined || v === "") return "";
    const num = typeof v === "string" ? parseFloat(v) : v;
    if (isNaN(num)) return "";
    return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const handleValorPagoSave = async (item: any, rawValue: string) => {
    const cleaned = rawValue.replace(/[^\d.,]/g, "").replace(",", ".");
    const num = parseFloat(cleaned);
    if (isNaN(num)) return;

    // Save to this item
    await updateItem(item.id, { valor_pago: num } as any);

    // Check for other items with the same model
    const model = (item.model || "").trim();
    if (!model) return;

    const othersWithModel = items.filter(
      (i) => i.id !== item.id && (i.model || "").trim().toLowerCase() === model.toLowerCase()
    );

    if (othersWithModel.length > 0) {
      setBulkDialog({
        open: true,
        model,
        value: formatCurrency(num),
        count: othersWithModel.length,
        itemId: item.id,
      });
    }
  };

  const handleBulkUpdate = async () => {
    const model = bulkDialog.model;
    const cleaned = bulkDialog.value.replace(/[^\d.,]/g, "").replace(",", ".");
    const num = parseFloat(cleaned);

    const othersWithModel = items.filter(
      (i) => i.id !== bulkDialog.itemId && (i.model || "").trim().toLowerCase() === model.toLowerCase()
    );

    const ids = othersWithModel.map((i) => i.id);
    if (ids.length > 0) {
      const { error } = await supabase
        .from("inventory")
        .update({ valor_pago: num, updated_at: new Date().toISOString() } as any)
        .in("id", ids);

      if (error) {
        toast.error("Erro ao atualizar em massa");
      } else {
        toast.success(`Valor atualizado para ${ids.length} itens do modelo "${model}"`);
      }
    }
    setBulkDialog((prev) => ({ ...prev, open: false }));
  };

  const handleNewAsset = async (data: Record<string, string>, fieldVals: Record<string, string>) => {
    const payload: Record<string, any> = {
      category,
      asset_code: "TEMP",
    };
    for (const col of columns) {
      if (col.key === "asset_code" || col.key === "created_at") continue;
      if (col.type === "readonly") continue;
      if (data[col.key] !== undefined) {
        if (col.type === "currency") {
          const cleaned = data[col.key].replace(/[^\d.,]/g, "").replace(",", ".");
          const num = parseFloat(cleaned);
          payload[col.key] = isNaN(num) ? null : num;
        } else {
          payload[col.key] = data[col.key];
        }
      }
    }
    if (!payload.status) payload.status = category === "licencas" ? "Ativo" : "Disponível";

    const { data: inserted, error } = await supabase
      .from("inventory")
      .insert(payload as any)
      .select()
      .single();

    if (error || !inserted) return;

    const entries = Object.entries(fieldVals).filter(([, v]) => v.trim() !== "");
    if (entries.length > 0) {
      await supabase.from("custom_field_values").insert(
        entries.map(([fieldId, value]) => ({ asset_id: (inserted as any).id, field_id: fieldId, value }))
      );
    }
  };

  const getStatusOptions = () => category === "licencas" ? statusOptionsLicenca : statusOptionsDefault;

  const getCellValue = (item: any, key: string): string => {
    if (key === "created_at") {
      return item.created_at ? new Date(item.created_at).toLocaleDateString("pt-BR") : "—";
    }
    return item[key] ?? "";
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold">{label}</CardTitle>
        <div className="flex items-center gap-2">
          <FieldManagerDialog categoryLabel={label} fields={fields} onAdd={addField} onUpdate={updateField} onDelete={deleteField} />
          <NewAssetDialog category={category} fields={fields} onSave={handleNewAsset} />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((col) => (
                  <TableHead key={col.key} className="whitespace-nowrap">{col.label}</TableHead>
                ))}
                {fields.map((f) => (
                  <TableHead key={f.id} className="whitespace-nowrap">{f.name}</TableHead>
                ))}
                <TableHead className="w-[60px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  {columns.map((col) => {
                    if (col.key === "asset_code") {
                      return (
                        <TableCell key={col.key} className="font-mono text-xs">
                          {item.asset_code}
                        </TableCell>
                      );
                    }
                    if (col.key === "created_at") {
                      return (
                        <TableCell key={col.key} className="text-sm">
                          {getCellValue(item, "created_at")}
                        </TableCell>
                      );
                    }
                    // Readonly (N/A for linhas/licencas)
                    if (col.type === "readonly") {
                      return (
                        <TableCell key={col.key} className="text-sm text-muted-foreground italic">
                          N/A
                        </TableCell>
                      );
                    }
                    // Currency column (valor_pago)
                    if (col.type === "currency") {
                      const raw = (item as any)[col.key];
                      const display = raw != null && raw !== "" ? formatCurrency(raw) : "";
                      return (
                        <TableCell key={col.key}>
                          <InlineCellEditor
                            value={raw != null && raw !== "" ? String(raw) : ""}
                            onSave={(v) => handleValorPagoSave(item, v)}
                            type="number"
                            displayRender={(v) => (
                              <span className="text-sm">{v ? formatCurrency(v) : <span className="text-muted-foreground italic">—</span>}</span>
                            )}
                          />
                        </TableCell>
                      );
                    }
                    if (col.type === "status") {
                      return (
                        <TableCell key={col.key}>
                          <InlineCellEditor
                            value={(item as any)[col.key] || ""}
                            onSave={(v) => updateItem(item.id, { [col.key]: v } as any)}
                            type="select"
                            options={getStatusOptions()}
                            displayRender={(v) => <StatusBadge status={v} />}
                          />
                        </TableCell>
                      );
                    }
                    if (col.type === "select" && col.options) {
                      return (
                        <TableCell key={col.key}>
                          <InlineCellEditor
                            value={(item as any)[col.key] || ""}
                            onSave={(v) => updateItem(item.id, { [col.key]: v } as any)}
                            type="select"
                            options={col.options}
                          />
                        </TableCell>
                      );
                    }
                    return (
                      <TableCell key={col.key} className={col.mono ? "font-mono text-xs" : ""}>
                        <InlineCellEditor
                          value={(item as any)[col.key] || ""}
                          onSave={(v) => updateItem(item.id, { [col.key]: v } as any)}
                        />
                      </TableCell>
                    );
                  })}
                  {fields.map((f) => (
                    <TableCell key={f.id}>
                      <InlineCellEditor
                        value={getFieldValue(item.id, f.id)}
                        onSave={(v) => setFieldValue(item.id, f.id, v)}
                        type={f.field_type === "seleção" ? "select" : f.field_type === "número" ? "number" : f.field_type === "data" ? "date" : "text"}
                        options={f.options || undefined}
                      />
                    </TableCell>
                  ))}
                  <TableCell>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteItem(item.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={columns.length + fields.length + 1} className="text-center py-8 text-muted-foreground">
                    Nenhum registro encontrado. Clique em "Novo ativo" para adicionar.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>

    <AlertDialog open={bulkDialog.open} onOpenChange={(v) => setBulkDialog((prev) => ({ ...prev, open: v }))}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Aplicar valor em massa?</AlertDialogTitle>
          <AlertDialogDescription>
            Deseja aplicar o valor de <strong>{bulkDialog.value}</strong> a todos os outros <strong>{bulkDialog.count}</strong> itens do modelo <strong>"{bulkDialog.model}"</strong>?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Não, apenas este</AlertDialogCancel>
          <AlertDialogAction onClick={handleBulkUpdate}>Sim, aplicar a todos</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
