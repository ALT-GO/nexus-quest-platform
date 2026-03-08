import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { useAuth } from "@/hooks/use-auth";
import { CollaboratorDashboard } from "@/components/dashboard/CollaboratorDashboard";
import { AdminDashboardOverview } from "@/components/dashboard/AdminDashboardOverview";

export default function Dashboard() {
  const { isAdmin, roles } = useAuth();
  const isPrivileged = isAdmin || roles.includes("ti") || roles.includes("marketing");

  return (
    <AppLayout>
      <PageHeader
        title="Dashboard"
        description={isPrivileged ? "Visão geral do sistema de gestão integrado" : "Sua visão pessoal"}
      />
      {isPrivileged ? <AdminDashboardOverview /> : <CollaboratorDashboard />}
    </AppLayout>
  );
}
