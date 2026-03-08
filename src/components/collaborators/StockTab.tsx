import { useState } from "react";
import { useAvailableStock, CollaboratorAsset } from "@/hooks/use-collaborators";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { NewAssetDialog } from "@/components/assets/NewAssetDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Search, Package, UserPlus, Laptop, Smartphone, Phone, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

const statusColors: Record<string, string> = {
  "Disponível": "bg-emerald-500/15 text-emerald-600",
  "Em uso": "bg-blue-500/15 text-blue-600",
  "Ativo": "bg-emerald-500/15 text-emerald-600",
  "Desligado": "bg-red-500/15 text-red-600",
};

const catConfig: Record<string, { label: string; icon: React.ElementType }> = {
  notebooks: { label: "Notebooks", icon: Laptop },
  celulares: { label: "Celulares", icon: Smartphone },
  linhas: { label: "Linhas", icon: Phone },
  licencas: { label: "Licenças", icon: FileText },
};

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
          <UserPlus className="h-3 w-3" />
          Vincular
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Vincular ativo a colaborador</DialogTitle>
        </DialogHeader>
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

interface StockTabProps {
  onAssigned: () => void;
}

export function StockTab({ onAssigned }: StockTabProps) {
  const { items, loading, refetch } = useAvailableStock();
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");

  const filtered = items.filter((i) => {
    const matchesSearch =
      (i.model || "").toLowerCase().includes(search.toLowerCase()) ||
      (i.asset_code || "").toLowerCase().includes(search.toLowerCase()) ||
      (i.service_tag || "").toLowerCase().includes(search.toLowerCase()) ||
      (i.licenca || "").toLowerCase().includes(search.toLowerCase()) ||
      (i.numero || "").toLowerCase().includes(search.toLowerCase());
    const matchesCat = catFilter === "all" || i.category === catFilter;
    return matchesSearch && matchesCat;
  });

  const handleNewAsset = async (data: Record<string, string>, _fieldVals: Record<string, string>, category: string) => {
    const payload: Record<string, any> = {
      category,
      asset_code: "TEMP",
      status: category === "licencas" ? "Ativo" : "Disponível",
      ...data,
    };
    const { error } = await supabase.from("inventory").insert(payload as any);
    if (error) {
      toast.error("Erro ao criar ativo");
      return;
    }
    toast.success("Ativo criado no estoque");
    refetch();
  };

  const handleAssigned = () => {
    refetch();
    onAssigned();
  };

  const categories = ["notebooks", "celulares", "linhas", "licencas"];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar no estoque..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <Badge
            variant={catFilter === "all" ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => setCatFilter("all")}
          >
            Todos ({items.length})
          </Badge>
          {categories.map((cat) => {
            const count = items.filter((i) => i.category === cat).length;
            const cfg = catConfig[cat];
            if (!cfg) return null;
            return (
              <Badge
                key={cat}
                variant={catFilter === cat ? "default" : "outline"}
                className="cursor-pointer gap-1"
                onClick={() => setCatFilter(cat)}
              >
                <cfg.icon className="h-3 w-3" />
                {cfg.label} ({count})
              </Badge>
            );
          })}
        </div>
        <NewAssetDialog
          category={catFilter !== "all" ? catFilter : "notebooks"}
          fields={[]}
          onSave={(data, fv) => handleNewAsset(data, fv, catFilter !== "all" ? catFilter : "notebooks")}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Id</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Identificação</TableHead>
                  <TableHead>Modelo / Licença</TableHead>
                  <TableHead>Service tag</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((item) => {
                  const cfg = catConfig[item.category];
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-xs">{item.asset_code}</TableCell>
                      <TableCell>
                        {cfg && (
                          <Badge variant="secondary" className="gap-1 text-xs">
                            <cfg.icon className="h-3 w-3" />
                            {cfg.label}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", statusColors[item.status] || "bg-secondary text-secondary-foreground")}>
                          {item.status}
                        </span>
                      </TableCell>
                      <TableCell>{item.numero || item.service_tag || "—"}</TableCell>
                      <TableCell>{item.model || item.licenca || "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{item.service_tag || "—"}</TableCell>
                      <TableCell>
                        <AssignDialog asset={item} onAssigned={handleAssigned} />
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      <Package className="mx-auto mb-2 h-8 w-8" />
                      Nenhum item disponível no estoque
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
