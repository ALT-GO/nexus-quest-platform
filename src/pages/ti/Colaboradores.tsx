import { useState } from "react";
import { cn } from "@/lib/utils";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCollaborators } from "@/hooks/use-collaborators";
import { CollaboratorProfile } from "@/components/collaborators/CollaboratorProfile";
import { StockTab } from "@/components/collaborators/StockTab";
import { Loader2, Search, Users, Laptop, Smartphone, Phone, FileText, Package } from "lucide-react";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import { NewCollaboratorDialog } from "@/components/collaborators/NewCollaboratorDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const catConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  notebooks: { label: "Notebook", icon: Laptop, color: "bg-blue-500/15 text-blue-700 border-blue-300" },
  celulares: { label: "Celular", icon: Smartphone, color: "bg-emerald-500/15 text-emerald-700 border-emerald-300" },
  linhas: { label: "Linha Telefônica", icon: Phone, color: "bg-purple-500/15 text-purple-700 border-purple-300" },
  licencas: { label: "Licença", icon: FileText, color: "bg-yellow-500/15 text-yellow-700 border-yellow-300" },
  hardware: { label: "Notebook", icon: Laptop, color: "bg-blue-500/15 text-blue-700 border-blue-300" },
  telecom: { label: "Linha Telefônica", icon: Phone, color: "bg-purple-500/15 text-purple-700 border-purple-300" },
  licenses: { label: "Licença", icon: FileText, color: "bg-yellow-500/15 text-yellow-700 border-yellow-300" },
};

export default function Colaboradores() {
  const { collaborators, loading, refetch } = useCollaborators();
  const [search, setSearch] = useState("");
  const [selectedName, setSelectedName] = useState<string | null>(null);

  const filtered = collaborators.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  if (selectedName) {
    return (
      <AppLayout>
        <CollaboratorProfile
          name={selectedName}
          onBack={() => { setSelectedName(null); refetch(); }}
        />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <PageHeader
          title="Colaboradores"
          description="Gestão de inventário e ativos por colaborador"
        />
        <NewCollaboratorDialog onCreated={refetch} />
      </div>

      <Tabs defaultValue="colaboradores" className="space-y-6">
        <TabsList className="h-auto flex-wrap gap-1 bg-muted/50 p-1">
          <TabsTrigger value="colaboradores" className="gap-2 px-4 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Users className="h-4 w-4" />
            <span>Colaboradores</span>
          </TabsTrigger>
          <TabsTrigger value="estoque" className="gap-2 px-4 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Package className="h-4 w-4" />
            <span>Estoque / Itens sem dono</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="colaboradores">
          <div className="space-y-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar colaborador..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <Users className="mb-3 h-10 w-10" />
                  <p>Nenhum colaborador encontrado</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filtered.map((c) => (
                  <Card
                    key={c.name}
                    className="cursor-pointer transition-all hover:shadow-md hover:border-primary/30"
                    onClick={() => setSelectedName(c.name)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary flex-shrink-0">
                            {c.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium leading-tight truncate">{c.name}</p>
                            <p className="text-xs text-muted-foreground">{c.assetCount} ativo(s)</p>
                          </div>
                        </div>
                        <ConfirmDeleteDialog
                          description={`Tem certeza que deseja excluir o colaborador "${c.name}"? Notebooks, celulares e linhas voltarão ao estoque. Licenças vinculadas serão excluídas.`}
                          onConfirm={async () => {
                            try {
                              // Return notebooks, celulares, linhas to stock
                              await supabase.from("inventory").update({
                                collaborator: "",
                                status: "Disponível",
                                updated_at: new Date().toISOString(),
                              }).eq("collaborator", c.name).in("category", ["notebooks", "celulares", "linhas", "hardware", "telecom"]);

                              // Delete licenças
                              await supabase.from("inventory").delete()
                                .eq("collaborator", c.name)
                                .in("category", ["licencas", "licenses"]);

                              toast.success(`Colaborador "${c.name}" removido. Ativos devolvidos ao estoque.`);
                              refetch();
                            } catch {
                              toast.error("Erro ao excluir colaborador");
                            }
                          }}
                        />
                      </div>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {c.categories.map((cat) => {
                          const cfg = catConfig[cat];
                          return (
                            <Badge key={cat} variant="outline" className={cn("gap-1 text-xs", cfg?.color)}>
                              {cfg?.icon && <cfg.icon className="h-3 w-3" />}
                              {cfg?.label || cat}
                            </Badge>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="estoque">
          <StockTab onAssigned={refetch} />
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
