import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { AlertTriangle, Trash2 } from "lucide-react";

export function DangerZoneTab() {
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const CONFIRM_PHRASE = "EXCLUIR TUDO";

  const handleReset = async () => {
    setLoading(true);
    try {
      // Delete custom_field_values first (FK dependency on inventory)
      const { error: cfvError } = await supabase
        .from("custom_field_values")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");

      if (cfvError) throw cfvError;

      // Delete all inventory
      const { error: invError } = await supabase
        .from("inventory")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");

      if (invError) throw invError;

      toast.success("Inventário excluído com sucesso. Todos os ativos foram removidos.");
      setStep(0);
      setConfirmText("");
      navigate("/ti/colaboradores");
    } catch (err: any) {
      toast.error("Erro ao excluir inventário: " + (err?.message ?? "Erro desconhecido"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-destructive/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          Zona de Perigo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-3">
          <div>
            <p className="font-medium">Excluir Todo o Inventário</p>
            <p className="text-sm text-muted-foreground">
              Remove permanentemente todos os ativos, valores de campos personalizados e históricos de movimentação. Esta ação é irreversível.
            </p>
          </div>
          <Button
            variant="destructive"
            onClick={() => setStep(1)}
            className="gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Excluir Todo o Inventário
          </Button>
        </div>

        {/* Step 1: First confirmation */}
        <AlertDialog open={step === 1} onOpenChange={(o) => !o && setStep(0)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Confirmar Exclusão Total
              </AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação é irreversível. Deseja apagar <strong>todos os ativos</strong> e históricos de movimentação? Todos os dados do inventário serão permanentemente removidos.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  setStep(2);
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Sim, quero excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Step 2: Double confirmation with text input */}
        <AlertDialog open={step === 2} onOpenChange={(o) => { if (!o) { setStep(0); setConfirmText(""); } }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Confirmação Final
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-3">
                  <p>Para confirmar, digite <strong className="text-foreground font-mono">{CONFIRM_PHRASE}</strong> no campo abaixo:</p>
                  <div className="space-y-1.5">
                    <Label htmlFor="confirm-delete" className="sr-only">Confirmação</Label>
                    <Input
                      id="confirm-delete"
                      placeholder={CONFIRM_PHRASE}
                      value={confirmText}
                      onChange={(e) => setConfirmText(e.target.value)}
                      className="font-mono"
                      autoComplete="off"
                    />
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  handleReset();
                }}
                disabled={confirmText !== CONFIRM_PHRASE || loading}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {loading ? "Excluindo..." : "Excluir Permanentemente"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
