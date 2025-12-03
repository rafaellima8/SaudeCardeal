import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Bell,
  AlertTriangle,
  AlertCircle,
  AlertOctagon,
  Info,
  CheckCircle2,
  XCircle,
  Eye,
  Clock,
  Filter,
  Loader2,
  Package,
  DollarSign,
  FileText,
  Activity,
  Shield,
} from "lucide-react";

interface AlertRule {
  id: string;
  slug: string;
  name: string;
  category: string;
  severity: string;
  description?: string;
  isBuiltIn: boolean;
  triggerCondition?: string;
  recipients?: string[];
}

interface AlertInstance {
  id: string;
  title: string;
  message: string;
  severity: string;
  category: string;
  status: string;
  createdAt: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
}

interface AlertStats {
  total: number;
  active: number;
  acknowledged: number;
  resolved: number;
  dismissed: number;
  byCategory: Record<string, number>;
  bySeverity: Record<string, number>;
}

interface AlertCategory {
  value: string;
  label: string;
  icon: string;
}

const severityConfig: Record<string, { color: string; icon: any; label: string }> = {
  critical: {
    color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    icon: AlertOctagon,
    label: "Crítico",
  },
  high: {
    color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    icon: AlertTriangle,
    label: "Alto",
  },
  medium: {
    color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    icon: AlertCircle,
    label: "Médio",
  },
  low: {
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    icon: Info,
    label: "Baixo",
  },
};

const statusConfig: Record<string, { color: string; label: string }> = {
  active: { color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200", label: "Ativo" },
  acknowledged: { color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200", label: "Reconhecido" },
  resolved: { color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200", label: "Resolvido" },
  dismissed: { color: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200", label: "Dispensado" },
};

const categoryIcons: Record<string, any> = {
  prazo: Clock,
  pendencia: AlertCircle,
  risco_financeiro: DollarSign,
  edital: FileText,
  irregularidade: AlertTriangle,
  epidemiologico: Activity,
  estoque: Package,
  compliance: Shield,
};

export default function AlertsPage() {
  const [selectedAlert, setSelectedAlert] = useState<AlertInstance | null>(null);
  const [selectedRule, setSelectedRule] = useState<AlertRule | null>(null);
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { toast } = useToast();

  const { data: activeAlerts = [], isLoading: loadingAlerts } = useQuery<AlertInstance[]>({
    queryKey: ["/api/alerts/active"],
  });

  const { data: allAlerts = [] } = useQuery<AlertInstance[]>({
    queryKey: ["/api/alerts/all", severityFilter, categoryFilter, statusFilter],
  });

  const { data: rules = [] } = useQuery<AlertRule[]>({
    queryKey: ["/api/alerts/rules"],
  });

  const { data: stats } = useQuery<AlertStats>({
    queryKey: ["/api/alerts/stats"],
  });

  const { data: categories = [] } = useQuery<AlertCategory[]>({
    queryKey: ["/api/alerts/categories"],
  });

  const acknowledgeMutation = useMutation({
    mutationFn: async (alertId: string) => {
      return apiRequest("POST", `/api/alerts/${alertId}/acknowledge`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
      toast({
        title: "Alerta reconhecido",
        description: "O alerta foi marcado como reconhecido.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message || "Não foi possível reconhecer o alerta.",
      });
    },
  });

  const resolveMutation = useMutation({
    mutationFn: async (alertId: string) => {
      return apiRequest("POST", `/api/alerts/${alertId}/resolve`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
      setSelectedAlert(null);
      toast({
        title: "Alerta resolvido",
        description: "O alerta foi marcado como resolvido.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message || "Não foi possível resolver o alerta.",
      });
    },
  });

  const dismissMutation = useMutation({
    mutationFn: async (alertId: string) => {
      return apiRequest("POST", `/api/alerts/${alertId}/dismiss`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
      setSelectedAlert(null);
      toast({
        title: "Alerta dispensado",
        description: "O alerta foi dispensado.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message || "Não foi possível dispensar o alerta.",
      });
    },
  });

  const getSeverityIcon = (severity: string) => {
    const config = severityConfig[severity];
    if (!config) return AlertCircle;
    return config.icon;
  };

  const criticalCount = activeAlerts.filter(a => a.severity === "critical").length;
  const highCount = activeAlerts.filter(a => a.severity === "high").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">
            Central de Alertas
          </h1>
          <p className="text-muted-foreground">
            Monitore prazos, pendências, estoque e indicadores epidemiológicos
          </p>
        </div>
        <div className="flex items-center gap-2">
          {criticalCount > 0 && (
            <Badge variant="destructive" className="gap-1" data-testid="badge-critical">
              <AlertOctagon className="h-3 w-3" />
              {criticalCount} crítico{criticalCount > 1 ? "s" : ""}
            </Badge>
          )}
          {highCount > 0 && (
            <Badge className="bg-orange-100 text-orange-800 gap-1" data-testid="badge-high">
              <AlertTriangle className="h-3 w-3" />
              {highCount} alto{highCount > 1 ? "s" : ""}
            </Badge>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card data-testid="card-stat-active">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ativos</CardTitle>
            <Bell className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.active || activeAlerts.length}</div>
            <p className="text-xs text-muted-foreground">Requerem atenção</p>
          </CardContent>
        </Card>
        <Card data-testid="card-stat-acknowledged">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reconhecidos</CardTitle>
            <Eye className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.acknowledged || 0}</div>
            <p className="text-xs text-muted-foreground">Em tratamento</p>
          </CardContent>
        </Card>
        <Card data-testid="card-stat-resolved">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolvidos</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.resolved || 0}</div>
            <p className="text-xs text-muted-foreground">Este mês</p>
          </CardContent>
        </Card>
        <Card data-testid="card-stat-total">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
            <p className="text-xs text-muted-foreground">Histórico geral</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="active" className="space-y-4">
        <TabsList data-testid="tabs-alerts">
          <TabsTrigger value="active" className="relative">
            Alertas Ativos
            {activeAlerts.length > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 px-1.5">
                {activeAlerts.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="all">Histórico</TabsTrigger>
          <TabsTrigger value="rules">Regras de Alerta</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {loadingAlerts ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : activeAlerts.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
                <h3 className="text-lg font-medium">Nenhum alerta ativo</h3>
                <p className="text-muted-foreground text-center">
                  Todos os alertas foram tratados. Continue monitorando o sistema.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {activeAlerts.map((alert) => {
                const SeverityIcon = getSeverityIcon(alert.severity);
                const CategoryIcon = categoryIcons[alert.category] || AlertCircle;
                return (
                  <Card
                    key={alert.id}
                    className="cursor-pointer hover-elevate"
                    onClick={() => setSelectedAlert(alert)}
                    data-testid={`card-alert-${alert.id}`}
                  >
                    <CardContent className="flex items-start gap-4 p-4">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                        severityConfig[alert.severity]?.color || "bg-gray-100"
                      }`}>
                        <SeverityIcon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-medium">{alert.title}</p>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {alert.message}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <Badge className={severityConfig[alert.severity]?.color || "bg-gray-100"}>
                              {severityConfig[alert.severity]?.label || alert.severity}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(alert.createdAt).toLocaleString("pt-BR")}
                            </span>
                          </div>
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CategoryIcon className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground capitalize">
                              {alert.category.replace("_", " ")}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                acknowledgeMutation.mutate(alert.id);
                              }}
                              disabled={acknowledgeMutation.isPending}
                              data-testid={`button-ack-${alert.id}`}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Reconhecer
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                resolveMutation.mutate(alert.id);
                              }}
                              disabled={resolveMutation.isPending}
                              data-testid={`button-resolve-${alert.id}`}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              Resolver
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          <div className="flex flex-col gap-4 md:flex-row">
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-full md:w-40" data-testid="select-severity-filter">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Severidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="critical">Crítico</SelectItem>
                <SelectItem value="high">Alto</SelectItem>
                <SelectItem value="medium">Médio</SelectItem>
                <SelectItem value="low">Baixo</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-48" data-testid="select-category-filter">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-40" data-testid="select-status-filter">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="acknowledged">Reconhecido</SelectItem>
                <SelectItem value="resolved">Resolvido</SelectItem>
                <SelectItem value="dismissed">Dispensado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            {allAlerts.map((alert) => {
              const SeverityIcon = getSeverityIcon(alert.severity);
              return (
                <Card
                  key={alert.id}
                  className="cursor-pointer hover-elevate"
                  onClick={() => setSelectedAlert(alert)}
                  data-testid={`row-alert-${alert.id}`}
                >
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-4">
                      <SeverityIcon className={`h-5 w-5 ${
                        alert.severity === "critical" ? "text-red-500" :
                        alert.severity === "high" ? "text-orange-500" :
                        alert.severity === "medium" ? "text-yellow-500" : "text-blue-500"
                      }`} />
                      <div>
                        <p className="font-medium">{alert.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(alert.createdAt).toLocaleString("pt-BR")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={statusConfig[alert.status]?.color || "bg-gray-100"}>
                        {statusConfig[alert.status]?.label || alert.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="rules" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {rules.map((rule) => {
              const CategoryIcon = categoryIcons[rule.category] || AlertCircle;
              return (
                <Card
                  key={rule.id}
                  className="cursor-pointer hover-elevate"
                  onClick={() => setSelectedRule(rule)}
                  data-testid={`card-rule-${rule.slug}`}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <CategoryIcon className="h-5 w-5 text-muted-foreground" />
                        <CardTitle className="text-base">{rule.name}</CardTitle>
                      </div>
                      <Badge className={severityConfig[rule.severity]?.color || "bg-gray-100"}>
                        {severityConfig[rule.severity]?.label || rule.severity}
                      </Badge>
                    </div>
                    <CardDescription>{rule.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="capitalize">
                        {rule.category.replace("_", " ")}
                      </Badge>
                      <Badge variant={rule.isBuiltIn ? "secondary" : "outline"}>
                        {rule.isBuiltIn ? "Built-in" : "Customizado"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={!!selectedAlert} onOpenChange={() => setSelectedAlert(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" data-testid="dialog-alert-title">
              {selectedAlert && (
                <>
                  {(() => {
                    const Icon = getSeverityIcon(selectedAlert.severity);
                    return <Icon className="h-5 w-5" />;
                  })()}
                  {selectedAlert.title}
                </>
              )}
            </DialogTitle>
            <DialogDescription>Detalhes e ações do alerta</DialogDescription>
          </DialogHeader>

          {selectedAlert && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={severityConfig[selectedAlert.severity]?.color || "bg-gray-100"}>
                  {severityConfig[selectedAlert.severity]?.label || selectedAlert.severity}
                </Badge>
                <Badge className={statusConfig[selectedAlert.status]?.color || "bg-gray-100"}>
                  {statusConfig[selectedAlert.status]?.label || selectedAlert.status}
                </Badge>
                <Badge variant="outline" className="capitalize">
                  {selectedAlert.category.replace("_", " ")}
                </Badge>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm">{selectedAlert.message}</p>
              </div>

              <div className="text-sm text-muted-foreground space-y-1">
                <p>Criado em: {new Date(selectedAlert.createdAt).toLocaleString("pt-BR")}</p>
                {selectedAlert.acknowledgedAt && (
                  <p>Reconhecido em: {new Date(selectedAlert.acknowledgedAt).toLocaleString("pt-BR")}</p>
                )}
                {selectedAlert.resolvedAt && (
                  <p>Resolvido em: {new Date(selectedAlert.resolvedAt).toLocaleString("pt-BR")}</p>
                )}
              </div>

              <div className="flex justify-end gap-2">
                {selectedAlert.status === "active" && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => dismissMutation.mutate(selectedAlert.id)}
                      disabled={dismissMutation.isPending}
                      data-testid="button-dismiss"
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Dispensar
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => acknowledgeMutation.mutate(selectedAlert.id)}
                      disabled={acknowledgeMutation.isPending}
                      data-testid="button-acknowledge"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Reconhecer
                    </Button>
                    <Button
                      onClick={() => resolveMutation.mutate(selectedAlert.id)}
                      disabled={resolveMutation.isPending}
                      data-testid="button-resolve-dialog"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Resolver
                    </Button>
                  </>
                )}
                {selectedAlert.status === "acknowledged" && (
                  <Button
                    onClick={() => resolveMutation.mutate(selectedAlert.id)}
                    disabled={resolveMutation.isPending}
                    data-testid="button-resolve-dialog"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Marcar como Resolvido
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedRule} onOpenChange={() => setSelectedRule(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle data-testid="dialog-rule-title">{selectedRule?.name}</DialogTitle>
            <DialogDescription>{selectedRule?.description}</DialogDescription>
          </DialogHeader>

          {selectedRule && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge className={severityConfig[selectedRule.severity]?.color || "bg-gray-100"}>
                  {severityConfig[selectedRule.severity]?.label || selectedRule.severity}
                </Badge>
                <Badge variant="outline" className="capitalize">
                  {selectedRule.category.replace("_", " ")}
                </Badge>
                <Badge variant={selectedRule.isBuiltIn ? "secondary" : "outline"}>
                  {selectedRule.isBuiltIn ? "Built-in" : "Customizado"}
                </Badge>
              </div>

              {selectedRule.triggerCondition && (
                <div>
                  <h4 className="font-medium mb-2">Condição de Disparo</h4>
                  <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg font-mono">
                    {selectedRule.triggerCondition}
                  </p>
                </div>
              )}

              {selectedRule.recipients && selectedRule.recipients.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Destinatários</h4>
                  <div className="flex flex-wrap gap-1">
                    {selectedRule.recipients.map((recipient, i) => (
                      <Badge key={i} variant="secondary">
                        {recipient}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
