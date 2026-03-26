import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Save, Download, Loader2, ScrollText } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { AutomationsTab } from "./AutomationsTab";
import { IntegrityAuditorTab } from "./IntegrityAuditorTab";
import { DangerZoneTab } from "./DangerZoneTab";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useSlaSettings } from "@/hooks/use-sla-settings";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const WEEKDAYS = [
  { value: 0, label: "Dom" },
  { value: 1, label: "Seg" },
  { value: 2, label: "Ter" },
  { value: 3, label: "Qua" },
  { value: 4, label: "Qui" },
  { value: 5, label: "Sex" },
  { value: 6, label: "Sáb" },
];

interface AuditLog {
  id: string;
  user_name: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details: string;
  created_at: string;
}

export function SystemPreferencesTab() {
  const { isAdmin } = useAuth();
  const { settings, loading: slaLoading, saveSettings } = useSlaSettings();
  const [businessStart, setBusinessStart] = useState("08:00");
  const [businessEnd, setBusinessEnd] = useState("18:00");
  const [workingDays, setWorkingDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [businessHoursOnly, setBusinessHoursOnly] = useState(true);
  const [savingSla, setSavingSla] = useState(false);

  // Audit logs
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logsVisible, setLogsVisible] = useState(false);

  useEffect(() => {
    if (!slaLoading) {
      setBusinessStart(settings.businessStart);
      setBusinessEnd(settings.businessEnd);
      setWorkingDays(settings.workingDays);
      setBusinessHoursOnly(settings.businessHoursOnly);
    }
  }, [slaLoading, settings]);

  const handleSaveSla = async () => {
    setSavingSla(true);
    const ok = await saveSettings({
      businessStart,
      businessEnd,
      workingDays,
      businessHoursOnly,
    });
    setSavingSla(false);
    if (ok) {
      toast.success("Configurações de SLA salvas!");
    } else {
      toast.error("Erro ao salvar configurações");
    }
  };

  const toggleDay = (day: number) => {
    setWorkingDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  const fetchAuditLogs = async () => {
    setLoadingLogs(true);
    const { data } = await supabase
      .from("audit_logs" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    setAuditLogs((data as AuditLog[] | null) || []);
    setLoadingLogs(false);
    setLogsVisible(true);
  };

  const downloadCsv = () => {
    if (auditLogs.length === 0) {
      toast.error("Nenhum log para exportar");
      return;
    }
    const header = "Data,Usuário,Ação,Tipo,ID Entidade,Detalhes\n";
    const rows = auditLogs
      .map((l) =>
        [
          format(new Date(l.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR }),
          `"${l.user_name}"`,
          `"${l.action}"`,
          `"${l.entity_type}"`,
          `"${l.entity_id}"`,
          `"${l.details.replace(/"/g, '""')}"`,
        ].join(",")
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit_logs_${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV baixado!");
  };

  return (
    <div className="space-y-6">
      {/* SLA & Horário Comercial */}
      <Card>
        <CardHeader>
          <CardTitle>Horário Comercial & SLA</CardTitle>
          <CardDescription>
            Defina o horário de trabalho e dias úteis usados para cálculo de prazos de SLA
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="business-start">Início do Expediente</Label>
              <Input
                id="business-start"
                type="time"
                value={businessStart}
                onChange={(e) => setBusinessStart(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="business-end">Fim do Expediente</Label>
              <Input
                id="business-end"
                type="time"
                value={businessEnd}
                onChange={(e) => setBusinessEnd(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Dias Úteis</Label>
            <div className="flex flex-wrap gap-3">
              {WEEKDAYS.map((day) => (
                <label
                  key={day.value}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Checkbox
                    checked={workingDays.includes(day.value)}
                    onCheckedChange={() => toggleDay(day.value)}
                  />
                  <span className="text-sm">{day.label}</span>
                </label>
              ))}
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Contar apenas horas úteis</p>
              <p className="text-sm text-muted-foreground">
                Excluir madrugadas e finais de semana do cálculo de SLA
              </p>
            </div>
            <Switch
              checked={businessHoursOnly}
              onCheckedChange={setBusinessHoursOnly}
            />
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSaveSla} disabled={savingSla}>
              <Save className="mr-2 h-4 w-4" />
              {savingSla ? "Salvando..." : "Salvar SLA"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notificações */}
      <Card>
        <CardHeader>
          <CardTitle>Notificações por E-mail</CardTitle>
          <CardDescription>
            Controle quais notificações automáticas o sistema envia
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { title: "Novos Chamados", desc: "Notificar responsáveis quando um chamado for aberto", on: true },
            { title: "SLA Próximo do Vencimento", desc: "Alertar quando um SLA estiver a 1h de expirar", on: true },
            { title: "Aprovações Pendentes", desc: "Lembrete diário de tarefas aguardando aprovação", on: true },
            { title: "Relatórios Semanais", desc: "Enviar resumo semanal de métricas por e-mail", on: false },
          ].map((item, i) => (
            <div key={i}>
              {i > 0 && <Separator className="mb-4" />}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{item.title}</p>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
                <Switch defaultChecked={item.on} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Automações */}
      <AutomationsTab />

      {/* Audit Logs (Admin only) */}
      {isAdmin && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ScrollText className="h-5 w-5" />
                Logs de Auditoria
              </CardTitle>
              <CardDescription>
                Registro de ações críticas: quem, o quê e quando
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={fetchAuditLogs} disabled={loadingLogs}>
                {loadingLogs ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {logsVisible ? "Atualizar" : "Carregar Logs"}
              </Button>
              {logsVisible && auditLogs.length > 0 && (
                <Button variant="outline" size="sm" onClick={downloadCsv} className="gap-1.5">
                  <Download className="h-4 w-4" />
                  CSV
                </Button>
              )}
            </div>
          </CardHeader>
          {logsVisible && (
            <CardContent>
              {auditLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Nenhum log registrado ainda.
                </p>
              ) : (
                <div className="max-h-[400px] overflow-y-auto rounded border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[140px]">Data</TableHead>
                        <TableHead>Usuário</TableHead>
                        <TableHead>Ação</TableHead>
                        <TableHead>Detalhes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {auditLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {format(new Date(log.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                          </TableCell>
                          <TableCell className="text-sm font-medium">{log.user_name}</TableCell>
                          <TableCell className="text-sm">{log.action}</TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[300px] truncate">
                            {log.details}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          )}
        </Card>
      )}

      {/* Avançado / Desenvolvedor */}
      <Accordion type="multiple" className="space-y-4">
        <AccordionItem value="integrity" className="rounded-lg border bg-card px-4">
          <AccordionTrigger className="hover:no-underline">
            <span className="text-sm font-medium">Auditoria de Integridade</span>
          </AccordionTrigger>
          <AccordionContent>
            <IntegrityAuditorTab />
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="danger" className="rounded-lg border border-destructive/30 bg-card px-4">
          <AccordionTrigger className="hover:no-underline">
            <span className="text-sm font-medium text-destructive">Zona de Perigo</span>
          </AccordionTrigger>
          <AccordionContent>
            <DangerZoneTab />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
