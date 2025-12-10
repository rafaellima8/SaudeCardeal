import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Settings as SettingsIcon, Bell, Palette, Database, Shield, FileText, Save, RefreshCw } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Settings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    smsNotifications: false,
    alertsQueue: true,
    alertsStock: true,
    alertsProtocols: true,
  });

  const [systemSettings, setSystemSettings] = useState({
    sessionTimeout: "30",
    autoLogout: true,
    twoFactorAuth: false,
    auditLogs: true,
  });

  const { data: user } = useQuery<any>({
    queryKey: ["/api/auth/me"],
  });

  const { data: units = [] } = useQuery<any[]>({
    queryKey: ["/api/health-units"],
  });

  const isAdmin = user?.role === 'admin' || user?.role === 'gestor';

  const handleSaveNotifications = () => {
    toast({
      title: "Configurações salvas",
      description: "Suas preferências de notificação foram atualizadas",
    });
  };

  const handleSaveSystem = () => {
    toast({
      title: "Configurações salvas",
      description: "As configurações do sistema foram atualizadas",
    });
  };

  const handleClearCache = () => {
    queryClient.clear();
    toast({
      title: "Cache limpo",
      description: "O cache local foi limpo com sucesso",
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <SettingsIcon className="h-8 w-8" />
          Configurações
        </h1>
        <p className="text-muted-foreground mt-1">Gerencie as configurações do sistema e suas preferências</p>
      </div>

      <Tabs defaultValue="notifications" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="notifications" data-testid="tab-notifications">
            <Bell className="h-4 w-4 mr-2" />
            Notificações
          </TabsTrigger>
          <TabsTrigger value="appearance" data-testid="tab-appearance">
            <Palette className="h-4 w-4 mr-2" />
            Aparência
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="system" data-testid="tab-system">
              <Shield className="h-4 w-4 mr-2" />
              Sistema
            </TabsTrigger>
          )}
          <TabsTrigger value="data" data-testid="tab-data">
            <Database className="h-4 w-4 mr-2" />
            Dados
          </TabsTrigger>
        </TabsList>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Preferências de Notificação</CardTitle>
              <CardDescription>Configure como você deseja receber alertas e notificações</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h4 className="font-medium">Canais de Comunicação</h4>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Notificações por Email</Label>
                    <p className="text-sm text-muted-foreground">Receber alertas importantes por email</p>
                  </div>
                  <Switch
                    checked={notificationSettings.emailNotifications}
                    onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, emailNotifications: checked }))}
                    data-testid="switch-email-notifications"
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Notificações por SMS</Label>
                    <p className="text-sm text-muted-foreground">Receber alertas urgentes por SMS</p>
                  </div>
                  <Switch
                    checked={notificationSettings.smsNotifications}
                    onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, smsNotifications: checked }))}
                    data-testid="switch-sms-notifications"
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-medium">Tipos de Alerta</h4>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Alertas de Fila</Label>
                    <p className="text-sm text-muted-foreground">Notificar sobre pacientes na fila de atendimento</p>
                  </div>
                  <Switch
                    checked={notificationSettings.alertsQueue}
                    onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, alertsQueue: checked }))}
                    data-testid="switch-queue-alerts"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Alertas de Estoque</Label>
                    <p className="text-sm text-muted-foreground">Notificar sobre medicamentos em estoque baixo</p>
                  </div>
                  <Switch
                    checked={notificationSettings.alertsStock}
                    onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, alertsStock: checked }))}
                    data-testid="switch-stock-alerts"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Alertas de Protocolos</Label>
                    <p className="text-sm text-muted-foreground">Notificar sobre alertas clínicos de protocolos</p>
                  </div>
                  <Switch
                    checked={notificationSettings.alertsProtocols}
                    onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, alertsProtocols: checked }))}
                    data-testid="switch-protocol-alerts"
                  />
                </div>
              </div>

              <Button onClick={handleSaveNotifications} data-testid="button-save-notifications">
                <Save className="h-4 w-4 mr-2" />
                Salvar Preferências
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>Aparência</CardTitle>
              <CardDescription>Personalize a aparência do sistema</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label>Tema</Label>
                  <p className="text-sm text-muted-foreground mb-2">Escolha entre tema claro e escuro</p>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="cursor-pointer hover-elevate">Claro</Badge>
                    <Badge variant="outline" className="cursor-pointer hover-elevate">Escuro</Badge>
                    <Badge variant="secondary" className="cursor-pointer">Sistema</Badge>
                  </div>
                </div>
                <Separator />
                <div>
                  <Label>Densidade</Label>
                  <p className="text-sm text-muted-foreground mb-2">Ajuste a densidade visual do interface</p>
                  <Select defaultValue="normal">
                    <SelectTrigger className="w-48" data-testid="select-density">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="compact">Compacto</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="comfortable">Confortável</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="system">
            <Card>
              <CardHeader>
                <CardTitle>Configurações do Sistema</CardTitle>
                <CardDescription>Configurações avançadas de segurança e sistema (apenas administradores)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label>Tempo de Sessão (minutos)</Label>
                    <p className="text-sm text-muted-foreground mb-2">Tempo de inatividade antes do logout automático</p>
                    <Select value={systemSettings.sessionTimeout} onValueChange={(value) => setSystemSettings(prev => ({ ...prev, sessionTimeout: value }))}>
                      <SelectTrigger className="w-48" data-testid="select-session-timeout">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 minutos</SelectItem>
                        <SelectItem value="30">30 minutos</SelectItem>
                        <SelectItem value="60">1 hora</SelectItem>
                        <SelectItem value="120">2 horas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Logout Automático</Label>
                      <p className="text-sm text-muted-foreground">Desconectar automaticamente após período de inatividade</p>
                    </div>
                    <Switch
                      checked={systemSettings.autoLogout}
                      onCheckedChange={(checked) => setSystemSettings(prev => ({ ...prev, autoLogout: checked }))}
                      data-testid="switch-auto-logout"
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Logs de Auditoria</Label>
                      <p className="text-sm text-muted-foreground">Registrar todas as ações do sistema</p>
                    </div>
                    <Switch
                      checked={systemSettings.auditLogs}
                      onCheckedChange={(checked) => setSystemSettings(prev => ({ ...prev, auditLogs: checked }))}
                      data-testid="switch-audit-logs"
                    />
                  </div>
                </div>

                <Button onClick={handleSaveSystem} data-testid="button-save-system">
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Configurações
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="data">
          <Card>
            <CardHeader>
              <CardTitle>Gerenciamento de Dados</CardTitle>
              <CardDescription>Gerencie o cache e dados locais do sistema</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label>Cache do Navegador</Label>
                    <p className="text-sm text-muted-foreground">Limpar dados em cache para atualizar o sistema</p>
                  </div>
                  <Button variant="outline" onClick={handleClearCache} data-testid="button-clear-cache">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Limpar Cache
                  </Button>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Informações do Sistema</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Versão do Sistema</span>
                      <span>1.0.0</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Unidades Cadastradas</span>
                      <span>{units.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Seu Perfil</span>
                      <Badge variant="outline">{user?.role}</Badge>
                    </div>
                  </div>
                </div>

                {isAdmin && (
                  <div className="p-4 border border-destructive/20 rounded-lg bg-destructive/5">
                    <h4 className="font-medium mb-2 text-destructive">Zona de Perigo</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Ações críticas que afetam todo o sistema
                    </p>
                    <div className="flex gap-2">
                      <Button variant="outline" className="border-destructive text-destructive hover:bg-destructive/10" data-testid="button-export-data">
                        <FileText className="h-4 w-4 mr-2" />
                        Exportar Todos os Dados
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
