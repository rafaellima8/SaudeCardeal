import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  GitBranch,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Eye,
  Play,
  Pause,
  RotateCcw,
  Filter,
  Loader2,
  User,
  Building,
  AlertCircle,
  FileCheck,
} from "lucide-react";

interface WorkflowDefinition {
  id: string;
  slug: string;
  name: string;
  entityType: string;
  isBuiltIn: boolean;
  description?: string;
  steps: WorkflowStep[];
}

interface WorkflowStep {
  order: number;
  name: string;
  role: string;
  action: string;
  autoApproveAfterHours?: number;
  requiredFields?: string[];
}

interface WorkflowInstance {
  id: string;
  workflowSlug: string;
  entityId: string;
  currentStep: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface WorkflowStats {
  total: number;
  pending: number;
  inProgress: number;
  approved: number;
  rejected: number;
  byType: Record<string, number>;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  approved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
};

const statusLabels: Record<string, string> = {
  pending: "Pendente",
  in_progress: "Em Andamento",
  approved: "Aprovado",
  rejected: "Rejeitado",
  completed: "Concluído",
};

export default function WorkflowPage() {
  const [selectedDefinition, setSelectedDefinition] = useState<WorkflowDefinition | null>(null);
  const [selectedInstance, setSelectedInstance] = useState<WorkflowInstance | null>(null);
  const [actionComment, setActionComment] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const { toast } = useToast();

  const { data: definitions = [], isLoading: loadingDefinitions } = useQuery<WorkflowDefinition[]>({
    queryKey: ["/api/workflow/definitions"],
  });

  const { data: stats } = useQuery<WorkflowStats>({
    queryKey: ["/api/workflow/stats"],
  });

  const { data: instances = [] } = useQuery<WorkflowInstance[]>({
    queryKey: ["/api/workflow/instances", statusFilter, typeFilter],
  });

  const actionMutation = useMutation({
    mutationFn: async ({ instanceId, action, comment }: { instanceId: string; action: string; comment?: string }) => {
      return apiRequest("POST", `/api/workflow/instances/${instanceId}/action`, { action, comment });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workflow/instances"] });
      queryClient.invalidateQueries({ queryKey: ["/api/workflow/stats"] });
      setSelectedInstance(null);
      setActionComment("");
      toast({
        title: "Ação executada",
        description: "O fluxo foi atualizado com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message || "Não foi possível executar a ação.",
      });
    },
  });

  const getStepProgress = (instance: WorkflowInstance) => {
    const definition = definitions.find(d => d.slug === instance.workflowSlug);
    if (!definition) return 0;
    return Math.round(((instance.currentStep + 1) / definition.steps.length) * 100);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">
            Fluxos de Aprovação
          </h1>
          <p className="text-muted-foreground">
            Gerencie os fluxos de trabalho: SINAN, TFD, Prescrições e Fraldas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1" data-testid="badge-workflow-count">
            <GitBranch className="h-3 w-3" />
            {definitions.length} fluxos configurados
          </Badge>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <Card data-testid="card-stat-total">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <GitBranch className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
            <p className="text-xs text-muted-foreground">Instâncias de workflow</p>
          </CardContent>
        </Card>
        <Card data-testid="card-stat-pending">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pending || 0}</div>
            <p className="text-xs text-muted-foreground">Aguardando ação</p>
          </CardContent>
        </Card>
        <Card data-testid="card-stat-progress">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Andamento</CardTitle>
            <Play className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.inProgress || 0}</div>
            <p className="text-xs text-muted-foreground">Processando</p>
          </CardContent>
        </Card>
        <Card data-testid="card-stat-approved">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aprovados</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.approved || 0}</div>
            <p className="text-xs text-muted-foreground">Concluídos com sucesso</p>
          </CardContent>
        </Card>
        <Card data-testid="card-stat-rejected">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejeitados</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.rejected || 0}</div>
            <p className="text-xs text-muted-foreground">Não aprovados</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="definitions" className="space-y-4">
        <TabsList data-testid="tabs-workflow">
          <TabsTrigger value="definitions">Definições de Fluxo</TabsTrigger>
          <TabsTrigger value="instances">Instâncias Ativas</TabsTrigger>
        </TabsList>

        <TabsContent value="definitions" className="space-y-4">
          {loadingDefinitions ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {definitions.map((definition) => (
                <Card
                  key={definition.id}
                  className="cursor-pointer hover-elevate"
                  onClick={() => setSelectedDefinition(definition)}
                  data-testid={`card-workflow-${definition.slug}`}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <CardTitle className="text-lg">{definition.name}</CardTitle>
                        <CardDescription>{definition.description}</CardDescription>
                      </div>
                      <Badge variant="outline">{definition.entityType}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="font-medium">Etapas:</span>
                        <div className="flex items-center gap-1">
                          {definition.steps.map((step, index) => (
                            <div key={index} className="flex items-center">
                              <Badge variant="secondary" className="text-xs">
                                {step.name.split(" ")[0]}
                              </Badge>
                              {index < definition.steps.length - 1 && (
                                <ArrowRight className="h-3 w-3 mx-1 text-muted-foreground" />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <Badge variant={definition.isBuiltIn ? "secondary" : "outline"}>
                          {definition.isBuiltIn ? "Built-in" : "Customizado"}
                        </Badge>
                        <Button variant="ghost" size="sm" data-testid={`button-view-${definition.slug}`}>
                          <Eye className="h-4 w-4 mr-1" />
                          Detalhes
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="instances" className="space-y-4">
          <div className="flex flex-col gap-4 md:flex-row">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48" data-testid="select-status-filter">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="in_progress">Em Andamento</SelectItem>
                <SelectItem value="approved">Aprovado</SelectItem>
                <SelectItem value="rejected">Rejeitado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full md:w-48" data-testid="select-type-filter">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Tipo de fluxo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                {definitions.map((def) => (
                  <SelectItem key={def.slug} value={def.slug}>
                    {def.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {instances.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <GitBranch className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">Nenhuma instância encontrada</h3>
                <p className="text-muted-foreground text-center">
                  Não há instâncias de workflow ativas no momento.
                  <br />
                  As instâncias são criadas automaticamente quando documentos são submetidos.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {instances.map((instance) => (
                <Card key={instance.id} data-testid={`row-instance-${instance.id}`}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                        <GitBranch className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium">{instance.workflowSlug}</p>
                        <p className="text-sm text-muted-foreground">
                          Entidade: {instance.entityId}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-32">
                        <Progress value={getStepProgress(instance)} className="h-2" />
                        <p className="text-xs text-muted-foreground mt-1 text-center">
                          Etapa {instance.currentStep + 1}
                        </p>
                      </div>
                      <Badge className={statusColors[instance.status] || "bg-gray-100"}>
                        {statusLabels[instance.status] || instance.status}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedInstance(instance)}
                        data-testid={`button-action-${instance.id}`}
                      >
                        <Play className="h-4 w-4 mr-1" />
                        Ações
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!selectedDefinition} onOpenChange={() => setSelectedDefinition(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" data-testid="dialog-definition-title">
              <GitBranch className="h-5 w-5" />
              {selectedDefinition?.name}
            </DialogTitle>
            <DialogDescription>{selectedDefinition?.description}</DialogDescription>
          </DialogHeader>

          {selectedDefinition && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4 pr-4">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{selectedDefinition.entityType}</Badge>
                  <Badge variant={selectedDefinition.isBuiltIn ? "secondary" : "outline"}>
                    {selectedDefinition.isBuiltIn ? "Built-in" : "Customizado"}
                  </Badge>
                </div>

                <div>
                  <h4 className="font-medium mb-3">Etapas do Fluxo</h4>
                  <div className="space-y-3">
                    {selectedDefinition.steps.map((step, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-4 p-4 rounded-lg border"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="font-medium">{step.name}</p>
                            <Badge variant="secondary">{step.action}</Badge>
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {step.role}
                            </span>
                            {step.autoApproveAfterHours && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Auto-aprova em {step.autoApproveAfterHours}h
                              </span>
                            )}
                          </div>
                          {step.requiredFields && step.requiredFields.length > 0 && (
                            <div className="mt-2 flex items-center gap-1 flex-wrap">
                              <span className="text-xs text-muted-foreground">Campos obrigatórios:</span>
                              {step.requiredFields.map((field) => (
                                <Badge key={field} variant="outline" className="text-xs">
                                  {field}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedInstance} onOpenChange={() => setSelectedInstance(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle data-testid="dialog-instance-title">
              Ações do Workflow
            </DialogTitle>
            <DialogDescription>
              Execute uma ação nesta instância de workflow
            </DialogDescription>
          </DialogHeader>

          {selectedInstance && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge className={statusColors[selectedInstance.status] || "bg-gray-100"}>
                  {statusLabels[selectedInstance.status] || selectedInstance.status}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Etapa atual: {selectedInstance.currentStep + 1}
                </span>
              </div>

              <div>
                <label className="text-sm font-medium">Comentário (opcional)</label>
                <Textarea
                  placeholder="Adicione um comentário sobre a ação..."
                  value={actionComment}
                  onChange={(e) => setActionComment(e.target.value)}
                  className="mt-2"
                  data-testid="textarea-action-comment"
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                if (selectedInstance) {
                  actionMutation.mutate({
                    instanceId: selectedInstance.id,
                    action: "reject",
                    comment: actionComment,
                  });
                }
              }}
              disabled={actionMutation.isPending}
              data-testid="button-reject"
            >
              <XCircle className="h-4 w-4 mr-1" />
              Rejeitar
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (selectedInstance) {
                  actionMutation.mutate({
                    instanceId: selectedInstance.id,
                    action: "return",
                    comment: actionComment,
                  });
                }
              }}
              disabled={actionMutation.isPending}
              data-testid="button-return"
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Devolver
            </Button>
            <Button
              onClick={() => {
                if (selectedInstance) {
                  actionMutation.mutate({
                    instanceId: selectedInstance.id,
                    action: "approve",
                    comment: actionComment,
                  });
                }
              }}
              disabled={actionMutation.isPending}
              data-testid="button-approve"
            >
              {actionMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-1" />
              )}
              Aprovar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
