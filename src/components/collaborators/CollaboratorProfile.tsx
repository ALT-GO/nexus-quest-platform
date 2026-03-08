import { useCollaboratorDetail, CollaboratorAsset } from "@/hooks/use-collaborators";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { InlineCellEditor } from "@/components/assets/InlineCellEditor";
import { ArrowLeft, FileDown, Laptop, Smartphone, Phone, FileText, Loader2, Plus } from "lucide-react";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import { generateResponsibilityPDF } from "@/lib/pdf-responsibility";
import { NewAssetDialog } from "@/components/assets/NewAssetDialog";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  name: string;
  onBack: () => void;
}

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
  type?: "text" | "select" | "date" | "status";
  options?: string[];
  readOnly?: boolean;
}

const statusOptionsDefault = ["Disponível", "Em uso", "Manutenção", "Reservado", "Baixado"];
const statusOptionsLicenca = ["Ativo", "Desligado"];
const tipoNotebook = ["Administrativo", "Campo"];

const columnsByCategory: Record<string, ColDef[]> = {
  notebooks: [
    { key: "service_tag", label: "Service tag" },
    { key: "cargo", label: "Cargo" },
    { key: "marca", label: "Marca" },
    { key: "model", label: "Modelo" },
    { key: "cost_center", label: "Centro de custo" },
    { key: "contrato", label: "Contrato" },
    { key: "asset_type", label: "Tipo", type: "select", options: tipoNotebook },
    { key: "notes", label: "Notas" },
    { key: "service_tag_2", label: "Service tag 2" },
  ],
  celulares: [
    { key: "service_tag", label: "Service tag" },
    { key: "cargo", label: "Cargo" },
    { key: "marca", label: "Marca" },
    { key: "model", label: "Modelo" },
    { key: "cost_center", label: "Centro de custo" },
    { key: "contrato", label: "Contrato" },
    { key: "asset_type", label: "Tipo" },
    { key: "notes", label: "Notas" },
    { key: "imei1", label: "Imei 1" },
    { key: "imei2", label: "Imei 2" },
  ],
  linhas: [
    { key: "numero", label: "Número" },
    { key: "cargo", label: "Cargo" },
    { key: "asset_type", label: "Tipo" },
    { key: "gestor", label: "Gestor" },
    { key: "operadora", label: "Operadora" },
    { key: "contrato", label: "Contrato" },
    { key: "cost_center_eng", label: "Centro de custo - Eng" },
    { key: "cost_center_man", label: "Centro de custo - Man" },
  ],
  licencas: [
    { key: "status", label: "Status", type: "status" },
    { key: "cargo", label: "Cargo" },
    { key: "email_address", label: "E-mail" },
    { key: "created_at", label: "Data criação", readOnly: true },
    { key: "licenca", label: "Licença" },
    { key: "gestor", label: "Gestor" },
    { key: "contrato", label: "Contrato" },
    { key: "cost_center_eng", label: "Centro de custo - Eng" },
    { key: "cost_center_man", label: "Centro de custo - Man" },
  ],
};

const categoryConfig: Record<string, { label: string; icon: React.ElementType }> = {
  notebooks: { label: "Notebooks", icon: Laptop },
  celulares: { label: "Celulares", icon: Smartphone },
  linhas: { label: "Linhas telefônicas", icon: Phone },
  licencas: { label: "Licenças", icon: FileText },
};

function AssetSection({
  category,
  assets,
  collaboratorName,
  onUpdate,
  onDelete,
  onRefetch,
}: {
  category: string;
  assets: CollaboratorAsset[];
  collaboratorName: string;
  onUpdate: (id: string, updates: Partial<CollaboratorAsset>) => void;
  onDelete: (id: string) => void;
  onRefetch: () => void;
}) {
  const config = categoryConfig[category];
  if (!config) return null;
  const Icon = config.icon;
  const columns = columnsByCategory[category] || [];

  const handleNewAsset = async (data: Record<string, string>) => {
    const payload: Record<string, any> = {
      category,
      asset_code: "TEMP",
      collaborator: collaboratorName,
      status: category === "licencas" ? "Ativo" : "Em uso",
    };
    for (const col of columns) {
      if (col.key === "created_at") continue;
      if (data[col.key] !== undefined) payload[col.key] = data[col.key];
    }
    // Copy extra fields from data
    Object.keys(data).forEach((k) => {
      if (!payload[k] && data[k]) payload[k] = data[k];
    });

    const { error } = await supabase.from("inventory").insert(payload as any);
    if (error) {
      toast.error("Erro ao criar ativo");
      return;
    }
    toast.success("Ativo criado com sucesso");
    onRefetch();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Icon className="h-5 w-5 text-muted-foreground" />
          {config.label}
          <Badge variant="secondary" className="ml-2">{assets.length}</Badge>
        </CardTitle>
        <NewAssetDialog
          category={category}
          fields={[]}
          onSave={async (data) => { await handleNewAsset(data); }}
        />
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Id</TableHead>
                {columns.map((col) => (
                  <TableHead key={col.key} className="whitespace-nowrap">{col.label}</TableHead>
                ))}
                <TableHead className="w-[60px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assets.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-xs">{item.asset_code}</TableCell>
                  {columns.map((col) => {
                    if (col.readOnly) {
                      const val = col.key === "created_at"
                        ? new Date(item.created_at).toLocaleDateString("pt-BR")
                        : (item as any)[col.key] || "—";
                      return <TableCell key={col.key} className="text-sm">{val}</TableCell>;
                    }
                    if (col.type === "status") {
                      return (
                        <TableCell key={col.key}>
                          <InlineCellEditor
                            value={(item as any)[col.key] || ""}
                            onSave={(v) => onUpdate(item.id, { [col.key]: v } as any)}
                            type="select"
                            options={category === "licencas" ? statusOptionsLicenca : statusOptionsDefault}
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
                            onSave={(v) => onUpdate(item.id, { [col.key]: v } as any)}
                            type="select"
                            options={col.options}
                          />
                        </TableCell>
                      );
                    }
                    return (
                      <TableCell key={col.key}>
                        <InlineCellEditor
                          value={(item as any)[col.key] || ""}
                          onSave={(v) => onUpdate(item.id, { [col.key]: v } as any)}
                        />
                      </TableCell>
                    );
                  })}
                  <TableCell>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => onDelete(item.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {assets.length === 0 && (
                <TableRow>
                  <TableCell colSpan={columns.length + 2} className="text-center py-6 text-muted-foreground">
                    Nenhum item nesta categoria
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

export function CollaboratorProfile({ name, onBack }: Props) {
  const { assets, loading, refetch, updateAsset, deleteAsset } = useCollaboratorDetail(name);

  const notebooks = assets.filter((a) => a.category === "notebooks" || a.category === "hardware");
  const celulares = assets.filter((a) => a.category === "celulares");
  const linhas = assets.filter((a) => a.category === "linhas" || a.category === "telecom");
  const licencas = assets.filter((a) => a.category === "licencas" || a.category === "licenses");

  const handleGeneratePDF = () => {
    generateResponsibilityPDF(name, assets, []);
  };

  const handleDelete = async (id: string) => {
    await deleteAsset(id);
    toast.success("Ativo excluído");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-xl font-bold">{name}</h2>
            <p className="text-sm text-muted-foreground">{assets.length} ativo(s) vinculado(s)</p>
          </div>
        </div>
        <Button onClick={handleGeneratePDF} className="gap-2">
          <FileDown className="h-4 w-4" />
          Gerar termo de responsabilidade
        </Button>
      </div>

      {assets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <p>Nenhum ativo vinculado a este colaborador.</p>
            <p className="text-xs mt-1">Use o botão "Novo ativo" em cada seção para adicionar.</p>
          </CardContent>
        </Card>
      ) : null}

      <div className="space-y-6">
        <AssetSection category="notebooks" assets={notebooks} collaboratorName={name} onUpdate={updateAsset} onDelete={handleDelete} onRefetch={refetch} />
        <AssetSection category="celulares" assets={celulares} collaboratorName={name} onUpdate={updateAsset} onDelete={handleDelete} onRefetch={refetch} />
        <AssetSection category="linhas" assets={linhas} collaboratorName={name} onUpdate={updateAsset} onDelete={handleDelete} onRefetch={refetch} />
        <AssetSection category="licencas" assets={licencas} collaboratorName={name} onUpdate={updateAsset} onDelete={handleDelete} onRefetch={refetch} />
      </div>
    </div>
  );
}
