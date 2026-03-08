import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import Dashboard from "./pages/Dashboard";
import Projetos from "./pages/marketing/Projetos";
import Solicitacoes from "./pages/marketing/Solicitacoes";
import KPIs from "./pages/marketing/KPIs";
import ServiceDesk from "./pages/ti/ServiceDesk";
import GestaoAtivos from "./pages/ti/GestaoAtivos";
import DashboardFinanceiro from "./pages/ti/DashboardFinanceiro";
import DashboardTI from "./pages/ti/DashboardTI";
import ChamadoPublico from "./pages/ti/ChamadoPublico";
import Configuracoes from "./pages/Configuracoes";
import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import NotFound from "./pages/NotFound";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/signup" element={user ? <Navigate to="/" replace /> : <Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/chamado-publico" element={<ChamadoPublico />} />

      {/* Protected routes */}
      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/marketing/projetos" element={<ProtectedRoute><Projetos /></ProtectedRoute>} />
      <Route path="/marketing/solicitacoes" element={<ProtectedRoute><Solicitacoes /></ProtectedRoute>} />
      <Route path="/ti/service-desk" element={<ProtectedRoute><ServiceDesk /></ProtectedRoute>} />
      <Route path="/ti/ativos" element={<ProtectedRoute><GestaoAtivos /></ProtectedRoute>} />
      <Route path="/ti/financeiro" element={<ProtectedRoute><DashboardFinanceiro /></ProtectedRoute>} />
      <Route path="/configuracoes" element={<ProtectedRoute><Configuracoes /></ProtectedRoute>} />

      {/* Admin-only routes (Central de Inteligência) */}
      <Route path="/ti/dashboard" element={<AdminRoute><DashboardTI /></AdminRoute>} />
      <Route path="/marketing/kpis" element={<AdminRoute><KPIs /></AdminRoute>} />

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
