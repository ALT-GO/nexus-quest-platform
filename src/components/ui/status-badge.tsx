import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const statusBadgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-secondary text-secondary-foreground",
        pending: "bg-warning/15 text-warning",
        inProgress: "bg-info/15 text-info",
        completed: "bg-success/15 text-success",
        cancelled: "bg-destructive/15 text-destructive",
        waitingApproval: "bg-chart-4/15 text-chart-4",
        high: "bg-destructive/15 text-destructive",
        medium: "bg-warning/15 text-warning",
        low: "bg-success/15 text-success",
        active: "bg-success/15 text-success",
        inactive: "bg-muted text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusBadgeVariants> {
  children: React.ReactNode;
}

export function StatusBadge({
  className,
  variant,
  children,
  ...props
}: StatusBadgeProps) {
  return (
    <span className={cn(statusBadgeVariants({ variant }), className)} {...props}>
      {children}
    </span>
  );
}
