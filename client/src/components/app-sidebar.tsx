import {
  Home,
  Users,
  Pill,
  Truck,
  FileText,
  Building2,
  UserCog,
  ChevronDown,
  LogOut,
  FileCheck,
  Baby,
  Heart,
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
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
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
  { title: "Pacientes", icon: Users, url: "/pacientes" },
  { title: "Prescrições", icon: FileCheck, url: "/prescricoes" },
  { title: "Farmácia", icon: Pill, url: "/farmacia" },
  { title: "Dispensação", icon: Pill, url: "/farmacia/dispensacao" },
  { title: "Estoque", icon: Pill, url: "/farmacia/estoque" },
  { title: "Fraldas", icon: Baby, url: "/farmacia/fraldas" },
  { title: "TFD", icon: Truck, url: "/tfd" },
  { title: "Assistência Social", icon: Heart, url: "/assistencia-social" },
  { title: "Relatórios", icon: FileText, url: "/relatorios" },
];

const allConfigItems = [
  { title: "Unidades", icon: Building2, url: "/unidades" },
  { title: "Profissionais", icon: UserCog, url: "/profissionais" },
];

const roleLabels: Record<string, string> = {
  admin: "Administrador",
  medico: "Médico(a)",
  enfermeiro: "Enfermeiro(a)",
  acs: "Agente Comunitário",
  farmaceutico: "Farmacêutico(a)",
  gestor: "Gestor(a)",
  recepcao: "Recepcionista",
  assistencia_social: "Assistente Social",
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
            <DropdownMenuItem data-testid="menu-perfil" onClick={() => setLocation("/perfil")}>
              <Users className="mr-2 h-4 w-4" />
              Meu Perfil
            </DropdownMenuItem>
            <DropdownMenuItem data-testid="menu-configuracoes" onClick={() => setLocation("/configuracoes")}>
              <UserCog className="mr-2 h-4 w-4" />
              Configurações
            </DropdownMenuItem>
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
