import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProfileTab } from "@/components/settings/ProfileTab";
import { TeamManagementTab } from "@/components/settings/TeamManagementTab";
import { SystemPreferencesTab } from "@/components/settings/SystemPreferencesTab";
import { useAuth } from "@/hooks/use-auth";
import { User, Users, Settings } from "lucide-react";

export default function Configuracoes() {
  const { isAdmin } = useAuth();
  return (
    <AppLayout>
      <PageHeader
        title="Configurações"
        description="Gerencie as configurações do sistema"
      />

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="h-auto flex-wrap gap-1">
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            Meu Perfil
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="team" className="gap-2">
              <Users className="h-4 w-4" />
              Gestão de Equipe
            </TabsTrigger>
          )}
          <TabsTrigger value="preferences" className="gap-2">
            <Settings className="h-4 w-4" />
            Preferências do Sistema
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <ProfileTab />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="team">
            <TeamManagementTab />
          </TabsContent>
        )}

        <TabsContent value="preferences">
          <SystemPreferencesTab />
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
