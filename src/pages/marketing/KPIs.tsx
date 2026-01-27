import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Plus,
  TrendingUp,
  Target,
  DollarSign,
  Users,
  Filter,
  FileText,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";

interface Event {
  id: string;
  name: string;
  investedValue: number;
  leadsGenerated: number;
  cpl: number;
  category: string;
  date: string;
}

interface Proposal {
  id: string;
  clientName: string;
  value: number;
  quantity: number;
  date: string;
}

const initialEvents: Event[] = [
  {
    id: "1",
    name: "Webinar Transformação Digital",
    investedValue: 5000,
    leadsGenerated: 120,
    cpl: 41.67,
    category: "Digital",
    date: "2024-11-01",
  },
  {
    id: "2",
    name: "Feira de Tecnologia 2024",
    investedValue: 25000,
    leadsGenerated: 350,
    cpl: 71.43,
    category: "Eventos Presenciais",
    date: "2024-10-15",
  },
  {
    id: "3",
    name: "Campanha LinkedIn Ads",
    investedValue: 8000,
    leadsGenerated: 95,
    cpl: 84.21,
    category: "Mídia Paga",
    date: "2024-11-05",
  },
];

const initialProposals: Proposal[] = [
  {
    id: "1",
    clientName: "Tech Solutions Ltda",
    value: 150000,
    quantity: 3,
    date: "2024-11-10",
  },
  {
    id: "2",
    clientName: "Indústria ABC",
    value: 85000,
    quantity: 1,
    date: "2024-11-08",
  },
  {
    id: "3",
    clientName: "Comércio XYZ",
    value: 45000,
    quantity: 2,
    date: "2024-11-05",
  },
];

const monthlyData = [
  { month: "Jan", investimento: 35000, leads: 280, propostas: 450000 },
  { month: "Fev", investimento: 42000, leads: 320, propostas: 520000 },
  { month: "Mar", investimento: 38000, leads: 295, propostas: 480000 },
  { month: "Abr", investimento: 55000, leads: 420, propostas: 680000 },
  { month: "Mai", investimento: 48000, leads: 380, propostas: 590000 },
  { month: "Jun", investimento: 52000, leads: 410, propostas: 720000 },
];

const categories = [
  "Digital",
  "Mídia Paga",
  "Eventos Presenciais",
  "Conteúdo",
  "Branding",
  "Outros",
];

export default function KPIs() {
  const [events, setEvents] = useState<Event[]>(initialEvents);
  const [proposals, setProposals] = useState<Proposal[]>(initialProposals);
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
  const [isProposalDialogOpen, setIsProposalDialogOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState("all");

  const [newEvent, setNewEvent] = useState({
    name: "",
    investedValue: "",
    leadsGenerated: "",
    category: "",
    date: "",
  });

  const [newProposal, setNewProposal] = useState({
    clientName: "",
    value: "",
    quantity: "",
    date: "",
  });

  const totalInvestment = events.reduce((sum, e) => sum + e.investedValue, 0);
  const totalLeads = events.reduce((sum, e) => sum + e.leadsGenerated, 0);
  const averageCPL = totalInvestment / totalLeads || 0;
  const totalProposalValue = proposals.reduce((sum, p) => sum + p.value, 0);

  const handleAddEvent = () => {
    if (!newEvent.name || !newEvent.investedValue || !newEvent.leadsGenerated)
      return;

    const investedValue = parseFloat(newEvent.investedValue);
    const leadsGenerated = parseInt(newEvent.leadsGenerated);
    const cpl = investedValue / leadsGenerated;

    const event: Event = {
      id: Date.now().toString(),
      name: newEvent.name,
      investedValue,
      leadsGenerated,
      cpl,
      category: newEvent.category,
      date: newEvent.date,
    };

    setEvents([...events, event]);
    setNewEvent({
      name: "",
      investedValue: "",
      leadsGenerated: "",
      category: "",
      date: "",
    });
    setIsEventDialogOpen(false);
  };

  const handleAddProposal = () => {
    if (!newProposal.clientName || !newProposal.value) return;

    const proposal: Proposal = {
      id: Date.now().toString(),
      clientName: newProposal.clientName,
      value: parseFloat(newProposal.value),
      quantity: parseInt(newProposal.quantity) || 1,
      date: newProposal.date,
    };

    setProposals([...proposals, proposal]);
    setNewProposal({ clientName: "", value: "", quantity: "", date: "" });
    setIsProposalDialogOpen(false);
  };

  return (
    <AppLayout>
      <PageHeader
        title="KPIs & Métricas"
        description="Indicadores de performance e ROI de marketing"
      >
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-[180px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Meses</SelectItem>
            <SelectItem value="11-2024">Novembro 2024</SelectItem>
            <SelectItem value="10-2024">Outubro 2024</SelectItem>
            <SelectItem value="09-2024">Setembro 2024</SelectItem>
          </SelectContent>
        </Select>
      </PageHeader>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Investimento Total"
          value={`R$ ${totalInvestment.toLocaleString("pt-BR")}`}
          icon={DollarSign}
          trend={{ value: 15, isPositive: true }}
        />
        <StatCard
          title="Leads Gerados"
          value={totalLeads}
          icon={Users}
          trend={{ value: 22, isPositive: true }}
        />
        <StatCard
          title="CPL Médio"
          value={`R$ ${averageCPL.toFixed(2)}`}
          description="Custo por Lead"
          icon={Target}
          trend={{ value: 8, isPositive: false }}
        />
        <StatCard
          title="Valor Propostas"
          value={`R$ ${(totalProposalValue / 1000).toFixed(0)}k`}
          icon={TrendingUp}
          trend={{ value: 18, isPositive: true }}
        />
      </div>

      {/* Charts */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Investimento vs Leads (Mensal)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                  />
                  <YAxis
                    yAxisId="left"
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar
                    yAxisId="left"
                    dataKey="investimento"
                    name="Investimento (R$)"
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="leads"
                    name="Leads"
                    stroke="hsl(var(--success))"
                    strokeWidth={2}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Valor de Propostas (Mensal)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="month"
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
                      `R$ ${value.toLocaleString("pt-BR")}`
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="propostas"
                    name="Propostas"
                    stroke="hsl(var(--chart-4))"
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--chart-4))" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Events Table */}
      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold">
            Eventos e Campanhas
          </CardTitle>
          <Dialog open={isEventDialogOpen} onOpenChange={setIsEventDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Novo Registro
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Registrar Evento/Campanha</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Nome do Evento</Label>
                  <Input
                    value={newEvent.name}
                    onChange={(e) =>
                      setNewEvent({ ...newEvent, name: e.target.value })
                    }
                    placeholder="Nome da campanha ou evento"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Valor Investido (R$)</Label>
                    <Input
                      type="number"
                      value={newEvent.investedValue}
                      onChange={(e) =>
                        setNewEvent({
                          ...newEvent,
                          investedValue: e.target.value,
                        })
                      }
                      placeholder="0.00"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Leads Gerados</Label>
                    <Input
                      type="number"
                      value={newEvent.leadsGenerated}
                      onChange={(e) =>
                        setNewEvent({
                          ...newEvent,
                          leadsGenerated: e.target.value,
                        })
                      }
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Categoria</Label>
                    <Select
                      value={newEvent.category}
                      onValueChange={(value) =>
                        setNewEvent({ ...newEvent, category: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Data</Label>
                    <Input
                      type="date"
                      value={newEvent.date}
                      onChange={(e) =>
                        setNewEvent({ ...newEvent, date: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setIsEventDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button onClick={handleAddEvent}>Salvar</Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Evento/Campanha</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead className="text-right">Investido</TableHead>
                <TableHead className="text-right">Leads</TableHead>
                <TableHead className="text-right">CPL</TableHead>
                <TableHead>Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((event) => (
                <TableRow key={event.id}>
                  <TableCell className="font-medium">{event.name}</TableCell>
                  <TableCell>
                    <span className="rounded-full bg-secondary px-2 py-1 text-xs">
                      {event.category}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    R$ {event.investedValue.toLocaleString("pt-BR")}
                  </TableCell>
                  <TableCell className="text-right">
                    {event.leadsGenerated}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    R$ {event.cpl.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    {new Date(event.date).toLocaleDateString("pt-BR")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Proposals Table */}
      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold">
            Registro de Propostas
          </CardTitle>
          <Dialog
            open={isProposalDialogOpen}
            onOpenChange={setIsProposalDialogOpen}
          >
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Nova Proposta
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Registrar Proposta</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Nome do Cliente</Label>
                  <Input
                    value={newProposal.clientName}
                    onChange={(e) =>
                      setNewProposal({
                        ...newProposal,
                        clientName: e.target.value,
                      })
                    }
                    placeholder="Nome da empresa"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Valor da Proposta (R$)</Label>
                    <Input
                      type="number"
                      value={newProposal.value}
                      onChange={(e) =>
                        setNewProposal({ ...newProposal, value: e.target.value })
                      }
                      placeholder="0.00"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Quantidade</Label>
                    <Input
                      type="number"
                      value={newProposal.quantity}
                      onChange={(e) =>
                        setNewProposal({
                          ...newProposal,
                          quantity: e.target.value,
                        })
                      }
                      placeholder="1"
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Data</Label>
                  <Input
                    type="date"
                    value={newProposal.date}
                    onChange={(e) =>
                      setNewProposal({ ...newProposal, date: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setIsProposalDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button onClick={handleAddProposal}>Salvar</Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-right">Quantidade</TableHead>
                <TableHead>Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {proposals.map((proposal) => (
                <TableRow key={proposal.id}>
                  <TableCell className="font-medium">
                    {proposal.clientName}
                  </TableCell>
                  <TableCell className="text-right">
                    R$ {proposal.value.toLocaleString("pt-BR")}
                  </TableCell>
                  <TableCell className="text-right">
                    {proposal.quantity}
                  </TableCell>
                  <TableCell>
                    {new Date(proposal.date).toLocaleDateString("pt-BR")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
