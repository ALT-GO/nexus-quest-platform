import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DollarSign,
  Phone,
  FileText,
  Filter,
  Plus,
  Download,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface TelecomCost {
  id: string;
  month: string;
  lineNumber: string;
  collaborator: string;
  costCenter: string;
  value: number;
}

interface LicenseCost {
  id: string;
  month: string;
  email: string;
  collaborator: string;
  costCenter: string;
  licenseType: string;
  value: number;
}

const initialTelecomCosts: TelecomCost[] = [
  {
    id: "1",
    month: "2024-11",
    lineNumber: "(11) 99999-1234",
    collaborator: "Maria Silva",
    costCenter: "Comercial",
    value: 189.9,
  },
  {
    id: "2",
    month: "2024-11",
    lineNumber: "(11) 99999-5678",
    collaborator: "João Pedro",
    costCenter: "TI",
    value: 149.9,
  },
  {
    id: "3",
    month: "2024-11",
    lineNumber: "(11) 99999-9012",
    collaborator: "Ana Costa",
    costCenter: "Marketing",
    value: 129.9,
  },
  {
    id: "4",
    month: "2024-10",
    lineNumber: "(11) 99999-1234",
    collaborator: "Maria Silva",
    costCenter: "Comercial",
    value: 210.5,
  },
  {
    id: "5",
    month: "2024-10",
    lineNumber: "(11) 99999-5678",
    collaborator: "João Pedro",
    costCenter: "TI",
    value: 145.0,
  },
];

const initialLicenseCosts: LicenseCost[] = [
  {
    id: "1",
    month: "2024-11",
    email: "maria.silva@empresa.com",
    collaborator: "Maria Silva",
    costCenter: "Comercial",
    licenseType: "Microsoft 365 E3",
    value: 120.0,
  },
  {
    id: "2",
    month: "2024-11",
    email: "joao.pedro@empresa.com",
    collaborator: "João Pedro",
    costCenter: "TI",
    licenseType: "Microsoft 365 E3",
    value: 120.0,
  },
  {
    id: "3",
    month: "2024-11",
    email: "ana.costa@empresa.com",
    collaborator: "Ana Costa",
    costCenter: "Marketing",
    licenseType: "Microsoft 365 E1",
    value: 45.0,
  },
  {
    id: "4",
    month: "2024-10",
    email: "maria.silva@empresa.com",
    collaborator: "Maria Silva",
    costCenter: "Comercial",
    licenseType: "Microsoft 365 E3",
    value: 120.0,
  },
  {
    id: "5",
    month: "2024-10",
    email: "joao.pedro@empresa.com",
    collaborator: "João Pedro",
    costCenter: "TI",
    licenseType: "Microsoft 365 E3",
    value: 120.0,
  },
];

const months = [
  { value: "2024-11", label: "Novembro 2024" },
  { value: "2024-10", label: "Outubro 2024" },
  { value: "2024-09", label: "Setembro 2024" },
];

export default function DashboardFinanceiro() {
  const [telecomCosts] = useState<TelecomCost[]>(initialTelecomCosts);
  const [licenseCosts] = useState<LicenseCost[]>(initialLicenseCosts);
  const [selectedMonth, setSelectedMonth] = useState("2024-11");
  const [isAddCostDialogOpen, setIsAddCostDialogOpen] = useState(false);

  // Filter by month
  const filteredTelecom = telecomCosts.filter((c) => c.month === selectedMonth);
  const filteredLicenses = licenseCosts.filter((c) => c.month === selectedMonth);

  // Totals
  const totalTelecom = filteredTelecom.reduce((sum, c) => sum + c.value, 0);
  const totalLicenses = filteredLicenses.reduce((sum, c) => sum + c.value, 0);
  const totalCosts = totalTelecom + totalLicenses;

  // Group by cost center
  const costByCostCenter = [...filteredTelecom, ...filteredLicenses].reduce(
    (acc, cost) => {
      const existing = acc.find((item) => item.costCenter === cost.costCenter);
      if (existing) {
        if ("lineNumber" in cost) {
          existing.telecom += cost.value;
        } else {
          existing.licenses += cost.value;
        }
        existing.total += cost.value;
      } else {
        acc.push({
          costCenter: cost.costCenter,
          telecom: "lineNumber" in cost ? cost.value : 0,
          licenses: "lineNumber" in cost ? 0 : cost.value,
          total: cost.value,
        });
      }
      return acc;
    },
    [] as { costCenter: string; telecom: number; licenses: number; total: number }[]
  );

  // Chart data
  const chartColors = [
    "hsl(var(--primary))",
    "hsl(var(--success))",
    "hsl(var(--warning))",
    "hsl(var(--chart-4))",
    "hsl(var(--info))",
  ];

  const pieData = costByCostCenter.map((item, index) => ({
    name: item.costCenter,
    value: item.total,
    color: chartColors[index % chartColors.length],
  }));

  return (
    <AppLayout>
      <PageHeader
        title="Dashboard Financeiro TI"
        description="Rateio de custos de Telecom e Licenças por Centro de Custo"
      >
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-[180px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {months.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </PageHeader>

      {/* Stats */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Total Telecom"
          value={`R$ ${totalTelecom.toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
          })}`}
          icon={Phone}
          className="border-l-4 border-l-primary"
        />
        <StatCard
          title="Total Licenças"
          value={`R$ ${totalLicenses.toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
          })}`}
          icon={FileText}
          className="border-l-4 border-l-success"
        />
        <StatCard
          title="Custo Total TI"
          value={`R$ ${totalCosts.toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
          })}`}
          icon={DollarSign}
          className="border-l-4 border-l-warning"
        />
      </div>

      {/* Charts */}
      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Custos por Centro de Custo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={costByCostCenter}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="costCenter"
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                  />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number) =>
                      `R$ ${value.toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                      })}`
                    }
                  />
                  <Bar
                    dataKey="telecom"
                    name="Telecom"
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                    stackId="a"
                  />
                  <Bar
                    dataKey="licenses"
                    name="Licenças"
                    fill="hsl(var(--success))"
                    radius={[4, 4, 0, 0]}
                    stackId="a"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Distribuição por Centro de Custo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-[280px] items-center justify-center gap-8">
              <div className="h-[200px] w-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                      formatter={(value: number) =>
                        `R$ ${value.toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                        })}`
                      }
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3">
                {pieData.map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm text-muted-foreground">
                      {item.name}
                    </span>
                    <span className="ml-auto font-medium">
                      R$ {item.value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cost Center Summary Table */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold">
            Resumo por Centro de Custo - {months.find((m) => m.value === selectedMonth)?.label}
          </CardTitle>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Centro de Custo</TableHead>
                <TableHead className="text-right">Telecom</TableHead>
                <TableHead className="text-right">Licenças Microsoft</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {costByCostCenter.map((item) => (
                <TableRow key={item.costCenter}>
                  <TableCell className="font-medium">{item.costCenter}</TableCell>
                  <TableCell className="text-right">
                    R$ {item.telecom.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-right">
                    R$ {item.licenses.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    R$ {item.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/50">
                <TableCell className="font-bold">TOTAL</TableCell>
                <TableCell className="text-right font-bold">
                  R$ {totalTelecom.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </TableCell>
                <TableCell className="text-right font-bold">
                  R$ {totalLicenses.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </TableCell>
                <TableCell className="text-right font-bold">
                  R$ {totalCosts.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detailed Costs */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Telecom Costs */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">
              Custos Telecom (Detalhado)
            </CardTitle>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Lançar Fatura
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Linha</TableHead>
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Centro Custo</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTelecom.map((cost) => (
                  <TableRow key={cost.id}>
                    <TableCell className="font-mono text-sm">
                      {cost.lineNumber}
                    </TableCell>
                    <TableCell>{cost.collaborator}</TableCell>
                    <TableCell>{cost.costCenter}</TableCell>
                    <TableCell className="text-right font-medium">
                      R$ {cost.value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* License Costs */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">
              Custos Licenças (Detalhado)
            </CardTitle>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Lançar Custo
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Centro Custo</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLicenses.map((cost) => (
                  <TableRow key={cost.id}>
                    <TableCell className="text-sm">{cost.email}</TableCell>
                    <TableCell>
                      <span className="rounded-full bg-secondary px-2 py-1 text-xs">
                        {cost.licenseType}
                      </span>
                    </TableCell>
                    <TableCell>{cost.costCenter}</TableCell>
                    <TableCell className="text-right font-medium">
                      R$ {cost.value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
