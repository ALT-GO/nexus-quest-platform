import { useState, useMemo, useRef } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, FileDown, Calculator, DollarSign, Printer, Phone, FileText } from "lucide-react";
import { toast } from "sonner";
import { HeaderTimbrado } from "@/components/collaborators/HeaderTimbrado";
import { FooterTimbrado } from "@/components/collaborators/FooterTimbrado";
import { InlineCellEditor } from "@/components/assets/InlineCellEditor";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

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

// ─── Inline mensalidade tab ───
function MensalidadeTab({ category }: { category: "linhas" | "licencas" }) {
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["mensalidade", category],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory")
        .select("*")
        .eq("category", category)
        .order("asset_code");
      if (error) throw error;
      return data || [];
    },
  });

  const handleSaveValorMensal = async (id: string, rawValue: string) => {
    const cleaned = rawValue.replace(/[^\d.,]/g, "").replace(",", ".");
    const num = parseFloat(cleaned);
    if (isNaN(num)) return;
    const { error } = await supabase
      .from("inventory")
      .update({ valor_mensal: num, updated_at: new Date().toISOString() } as any)
      .eq("id", id);
    if (error) {
      toast.error("Erro ao salvar valor mensal");
    } else {
      toast.success("Valor mensal atualizado");
      queryClient.invalidateQueries({ queryKey: ["mensalidade", category] });
    }
  };

  const totalMensal = items.reduce((acc, item) => acc + ((item as any).valor_mensal ?? 0), 0);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const isLinhas = category === "linhas";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">
          {isLinhas ? "Mensalidade de Linhas" : "Mensalidade de Licenças"}
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            ({items.length} itens • Total: {formatBRL(totalMensal)}/mês)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">ID</TableHead>
                {isLinhas ? (
                  <>
                    <TableHead className="whitespace-nowrap">Número</TableHead>
                    <TableHead className="whitespace-nowrap">Colaborador</TableHead>
                    <TableHead className="whitespace-nowrap">Operadora</TableHead>
                  </>
                ) : (
                  <>
                    <TableHead className="whitespace-nowrap">E-mail</TableHead>
                    <TableHead className="whitespace-nowrap">Colaborador</TableHead>
                    <TableHead className="whitespace-nowrap">Licença</TableHead>
                  </>
                )}
                <TableHead className="whitespace-nowrap">CC - Eng</TableHead>
                <TableHead className="whitespace-nowrap">CC - Man</TableHead>
                <TableHead className="whitespace-nowrap text-right">Valor Mensal (R$)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const valorMensal = (item as any).valor_mensal;
                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-xs">{item.asset_code}</TableCell>
                    {isLinhas ? (
                      <>
                        <TableCell className="text-sm">{item.numero || <span className="text-muted-foreground italic">—</span>}</TableCell>
                        <TableCell className="text-sm">{item.collaborator || <span className="text-muted-foreground italic">—</span>}</TableCell>
                        <TableCell className="text-sm">{item.operadora || <span className="text-muted-foreground italic">—</span>}</TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell className="text-sm">{item.email_address || <span className="text-muted-foreground italic">—</span>}</TableCell>
                        <TableCell className="text-sm">{item.collaborator || <span className="text-muted-foreground italic">—</span>}</TableCell>
                        <TableCell className="text-sm">{item.licenca || <span className="text-muted-foreground italic">—</span>}</TableCell>
                      </>
                    )}
                    <TableCell className="text-sm">{item.cost_center_eng || <span className="text-muted-foreground italic">—</span>}</TableCell>
                    <TableCell className="text-sm">{item.cost_center_man || <span className="text-muted-foreground italic">—</span>}</TableCell>
                    <TableCell className="text-right">
                      <InlineCellEditor
                        value={valorMensal != null && valorMensal !== "" ? String(valorMensal) : ""}
                        onSave={(v) => handleSaveValorMensal(item.id, v)}
                        type="number"
                        displayRender={(v) => (
                          <span className="text-sm font-medium">
                            {v ? formatBRL(parseFloat(v)) : <span className="text-muted-foreground italic">—</span>}
                          </span>
                        )}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
              {items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nenhum registro encontrado.
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

// ─── Main page ───
export default function GestaoFaturas() {
  const [selectedOp, setSelectedOp] = useState<Operadora | "">("");
  const [ajusteGlobal, setAjusteGlobal] = useState("");
  const [pdfOpen, setPdfOpen] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

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

  const handlePrint = () => {
    setPdfOpen(true);
    setTimeout(() => window.print(), 400);
  };

  const today = new Date().toLocaleDateString("pt-BR");
  const mesRef = new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  return (
    <AppLayout>
      <PageHeader
        title="Gestão de Faturas"
        description="Rateio de custos e lançamento de mensalidades"
      />

      <Tabs defaultValue="rateio" className="space-y-6">
        <TabsList className="h-auto flex-wrap gap-1 bg-muted/50 p-1">
          <TabsTrigger value="rateio" className="gap-2 px-4 py-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm">
            <DollarSign className="h-4 w-4" />
            <span>Rateio & PDF</span>
          </TabsTrigger>
          <TabsTrigger value="linhas" className="gap-2 px-4 py-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm">
            <Phone className="h-4 w-4" />
            <span>Mensalidade de Linhas</span>
          </TabsTrigger>
          <TabsTrigger value="licencas" className="gap-2 px-4 py-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm">
            <FileText className="h-4 w-4" />
            <span>Mensalidade de Licenças</span>
          </TabsTrigger>
        </TabsList>

        {/* ─── Tab: Rateio & PDF ─── */}
        <TabsContent value="rateio">
          <div className="space-y-6">
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
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handlePrint} disabled={!adjustedRows.length}>
                      <Printer className="h-4 w-4 mr-1" />
                      Gerar PDF
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={!adjustedRows.length}>
                      <FileDown className="h-4 w-4 mr-1" />
                      Exportar CSV
                    </Button>
                  </div>
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
                            <TableHead>Descrição</TableHead>
                            <TableHead className="text-right">Itens Inclusos</TableHead>
                            <TableHead className="text-right">Valor Base</TableHead>
                            {ajusteNum !== 0 && <TableHead className="text-right">Ajuste</TableHead>}
                            <TableHead className="text-right">Valor Total do Rateio</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {adjustedRows.map((row) => (
                            <TableRow key={`${row.type}:${row.code}`}>
                              <TableCell className="font-mono text-sm">{row.code}</TableCell>
                              <TableCell className="text-sm">
                                {row.code === "SEM_CC" ? "Sem centro de custo" : row.type === "eng" ? "Engenharia" : "Manutenção"}
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
        </TabsContent>

        {/* ─── Tab: Mensalidade de Linhas ─── */}
        <TabsContent value="linhas">
          <MensalidadeTab category="linhas" />
        </TabsContent>

        {/* ─── Tab: Mensalidade de Licenças ─── */}
        <TabsContent value="licencas">
          <MensalidadeTab category="licencas" />
        </TabsContent>
      </Tabs>

      {/* ===== Printable PDF Document ===== */}
      <Dialog open={pdfOpen} onOpenChange={setPdfOpen}>
        <DialogContent className="max-w-[900px] max-h-[95vh] overflow-y-auto print:!block">
          <DialogHeader className="print:hidden">
            <DialogTitle>Relatório de Rateio — {selectedOp}</DialogTitle>
          </DialogHeader>

          <div
            ref={printRef}
            className="print-page p-6 mx-auto w-full max-w-[210mm] min-h-[297mm] flex flex-col relative"
            style={{ fontFamily: "Inter, Arial, Helvetica, sans-serif", fontSize: "11pt", lineHeight: "1.4" }}
          >
            <div className="print-header-table">
              <HeaderTimbrado
                title="Relatório de Rateio de Custos"
                prefix={`Operadora: ${selectedOp}`}
                docCode="FF.RTC"
                revision="Rev. 01"
              />
            </div>

            <div className="flex-1 space-y-4 mt-2">
              <div className="text-sm">
                <p><strong>Operadora:</strong> {selectedOp}</p>
                <p><strong>Competência:</strong> {mesRef}</p>
                <p><strong>Data de emissão:</strong> {today}</p>
                {ajusteNum !== 0 && (
                  <p><strong>Ajuste global aplicado:</strong> {formatBRL(ajusteNum)}</p>
                )}
              </div>

              <table className="w-full border-collapse text-sm" style={{ fontSize: "10pt" }}>
                <thead>
                  <tr style={{ backgroundColor: "#f3f4f6" }}>
                    <th className="border border-gray-400 px-3 py-2 text-left font-semibold">Centro de Custo</th>
                    <th className="border border-gray-400 px-3 py-2 text-left font-semibold">Descrição</th>
                    <th className="border border-gray-400 px-3 py-2 text-center font-semibold">Itens Inclusos</th>
                    {ajusteNum !== 0 && (
                      <th className="border border-gray-400 px-3 py-2 text-right font-semibold">Valor Base</th>
                    )}
                    {ajusteNum !== 0 && (
                      <th className="border border-gray-400 px-3 py-2 text-right font-semibold">Ajuste</th>
                    )}
                    <th className="border border-gray-400 px-3 py-2 text-right font-semibold">Valor Total do Rateio</th>
                  </tr>
                </thead>
                <tbody>
                  {adjustedRows.map((row, i) => (
                    <tr key={i} style={{ pageBreakInside: "avoid" }}>
                      <td className="border border-gray-400 px-3 py-1.5 font-mono">{row.code}</td>
                      <td className="border border-gray-400 px-3 py-1.5">
                        {row.code === "SEM_CC" ? "Sem centro de custo" : row.type === "eng" ? "Engenharia" : "Manutenção"}
                      </td>
                      <td className="border border-gray-400 px-3 py-1.5 text-center">{row.items}</td>
                      {ajusteNum !== 0 && (
                        <td className="border border-gray-400 px-3 py-1.5 text-right">{formatBRL(row.sum)}</td>
                      )}
                      {ajusteNum !== 0 && (
                        <td className="border border-gray-400 px-3 py-1.5 text-right">{formatBRL(row.adjusted - row.sum)}</td>
                      )}
                      <td className="border border-gray-400 px-3 py-1.5 text-right font-medium">{formatBRL(row.adjusted)}</td>
                    </tr>
                  ))}
                  <tr style={{ backgroundColor: "#e5e7eb", fontWeight: 700 }}>
                    <td className="border border-gray-400 px-3 py-2" colSpan={2}>TOTAL GERAL DA FATURA</td>
                    <td className="border border-gray-400 px-3 py-2 text-center">
                      {adjustedRows.reduce((a, r) => a + r.items, 0)}
                    </td>
                    {ajusteNum !== 0 && (
                      <td className="border border-gray-400 px-3 py-2 text-right">{formatBRL(totalBase)}</td>
                    )}
                    {ajusteNum !== 0 && (
                      <td className="border border-gray-400 px-3 py-2 text-right">{formatBRL(ajusteNum)}</td>
                    )}
                    <td className="border border-gray-400 px-3 py-2 text-right text-base">{formatBRL(totalAdjusted)}</td>
                  </tr>
                </tbody>
              </table>

              <div className="pt-8 mt-auto" style={{ pageBreakInside: "avoid" }}>
                <div className="flex justify-between gap-8">
                  <div className="flex-1 text-center">
                    <div className="border-t border-gray-600 pt-1 mt-12">
                      <p className="text-sm font-medium">Responsável TI</p>
                      <p className="text-xs text-gray-500">Data: ____/____/________</p>
                    </div>
                  </div>
                  <div className="flex-1 text-center">
                    <div className="border-t border-gray-600 pt-1 mt-12">
                      <p className="text-sm font-medium">Aprovação Financeiro</p>
                      <p className="text-xs text-gray-500">Data: ____/____/________</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="print-footer-container mt-auto pt-2">
              <FooterTimbrado />
            </div>
          </div>

          <div className="flex justify-end gap-2 print:hidden mt-4">
            <Button variant="outline" onClick={() => setPdfOpen(false)}>Fechar</Button>
            <Button onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-1" />
              Imprimir / Salvar PDF
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
