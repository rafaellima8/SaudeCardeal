import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Bell, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Dashboard from "@/pages/dashboard";
import Reception from "@/pages/reception";
import Patients from "@/pages/patients";
import PatientDetail from "@/pages/patient-detail";
import Appointments from "@/pages/appointments";
import Pharmacy from "@/pages/pharmacy";
import TFD from "@/pages/tfd";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/recepcao" component={Reception} />
      <Route path="/pacientes" component={Patients} />
      <Route path="/pacientes/:id" component={PatientDetail} />
      <Route path="/agendamentos" component={Appointments} />
      <Route path="/farmacia" component={Pharmacy} />
      <Route path="/tfd" component={TFD} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
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
                <Router />
              </main>
            </div>
          </div>
        </SidebarProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
