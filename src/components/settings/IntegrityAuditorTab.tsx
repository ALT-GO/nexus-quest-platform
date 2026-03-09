import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { diceSimilarity } from "@/lib/name-similarity";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  ShieldCheck,
  Search,
  Merge,
  EyeOff,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Loader2,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface InventoryRow {
  id: string;
  asset_code: string;
  category: string;
  collaborator: string | null;
  model: string | null;
  service_tag: string | null;
  imei1: string | null;
  numero: string | null;
  status: string;
}

type DuplicateType = "service_tag" | "imei1" | "numero" | "collaborator_name";

interface DuplicatePair {
  type: DuplicateType;
  label: string;
  matchValue: string;
  itemA: InventoryRow;
  itemB: InventoryRow;
  score?: number; // fuzzy score for names
}

interface GroupedDuplicates {
  category: string;
  categoryLabel: string;
  pairs: DuplicatePair[];
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const CATEGORY_LABELS: Record<string, string> = {
  notebooks: "Notebooks",
  celulares: "Celulares",
  linhas: "Linhas",
  licencas: "Licenças",
  hardware: "Hardware",
  passwords: "Senhas",
  telecom: "Telecom",
  licenses: "Licenças",
};

const TYPE_LABELS: Record<DuplicateType, string> = {
  service_tag: "Service Tag",
  imei1: "IMEI",
  numero: "Número / Linha",
  collaborator_name: "Nome de Colaborador Similar",
};

function isBlank(v: string | null | undefined): boolean {
  if (!v) return true;
  const trimmed = v.trim().toLowerCase();
  return trimmed === "" || trimmed === "-" || trimmed === "nulo" || trimmed === "null";
}

function pairKey(a: string, b: string): string {
  return [a, b].sort().join("|");
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function IntegrityAuditorTab() {
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<GroupedDuplicates[] | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);

  /* ---------- scan logic ------------------------------------------ */
  const runScan = useCallback(async () => {
    setScanning(true);
    setProgress(10);
    setResults(null);

    try {
      // 1. Fetch all inventory
      const { data: inventory, error } = await supabase
        .from("inventory")
        .select("id, asset_code, category, collaborator, model, service_tag, imei1, numero, status");

      if (error) throw error;
      if (!inventory || inventory.length === 0) {
        toast.info("Nenhum ativo encontrado no inventário.");
        setScanning(false);
        return;
      }

      setProgress(30);

      // 2. Fetch ignored pairs
      const { data: ignores } = await supabase
        .from("integrity_duplicate_ignores")
        .select("key_a, key_b, duplicate_type");

      const ignoredSet = new Set(
        (ignores ?? []).map((ig) => `${ig.duplicate_type}:${pairKey(ig.key_a, ig.key_b)}`)
      );

      setProgress(50);

      const pairs: DuplicatePair[] = [];

      // 3. Exact identifier matches
      const identifierFields: { field: keyof InventoryRow; type: DuplicateType }[] = [
        { field: "service_tag", type: "service_tag" },
        { field: "imei1", type: "imei1" },
        { field: "numero", type: "numero" },
      ];

      for (const { field, type } of identifierFields) {
        const groups = new Map<string, InventoryRow[]>();
        for (const item of inventory) {
          const val = item[field] as string | null;
          if (isBlank(val)) continue;
          const key = val!.trim().toLowerCase();
          if (!groups.has(key)) groups.set(key, []);
          groups.get(key)!.push(item as InventoryRow);
        }

        for (const [matchVal, items] of groups) {
          if (items.length < 2) continue;
          for (let i = 0; i < items.length; i++) {
            for (let j = i + 1; j < items.length; j++) {
              const pk = `${type}:${pairKey(items[i].id, items[j].id)}`;
              if (ignoredSet.has(pk)) continue;
              pairs.push({
                type,
                label: TYPE_LABELS[type],
                matchValue: matchVal,
                itemA: items[i],
                itemB: items[j],
              });
            }
          }
        }
      }

      setProgress(70);

      // 4. Fuzzy collaborator name matching
      const withCollab = inventory.filter((i) => !isBlank(i.collaborator));
      for (let i = 0; i < withCollab.length; i++) {
        for (let j = i + 1; j < withCollab.length; j++) {
          const a = withCollab[i];
          const b = withCollab[j];
          const nameA = a.collaborator!.trim();
          const nameB = b.collaborator!.trim();
          if (nameA.toLowerCase() === nameB.toLowerCase()) continue; // exact = not a "similar" duplicate

          const score = diceSimilarity(nameA, nameB);
          if (score >= 0.85) {
            const pk = `collaborator_name:${pairKey(a.id, b.id)}`;
            if (ignoredSet.has(pk)) continue;
            pairs.push({
              type: "collaborator_name",
              label: TYPE_LABELS.collaborator_name,
              matchValue: `${nameA} ↔ ${nameB}`,
              itemA: a as InventoryRow,
              itemB: b as InventoryRow,
              score,
            });
          }
        }
      }

      setProgress(90);

      // 5. Group by category
      const catMap = new Map<string, DuplicatePair[]>();
      for (const p of pairs) {
        const cat = p.itemA.category;
        if (!catMap.has(cat)) catMap.set(cat, []);
        catMap.get(cat)!.push(p);
      }

      const grouped: GroupedDuplicates[] = Array.from(catMap.entries())
        .map(([cat, catPairs]) => ({
          category: cat,
          categoryLabel: CATEGORY_LABELS[cat] || cat,
          pairs: catPairs,
        }))
        .sort((a, b) => b.pairs.length - a.pairs.length);

      setResults(grouped);
      setProgress(100);

      if (pairs.length === 0) {
        toast.success("Nenhum duplicado encontrado! Inventário íntegro.");
      } else {
        toast.warning(`${pairs.length} possível(is) duplicado(s) encontrado(s).`);
      }
    } catch (err: any) {
      toast.error("Erro ao escanear: " + (err.message || err));
    } finally {
      setScanning(false);
    }
  }, []);

  /* ---------- actions --------------------------------------------- */
  const removePairFromResults = (itemAId: string, itemBId: string) => {
    setResults((prev) =>
      prev
        ?.map((g) => ({
          ...g,
          pairs: g.pairs.filter(
            (p) =>
              !(
                (p.itemA.id === itemAId && p.itemB.id === itemBId) ||
                (p.itemA.id === itemBId && p.itemB.id === itemAId)
              )
          ),
        }))
        .filter((g) => g.pairs.length > 0) ?? null
    );
  };

  const handleMerge = async (pair: DuplicatePair) => {
    const actionKey = `merge-${pair.itemA.id}-${pair.itemB.id}`;
    setProcessing(actionKey);
    try {
      // Transfer custom field values from B → A
      await supabase
        .from("custom_field_values")
        .update({ asset_id: pair.itemA.id })
        .eq("asset_id", pair.itemB.id);

      // Add merge note to primary
      const currentNotes = pair.itemA.model || "";
      await supabase
        .from("inventory")
        .update({
          notes: `[Merge] Mesclado com ${pair.itemB.asset_code}. ${currentNotes}`,
          updated_at: new Date().toISOString(),
        })
        .eq("id", pair.itemA.id);

      // Delete duplicate's custom values and the duplicate itself
      await supabase.from("custom_field_values").delete().eq("asset_id", pair.itemB.id);
      await supabase.from("inventory").delete().eq("id", pair.itemB.id);

      removePairFromResults(pair.itemA.id, pair.itemB.id);
      toast.success(`Mesclado: ${pair.itemB.asset_code} → ${pair.itemA.asset_code}`);
    } catch (err: any) {
      toast.error("Erro ao mesclar: " + err.message);
    } finally {
      setProcessing(null);
    }
  };

  const handleIgnore = async (pair: DuplicatePair) => {
    const actionKey = `ignore-${pair.itemA.id}-${pair.itemB.id}`;
    setProcessing(actionKey);
    try {
      const [ka, kb] = [pair.itemA.id, pair.itemB.id].sort();
      await supabase.from("integrity_duplicate_ignores").insert({
        key_a: ka,
        key_b: kb,
        duplicate_type: pair.type,
      });

      removePairFromResults(pair.itemA.id, pair.itemB.id);
      toast.success("Par ignorado — não aparecerá em futuras varreduras.");
    } catch (err: any) {
      toast.error("Erro ao ignorar: " + err.message);
    } finally {
      setProcessing(null);
    }
  };

  const handleDelete = async (pair: DuplicatePair) => {
    const actionKey = `delete-${pair.itemA.id}-${pair.itemB.id}`;
    setProcessing(actionKey);
    try {
      await supabase.from("custom_field_values").delete().eq("asset_id", pair.itemB.id);
      await supabase.from("inventory").delete().eq("id", pair.itemB.id);

      removePairFromResults(pair.itemA.id, pair.itemB.id);
      toast.success(`Excluído: ${pair.itemB.asset_code}`);
    } catch (err: any) {
      toast.error("Erro ao excluir: " + err.message);
    } finally {
      setProcessing(null);
    }
  };

  /* ---------- render ---------------------------------------------- */
  const totalPairs = results?.reduce((s, g) => s + g.pairs.length, 0) ?? 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          Auditório de Integridade
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Scan button */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Escaneia o inventário buscando identificadores duplicados (Service Tag, IMEI, Número) e
            nomes de colaboradores similares (≥ 85%).
          </p>
          <Button onClick={runScan} disabled={scanning} className="shrink-0">
            {scanning ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Search className="mr-2 h-4 w-4" />
            )}
            Escanear Inventário por Duplicados
          </Button>
        </div>

        {scanning && <Progress value={progress} className="h-2" />}

        {/* Results */}
        {results !== null && !scanning && (
          <>
            <Separator />

            {totalPairs === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <CheckCircle2 className="h-10 w-10 text-green-500" />
                <p className="font-medium">Inventário íntegro!</p>
                <p className="text-sm text-muted-foreground">
                  Nenhum duplicado pendente encontrado.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  <span className="font-medium">
                    {totalPairs} possível(is) duplicado(s) encontrado(s)
                  </span>
                </div>

                {results.map((group) => (
                  <div key={group.category} className="space-y-3">
                    <h3 className="text-sm font-semibold text-muted-foreground">
                      {group.categoryLabel} — {group.pairs.length} par(es)
                    </h3>

                    {group.pairs.map((pair) => {
                      const baseKey = `${pair.itemA.id}-${pair.itemB.id}`;
                      const isProcessing = processing?.endsWith(baseKey) ?? false;

                      return (
                        <Card key={baseKey} className="border-dashed">
                          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                            {/* Info */}
                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="outline">{pair.label}</Badge>
                                <span className="truncate text-xs text-muted-foreground">
                                  {pair.matchValue}
                                </span>
                                {pair.score && (
                                  <Badge variant="secondary">
                                    {Math.round(pair.score * 100)}% similar
                                  </Badge>
                                )}
                              </div>
                              <div className="grid gap-1 text-sm sm:grid-cols-2">
                                <div>
                                  <span className="font-medium">{pair.itemA.asset_code}</span>{" "}
                                  <span className="text-muted-foreground">
                                    {pair.itemA.collaborator || "—"} · {pair.itemA.model || "—"} ·{" "}
                                    {pair.itemA.status}
                                  </span>
                                </div>
                                <div>
                                  <span className="font-medium">{pair.itemB.asset_code}</span>{" "}
                                  <span className="text-muted-foreground">
                                    {pair.itemB.collaborator || "—"} · {pair.itemB.model || "—"} ·{" "}
                                    {pair.itemB.status}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex shrink-0 gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={isProcessing}
                                onClick={() => handleMerge(pair)}
                              >
                                <Merge className="mr-1 h-3.5 w-3.5" />
                                Mesclar
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={isProcessing}
                                onClick={() => handleIgnore(pair)}
                              >
                                <EyeOff className="mr-1 h-3.5 w-3.5" />
                                Ignorar
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                disabled={isProcessing}
                                onClick={() => handleDelete(pair)}
                              >
                                <Trash2 className="mr-1 h-3.5 w-3.5" />
                                Excluir
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
