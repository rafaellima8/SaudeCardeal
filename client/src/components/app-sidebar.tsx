import { useState } from "react";
import {
  Home,
  Users,
  Pill,
  Truck,
  FileText,
  Building2,
  UserCog,
  ChevronDown,
  ChevronRight,
  LogOut,
  FileCheck,
  Baby,
  Heart,
  AlertTriangle,
  ClipboardList,
  GitBranch,
  Bell,
  BarChart3,
  Package,
  Boxes,
  ClipboardCheck,
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Logo, ArgoTechLogo } from "@/components/Logo";
import { filterMenuByRole } from "@/lib/permissions";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

const mainMenuItems = [
  { title: "Dashboard", icon: Home, url: "/" },
  { title: "Pacientes", icon: Users, url: "/pacientes" },
];

const farmaciaSubItems = [
  { title: "Prescrições", icon: FileCheck, url: "/prescricoes" },
  { title: "Dispensação", icon: Package, url: "/farmacia/dispensacao" },
  { title: "Estoque", icon: Boxes, url: "/farmacia/estoque" },
  { title: "Fraldas", icon: Baby, url: "/farmacia/fraldas" },
  { title: "Autorizações", icon: ClipboardCheck, url: "/farmacia/autorizacoes" },
];

const operationalMenuItems = [
  { title: "TFD", icon: Truck, url: "/tfd" },
  { title: "Assistência Social", icon: Heart, url: "/assistencia-social" },
  { title: "SINAN", icon: AlertTriangle, url: "/sinan" },
  { title: "Relatórios", icon: FileText, url: "/relatorios" },
];

const automationMenuItems = [
  { title: "Formulários", icon: ClipboardList, url: "/formularios" },
  { title: "Workflows", icon: GitBranch, url: "/workflows" },
  { title: "Alertas", icon: Bell, url: "/alertas" },
  { title: "Relatórios Estratégicos", icon: BarChart3, url: "/relatorios-estrategicos" },
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
  const [location, setLocation] = useLocation();
  const [isFarmaciaOpen, setIsFarmaciaOpen] = useState(true);

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

  const menuItems = filterMenuByRole(mainMenuItems, user.role);
  const farmaciaItems = filterMenuByRole(farmaciaSubItems, user.role);
  const operationalItems = filterMenuByRole(operationalMenuItems, user.role);
  const automationItems = filterMenuByRole(automationMenuItems, user.role);
  const configItems = filterMenuByRole(allConfigItems, user.role);

  const isFarmaciaActive = location.startsWith("/farmacia") || location === "/prescricoes";

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
        {(menuItems.length > 0 || farmaciaItems.length > 0 || operationalItems.length > 0) && (
          <SidebarGroup>
            <SidebarGroupLabel>Principal</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {menuItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={location === item.url}
                      data-testid={`nav-${item.title.toLowerCase()}`}
                    >
                      <a href={item.url} className="hover-elevate active-elevate-2">
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}

                {farmaciaItems.length > 0 && (
                  <Collapsible
                    open={isFarmaciaOpen || isFarmaciaActive}
                    onOpenChange={setIsFarmaciaOpen}
                    className="group/collapsible"
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton 
                          className="hover-elevate active-elevate-2"
                          isActive={isFarmaciaActive}
                          data-testid="nav-farmacia"
                        >
                          <Pill className="h-4 w-4" />
                          <span>Farmácia</span>
                          <ChevronRight className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {farmaciaItems.map((item) => (
                            <SidebarMenuSubItem key={item.title}>
                              <SidebarMenuSubButton 
                                asChild
                                isActive={location === item.url}
                                data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                              >
                                <a href={item.url} className="hover-elevate active-elevate-2">
                                  <item.icon className="h-4 w-4" />
                                  <span>{item.title}</span>
                                </a>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                )}

                {operationalItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={location === item.url}
                      data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                    >
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

        {automationItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Automação</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {automationItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={location === item.url}
                      data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                    >
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
                    <SidebarMenuButton 
                      asChild 
                      isActive={location === item.url}
                      data-testid={`nav-${item.title.toLowerCase()}`}
                    >
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

      <SidebarFooter className="border-t border-sidebar-border p-2 space-y-2">
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
        <div className="pt-2 border-t border-sidebar-border/50">
          <a 
            href="https://argotechbrasil.com.br" 
            target="_blank" 
            rel="noopener noreferrer"
            className="block"
            data-testid="link-argo-tech"
          >
            <ArgoTechLogo className="py-1" />
          </a>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
