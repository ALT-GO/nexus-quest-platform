import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { calcDepreciation, formatBRL } from "@/lib/depreciation";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { DollarSign, Phone, FileText, Download, Plus, TrendingDown, Wifi } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";

interface TelecomCost { id: string; month: string; lineNumber: string; collaborator: string; costCenter: string; value: number; }
interface LicenseCost { id: string; month: string; email: string; collaborator: string; costCenter: string; licenseType: string; value: number; }

const initialTelecomCosts: TelecomCost[] = [
  { id: "1", month: "2024-11", lineNumber: "(11) 99999-1234", collaborator: "Maria Silva", costCenter: "Comercial", value: 189.9 },
  { id: "2", month: "2024-11", lineNumber: "(11) 99999-5678", collaborator: "João Pedro", costCenter: "TI", value: 149.9 },
  { id: "3", month: "2024-11", lineNumber: "(11) 99999-9012", collaborator: "Ana Costa", costCenter: "Marketing", value: 129.9 },
  { id: "4", month: "2024-10", lineNumber: "(11) 99999-1234", collaborator: "Maria Silva", costCenter: "Comercial", value: 210.5 },
  { id: "5", month: "2024-10", lineNumber: "(11) 99999-5678", collaborator: "João Pedro", costCenter: "TI", value: 145.0 },
];

const initialLicenseCosts: LicenseCost[] = [
  { id: "1", month: "2024-11", email: "maria.silva@empresa.com", collaborator: "Maria Silva", costCenter: "Comercial", licenseType: "Microsoft 365 E3", value: 120.0 },
  { id: "2", month: "2024-11", email: "joao.pedro@empresa.com", collaborator: "João Pedro", costCenter: "TI", licenseType: "Microsoft 365 E3", value: 120.0 },
  { id: "3", month: "2024-11", email: "ana.costa@empresa.com", collaborator: "Ana Costa", costCenter: "Marketing", licenseType: "Microsoft 365 E1", value: 45.0 },
  { id: "4", month: "2024-10", email: "maria.silva@empresa.com", collaborator: "Maria Silva", costCenter: "Comercial", licenseType: "Microsoft 365 E3", value: 120.0 },
  { id: "5", month: "2024-10", email: "joao.pedro@empresa.com", collaborator: "João Pedro", costCenter: "TI", licenseType: "Microsoft 365 E3", value: 120.0 },
];

const chartColors = ["hsl(var(--primary))", "hsl(var(--success))", "hsl(var(--warning))", "hsl(var(--chart-4))", "hsl(var(--info))", "hsl(var(--destructive))"];
const tooltipStyle = { backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" };

interface InventoryAsset {
  id: string;
  category: string;
  operadora: string | null;
  valor_mensal: number | null;
  valor_pago: number | null;
  data_aquisicao: string | null;
}

interface FinanceiroTabProps {
  selectedMonth: string;
}

export function FinanceiroTab({ selectedMonth }: FinanceiroTabProps) {
  const [telecomCosts] = useState<TelecomCost[]>(initialTelecomCosts);
  const [licenseCosts] = useState<LicenseCost[]>(initialLicenseCosts);
  const [inventoryAssets, setInventoryAssets] = useState<InventoryAsset[]>([]);

  // Fetch inventory for operadora donut + depreciation
  useEffect(() => {
    supabase
      .from("inventory")
      .select("id, category, operadora, valor_mensal, valor_pago, data_aquisicao")
      .then(({ data }) => {
        if (data) setInventoryAssets(data as InventoryAsset[]);
      });

    const channel = supabase
      .channel("financeiro-inventory-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "inventory" }, () => {
        supabase
          .from("inventory")
          .select("id, category, operadora, valor_mensal, valor_pago, data_aquisicao")
          .then(({ data }) => {
            if (data) setInventoryAssets(data as InventoryAsset[]);
          });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const filteredTelecom = telecomCosts.filter((c) => c.month === selectedMonth);
  const filteredLicenses = licenseCosts.filter((c) => c.month === selectedMonth);

  const totalTelecom = filteredTelecom.reduce((sum, c) => sum + c.value, 0);
  const totalLicenses = filteredLicenses.reduce((sum, c) => sum + c.value, 0);
  const totalCosts = totalTelecom + totalLicenses;

  const costByCostCenter = [...filteredTelecom, ...filteredLicenses].reduce(
    (acc, cost) => {
      const existing = acc.find((i) => i.costCenter === cost.costCenter);
      if (existing) {
        if ("lineNumber" in cost) existing.telecom += cost.value;
        else existing.licenses += cost.value;
        existing.total += cost.value;
      } else {
        acc.push({ costCenter: cost.costCenter, telecom: "lineNumber" in cost ? cost.value : 0, licenses: "lineNumber" in cost ? 0 : cost.value, total: cost.value });
      }
      return acc;
    },
    [] as { costCenter: string; telecom: number; licenses: number; total: number }[]
  );

  const pieData = costByCostCenter.map((item, i) => ({ name: item.costCenter, value: item.total, color: chartColors[i % chartColors.length] }));

  // ---- NEW: Custo por Operadora (Donut) ----
  const costByOperadora = useMemo(() => {
    const linhas = inventoryAssets.filter((a) => a.category === "linhas" && a.operadora && a.operadora.trim() !== "");
    const map: Record<string, number> = {};
    linhas.forEach((a) => {
      const op = a.operadora!.trim();
      // Normalize operator names
      let normalized = op;
      const lower = op.toLowerCase();
      if (lower.includes("vivo")) normalized = "Vivo";
      else if (lower.includes("claro")) normalized = "Claro";
      else if (lower.includes("salvy") || lower.includes("salvi")) normalized = "Salvy";
      else if (lower.includes("tim")) normalized = "TIM";
      else if (lower.includes("oi")) normalized = "Oi";

      const value = a.valor_mensal || 0;
      if (value > 0) {
        map[normalized] = (map[normalized] || 0) + value;
      }
    });
    return Object.entries(map)
      .map(([name, value], i) => ({ name, value: Math.round(value * 100) / 100, color: chartColors[i % chartColors.length] }))
      .sort((a, b) => b.value - a.value);
  }, [inventoryAssets]);

  // ---- NEW: Depreciação Acumulada ----
  const depreciationTotal = useMemo(() => {
    const hardwareAssets = inventoryAssets.filter(
      (a) => (a.category === "notebooks" || a.category === "celulares") && a.valor_pago && a.valor_pago > 0 && a.data_aquisicao
    );
    let totalDepreciation = 0;
    let totalOriginal = 0;
    hardwareAssets.forEach((a) => {
      const result = calcDepreciation(a.valor_pago, a.data_aquisicao);
      if (result) {
        totalDepreciation += result.depreciacaoAcumulada;
        totalOriginal += result.valorAquisicao;
      }
    });
    return { totalDepreciation, totalOriginal, assetCount: hardwareAssets.length };
  }, [inventoryAssets]);

  const months: Record<string, string> = { "2024-11": "Novembro 2024", "2024-10": "Outubro 2024", "2024-09": "Setembro 2024" };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total Telecom" value={`R$ ${totalTelecom.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} icon={Phone} className="border-l-4 border-l-primary" />
        <StatCard title="Total Licenças" value={`R$ ${totalLicenses.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} icon={FileText} className="border-l-4 border-l-success" />
        <StatCard title="Custo Total TI" value={`R$ ${totalCosts.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} icon={DollarSign} className="border-l-4 border-l-warning" />
        <StatCard
          title="Depreciação Acumulada"
          value={formatBRL(depreciationTotal.totalDepreciation)}
          icon={TrendingDown}
          description={`${depreciationTotal.assetCount} ativos · Original: ${formatBRL(depreciationTotal.totalOriginal)}`}
          className="border-l-4 border-l-destructive"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base font-semibold">Custos por Centro de Custo</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={costByCostCenter}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="costCenter" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} />
                  <Bar dataKey="telecom" name="Telecom" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} stackId="a" />
                  <Bar dataKey="licenses" name="Licenças" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* NEW: Custo por Operadora Donut */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Wifi className="h-4 w-4 text-muted-foreground" />Custo por Operadora
            </CardTitle>
          </CardHeader>
          <CardContent>
            {costByOperadora.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                Nenhuma linha com operadora e valor mensal cadastrados
              </div>
            ) : (
              <div className="flex h-[300px] items-center justify-center gap-8">
                <div className="h-[220px] w-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={costByOperadora} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={4} dataKey="value">
                        {costByOperadora.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-3">
                  {costByOperadora.map((item) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-sm text-muted-foreground">{item.name}</span>
                      <span className="ml-auto font-medium">R$ {item.value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Summary Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold">Resumo por Centro de Custo — {months[selectedMonth] || selectedMonth}</CardTitle>
          <Button variant="outline" size="sm"><Download className="mr-2 h-4 w-4" />Exportar</Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Centro de Custo</TableHead><TableHead className="text-right">Telecom</TableHead>
                <TableHead className="text-right">Licenças Microsoft</TableHead><TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {costByCostCenter.map((item) => (
                <TableRow key={item.costCenter}>
                  <TableCell className="font-medium">{item.costCenter}</TableCell>
                  <TableCell className="text-right">R$ {item.telecom.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell className="text-right">R$ {item.licenses.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell className="text-right font-semibold">R$ {item.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/50">
                <TableCell className="font-bold">TOTAL</TableCell>
                <TableCell className="text-right font-bold">R$ {totalTelecom.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                <TableCell className="text-right font-bold">R$ {totalLicenses.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                <TableCell className="text-right font-bold">R$ {totalCosts.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detailed */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">Custos Telecom (Detalhado)</CardTitle>
            <Button size="sm"><Plus className="mr-2 h-4 w-4" />Lançar Fatura</Button>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Linha</TableHead><TableHead>Colaborador</TableHead><TableHead>Centro Custo</TableHead><TableHead className="text-right">Valor</TableHead></TableRow></TableHeader>
              <TableBody>
                {filteredTelecom.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-sm">{c.lineNumber}</TableCell>
                    <TableCell>{c.collaborator}</TableCell><TableCell>{c.costCenter}</TableCell>
                    <TableCell className="text-right font-medium">R$ {c.value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">Custos Licenças (Detalhado)</CardTitle>
            <Button size="sm"><Plus className="mr-2 h-4 w-4" />Lançar Custo</Button>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>E-mail</TableHead><TableHead>Tipo</TableHead><TableHead>Centro Custo</TableHead><TableHead className="text-right">Valor</TableHead></TableRow></TableHeader>
              <TableBody>
                {filteredLicenses.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="text-sm">{c.email}</TableCell>
                    <TableCell><span className="rounded-full bg-secondary px-2 py-1 text-xs">{c.licenseType}</span></TableCell>
                    <TableCell>{c.costCenter}</TableCell>
                    <TableCell className="text-right font-medium">R$ {c.value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}