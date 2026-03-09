import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Loader2, FileDown, Calculator, DollarSign } from "lucide-react";
import { toast } from "sonner";

type Operadora = "Claro" | "Vivo" | "Salvy" | "Microsoft";

const operadoraCategories: Record<Operadora, string> = {
  Claro: "linhas",
  Vivo: "linhas",
  Salvy: "linhas",
  Microsoft: "licencas",
};

interface CostCenterRow {
  code: string;
  type: "eng" | "man";
  sum: number;
  adjusted: number;
  items: number;
}

const formatBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function GestaoFaturas() {
  const [selectedOp, setSelectedOp] = useState<Operadora | "">("");
  const [ajusteGlobal, setAjusteGlobal] = useState("");

  const category = selectedOp ? operadoraCategories[selectedOp] : null;

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["faturas-inventory", category, selectedOp],
    queryFn: async () => {
      if (!category || !selectedOp) return [];
      let query = supabase
        .from("inventory")
        .select("*")
        .eq("category", category);

      if (category === "linhas") {
        query = query.eq("operadora", selectedOp);
      }
      // For licencas/Microsoft, fetch all active
      if (category === "licencas") {
        query = query.eq("status", "Ativo");
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!category && !!selectedOp,
  });

  const rows = useMemo<CostCenterRow[]>(() => {
    if (!items.length) return [];

    const map = new Map<string, { sum: number; items: number; type: "eng" | "man" }>();

    for (const item of items) {
      const valor = (item as any).valor_mensal ?? 0;
      if (valor <= 0) continue;

      const eng = ((item as any).cost_center_eng || "").trim();
      const man = ((item as any).cost_center_man || "").trim();

      // If both centers exist, the full value appears for each
      if (eng) {
        const existing = map.get(`eng:${eng}`) || { sum: 0, items: 0, type: "eng" as const };
        existing.sum += valor;
        existing.items += 1;
        map.set(`eng:${eng}`, existing);
      }
      if (man) {
        const existing = map.get(`man:${man}`) || { sum: 0, items: 0, type: "man" as const };
        existing.sum += valor;
        existing.items += 1;
        map.set(`man:${man}`, existing);
      }
      // If neither center, group as "Sem CC"
      if (!eng && !man) {
        const existing = map.get(`none:SEM_CC`) || { sum: 0, items: 0, type: "eng" as const };
        existing.sum += valor;
        existing.items += 1;
        map.set(`none:SEM_CC`, existing);
      }
    }

    return Array.from(map.entries()).map(([key, val]) => ({
      code: key.split(":")[1],
      type: val.type,
      sum: val.sum,
      adjusted: val.sum,
      items: val.items,
    }));
  }, [items]);

  const totalBase = rows.reduce((acc, r) => acc + r.sum, 0);
  const ajusteNum = parseFloat((ajusteGlobal || "0").replace(/[^\d.,-]/g, "").replace(",", ".")) || 0;

  const adjustedRows = useMemo(() => {
    if (!ajusteNum || totalBase === 0) return rows.map((r) => ({ ...r, adjusted: r.sum }));
    return rows.map((r) => ({
      ...r,
      adjusted: r.sum + (r.sum / totalBase) * ajusteNum,
    }));
  }, [rows, ajusteNum, totalBase]);

  const totalAdjusted = adjustedRows.reduce((acc, r) => acc + r.adjusted, 0);

  const handleExportCSV = () => {
    if (!adjustedRows.length) return;
    const header = "Centro de Custo;Tipo;Qtd Itens;Valor Base;Ajuste;Valor Final";
    const lines = adjustedRows.map(
      (r) =>
        `${r.code};${r.type === "eng" ? "Engenharia" : r.type === "man" ? "Manutenção" : "—"};${r.items};${r.sum.toFixed(2)};${(r.adjusted - r.sum).toFixed(2)};${r.adjusted.toFixed(2)}`
    );
    const totalLine = `TOTAL;;;${totalBase.toFixed(2)};${ajusteNum.toFixed(2)};${totalAdjusted.toFixed(2)}`;
    const csv = [header, ...lines, totalLine].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rateio_${selectedOp}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado com sucesso");
  };

  return (
    <AppLayout>
      <PageHeader
        title="Gestão de Faturas"
        description="Rateio de custos por operadora e centro de custo"
      />

      <div className="space-y-6">
        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Selecionar Operadora
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-end gap-4">
              <div className="w-64">
                <Label>Operadora</Label>
                <Select value={selectedOp} onValueChange={(v) => { setSelectedOp(v as Operadora); setAjusteGlobal(""); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Claro">Claro</SelectItem>
                    <SelectItem value="Vivo">Vivo</SelectItem>
                    <SelectItem value="Salvy">Salvy</SelectItem>
                    <SelectItem value="Microsoft">Microsoft</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {selectedOp && (
                <div className="w-64">
                  <Label className="flex items-center gap-1">
                    <Calculator className="h-3.5 w-3.5" />
                    Ajuste Global (R$)
                  </Label>
                  <Input
                    placeholder="Ex: 50.00 (taxas extras)"
                    value={ajusteGlobal}
                    onChange={(e) => setAjusteGlobal(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Valor distribuído proporcionalmente entre os centros de custo
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {isLoading && (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        )}

        {selectedOp && !isLoading && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold">
                Rateio — {selectedOp}
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({items.length} itens encontrados)
                </span>
              </CardTitle>
              <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={!adjustedRows.length}>
                <FileDown className="h-4 w-4 mr-1" />
                Exportar CSV
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {adjustedRows.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  Nenhum item com Valor Mensal encontrado para esta operadora.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Centro de Custo</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead className="text-right">Itens</TableHead>
                        <TableHead className="text-right">Valor Base</TableHead>
                        {ajusteNum !== 0 && <TableHead className="text-right">Ajuste</TableHead>}
                        <TableHead className="text-right">Valor Final</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {adjustedRows.map((row) => (
                        <TableRow key={`${row.type}:${row.code}`}>
                          <TableCell className="font-mono text-sm">{row.code}</TableCell>
                          <TableCell className="text-sm">
                            {row.code === "SEM_CC" ? "—" : row.type === "eng" ? "Engenharia" : "Manutenção"}
                          </TableCell>
                          <TableCell className="text-right text-sm">{row.items}</TableCell>
                          <TableCell className="text-right text-sm">{formatBRL(row.sum)}</TableCell>
                          {ajusteNum !== 0 && (
                            <TableCell className="text-right text-sm text-amber-600">
                              {formatBRL(row.adjusted - row.sum)}
                            </TableCell>
                          )}
                          <TableCell className="text-right text-sm font-medium">{formatBRL(row.adjusted)}</TableCell>
                        </TableRow>
                      ))}
                      {/* Total row */}
                      <TableRow className="bg-muted/50 font-semibold">
                        <TableCell>TOTAL</TableCell>
                        <TableCell />
                        <TableCell className="text-right">{adjustedRows.reduce((a, r) => a + r.items, 0)}</TableCell>
                        <TableCell className="text-right">{formatBRL(totalBase)}</TableCell>
                        {ajusteNum !== 0 && (
                          <TableCell className="text-right text-amber-600">{formatBRL(ajusteNum)}</TableCell>
                        )}
                        <TableCell className="text-right">{formatBRL(totalAdjusted)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
