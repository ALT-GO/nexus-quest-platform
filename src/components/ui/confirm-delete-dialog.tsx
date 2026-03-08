import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConfirmDeleteDialogProps {
  onConfirm: () => void | Promise<void>;
  title?: string;
  description?: string;
  children?: React.ReactNode;
  /** Render as inline icon button if no children */
  className?: string;
  size?: "sm" | "md";
}

export function ConfirmDeleteDialog({
  onConfirm,
  title = "Confirmar exclusão",
  description = "Tem certeza que deseja excluir permanentemente este registro? Esta ação não pode ser desfeita.",
  children,
  className,
  size = "sm",
}: ConfirmDeleteDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
      setOpen(false);
    }
  };

  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  const btnSize = size === "sm" ? "h-7 w-7" : "h-8 w-8";

  return (
    <>
      {children ? (
        <div onClick={(e) => { e.stopPropagation(); setOpen(true); }}>
          {children}
        </div>
      ) : (
        <button
          onClick={(e) => { e.stopPropagation(); setOpen(true); }}
          className={cn(
            "inline-flex items-center justify-center rounded-md p-0 text-destructive/60 transition-colors hover:text-destructive hover:bg-destructive/10",
            btnSize,
            className
          )}
          title="Excluir"
        >
          <Trash2 className={iconSize} />
        </button>
      )}

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            <AlertDialogDescription>{description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleConfirm(); }}
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? "Excluindo..." : "Excluir permanentemente"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
