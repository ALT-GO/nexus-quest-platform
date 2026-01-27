import { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Monitor, Upload, CheckCircle2, Send } from "lucide-react";
import { toast } from "sonner";

const categories = [
  "Acesso e permissões",
  "Problemas com Computador/Notebook",
  "Problemas com Celular/Tablet",
  "Rede e Internet",
  "E-mail e Comunicação",
  "Serviços de Impressão",
  "Sistemas Corporativos",
  "Solicitação de novo Computador/Notebook",
  "Solicitação de novo Celular",
  "Solicitação de Tablet",
  "Gerais/Outros",
];

export default function ChamadoPublico() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [ticketId, setTicketId] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    department: "",
    category: "",
    description: "",
    file: null as File | null,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.email || !formData.category || !formData.description) {
      toast.error("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    // Simulate ticket creation
    const newTicketId = `TI-2024-${String(Math.floor(Math.random() * 1000)).padStart(3, "0")}`;
    setTicketId(newTicketId);
    setIsSubmitted(true);

    // Simulate email notification
    console.log("Email notification would be sent to:", formData.email);
    console.log("Ticket details:", { ...formData, ticketId: newTicketId });

    toast.success("Chamado aberto com sucesso!");
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="mx-auto max-w-lg">
          <Card className="text-center">
            <CardContent className="py-12">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
                <CheckCircle2 className="h-8 w-8 text-success" />
              </div>
              <h2 className="mb-2 text-2xl font-bold">Chamado Registrado!</h2>
              <p className="mb-4 text-muted-foreground">
                Seu chamado foi aberto com sucesso.
              </p>
              <div className="mb-6 rounded-lg bg-muted p-4">
                <p className="text-sm text-muted-foreground">Número do Chamado</p>
                <p className="text-2xl font-bold text-primary">{ticketId}</p>
              </div>
              <p className="mb-6 text-sm text-muted-foreground">
                Você receberá atualizações sobre o andamento do chamado no e-mail{" "}
                <strong>{formData.email}</strong>
              </p>
              <Button onClick={() => setIsSubmitted(false)}>
                Abrir Novo Chamado
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-primary">
            <Monitor className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold">Suporte de TI</h1>
          <p className="mt-2 text-muted-foreground">
            Abra um chamado para solicitar suporte técnico
          </p>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>Novo Chamado</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">
                    Nome Completo <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="Seu nome"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">
                    E-mail <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="seu.email@empresa.com"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="department">Departamento</Label>
                  <Input
                    id="department"
                    value={formData.department}
                    onChange={(e) =>
                      setFormData({ ...formData, department: e.target.value })
                    }
                    placeholder="Ex: Comercial, RH, Financeiro..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">
                    Categoria <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) =>
                      setFormData({ ...formData, category: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o motivo" />
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">
                  Descrição do Problema <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="description"
                  rows={5}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Descreva detalhadamente o problema ou solicitação..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="file">Anexar Arquivo (opcional)</Label>
                <div className="flex items-center gap-4">
                  <Input
                    id="file"
                    type="file"
                    className="hidden"
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        file: e.target.files?.[0] || null,
                      })
                    }
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById("file")?.click()}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Escolher Arquivo
                  </Button>
                  {formData.file && (
                    <span className="text-sm text-muted-foreground">
                      {formData.file.name}
                    </span>
                  )}
                </div>
              </div>

              <Button type="submit" className="w-full" size="lg">
                <Send className="mr-2 h-4 w-4" />
                Enviar Chamado
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Após enviar, você receberá um e-mail com o número do chamado para
          acompanhamento.
        </p>
      </div>
    </div>
  );
}
