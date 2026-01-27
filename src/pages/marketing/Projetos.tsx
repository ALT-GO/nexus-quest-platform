import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, GripVertical, Calendar, User, Clock } from "lucide-react";

interface Task {
  id: string;
  title: string;
  description: string;
  status: "backlog" | "todo" | "inProgress" | "review" | "done";
  priority: "low" | "medium" | "high";
  assignee: string;
  dueDate: string;
  type: string;
  needsApproval: boolean;
}

const initialTasks: Task[] = [
  {
    id: "1",
    title: "Campanha Black Friday",
    description: "Criar artes para redes sociais e e-mail marketing",
    status: "inProgress",
    priority: "high",
    assignee: "Maria Silva",
    dueDate: "2024-11-20",
    type: "Criação de arte",
    needsApproval: true,
  },
  {
    id: "2",
    title: "Assinatura E-mail - João",
    description: "Nova assinatura de e-mail para colaborador",
    status: "review",
    priority: "low",
    assignee: "Carlos Souza",
    dueDate: "2024-11-15",
    type: "Assinatura de e-mail",
    needsApproval: true,
  },
  {
    id: "3",
    title: "Capa Relatório Anual",
    description: "Design da capa do relatório anual 2024",
    status: "todo",
    priority: "medium",
    assignee: "Ana Costa",
    dueDate: "2024-11-25",
    type: "Capa de proposta/relatório",
    needsApproval: true,
  },
  {
    id: "4",
    title: "Banner Site Institucional",
    description: "Atualização do banner principal do site",
    status: "backlog",
    priority: "medium",
    assignee: "Maria Silva",
    dueDate: "2024-11-30",
    type: "Materiais digitais",
    needsApproval: false,
  },
  {
    id: "5",
    title: "Folder Evento",
    description: "Material impresso para evento corporativo",
    status: "done",
    priority: "high",
    assignee: "Carlos Souza",
    dueDate: "2024-11-10",
    type: "Materiais impressos",
    needsApproval: true,
  },
];

const columns = [
  { id: "backlog", title: "Backlog", color: "bg-muted" },
  { id: "todo", title: "A Fazer", color: "bg-info/20" },
  { id: "inProgress", title: "Em Andamento", color: "bg-warning/20" },
  { id: "review", title: "Aguardando Aprovação", color: "bg-chart-4/20" },
  { id: "done", title: "Concluído", color: "bg-success/20" },
];

const requestTypes = [
  "Assinatura de e-mail",
  "Capa de proposta/relatório",
  "Criação de arte",
  "Materiais impressos",
  "Materiais digitais",
  "Outros",
];

export default function Projetos() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newTask, setNewTask] = useState<{
    title: string;
    description: string;
    priority: "low" | "medium" | "high";
    assignee: string;
    dueDate: string;
    type: string;
  }>({
    title: "",
    description: "",
    priority: "medium",
    assignee: "",
    dueDate: "",
    type: "",
  });

  const handleAddTask = () => {
    if (!newTask.title || !newTask.type) return;

    const task: Task = {
      id: Date.now().toString(),
      ...newTask,
      status: "backlog",
      needsApproval: true,
    };

    setTasks([...tasks, task]);
    setNewTask({
      title: "",
      description: "",
      priority: "medium",
      assignee: "",
      dueDate: "",
      type: "",
    });
    setIsDialogOpen(false);
  };

  const getTasksByStatus = (status: string) =>
    tasks.filter((task) => task.status === status);

  return (
    <AppLayout>
      <PageHeader
        title="Gestão de Projetos"
        description="Kanban de tarefas e solicitações de marketing"
      >
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nova Tarefa
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Criar Nova Tarefa</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Título</Label>
                <Input
                  id="title"
                  value={newTask.title}
                  onChange={(e) =>
                    setNewTask({ ...newTask, title: e.target.value })
                  }
                  placeholder="Nome da tarefa"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="type">Tipo de Solicitação</Label>
                <Select
                  value={newTask.type}
                  onValueChange={(value) =>
                    setNewTask({ ...newTask, type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {requestTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={newTask.description}
                  onChange={(e) =>
                    setNewTask({ ...newTask, description: e.target.value })
                  }
                  placeholder="Detalhes da solicitação"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="priority">Prioridade</Label>
                  <Select
                    value={newTask.priority}
                    onValueChange={(value: "low" | "medium" | "high") =>
                      setNewTask({ ...newTask, priority: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Baixa</SelectItem>
                      <SelectItem value="medium">Média</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="dueDate">Prazo</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={newTask.dueDate}
                    onChange={(e) =>
                      setNewTask({ ...newTask, dueDate: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="assignee">Responsável</Label>
                <Input
                  id="assignee"
                  value={newTask.assignee}
                  onChange={(e) =>
                    setNewTask({ ...newTask, assignee: e.target.value })
                  }
                  placeholder="Nome do responsável"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAddTask}>Criar Tarefa</Button>
            </div>
          </DialogContent>
        </Dialog>
      </PageHeader>

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((column) => (
          <div key={column.id} className="min-w-[300px] flex-1">
            <div
              className={`mb-3 flex items-center justify-between rounded-lg px-3 py-2 ${column.color}`}
            >
              <h3 className="font-semibold">{column.title}</h3>
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-background text-sm font-medium">
                {getTasksByStatus(column.id).length}
              </span>
            </div>
            <div className="space-y-3">
              {getTasksByStatus(column.id).map((task) => (
                <Card
                  key={task.id}
                  className="cursor-pointer transition-shadow hover:shadow-md"
                >
                  <CardContent className="p-4">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <h4 className="font-medium leading-tight">{task.title}</h4>
                      <GripVertical className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    </div>
                    <p className="mb-3 text-sm text-muted-foreground line-clamp-2">
                      {task.description}
                    </p>
                    <div className="mb-3 flex flex-wrap gap-2">
                      <StatusBadge variant={task.priority}>
                        {task.priority === "high"
                          ? "Alta"
                          : task.priority === "medium"
                          ? "Média"
                          : "Baixa"}
                      </StatusBadge>
                      <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
                        {task.type}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {task.assignee}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(task.dueDate).toLocaleDateString("pt-BR")}
                      </div>
                    </div>
                    {task.needsApproval && task.status === "review" && (
                      <div className="mt-3 flex gap-2">
                        <Button size="sm" variant="outline" className="flex-1">
                          Rejeitar
                        </Button>
                        <Button size="sm" className="flex-1">
                          Aprovar
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </AppLayout>
  );
}
