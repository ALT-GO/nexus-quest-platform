import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Plus,
  Laptop,
  Key,
  Phone,
  FileText,
  Search,
  Eye,
  EyeOff,
  Edit,
  Trash2,
} from "lucide-react";

// Hardware types
interface Hardware {
  id: string;
  collaborator: string;
  costCenter: string;
  sector: string;
  model: string;
  type: "Notebook" | "Tablet" | "Monitor" | "Teclado" | "Mouse" | "Outros";
  serviceTag: string;
  notes: string;
}

// Password vault
interface PasswordEntry {
  id: string;
  accountName: string;
  login: string;
  password: string;
  notes: string;
}

// Telecom
interface TelecomLine {
  id: string;
  number: string;
  collaborator: string;
  type: string;
  manager: string;
  operator: string;
  contract: string;
  costCenter: string;
}

// Microsoft License
interface MicrosoftLicense {
  id: string;
  status: "active" | "inactive";
  collaborator: string;
  email: string;
  createdDate: string;
  licenseType: string;
  manager: string;
  contract: string;
  costCenter: string;
  notes: string;
}

const initialHardware: Hardware[] = [
  {
    id: "1",
    collaborator: "Maria Silva",
    costCenter: "Comercial",
    sector: "Vendas",
    model: "Dell Latitude 5520",
    type: "Notebook",
    serviceTag: "ABC123XYZ",
    notes: "Entregue em 01/2024",
  },
  {
    id: "2",
    collaborator: "João Pedro",
    costCenter: "TI",
    sector: "Desenvolvimento",
    model: "Dell Latitude 7420",
    type: "Notebook",
    serviceTag: "DEF456UVW",
    notes: "",
  },
  {
    id: "3",
    collaborator: "Ana Costa",
    costCenter: "Marketing",
    sector: "Criação",
    model: "iPad Pro 12.9",
    type: "Tablet",
    serviceTag: "GHI789RST",
    notes: "Para apresentações",
  },
];

const initialPasswords: PasswordEntry[] = [
  {
    id: "1",
    accountName: "AWS Console",
    login: "admin@empresa.com",
    password: "S3cur3P@ssw0rd!",
    notes: "Conta principal AWS",
  },
  {
    id: "2",
    accountName: "Google Workspace Admin",
    login: "admin@empresa.com",
    password: "G00gl3Adm1n#2024",
    notes: "Administração do Workspace",
  },
  {
    id: "3",
    accountName: "Cloudflare",
    login: "ti@empresa.com",
    password: "Cl0udfl@r3!Secure",
    notes: "DNS e CDN",
  },
];

const initialTelecom: TelecomLine[] = [
  {
    id: "1",
    number: "(11) 99999-1234",
    collaborator: "Maria Silva",
    type: "Corporativo",
    manager: "Carlos Diretor",
    operator: "Vivo",
    contract: "CONT-2024-001",
    costCenter: "Comercial",
  },
  {
    id: "2",
    number: "(11) 99999-5678",
    collaborator: "João Pedro",
    type: "Corporativo",
    manager: "Carlos Diretor",
    operator: "Vivo",
    contract: "CONT-2024-001",
    costCenter: "TI",
  },
];

const initialLicenses: MicrosoftLicense[] = [
  {
    id: "1",
    status: "active",
    collaborator: "Maria Silva",
    email: "maria.silva@empresa.com",
    createdDate: "2024-01-15",
    licenseType: "Microsoft 365 E3",
    manager: "Carlos Diretor",
    contract: "EA-2024-001",
    costCenter: "Comercial",
    notes: "",
  },
  {
    id: "2",
    status: "active",
    collaborator: "João Pedro",
    email: "joao.pedro@empresa.com",
    createdDate: "2024-02-10",
    licenseType: "Microsoft 365 E3",
    manager: "Carlos Diretor",
    contract: "EA-2024-001",
    costCenter: "TI",
    notes: "",
  },
  {
    id: "3",
    status: "inactive",
    collaborator: "Ex-Funcionário",
    email: "ex.funcionario@empresa.com",
    createdDate: "2023-06-01",
    licenseType: "Microsoft 365 E1",
    manager: "Carlos Diretor",
    contract: "EA-2024-001",
    costCenter: "RH",
    notes: "Desligado em 11/2024",
  },
];

export default function GestaoAtivos() {
  const [hardware, setHardware] = useState<Hardware[]>(initialHardware);
  const [passwords, setPasswords] = useState<PasswordEntry[]>(initialPasswords);
  const [telecom, setTelecom] = useState<TelecomLine[]>(initialTelecom);
  const [licenses, setLicenses] = useState<MicrosoftLicense[]>(initialLicenses);

  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  return (
    <AppLayout>
      <PageHeader
        title="Gestão de Ativos"
        description="Inventário de hardware, senhas, telecom e licenças"
      />

      <Tabs defaultValue="hardware" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:grid-cols-none lg:gap-2">
          <TabsTrigger value="hardware" className="gap-2">
            <Laptop className="h-4 w-4 hidden sm:inline" />
            Hardware
          </TabsTrigger>
          <TabsTrigger value="passwords" className="gap-2">
            <Key className="h-4 w-4 hidden sm:inline" />
            Senhas
          </TabsTrigger>
          <TabsTrigger value="telecom" className="gap-2">
            <Phone className="h-4 w-4 hidden sm:inline" />
            Telecom
          </TabsTrigger>
          <TabsTrigger value="licenses" className="gap-2">
            <FileText className="h-4 w-4 hidden sm:inline" />
            Licenças
          </TabsTrigger>
        </TabsList>

        {/* Hardware Tab */}
        <TabsContent value="hardware">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold">
                Hardware (Notebooks/Tablets/Periféricos)
              </CardTitle>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Novo Ativo
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Colaborador</TableHead>
                    <TableHead>Centro de Custo</TableHead>
                    <TableHead>Setor</TableHead>
                    <TableHead>Modelo</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Service Tag</TableHead>
                    <TableHead>Notas</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {hardware.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {item.collaborator}
                      </TableCell>
                      <TableCell>{item.costCenter}</TableCell>
                      <TableCell>{item.sector}</TableCell>
                      <TableCell>{item.model}</TableCell>
                      <TableCell>
                        <span className="rounded-full bg-secondary px-2 py-1 text-xs">
                          {item.type}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {item.serviceTag}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                        {item.notes || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Passwords Tab */}
        <TabsContent value="passwords">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold">
                Cofre de Senhas
              </CardTitle>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Nova Senha
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome da Conta</TableHead>
                    <TableHead>Login</TableHead>
                    <TableHead>Senha</TableHead>
                    <TableHead>Notas</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {passwords.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {item.accountName}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {item.login}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm">
                            {visiblePasswords.has(item.id)
                              ? item.password
                              : "••••••••••"}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => togglePasswordVisibility(item.id)}
                          >
                            {visiblePasswords.has(item.id) ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {item.notes || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Telecom Tab */}
        <TabsContent value="telecom">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold">
                Gestão de Telecom (Linhas Telefônicas)
              </CardTitle>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Nova Linha
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>Colaborador</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Gestor</TableHead>
                    <TableHead>Operadora</TableHead>
                    <TableHead>Contrato</TableHead>
                    <TableHead>Centro de Custo</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {telecom.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono font-medium">
                        {item.number}
                      </TableCell>
                      <TableCell>{item.collaborator}</TableCell>
                      <TableCell>
                        <span className="rounded-full bg-secondary px-2 py-1 text-xs">
                          {item.type}
                        </span>
                      </TableCell>
                      <TableCell>{item.manager}</TableCell>
                      <TableCell>{item.operator}</TableCell>
                      <TableCell className="text-sm">{item.contract}</TableCell>
                      <TableCell>{item.costCenter}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Licenses Tab */}
        <TabsContent value="licenses">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold">
                Licenças Microsoft
              </CardTitle>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Nova Licença
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Colaborador</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Tipo Licença</TableHead>
                    <TableHead>Gestor</TableHead>
                    <TableHead>Centro de Custo</TableHead>
                    <TableHead>Data Criação</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {licenses.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <StatusBadge variant={item.status}>
                          {item.status === "active" ? "Ativo" : "Inativo"}
                        </StatusBadge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {item.collaborator}
                      </TableCell>
                      <TableCell className="text-sm">{item.email}</TableCell>
                      <TableCell>
                        <span className="rounded-full bg-secondary px-2 py-1 text-xs">
                          {item.licenseType}
                        </span>
                      </TableCell>
                      <TableCell>{item.manager}</TableCell>
                      <TableCell>{item.costCenter}</TableCell>
                      <TableCell>
                        {new Date(item.createdDate).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
