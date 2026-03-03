import { StatusCustom } from "@/hooks/use-custom-status";
import { SlaIndicator } from "@/components/sla/SlaIndicator";
import { SlaInfo } from "@/hooks/use-sla";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Eye } from "lucide-react";

interface TicketForTable {
  id: string;
  title: string;
  category: string;
  statusId: string;
  priority: "low" | "medium" | "high";
  requester: string;
  email: string;
  createdAt: string;
  slaVencido: boolean;
  assignee?: string;
}

interface TicketTableProps {
  tickets: TicketForTable[];
  statuses: StatusCustom[];
  getSlaInfo: (createdAt: string, category: string, isCompleted: boolean) => SlaInfo;
  isFinalStatus: (statusId: string) => boolean;
}

export function TicketTable({
  tickets,
  statuses,
  getSlaInfo,
  isFinalStatus,
}: TicketTableProps) {
  const getStatusDisplay = (statusId: string) => {
    const status = statuses.find((s) => s.id === statusId);
    if (!status) return { nome: statusId, cor: "215 16% 47%" };
    return status;
  };

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Título</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Solicitante</TableHead>
              <TableHead>SLA</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Prioridade</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickets.map((ticket) => {
              const isCompleted = isFinalStatus(ticket.statusId);
              const sla = getSlaInfo(ticket.createdAt, ticket.category, isCompleted);
              const statusDisplay = getStatusDisplay(ticket.statusId);

              return (
                <TableRow
                  key={ticket.id}
                  className={
                    sla.slaVencido && !isCompleted
                      ? "bg-destructive/5"
                      : undefined
                  }
                >
                  <TableCell className="font-mono text-sm">
                    {ticket.id}
                  </TableCell>
                  <TableCell className="font-medium">{ticket.title}</TableCell>
                  <TableCell>
                    <span className="rounded-full bg-secondary px-2 py-1 text-xs">
                      {ticket.category}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm">{ticket.requester}</p>
                      <p className="text-xs text-muted-foreground">
                        {ticket.email}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <SlaIndicator sla={sla} />
                  </TableCell>
                  <TableCell>
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
                      style={{
                        backgroundColor: `hsl(${statusDisplay.cor} / 0.15)`,
                        color: `hsl(${statusDisplay.cor})`,
                      }}
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: `hsl(${statusDisplay.cor})` }}
                      />
                      {statusDisplay.nome}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        ticket.priority === "high"
                          ? "bg-destructive/15 text-destructive"
                          : ticket.priority === "medium"
                          ? "bg-warning/15 text-warning"
                          : "bg-success/15 text-success"
                      }`}
                    >
                      {ticket.priority === "high"
                        ? "Alta"
                        : ticket.priority === "medium"
                        ? "Média"
                        : "Baixa"}
                    </span>
                  </TableCell>
                  <TableCell>{ticket.assignee || "-"}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
