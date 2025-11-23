import {
  Home,
  Users,
  Calendar,
  Pill,
  Truck,
  FileText,
  Building2,
  UserCog,
  BarChart3,
  ChevronDown,
  ClipboardList,
  MapPin,
  Activity,
  LogOut,
  Bug,
  Stethoscope,
  ListChecks,
  FileCheck,
  ChevronRight,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Logo } from "@/components/Logo";
import { filterMenuByRole } from "@/lib/permissions";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

const allMenuItems = [
  { title: "Dashboard", icon: Home, url: "/" },
  { title: "Recepção", icon: ClipboardList, url: "/recepcao" },
  { title: "Pacientes", icon: Users, url: "/pacientes" },
  { title: "Agendamentos", icon: Calendar, url: "/agendamentos" },
  { title: "Fila de Atendimento", icon: ListChecks, url: "/fila-atendimento" },
  { title: "Atendimentos", icon: Stethoscope, url: "/atendimentos" },
  { title: "Prescrições", icon: FileCheck, url: "/prescricoes" },
  { title: "Território", icon: MapPin, url: "/territorio" },
  { 
    title: "ACE", 
    icon: Activity, 
    url: "/ace",
    submenu: [
      { title: "Dashboard", url: "/ace" },
      { title: "Imóveis", url: "/ace/imoveis" },
    ]
  },
  { title: "Endemias", icon: Bug, url: "/endemias" },
  { title: "Farmácia", icon: Pill, url: "/farmacia" },
  { title: "TFD", icon: Truck, url: "/tfd" },
  { title: "Relatórios", icon: FileText, url: "/relatorios" },
];

const allConfigItems = [
  { title: "Unidades", icon: Building2, url: "/unidades" },
  { title: "Profissionais", icon: UserCog, url: "/profissionais" },
  { title: "Indicadores", icon: BarChart3, url: "/indicadores" },
];

const roleLabels: Record<string, string> = {
  admin: "Administrador",
  medico: "Médico(a)",
  enfermeiro: "Enfermeiro(a)",
  acs: "Agente Comunitário",
  farmaceutico: "Farmacêutico(a)",
  gestor: "Gestor(a)",
  recepcao: "Recepcionista",
};

export function AppSidebar() {
  const { user, isLoading } = useCurrentUser();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const logoutMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/auth/logout", {});
    },
    onSuccess: () => {
      queryClient.clear();
      toast({
        title: "Logout realizado",
        description: "Você saiu do sistema com sucesso.",
      });
      setLocation("/login");
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Erro ao sair",
        description: "Não foi possível fazer logout.",
      });
    },
  });

  function handleLogout() {
    logoutMutation.mutate();
  }

  if (isLoading || !user) {
    return (
      <Sidebar>
        <SidebarHeader className="border-b border-sidebar-border p-4">
          <Logo size="sm" variant="full" />
        </SidebarHeader>
        <SidebarContent>
          <div className="p-4 text-center text-sm text-muted-foreground">
            Carregando...
          </div>
        </SidebarContent>
      </Sidebar>
    );
  }

  const menuItems = filterMenuByRole(allMenuItems, user.role);
  const configItems = filterMenuByRole(allConfigItems, user.role);

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <Logo size="sm" variant="full" />
      </SidebarHeader>

      <SidebarContent>
        {menuItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Principal</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {menuItems.map((item) => (
                  <Collapsible key={item.title} asChild defaultOpen={false}>
                    <SidebarMenuItem>
                      {item.submenu ? (
                        <>
                          <CollapsibleTrigger asChild>
                            <SidebarMenuButton data-testid={`nav-${item.title.toLowerCase()}`} className="hover-elevate active-elevate-2">
                              <item.icon className="h-4 w-4" />
                              <span>{item.title}</span>
                              <ChevronRight className="ml-auto h-4 w-4 transition-transform group-data-[state=open]:rotate-90" />
                            </SidebarMenuButton>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <SidebarMenuSub>
                              {item.submenu.map((subItem) => (
                                <SidebarMenuSubItem key={subItem.title}>
                                  <SidebarMenuSubButton asChild data-testid={`nav-${item.title.toLowerCase()}-${subItem.title.toLowerCase()}`}>
                                    <a href={subItem.url} className="hover-elevate active-elevate-2">
                                      <span>{subItem.title}</span>
                                    </a>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              ))}
                            </SidebarMenuSub>
                          </CollapsibleContent>
                        </>
                      ) : (
                        <SidebarMenuButton asChild data-testid={`nav-${item.title.toLowerCase()}`}>
                          <a href={item.url} className="hover-elevate active-elevate-2">
                            <item.icon className="h-4 w-4" />
                            <span>{item.title}</span>
                          </a>
                        </SidebarMenuButton>
                      )}
                    </SidebarMenuItem>
                  </Collapsible>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {configItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Configurações</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {configItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild data-testid={`nav-${item.title.toLowerCase()}`}>
                      <a href={item.url} className="hover-elevate active-elevate-2">
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-3 rounded-md p-2 hover-elevate active-elevate-2" data-testid="button-user-menu">
              <Avatar className="h-8 w-8">
                <AvatarImage src="" alt={user.name} />
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-1 flex-col items-start text-left">
                <span className="text-sm font-medium text-sidebar-foreground">{user.name}</span>
                <span className="text-xs text-muted-foreground">{roleLabels[user.role]}</span>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem data-testid="menu-perfil">Meu Perfil</DropdownMenuItem>
            <DropdownMenuItem data-testid="menu-configuracoes">Configurações</DropdownMenuItem>
            <DropdownMenuItem 
              data-testid="menu-sair" 
              className="text-destructive"
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
            >
              <LogOut className="mr-2 h-4 w-4" />
              {logoutMutation.isPending ? "Saindo..." : "Sair"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}