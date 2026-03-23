import { useState, useMemo } from "react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  Link2,
  UserPlus,
  Ban,
  CheckCircle2,
  ChevronsUpDown,
} from "lucide-react";

export type DuplicateAction = "merge" | "replace" | "ignore";

export interface DuplicateMatch {
  csvName: string;
  existingName: string;
  score: number;
  csvRowIndex: number;
  /** Categories the existing collaborator already has in DB */
  existingCategories?: string[];
  /** Categories from the CSV row being imported */
  csvCategories?: string[];
}

export interface DuplicateResolution {
  csvName: string;
  csvRowIndex: number;
  action: DuplicateAction;
  /** For merge/replace, the resolved DB name to use */
  resolvedName: string;
}

// Keep old type alias for backward compat
export type { DuplicateResolution as DuplicateResolutionLegacy };

interface Props {
  matches: DuplicateMatch[];
  onComplete: (resolutions: DuplicateResolution[]) => void;
  onCancel: () => void;
}

const actionLabel: Record<DuplicateAction, string> = {
  merge: "Mesclar",
  replace: "Substituir",
  ignore: "Ignorar",
};

const actionIcon: Record<DuplicateAction, React.ElementType> = {
  merge: Link2,
  replace: ChevronsUpDown,
  ignore: Ban,
};

const actionColor: Record<DuplicateAction, string> = {
  merge: "text-blue-600",
  replace: "text-amber-600",
  ignore: "text-muted-foreground",
};

export function DuplicateResolverDialog({ matches, onComplete, onCancel }: Props) {
  const [decisions, setDecisions] = useState<Map<number, DuplicateAction>>(() => new Map());

  const setDecision = (rowIndex: number, action: DuplicateAction) => {
    setDecisions((prev) => {
      const next = new Map(prev);
      next.set(rowIndex, action);
      return next;
    });
  };

  const applyAll = (action: DuplicateAction) => {
    setDecisions(() => {
      const next = new Map<number, DuplicateAction>();
      matches.forEach((m) => next.set(m.csvRowIndex, action));
      return next;
    });
  };

  const allResolved = matches.every((m) => decisions.has(m.csvRowIndex));

  const summary = useMemo(() => {
    const counts = { merge: 0, replace: 0, ignore: 0 };
    decisions.forEach((action) => counts[action]++);
    return counts;
  }, [decisions]);

  const handleConfirm = () => {
    const resolutions: DuplicateResolution[] = matches.map((m) => {
      const action = decisions.get(m.csvRowIndex) || "ignore";
      return {
        csvName: m.csvName,
        csvRowIndex: m.csvRowIndex,
        action,
        resolvedName: action === "ignore" ? m.csvName : m.existingName,
      };
    });
    onComplete(resolutions);
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onCancel(); }}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col p-4 sm:p-6 gap-3">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            {matches.length} duplicata(s) encontrada(s)
          </DialogTitle>
          <DialogDescription>
            Revise os colaboradores similares encontrados e escolha a ação para cada um.
          </DialogDescription>
        </DialogHeader>

        {/* Bulk actions */}
        <div className="flex items-center gap-2 flex-wrap border rounded-lg p-3 bg-muted/30">
          <span className="text-sm font-medium mr-1">Ação em massa:</span>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => applyAll("merge")}>
            <Link2 className="h-3.5 w-3.5 text-blue-600" />
            Mesclar todos
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => applyAll("replace")}>
            <ChevronsUpDown className="h-3.5 w-3.5 text-amber-600" />
            Substituir todos
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => applyAll("ignore")}>
            <Ban className="h-3.5 w-3.5 text-muted-foreground" />
            Ignorar todos
          </Button>
        </div>

        {/* Scrollable list */}
        <ScrollArea className="flex-1 min-h-0 max-h-[45vh] border rounded-lg">
          <div className="divide-y">
            {matches.map((m) => {
              const pct = Math.round(m.score * 100);
              const chosen = decisions.get(m.csvRowIndex);
              return (
                <div
                  key={m.csvRowIndex}
                  className={`p-3 space-y-2 transition-colors ${chosen ? "bg-muted/20" : ""}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">CSV:</span>
                        <Badge variant="outline" className="font-semibold text-sm truncate max-w-[200px]">
                          {m.csvName}
                        </Badge>
                        <span className="text-muted-foreground text-xs">→</span>
                        <span className="text-sm font-medium">BD:</span>
                        <Badge variant="secondary" className="font-semibold text-sm truncate max-w-[200px]">
                          {m.existingName}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={
                            pct >= 80
                              ? "border-destructive/50 text-destructive text-xs"
                              : "border-yellow-500/50 text-yellow-600 text-xs"
                          }
                        >
                          {pct}% similar
                        </Badge>
                        {m.existingCategories && m.existingCategories.length > 0 && (
                          <span className="text-xs text-muted-foreground">
                            BD tem: {m.existingCategories.join(", ")}
                          </span>
                        )}
                      </div>
                    </div>

                    <Select
                      value={chosen || ""}
                      onValueChange={(v) => setDecision(m.csvRowIndex, v as DuplicateAction)}
                    >
                      <SelectTrigger className="w-[150px] shrink-0">
                        <SelectValue placeholder="Escolher..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="merge">
                          <span className="flex items-center gap-2">
                            <Link2 className="h-3.5 w-3.5 text-blue-600" />
                            Mesclar
                          </span>
                        </SelectItem>
                        <SelectItem value="replace">
                          <span className="flex items-center gap-2">
                            <ChevronsUpDown className="h-3.5 w-3.5 text-amber-600" />
                            Substituir
                          </span>
                        </SelectItem>
                        <SelectItem value="ignore">
                          <span className="flex items-center gap-2">
                            <Ban className="h-3.5 w-3.5 text-muted-foreground" />
                            Ignorar
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {chosen && (
                    <p className="text-xs text-muted-foreground pl-1">
                      {chosen === "merge" && (
                        <>
                          <span className={actionColor.merge}>Mesclar:</span> Os ativos do CSV serão adicionados ao colaborador existente "{m.existingName}"
                        </>
                      )}
                      {chosen === "replace" && (
                        <>
                          <span className={actionColor.replace}>Substituir:</span> Os dados do CSV substituirão os dados do colaborador "{m.existingName}"
                        </>
                      )}
                      {chosen === "ignore" && (
                        <>
                          <span className={actionColor.ignore}>Ignorar:</span> Esta linha será criada como novo colaborador "{m.csvName}"
                        </>
                      )}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {/* Summary */}
        <div className="flex items-center gap-4 text-sm border rounded-lg p-3 bg-muted/20">
          <span className="font-medium">Resumo:</span>
          {summary.merge > 0 && (
            <span className="flex items-center gap-1 text-blue-600">
              <Link2 className="h-3.5 w-3.5" /> {summary.merge} mesclar
            </span>
          )}
          {summary.replace > 0 && (
            <span className="flex items-center gap-1 text-amber-600">
              <ChevronsUpDown className="h-3.5 w-3.5" /> {summary.replace} substituir
            </span>
          )}
          {summary.ignore > 0 && (
            <span className="flex items-center gap-1 text-muted-foreground">
              <Ban className="h-3.5 w-3.5" /> {summary.ignore} ignorar
            </span>
          )}
          {decisions.size === 0 && (
            <span className="text-muted-foreground italic">Nenhuma ação selecionada</span>
          )}
        </div>

        <DialogFooter className="flex-row gap-2 justify-end">
          <Button variant="ghost" onClick={onCancel}>
            Cancelar importação
          </Button>
          <Button onClick={handleConfirm} disabled={!allResolved}>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Confirmar e importar ({decisions.size}/{matches.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
