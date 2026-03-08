import { useCollaboratorDetail, CollaboratorAsset, CollaboratorCustomField } from "@/hooks/use-collaborators";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ArrowLeft, FileDown, Laptop, Phone, FileText, Loader2 } from "lucide-react";
import { generateResponsibilityPDF } from "@/lib/pdf-responsibility";

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
};

const categoryConfig: Record<string, { label: string; icon: React.ElementType }> = {
  hardware: { label: "Hardware (Notebooks / Tablets / Periféricos)", icon: Laptop },
  telecom: { label: "Telecom (Linhas / Chips)", icon: Phone },
  licenses: { label: "Licenças de Software", icon: FileText },
};

function AssetSection({
  category,
  assets,
  customFields,
}: {
  category: string;
  assets: CollaboratorAsset[];
  customFields: CollaboratorCustomField[];
}) {
  const config = categoryConfig[category];
  if (!config || assets.length === 0) return null;
  const Icon = config.icon;

  // Get unique custom field names for this category's assets
  const assetIds = new Set(assets.map((a) => a.id));
  const relevantFields = customFields.filter((cf) => assetIds.has(cf.asset_id));
  const fieldNames = [...new Set(relevantFields.map((f) => f.field_name))];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Icon className="h-5 w-5 text-muted-foreground" />
          {config.label}
          <Badge variant="secondary" className="ml-2">{assets.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Modelo</TableHead>
                {category === "hardware" && <TableHead>Tipo</TableHead>}
                {category === "hardware" && <TableHead>Service Tag</TableHead>}
                <TableHead>Setor</TableHead>
                {fieldNames.map((fn) => (
                  <TableHead key={fn}>{fn}</TableHead>
                ))}
                <TableHead>Notas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assets.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-xs">{item.asset_code}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[item.status] || "bg-secondary text-secondary-foreground"}`}>
                      {item.status}
                    </span>
                  </TableCell>
                  <TableCell>{item.model || "—"}</TableCell>
                  {category === "hardware" && (
                    <TableCell>
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">{item.asset_type || "—"}</span>
                    </TableCell>
                  )}
                  {category === "hardware" && (
                    <TableCell className="font-mono text-xs">{item.service_tag || "—"}</TableCell>
                  )}
                  <TableCell>{item.sector || "—"}</TableCell>
                  {fieldNames.map((fn) => {
                    const val = relevantFields.find((cf) => cf.asset_id === item.id && cf.field_name === fn);
                    return <TableCell key={fn}>{val?.value || "—"}</TableCell>;
                  })}
                  <TableCell className="max-w-[150px] truncate text-sm text-muted-foreground">{item.notes || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

export function CollaboratorProfile({ name, onBack }: Props) {
  const { assets, customFields, loading } = useCollaboratorDetail(name);

  const hardware = assets.filter((a) => a.category === "hardware");
  const telecom = assets.filter((a) => a.category === "telecom");
  const licenses = assets.filter((a) => a.category === "licenses");

  const handleGeneratePDF = () => {
    generateResponsibilityPDF(name, assets, customFields);
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
      <div className="flex items-center justify-between">
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
          Gerar Termo de Responsabilidade
        </Button>
      </div>

      {assets.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12 text-muted-foreground">
            Nenhum ativo vinculado a este colaborador.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <AssetSection category="hardware" assets={hardware} customFields={customFields} />
          <AssetSection category="telecom" assets={telecom} customFields={customFields} />
          <AssetSection category="licenses" assets={licenses} customFields={customFields} />
        </div>
      )}
    </div>
  );
}
