import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Save } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { AutomationsTab } from "./AutomationsTab";
import { IntegrityAuditorTab } from "./IntegrityAuditorTab";
import { DangerZoneTab } from "./DangerZoneTab";

export function SystemPreferencesTab() {
  return (
    <div className="space-y-6">
      {/* SLA & Horário Comercial */}
      <Card>
        <CardHeader>
          <CardTitle>Horário Comercial & SLA</CardTitle>
          <CardDescription>
            Defina o horário de trabalho usado para cálculo de prazos de SLA
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="business-start">Início do Expediente</Label>
              <Input id="business-start" type="time" defaultValue="08:00" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="business-end">Fim do Expediente</Label>
              <Input id="business-end" type="time" defaultValue="18:00" />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Contar apenas dias úteis</p>
              <p className="text-sm text-muted-foreground">
                Excluir finais de semana e feriados do cálculo de SLA
              </p>
            </div>
            <Switch defaultChecked />
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

      <div className="flex justify-end">
        <Button>
          <Save className="mr-2 h-4 w-4" />
          Salvar Preferências
        </Button>
      </div>
    </div>
  );
}
