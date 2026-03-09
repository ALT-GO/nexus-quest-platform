import { useState, useCallback, useRef } from "react";
import { useAvailableStock, CollaboratorAsset } from "@/hooks/use-collaborators";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Search, Package, UserPlus, Laptop, Smartphone, Phone, FileText, GripVertical } from "lucide-react";
import { format } from "date-fns";
import { InlineStockCell } from "./InlineStockCell";
import { StockFilters, getFiltersForCategory } from "./StockFilters";

/* ── Assign dialog ─────────────────────────────────────────── */
function AssignDialog({ asset, onAssigned }: { asset: CollaboratorAsset; onAssigned: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const handleAssign = async () => {
    if (!name.trim()) return;
    setSaving(true);
    await supabase.from("inventory").update({
      collaborator: name.trim(),
      status: asset.category === "licencas" ? "Ativo" : "Em uso",
      updated_at: new Date().toISOString(),
    }).eq("id", asset.id);
    toast.success(`Ativo ${asset.asset_code} vinculado a ${name.trim()}`);
    setSaving(false);
    setName("");
    setOpen(false);
    onAssigned();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1 h-7 text-xs">
          <UserPlus className="h-3 w-3" /> Vincular
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Vincular ativo a colaborador</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">{asset.asset_code} — {asset.model || asset.licenca || asset.numero || "Sem nome"}</p>
        <div className="space-y-3 pt-2">
          <Input placeholder="Nome do colaborador" value={name} onChange={(e) => setName(e.target.value)} />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleAssign} disabled={saving || !name.trim()}>
              {saving ? "Salvando..." : "Vincular"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ── Column definitions per category ───────────────────────── */
interface ColDef {
  id: string;
  header: string;
  field: keyof CollaboratorAsset | null; // null = computed
  accessor: (item: CollaboratorAsset) => string;
}

const notebookCols: ColDef[] = [
  { id: "service_tag", header: "Service tag", field: "service_tag", accessor: (i) => i.service_tag || "" },
  { id: "collaborator", header: "Colaborador", field: "collaborator", accessor: (i) => i.collaborator || "" },
  { id: "cargo", header: "Cargo", field: "cargo", accessor: (i) => i.cargo || "" },
  { id: "marca", header: "Marca", field: "marca", accessor: (i) => i.marca || "" },
  { id: "model", header: "Modelo", field: "model", accessor: (i) => i.model || "" },
  { id: "cost_center", header: "Centro de custo", field: "cost_center", accessor: (i) => i.cost_center || "" },
  { id: "contrato", header: "Contrato", field: "contrato", accessor: (i) => i.contrato || "" },
  { id: "asset_type", header: "Tipo", field: "asset_type", accessor: (i) => i.asset_type || "" },
  { id: "notes", header: "Notas", field: "notes", accessor: (i) => i.notes || "" },
  { id: "service_tag_2", header: "Service tag 2", field: "service_tag_2", accessor: (i) => i.service_tag_2 || "" },
];

const celularCols: ColDef[] = [
  { id: "service_tag", header: "Service tag", field: "service_tag", accessor: (i) => i.service_tag || "" },
  { id: "collaborator", header: "Colaborador", field: "collaborator", accessor: (i) => i.collaborator || "" },
  { id: "cargo", header: "Cargo", field: "cargo", accessor: (i) => i.cargo || "" },
  { id: "marca", header: "Marca", field: "marca", accessor: (i) => i.marca || "" },
  { id: "model", header: "Modelo", field: "model", accessor: (i) => i.model || "" },
  { id: "cost_center", header: "Centro de custo", field: "cost_center", accessor: (i) => i.cost_center || "" },
  { id: "contrato", header: "Contrato", field: "contrato", accessor: (i) => i.contrato || "" },
  { id: "asset_type", header: "Tipo", field: "asset_type", accessor: (i) => i.asset_type || "" },
  { id: "notes", header: "Notas", field: "notes", accessor: (i) => i.notes || "" },
  { id: "imei1", header: "Imei 1", field: "imei1", accessor: (i) => i.imei1 || "" },
  { id: "imei2", header: "Imei 2", field: "imei2", accessor: (i) => i.imei2 || "" },
];

const linhaCols: ColDef[] = [
  { id: "numero", header: "Número", field: "numero", accessor: (i) => i.numero || "" },
  { id: "collaborator", header: "Colaborador", field: "collaborator", accessor: (i) => i.collaborator || "" },
  { id: "cargo", header: "Cargo", field: "cargo", accessor: (i) => i.cargo || "" },
  { id: "asset_type", header: "Tipo", field: "asset_type", accessor: (i) => i.asset_type || "" },
  { id: "gestor", header: "Gestor", field: "gestor", accessor: (i) => i.gestor || "" },
  { id: "operadora", header: "Operadora", field: "operadora", accessor: (i) => i.operadora || "" },
  { id: "contrato", header: "Contrato", field: "contrato", accessor: (i) => i.contrato || "" },
  { id: "cost_center_eng", header: "Centro de custo - Eng", field: "cost_center_eng", accessor: (i) => i.cost_center_eng || "" },
  { id: "cost_center_man", header: "Centro de custo - Man", field: "cost_center_man", accessor: (i) => i.cost_center_man || "" },
];

const licencaCols: ColDef[] = [
  { id: "status", header: "Status", field: "status", accessor: (i) => i.status || "" },
  { id: "collaborator", header: "Colaborador", field: "collaborator", accessor: (i) => i.collaborator || "" },
  { id: "cargo", header: "Cargo", field: "cargo", accessor: (i) => i.cargo || "" },
  { id: "email_address", header: "E-mail", field: "email_address", accessor: (i) => i.email_address || "" },
  { id: "created_at", header: "Data criação", field: null, accessor: (i) => i.created_at ? format(new Date(i.created_at), "dd/MM/yyyy") : "" },
  { id: "licenca", header: "Licença", field: "licenca", accessor: (i) => i.licenca || "" },
  { id: "gestor", header: "Gestor", field: "gestor", accessor: (i) => i.gestor || "" },
  { id: "contrato", header: "Contrato", field: "contrato", accessor: (i) => i.contrato || "" },
  { id: "cost_center_eng", header: "Centro de custo - Eng", field: "cost_center_eng", accessor: (i) => i.cost_center_eng || "" },
  { id: "cost_center_man", header: "Centro de custo - Man", field: "cost_center_man", accessor: (i) => i.cost_center_man || "" },
];

const defaultColsByCat: Record<string, ColDef[]> = {
  notebooks: notebookCols,
  celulares: celularCols,
  linhas: linhaCols,
  licencas: licencaCols,
};

const tabConfig = [
  { key: "notebooks", label: "Notebooks", icon: Laptop },
  { key: "celulares", label: "Celulares", icon: Smartphone },
  { key: "linhas", label: "Linhas", icon: Phone },
  { key: "licencas", label: "Licenças", icon: FileText },
];

/* ── Helper: is item "unowned" ─────────────────────────────── */
function isUnowned(collaborator: string | null | undefined): boolean {
  if (!collaborator) return true;
  const trimmed = collaborator.trim();
  return trimmed === "" || trimmed === "-" || trimmed === "—";
}

/* ── Column order hook with localStorage ───────────────────── */
function useColumnOrder(category: string, defaultCols: ColDef[]): [ColDef[], (fromIdx: number, toIdx: number) => void] {
  const storageKey = `stock-col-order-${category}`;
  const [orderedIds, setOrderedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    } catch {}
    return defaultCols.map((c) => c.id);
  });

  const reorder = useCallback((fromIdx: number, toIdx: number) => {
    setOrderedIds((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch {}
      return next;
    });
  }, [storageKey]);

  // Map ordered IDs to actual ColDef objects
  const colMap = new Map(defaultCols.map((c) => [c.id, c]));
  const ordered = orderedIds
    .map((id) => colMap.get(id))
    .filter(Boolean) as ColDef[];
  // Append any new cols not in saved order
  for (const col of defaultCols) {
    if (!ordered.find((c) => c.id === col.id)) ordered.push(col);
  }

  return [ordered, reorder];
}

/* ── Draggable Header ──────────────────────────────────────── */
function DraggableHeader({
  col,
  index,
  onDragStart,
  onDragOver,
  onDrop,
}: {
  col: ColDef;
  index: number;
  onDragStart: (idx: number) => void;
  onDragOver: (e: React.DragEvent, idx: number) => void;
  onDrop: (idx: number) => void;
}) {
  return (
    <TableHead
      className="whitespace-nowrap select-none cursor-grab active:cursor-grabbing"
      draggable
      onDragStart={() => onDragStart(index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDrop={() => onDrop(index)}
    >
      <span className="inline-flex items-center gap-1">
        <GripVertical className="h-3 w-3 opacity-30" />
        {col.header}
      </span>
    </TableHead>
  );
}

/* ── Category Table ────────────────────────────────────────── */
function CategoryStockTable({
  items,
  category,
  search,
  onAssigned,
  onCellSave,
  advancedFilters,
}: {
  items: CollaboratorAsset[];
  category: string;
  search: string;
  onAssigned: () => void;
  onCellSave: (id: string, field: string, value: string) => Promise<void>;
  advancedFilters: Record<string, string>;
}) {
  const [columns, reorderColumns] = useColumnOrder(category, defaultColsByCat[category]);
  const dragIdx = useRef<number | null>(null);

  const filtered = items.filter((i) => {
    // Global search
    if (search) {
      const q = search.toLowerCase();
      if (!columns.some((col) => col.accessor(i).toLowerCase().includes(q))) return false;
    }
    // Advanced filters (cumulative)
    for (const [field, val] of Object.entries(advancedFilters)) {
      if (!val) continue;
      const itemVal = ((i as any)[field] ?? "").toString().toLowerCase();
      if (!itemVal.includes(val.toLowerCase())) return false;
    }
    return true;
  });

  const handleDragStart = (idx: number) => { dragIdx.current = idx; };
  const handleDragOver = (e: React.DragEvent, _idx: number) => { e.preventDefault(); };
  const handleDrop = (toIdx: number) => {
    if (dragIdx.current !== null && dragIdx.current !== toIdx) {
      reorderColumns(dragIdx.current, toIdx);
    }
    dragIdx.current = null;
  };

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((col, idx) => (
                  <DraggableHeader
                    key={col.id}
                    col={col}
                    index={idx}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                  />
                ))}
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item) => (
                <TableRow key={item.id}>
                  {columns.map((col) => (
                    <TableCell key={col.id} className="whitespace-nowrap p-1.5">
                      {col.field ? (
                        <InlineStockCell
                          value={col.accessor(item)}
                          onSave={(v) => onCellSave(item.id, col.field!, v)}
                        />
                      ) : (
                        <span className="text-sm px-1">{col.accessor(item) || <span className="text-muted-foreground italic">—</span>}</span>
                      )}
                    </TableCell>
                  ))}
                  <TableCell>
                    <AssignDialog asset={item} onAssigned={onAssigned} />
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={columns.length + 1} className="text-center py-8 text-muted-foreground">
                    <Package className="mx-auto mb-2 h-8 w-8" />
                    Nenhum item disponível nesta categoria
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

/* ── Main StockTab ─────────────────────────────────────────── */
interface StockTabProps {
  onAssigned: () => void;
}

export function StockTab({ onAssigned }: StockTabProps) {
  const { items, loading, refetch } = useAvailableStock();
  const [search, setSearch] = useState("");

  const unowned = items.filter((i) => isUnowned(i.collaborator));

  const handleAssigned = () => {
    refetch();
    onAssigned();
  };

  const handleCellSave = async (id: string, field: string, value: string) => {
    const { error } = await supabase
      .from("inventory")
      .update({ [field]: value, updated_at: new Date().toISOString() } as any)
      .eq("id", id);
    if (error) {
      toast.error("Erro ao salvar alteração");
    }
    // Realtime subscription will refresh data automatically
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar no estoque..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <Tabs defaultValue="notebooks">
        <TabsList>
          {tabConfig.map((tab) => {
            const count = unowned.filter((i) => i.category === tab.key).length;
            return (
              <TabsTrigger key={tab.key} value={tab.key} className="gap-1.5">
                <tab.icon className="h-4 w-4" />
                {tab.label} ({count})
              </TabsTrigger>
            );
          })}
        </TabsList>

        {tabConfig.map((tab) => (
          <TabsContent key={tab.key} value={tab.key}>
            <CategoryStockTable
              items={unowned.filter((i) => i.category === tab.key)}
              category={tab.key}
              search={search}
              onAssigned={handleAssigned}
              onCellSave={handleCellSave}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
