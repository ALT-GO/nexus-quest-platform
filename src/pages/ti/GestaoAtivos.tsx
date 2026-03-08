import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Laptop, Smartphone, Phone, FileText } from "lucide-react";
import { CategoryTable } from "@/components/assets/CategoryTable";

export default function GestaoAtivos() {
  return (
    <AppLayout>
      <PageHeader
        title="Gestão de Ativos"
        description="Inventário de notebooks, celulares, linhas e licenças"
      />

      <Tabs defaultValue="notebooks" className="space-y-6">
        <TabsList className="h-auto flex-wrap gap-1 bg-muted/50 p-1">
          <TabsTrigger value="notebooks" className="gap-2 px-4 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Laptop className="h-4 w-4" />
            <span>Notebooks</span>
          </TabsTrigger>
          <TabsTrigger value="celulares" className="gap-2 px-4 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Smartphone className="h-4 w-4" />
            <span>Celulares</span>
          </TabsTrigger>
          <TabsTrigger value="linhas" className="gap-2 px-4 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Phone className="h-4 w-4" />
            <span>Linhas</span>
          </TabsTrigger>
          <TabsTrigger value="licencas" className="gap-2 px-4 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <FileText className="h-4 w-4" />
            <span>Licenças</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="notebooks">
          <CategoryTable category="notebooks" label="Notebooks" />
        </TabsContent>
        <TabsContent value="celulares">
          <CategoryTable category="celulares" label="Celulares" />
        </TabsContent>
        <TabsContent value="linhas">
          <CategoryTable category="linhas" label="Linhas telefônicas" />
        </TabsContent>
        <TabsContent value="licencas">
          <CategoryTable category="licencas" label="Licenças" />
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
