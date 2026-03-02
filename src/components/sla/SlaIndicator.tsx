import { cn } from "@/lib/utils";
import { SlaInfo } from "@/hooks/use-sla";
import { Clock, AlertTriangle, XCircle, CheckCircle2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SlaIndicatorProps {
  sla: SlaInfo;
  showLabel?: boolean;
}

const statusConfig = {
  ok: {
    bg: "bg-success/15",
    text: "text-success",
    border: "border-success/30",
    icon: Clock,
    pulse: false,
  },
  warning: {
    bg: "bg-warning/15",
    text: "text-warning",
    border: "border-warning/30",
    icon: AlertTriangle,
    pulse: true,
  },
  expired: {
    bg: "bg-destructive/15",
    text: "text-destructive",
    border: "border-destructive/30",
    icon: XCircle,
    pulse: true,
  },
};

export function SlaIndicator({ sla, showLabel = true }: SlaIndicatorProps) {
  if (sla.remainingLabel === "Concluído") {
    return (
      <div className="flex items-center gap-1.5 text-sm text-success">
        <CheckCircle2 className="h-3.5 w-3.5" />
        {showLabel && <span className="text-xs font-medium">Concluído</span>}
      </div>
    );
  }

  const config = statusConfig[sla.slaStatus];
  const Icon = config.icon;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            "flex items-center gap-1.5 rounded-full border px-2 py-0.5",
            config.bg,
            config.text,
            config.border,
            config.pulse && "animate-pulse"
          )}
        >
          <Icon className="h-3.5 w-3.5 flex-shrink-0" />
          {showLabel && (
            <span className="whitespace-nowrap text-xs font-medium">
              {sla.remainingLabel}
            </span>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent side="top">
        <div className="space-y-1 text-xs">
          <p>
            <strong>Prazo SLA:</strong> {sla.prazoSlaEmHoras}h
          </p>
          <p>
            <strong>Limite:</strong>{" "}
            {sla.dataLimiteSla.toLocaleString("pt-BR")}
          </p>
          <p>
            <strong>Status:</strong>{" "}
            {sla.slaVencido ? "⛔ Vencido" : `${sla.percentRemaining.toFixed(0)}% restante`}
          </p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
