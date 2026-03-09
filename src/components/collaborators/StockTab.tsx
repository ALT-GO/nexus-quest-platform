import { useState } from "react";
import { useAvailableStock, CollaboratorAsset } from "@/hooks/use-collaborators";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Search, Package, UserPlus, Laptop, Smartphone, Phone, FileText } from "lucide-react";
import { format } from "date-fns";

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
  header: string;
  accessor: (item: CollaboratorAsset) => string;
}

const notebookCols: ColDef[] = [
  { header: "Service tag", accessor: (i) => i.service_tag || "—" },
  { header: "Colaborador", accessor: (i) => i.collaborator || "—" },
  { header: "Cargo", accessor: (i) => i.cargo || "—" },
  { header: "Marca", accessor: (i) => i.marca || "—" },
  { header: "Modelo", accessor: (i) => i.model || "—" },
  { header: "Centro de custo", accessor: (i) => i.cost_center || "—" },
  { header: "Contrato", accessor: (i) => i.contrato || "—" },
  { header: "Tipo", accessor: (i) => i.asset_type || "—" },
  { header: "Notas", accessor: (i) => i.notes || "—" },
  { header: "Service tag 2", accessor: (i) => i.service_tag_2 || "—" },
];

const celularCols: ColDef[] = [
  { header: "Service tag", accessor: (i) => i.service_tag || "—" },
  { header: "Colaborador", accessor: (i) => i.collaborator || "—" },
  { header: "Cargo", accessor: (i) => i.cargo || "—" },
  { header: "Marca", accessor: (i) => i.marca || "—" },
  { header: "Modelo", accessor: (i) => i.model || "—" },
  { header: "Centro de custo", accessor: (i) => i.cost_center || "—" },
  { header: "Contrato", accessor: (i) => i.contrato || "—" },
  { header: "Tipo", accessor: (i) => i.asset_type || "—" },
  { header: "Notas", accessor: (i) => i.notes || "—" },
  { header: "Imei 1", accessor: (i) => i.imei1 || "—" },
  { header: "Imei 2", accessor: (i) => i.imei2 || "—" },
];

const linhaCols: ColDef[] = [
  { header: "Número", accessor: (i) => i.numero || "—" },
  { header: "Colaborador", accessor: (i) => i.collaborator || "—" },
  { header: "Cargo", accessor: (i) => i.cargo || "—" },
  { header: "Tipo", accessor: (i) => i.asset_type || "—" },
  { header: "Gestor", accessor: (i) => i.gestor || "—" },
  { header: "Operadora", accessor: (i) => i.operadora || "—" },
  { header: "Contrato", accessor: (i) => i.contrato || "—" },
  { header: "Centro de custo - Eng", accessor: (i) => i.cost_center_eng || "—" },
  { header: "Centro de custo - Man", accessor: (i) => i.cost_center_man || "—" },
];

const licencaCols: ColDef[] = [
  { header: "Status", accessor: (i) => i.status || "—" },
  { header: "Colaborador", accessor: (i) => i.collaborator || "—" },
  { header: "Cargo", accessor: (i) => i.cargo || "—" },
  { header: "E-mail", accessor: (i) => i.email_address || "—" },
  { header: "Data criação", accessor: (i) => i.created_at ? format(new Date(i.created_at), "dd/MM/yyyy") : "—" },
  { header: "Licença", accessor: (i) => i.licenca || "—" },
  { header: "Gestor", accessor: (i) => i.gestor || "—" },
  { header: "Contrato", accessor: (i) => i.contrato || "—" },
  { header: "Centro de custo - Eng", accessor: (i) => i.cost_center_eng || "—" },
  { header: "Centro de custo - Man", accessor: (i) => i.cost_center_man || "—" },
];

const colsByCat: Record<string, ColDef[]> = {
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

/* ── Category Table ────────────────────────────────────────── */
function CategoryStockTable({
  items,
  columns,
  search,
  onAssigned,
}: {
  items: CollaboratorAsset[];
  columns: ColDef[];
  search: string;
  onAssigned: () => void;
}) {
  const filtered = items.filter((i) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return columns.some((col) => col.accessor(i).toLowerCase().includes(q));
  });

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((col) => (
                  <TableHead key={col.header} className="whitespace-nowrap">{col.header}</TableHead>
                ))}
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item) => (
                <TableRow key={item.id}>
                  {columns.map((col) => (
                    <TableCell key={col.header} className="whitespace-nowrap text-sm">
                      {col.accessor(item)}
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

  // Filter to unowned items only
  const unowned = items.filter((i) => isUnowned(i.collaborator));

  const handleAssigned = () => {
    refetch();
    onAssigned();
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
              columns={colsByCat[tab.key]}
              search={search}
              onAssigned={handleAssigned}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
