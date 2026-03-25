import { Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { useAuth } from "@/hooks/use-auth";
import { CollaboratorDashboard } from "@/components/dashboard/CollaboratorDashboard";

export default function Dashboard() {
  const { isAdmin, roles } = useAuth();
  const isPrivileged = isAdmin || roles.includes("ti") || roles.includes("marketing");

  // Redirect privileged users (gestores) to Torre de Controle
  if (isPrivileged) {
    return <Navigate to="/central-inteligencia" replace />;
  }

  return (
    <AppLayout>
      <PageHeader
        title="Dashboard"
        description="Sua visão pessoal"
      />
      <CollaboratorDashboard />
    </AppLayout>
  );
}
