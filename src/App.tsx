import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Projetos from "./pages/marketing/Projetos";
import Solicitacoes from "./pages/marketing/Solicitacoes";
import KPIs from "./pages/marketing/KPIs";
import ServiceDesk from "./pages/ti/ServiceDesk";
import GestaoAtivos from "./pages/ti/GestaoAtivos";
import DashboardFinanceiro from "./pages/ti/DashboardFinanceiro";
import ChamadoPublico from "./pages/ti/ChamadoPublico";
import Configuracoes from "./pages/Configuracoes";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          {/* Marketing Routes */}
          <Route path="/marketing/projetos" element={<Projetos />} />
          <Route path="/marketing/solicitacoes" element={<Solicitacoes />} />
          <Route path="/marketing/kpis" element={<KPIs />} />
          {/* TI Routes */}
          <Route path="/ti/service-desk" element={<ServiceDesk />} />
          <Route path="/ti/ativos" element={<GestaoAtivos />} />
          <Route path="/ti/financeiro" element={<DashboardFinanceiro />} />
          {/* Public Form */}
          <Route path="/chamado-publico" element={<ChamadoPublico />} />
          {/* Settings */}
          <Route path="/configuracoes" element={<Configuracoes />} />
          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
