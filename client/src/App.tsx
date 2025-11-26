import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Bell, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Dashboard from "@/pages/dashboard";
import Reception from "@/pages/reception";
import Patients from "@/pages/patients";
import PatientDetail from "@/pages/patient-detail";
import Appointments from "@/pages/appointments";
import AttendanceQueue from "@/pages/attendance-queue";
import MedicalAttendance from "@/pages/medical-attendance";
import Consultations from "@/pages/consultations";
import Prescriptions from "@/pages/prescriptions";
import Pharmacy from "@/pages/pharmacy";
import PharmacyDispensation from "@/pages/pharmacy-dispensation";
import PharmacyStock from "@/pages/pharmacy-stock";
import TFD from "@/pages/tfd";
import Reports from "@/pages/reports";
import Units from "@/pages/units";
import Professionals from "@/pages/professionals";
import Indicators from "@/pages/indicators";
import EsusExports from "@/pages/admin/esus-exports";
import ClinicalProtocols from "@/pages/admin/clinical-protocols";
import DynamicFormsAdmin from "@/pages/admin/dynamic-forms-admin";
import TerritoryPage from "@/pages/territorio";
import AceDashboard from "@modules/ace/client/pages/ace-dashboard";
import AceDwellings from "@/pages/ace-dwellings";
import AceVisits from "@/pages/ace-visits";
import AceFoci from "@/pages/ace-foci";
import EndemicDashboard from "@/pages/endemic-dashboard";
import LoginPage from "@/pages/login";
import NotFound from "@/pages/not-found";
import { useEffect } from "react";

function ProtectedRoutes() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/recepcao" component={Reception} />
      <Route path="/pacientes" component={Patients} />
      <Route path="/pacientes/:id" component={PatientDetail} />
      <Route path="/agendamentos" component={Appointments} />
      <Route path="/fila-atendimento" component={AttendanceQueue} />
      <Route path="/atendimento-medico/:consultationId" component={MedicalAttendance} />
      <Route path="/atendimentos" component={Consultations} />
      <Route path="/prescricoes" component={Prescriptions} />
      <Route path="/farmacia" component={Pharmacy} />
      <Route path="/farmacia/dispensacao" component={PharmacyDispensation} />
      <Route path="/farmacia/estoque" component={PharmacyStock} />
      <Route path="/tfd" component={TFD} />
      <Route path="/relatorios" component={Reports} />
      <Route path="/unidades" component={Units} />
      <Route path="/profissionais" component={Professionals} />
      <Route path="/indicadores" component={Indicators} />
      <Route path="/admin/esus-exports" component={EsusExports} />
      <Route path="/admin/protocolos-clinicos" component={ClinicalProtocols} />
      <Route path="/admin/formularios-dinamicos" component={DynamicFormsAdmin} />
      <Route path="/territorio" component={TerritoryPage} />
      <Route path="/ace" component={AceDashboard} />
      <Route path="/ace/imoveis" component={AceDwellings} />
      <Route path="/ace/visitas" component={AceVisits} />
      <Route path="/ace/focos" component={AceFoci} />
      <Route path="/endemias" component={EndemicDashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AuthenticatedApp() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between gap-4 border-b border-border bg-background px-6 py-3">
            <div className="flex items-center gap-4 flex-1">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <div className="relative max-w-md flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar paciente, CNS, CPF..."
                  className="pl-10"
                  data-testid="input-global-search"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="relative" data-testid="button-notifications">
                <Bell className="h-5 w-5" />
                <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">
                  3
                </Badge>
              </Button>
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 overflow-auto bg-background p-6">
            <ProtectedRoutes />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function AppContent() {
  const { user, isLoading, isAuthenticated } = useCurrentUser();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated && location !== "/login") {
      setLocation("/login");
    }
  }, [isLoading, isAuthenticated, location, setLocation]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (location === "/login") {
    return <LoginPage />;
  }

  if (!isAuthenticated) {
    return null;
  }

  return <AuthenticatedApp />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppContent />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;