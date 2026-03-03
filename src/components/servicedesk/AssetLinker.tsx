import { useState } from "react";
import {
  HardwareAsset,
  assetRequestCategories,
  getAssetTypeForCategory,
} from "@/hooks/use-assets";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertCircle, Link2, Package, CheckCircle2, Laptop } from "lucide-react";
import { toast } from "sonner";

interface AssetLinkerProps {
  ticketId: string;
  ticketCategory: string;
  linkedAssetId?: string;
  linkedAsset?: HardwareAsset;
  availableAssets: HardwareAsset[];
  onLink: (assetId: string) => void;
}

export function AssetLinker({
  ticketId,
  ticketCategory,
  linkedAssetId,
  linkedAsset,
  availableAssets,
  onLink,
}: AssetLinkerProps) {
  const [open, setOpen] = useState(false);

  // Only show for asset request categories
  if (!assetRequestCategories.includes(ticketCategory)) return null;

  const assetType = getAssetTypeForCategory(ticketCategory);

  // Already linked
  if (linkedAssetId && linkedAsset) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/5 px-3 py-2 text-sm">
        <CheckCircle2 className="h-4 w-4 text-success" />
        <div className="flex-1">
          <span className="font-medium text-success">Ativo vinculado: </span>
          <span className="text-foreground">
            {linkedAsset.model} ({linkedAsset.serviceTag})
          </span>
          <span className="ml-2 rounded-full bg-warning/15 px-2 py-0.5 text-xs font-medium text-warning">
            {linkedAsset.status}
          </span>
        </div>
      </div>
    );
  }

  // Available assets alert
  return (
    <div className="space-y-2">
      {availableAssets.length > 0 ? (
        <div className="flex items-center justify-between rounded-lg border border-info/30 bg-info/5 px-3 py-2">
          <div className="flex items-center gap-2 text-sm">
            <Package className="h-4 w-4 text-info" />
            <span>
              <span className="font-semibold text-info">
                {availableAssets.length} {assetType}(s)
              </span>{" "}
              disponível(is) no estoque
            </span>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1.5">
                <Link2 className="h-3.5 w-3.5" />
                Vincular ativo disponível
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Laptop className="h-5 w-5" />
                  Selecionar {assetType} Disponível
                </DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">
                Vincule um ativo ao chamado <strong>{ticketId}</strong>. O status
                do ativo será alterado para <strong>Reservado</strong>.
              </p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Modelo</TableHead>
                    <TableHead>Service Tag</TableHead>
                    <TableHead>Notas</TableHead>
                    <TableHead className="text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {availableAssets.map((asset) => (
                    <TableRow key={asset.id}>
                      <TableCell className="font-mono text-sm">
                        {asset.id}
                      </TableCell>
                      <TableCell className="font-medium">
                        {asset.model}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {asset.serviceTag}
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate text-sm text-muted-foreground">
                        {asset.notes || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          onClick={() => {
                            onLink(asset.id);
                            setOpen(false);
                            toast.success(
                              `Ativo ${asset.id} (${asset.model}) vinculado ao chamado ${ticketId}`,
                              {
                                description:
                                  "Status do ativo alterado para Reservado",
                              }
                            );
                          }}
                        >
                          <Link2 className="mr-1 h-3.5 w-3.5" />
                          Vincular
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </DialogContent>
          </Dialog>
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/5 px-3 py-2 text-sm">
          <AlertCircle className="h-4 w-4 text-warning" />
          <span>
            Nenhum <strong>{assetType}</strong> disponível no estoque
          </span>
        </div>
      )}
    </div>
  );
}

/** Compact inline version for Kanban cards */
export function AssetLinkerCompact({
  ticketCategory,
  linkedAssetId,
  linkedAsset,
  availableCount,
}: {
  ticketCategory: string;
  linkedAssetId?: string;
  linkedAsset?: HardwareAsset;
  availableCount: number;
}) {
  if (!assetRequestCategories.includes(ticketCategory)) return null;

  if (linkedAssetId && linkedAsset) {
    return (
      <div className="flex items-center gap-1.5 rounded bg-success/10 px-2 py-1 text-xs">
        <CheckCircle2 className="h-3 w-3 text-success" />
        <span className="font-medium text-success">{linkedAsset.model}</span>
      </div>
    );
  }

  if (availableCount > 0) {
    return (
      <div className="flex items-center gap-1.5 rounded bg-info/10 px-2 py-1 text-xs">
        <Package className="h-3 w-3 text-info" />
        <span className="text-info">{availableCount} disponível(is)</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 rounded bg-warning/10 px-2 py-1 text-xs">
      <AlertCircle className="h-3 w-3 text-warning" />
      <span className="text-warning">Sem estoque</span>
    </div>
  );
}
