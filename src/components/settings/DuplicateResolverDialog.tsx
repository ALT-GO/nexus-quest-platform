import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Link2, UserPlus } from "lucide-react";
import type { SimilarMatch } from "@/lib/name-similarity";

export interface DuplicateResolution {
  csvName: string;
  csvRowIndex: number;
  /** 'link' = use existing collaborator name; 'create' = keep CSV name as-is */
  action: "link" | "create";
  resolvedName: string;
}

interface Props {
  matches: SimilarMatch[];
  onComplete: (resolutions: DuplicateResolution[]) => void;
  onCancel: () => void;
}

export function DuplicateResolverDialog({ matches, onComplete, onCancel }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [resolutions, setResolutions] = useState<DuplicateResolution[]>([]);

  const current = matches[currentIndex];
  const isLast = currentIndex === matches.length - 1;

  const handleDecision = (action: "link" | "create") => {
    const resolution: DuplicateResolution = {
      csvName: current.csvName,
      csvRowIndex: current.csvRowIndex,
      action,
      resolvedName: action === "link" ? current.existingName : current.csvName,
    };

    const updated = [...resolutions, resolution];

    if (isLast) {
      onComplete(updated);
    } else {
      setResolutions(updated);
      setCurrentIndex((i) => i + 1);
    }
  };

  if (!current) return null;

  const pct = Math.round(current.score * 100);

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onCancel(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Colaborador similar encontrado
          </DialogTitle>
          <DialogDescription>
            {currentIndex + 1} de {matches.length} — Verifique se é a mesma pessoa
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">No banco de dados:</span>
              <Badge variant="secondary" className="font-semibold text-sm">
                {current.existingName}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">No arquivo CSV:</span>
              <Badge variant="outline" className="font-semibold text-sm">
                {current.csvName}
              </Badge>
            </div>
            <div className="flex items-center justify-center pt-1">
              <Badge
                variant="outline"
                className={
                  pct >= 80
                    ? "border-destructive/50 text-destructive"
                    : "border-yellow-500/50 text-yellow-600"
                }
              >
                Similaridade: {pct}%
              </Badge>
            </div>
          </div>

          <p className="text-sm text-muted-foreground text-center">
            Deseja vincular ao colaborador existente ou criar um novo perfil?
          </p>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            className="w-full"
            onClick={() => handleDecision("link")}
          >
            <Link2 className="mr-2 h-4 w-4" />
            Vincular a "{current.existingName}"
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => handleDecision("create")}
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Criar novo perfil "{current.csvName}"
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
