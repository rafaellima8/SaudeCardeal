import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Bug, Home, AlertTriangle, Droplets, Plus, Calendar, Activity, Pencil, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

const cycleFormSchema = z.object({
  name: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  cycleType: z.enum(["liraa", "pve"]),
  startDate: z.string(),
  endDate: z.string(),
  targetMicroareas: z.string().min(1, "Informe as microáreas"),
  totalDwellings: z.coerce.number().min(1, "Total de imóveis deve ser maior que 0"),
  description: z.string().optional(),
});

type CycleFormData = z.infer<typeof cycleFormSchema>;

interface EndemicCycle {
  id: string;
  name: string;
  cycleType: string;
  startDate: string;
  endDate: string;
  status: string;
  totalDwellings: number;
  visitedDwellings: number;
  fociFound: number;
  targetMicroareas: string;
}

interface EndemicStats {
  indicators: {
    iip: number;
    ib: number;
    dwellingsInspected: number;
    dwellingsPositive: number;
    containersWithLarvae: number;
  };
  fociByType: Array<{ depositType: string; count: number }>;
  treatmentsByType: Array<{ treatmentType: string; count: number }>;
}

export default function EndemicDashboard() {
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);
  const [cycleDialogOpen, setCycleDialogOpen] = useState(false);
  const [editingCycle, setEditingCycle] = useState<EndemicCycle | null>(null);
  const [deletingCycle, setDeletingCycle] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: cycles, isLoading: cyclesLoading } = useQuery<EndemicCycle[]>({
    queryKey: ['/api/endemic/cycles'],
  });

  const { data: stats, isLoading: statsLoading } = useQuery<EndemicStats>({
    queryKey: ['/api/endemic/stats', selectedCycleId],
    enabled: !!selectedCycleId,
  });

  const activeCycle = cycles?.find(c => c.status === 'in_progress');

  useEffect(() => {
    if (activeCycle && !selectedCycleId) {
      setSelectedCycleId(activeCycle.id);
    }
  }, [activeCycle, selectedCycleId]);

  const cycleForm = useForm<CycleFormData>({
    resolver: zodResolver(cycleFormSchema),
    defaultValues: {
      name: "",
      cycleType: "liraa",
      startDate: "",
      endDate: "",
      targetMicroareas: "",
      totalDwellings: 0,
      description: "",
    },
  });

  const createCycleMutation = useMutation({
    mutationFn: async (data: CycleFormData) => {
      const payload = {
        ...data,
        targetMicroareas: JSON.parse(`[${data.targetMicroareas.split(',').map(m => `"${m.trim()}"`).join(',')}]`),
        status: 'planned',
      };
      return await apiRequest("POST", "/api/endemic/cycles", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/endemic/cycles'] });
      toast({
        title: "Ciclo criado",
        description: "Ciclo de trabalho criado com sucesso.",
      });
      setCycleDialogOpen(false);
      cycleForm.reset();
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível criar o ciclo.",
      });
    },
  });

  const updateCycleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CycleFormData> }) => {
      const payload = data.targetMicroareas 
        ? {
            ...data,
            targetMicroareas: JSON.parse(`[${data.targetMicroareas.split(',').map(m => `"${m.trim()}"`).join(',')}]`),
          }
        : data;
      return await apiRequest("PATCH", `/api/endemic/cycles/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/endemic/cycles'] });
      toast({
        title: "Ciclo atualizado",
        description: "Ciclo de trabalho atualizado com sucesso.",
      });
      setCycleDialogOpen(false);
      setEditingCycle(null);
      cycleForm.reset();
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível atualizar o ciclo.",
      });
    },
  });

  const deleteCycleMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/endemic/cycles/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/endemic/cycles'] });
      toast({
        title: "Ciclo excluído",
        description: "Ciclo de trabalho excluído com sucesso.",
      });
      setDeletingCycle(null);
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível excluir o ciclo.",
      });
    },
  });

  const onCycleSubmit = (data: CycleFormData) => {
    if (editingCycle) {
      updateCycleMutation.mutate({ id: editingCycle.id, data });
    } else {
      createCycleMutation.mutate(data);
    }
  };

  const handleEditCycle = (cycle: EndemicCycle) => {
    setEditingCycle(cycle);
    cycleForm.reset({
      name: cycle.name,
      cycleType: cycle.cycleType as any,
      startDate: cycle.startDate,
      endDate: cycle.endDate,
      targetMicroareas: Array.isArray(cycle.targetMicroareas) 
        ? cycle.targetMicroareas.join(', ')
        : cycle.targetMicroareas,
      totalDwellings: cycle.totalDwellings,
      description: "",
    });
    setCycleDialogOpen(true);
  };

  const handleCloseCycleDialog = () => {
    setCycleDialogOpen(false);
    setEditingCycle(null);
    cycleForm.reset();
  };

  if (cyclesLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const selectedCycle = selectedCycleId ? cycles?.find(c => c.id === selectedCycleId) : activeCycle;

  return (
    <div className="container mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Controle de Endemias</h1>
          <p className="text-muted-foreground">Gestão de ciclos, focos vetoriais e tratamentos</p>
        </div>
        <Dialog open={cycleDialogOpen} onOpenChange={setCycleDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-new-cycle">
              <Plus className="mr-2 h-4 w-4" />
              Novo Ciclo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingCycle ? "Editar Ciclo de Trabalho" : "Criar Ciclo de Trabalho"}</DialogTitle>
              <DialogDescription>
                {editingCycle ? "Atualize as informações do ciclo" : "Crie um novo ciclo LIRAa ou PVE para controle vetorial"}
              </DialogDescription>
            </DialogHeader>
            <Form {...cycleForm}>
              <form onSubmit={cycleForm.handleSubmit(onCycleSubmit)} className="space-y-4">
                <FormField
                  control={cycleForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Ciclo</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: LIRAa 1º Ciclo 2025" {...field} data-testid="input-cycle-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={cycleForm.control}
                    name="cycleType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de Ciclo</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-cycle-type">
                              <SelectValue placeholder="Selecione o tipo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="liraa">LIRAa</SelectItem>
                            <SelectItem value="pve">PVE</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={cycleForm.control}
                    name="totalDwellings"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Total de Imóveis</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="150" {...field} data-testid="input-total-dwellings" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={cycleForm.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data Início</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-start-date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={cycleForm.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data Fim</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-end-date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={cycleForm.control}
                  name="targetMicroareas"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Microáreas (separadas por vírgula)</FormLabel>
                      <FormControl>
                        <Input placeholder="01, 02, 03" {...field} data-testid="input-microareas" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={cycleForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Observações sobre o ciclo..." {...field} data-testid="textarea-description" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={handleCloseCycleDialog} data-testid="button-cancel">
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createCycleMutation.isPending || updateCycleMutation.isPending} 
                    data-testid="button-submit-cycle"
                  >
                    {editingCycle
                      ? (updateCycleMutation.isPending ? "Atualizando..." : "Atualizar")
                      : (createCycleMutation.isPending ? "Criando..." : "Criar Ciclo")}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {activeCycle && (
        <Card className="bg-primary/5 border-primary/20" data-testid="card-active-cycle">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  {activeCycle.name}
                </CardTitle>
                <CardDescription>
                  {format(new Date(activeCycle.startDate), "dd/MM/yyyy", { locale: ptBR })} - {format(new Date(activeCycle.endDate), "dd/MM/yyyy", { locale: ptBR })}
                </CardDescription>
              </div>
              <Badge variant="default" data-testid="badge-cycle-status">Em Andamento</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Imóveis Visitados</p>
                <p className="text-2xl font-bold" data-testid="text-visited-dwellings">{activeCycle.visitedDwellings} / {activeCycle.totalDwellings}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Focos Encontrados</p>
                <p className="text-2xl font-bold" data-testid="text-foci-found">{activeCycle.fociFound}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Progresso</p>
                <p className="text-2xl font-bold" data-testid="text-progress">
                  {Math.round((activeCycle.visitedDwellings / activeCycle.totalDwellings) * 100)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="indicators" className="space-y-4">
        <TabsList>
          <TabsTrigger value="indicators" data-testid="tab-indicators">Indicadores</TabsTrigger>
          <TabsTrigger value="heatmap" data-testid="tab-heatmap">Mapa de Calor</TabsTrigger>
          <TabsTrigger value="cycles" data-testid="tab-cycles">Ciclos</TabsTrigger>
          <TabsTrigger value="fad" data-testid="tab-fad">FAD</TabsTrigger>
          <TabsTrigger value="foci" data-testid="tab-foci">Focos</TabsTrigger>
        </TabsList>

        <TabsContent value="indicators" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card data-testid="card-iip">
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">IIP</CardTitle>
                <Home className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-iip">
                  {stats?.indicators?.iip?.toFixed(2) ?? '0.00'}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Índice de Infestação Predial
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-ib">
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">IB</CardTitle>
                <Droplets className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-ib">
                  {stats?.indicators?.ib?.toFixed(0) ?? '0'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Índice de Breteau
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-inspected">
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Inspecionados</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-inspected">
                  {stats?.indicators?.dwellingsInspected ?? 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {stats?.indicators?.dwellingsPositive ?? 0} positivos
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-containers">
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Recipientes</CardTitle>
                <Bug className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-containers">
                  {stats?.indicators?.containersWithLarvae ?? 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Com larvas/pupas
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card data-testid="card-chart-foci">
              <CardHeader>
                <CardTitle>Focos por Tipo de Depósito</CardTitle>
                <CardDescription>Distribuição dos focos identificados</CardDescription>
              </CardHeader>
              <CardContent>
                {stats?.fociByType && stats.fociByType.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={stats.fociByType}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="depositType" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#0088FE" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    Selecione um ciclo para ver os dados
                  </div>
                )}
              </CardContent>
            </Card>

            <Card data-testid="card-chart-treatments">
              <CardHeader>
                <CardTitle>Tratamentos Realizados</CardTitle>
                <CardDescription>Distribuição por tipo de tratamento</CardDescription>
              </CardHeader>
              <CardContent>
                {stats?.treatmentsByType && stats.treatmentsByType.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={stats.treatmentsByType}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry) => `${entry.treatmentType}: ${entry.count}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {stats.treatmentsByType.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    Selecione um ciclo para ver os dados
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="heatmap" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Mapa de Calor - Distribuição de Focos</CardTitle>
              <CardDescription>
                Intensidade de focos por tipo de depósito e localização
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {stats?.fociByType && stats.fociByType.length > 0 ? (
                <>
                  <div>
                    <h3 className="text-sm font-medium mb-3">Intensidade por Tipo de Depósito</h3>
                    <div className="space-y-2">
                      {stats.fociByType.map((item) => {
                        const maxCount = Math.max(...stats.fociByType.map(f => f.count));
                        const intensity = (item.count / maxCount) * 100;
                        const getColor = (pct: number) => {
                          if (pct > 75) return 'bg-red-500';
                          if (pct > 50) return 'bg-orange-500';
                          if (pct > 25) return 'bg-yellow-500';
                          return 'bg-green-500';
                        };
                        const getTextColor = (pct: number) => {
                          if (pct > 75) return 'text-red-500';
                          if (pct > 50) return 'text-orange-500';
                          if (pct > 25) return 'text-yellow-500';
                          return 'text-green-500';
                        };

                        return (
                          <div key={item.depositType} className="flex items-center gap-3">
                            <div className="w-32 text-sm font-medium">{item.depositType}</div>
                            <div className="flex-1 bg-muted rounded-full h-8 overflow-hidden">
                              <div
                                className={`h-full ${getColor(intensity)} transition-all duration-500 flex items-center justify-end px-3`}
                                style={{ width: `${intensity}%` }}
                              >
                                <span className="text-xs font-bold text-white">
                                  {item.count}
                                </span>
                              </div>
                            </div>
                            <div className={`w-20 text-right text-sm font-bold ${getTextColor(intensity)}`}>
                              {intensity.toFixed(0)}%
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">Depósitos Prioritários</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {stats.fociByType
                            .sort((a, b) => b.count - a.count)
                            .slice(0, 3)
                            .map((item, idx) => (
                              <div key={item.depositType} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Badge className="h-6 w-6 rounded-full p-0 flex items-center justify-center">
                                    {idx + 1}
                                  </Badge>
                                  <span className="text-sm font-medium">{item.depositType}</span>
                                </div>
                                <span className="text-sm font-bold">{item.count} focos</span>
                              </div>
                            ))}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">Classificação de Risco</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="h-3 w-3 rounded-full bg-red-500"></div>
                              <span className="text-sm">Alto Risco</span>
                            </div>
                            <span className="text-sm font-bold">
                              {stats.fociByType.filter(f => {
                                const max = Math.max(...stats.fociByType.map(x => x.count));
                                return (f.count / max) > 0.75;
                              }).length} tipos
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="h-3 w-3 rounded-full bg-orange-500"></div>
                              <span className="text-sm">Médio Risco</span>
                            </div>
                            <span className="text-sm font-bold">
                              {stats.fociByType.filter(f => {
                                const max = Math.max(...stats.fociByType.map(x => x.count));
                                const pct = f.count / max;
                                return pct > 0.50 && pct <= 0.75;
                              }).length} tipos
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
                              <span className="text-sm">Baixo Risco</span>
                            </div>
                            <span className="text-sm font-bold">
                              {stats.fociByType.filter(f => {
                                const max = Math.max(...stats.fociByType.map(x => x.count));
                                return (f.count / max) <= 0.50;
                              }).length} tipos
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="pt-4 border-t">
                    <p className="text-xs text-muted-foreground text-center">
                      💡 Dica: Priorize ações de controle nos depósitos com maior intensidade (vermelho e laranja)
                    </p>
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <AlertTriangle className="h-16 w-16 mx-auto mb-4 opacity-20" />
                  <p className="text-lg font-medium mb-2">Sem dados de focos</p>
                  <p className="text-sm">
                    Selecione um ciclo com focos registrados para visualizar o mapa de calor
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cycles">
          <Card>
            <CardHeader>
              <CardTitle>Ciclos de Trabalho</CardTitle>
              <CardDescription>Histórico de ciclos LIRAa e PVE</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Progresso</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cycles?.map((cycle) => (
                    <TableRow key={cycle.id} data-testid={`row-cycle-${cycle.id}`}>
                      <TableCell className="font-medium">{cycle.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{cycle.cycleType.toUpperCase()}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(cycle.startDate), "dd/MM/yy", { locale: ptBR })} - {format(new Date(cycle.endDate), "dd/MM/yy", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <Badge variant={cycle.status === 'in_progress' ? 'default' : cycle.status === 'completed' ? 'secondary' : 'outline'}>
                          {cycle.status === 'in_progress' ? 'Em Andamento' : cycle.status === 'completed' ? 'Concluído' : 'Planejado'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{cycle.visitedDwellings}/{cycle.totalDwellings}</span>
                          <span className="text-xs text-muted-foreground">
                            ({Math.round((cycle.visitedDwellings / cycle.totalDwellings) * 100)}%)
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleEditCycle(cycle)}
                            data-testid={`button-edit-cycle-${cycle.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setDeletingCycle(cycle.id)}
                            data-testid={`button-delete-cycle-${cycle.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedCycleId(cycle.id)}
                            data-testid={`button-view-stats-${cycle.id}`}
                          >
                            Ver Estatísticas
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fad">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-4">
              <div>
                <CardTitle>Fichas de Atividade Diária (FAD)</CardTitle>
                <CardDescription>Registro de avaliações de imóveis visitados</CardDescription>
              </div>
              <Button size="sm" data-testid="button-new-fad">
                <Plus className="mr-2 h-4 w-4" />
                Nova FAD
              </Button>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <Activity className="h-16 w-16 mx-auto mb-4 opacity-20" />
                <p className="text-lg font-medium mb-2">Nenhuma FAD registrada</p>
                <p className="text-sm">
                  Clique em "Nova FAD" para registrar uma avaliação de imóvel
                </p>
                <p className="text-xs mt-4 max-w-md mx-auto">
                  A Ficha de Atividade Diária (FAD) registra imóveis inspecionados,
                  recipientes encontrados, larvas identificadas e ações tomadas durante visitas domiciliares.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="foci">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-4">
              <div>
                <CardTitle>Focos Vetoriais</CardTitle>
                <CardDescription>Registro e monitoramento de focos identificados</CardDescription>
              </div>
              <Button size="sm" data-testid="button-new-focus">
                <Plus className="mr-2 h-4 w-4" />
                Novo Foco
              </Button>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <Bug className="h-16 w-16 mx-auto mb-4 opacity-20" />
                <p className="text-lg font-medium mb-2">Nenhum foco registrado</p>
                <p className="text-sm">
                  Clique em "Novo Foco" para registrar um foco vetorial identificado
                </p>
                <div className="mt-6 max-w-2xl mx-auto">
                  <p className="text-xs font-medium mb-2">Tipos de Depósitos:</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <Badge variant="outline">A1 - Armazenamento água (elevado)</Badge>
                    <Badge variant="outline">A2 - Armazenamento água (solo)</Badge>
                    <Badge variant="outline">B - Depósitos móveis</Badge>
                    <Badge variant="outline">C - Depósitos fixos</Badge>
                    <Badge variant="outline">D1 - Pneus/borrachas</Badge>
                    <Badge variant="outline">D2 - Lixo/entulho</Badge>
                    <Badge variant="outline">E - Naturais</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Cycle Confirmation Dialog */}
      <AlertDialog open={!!deletingCycle} onOpenChange={() => setDeletingCycle(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este ciclo de trabalho? Esta ação não pode ser desfeita e todos os dados associados (FAD, focos, tratamentos) também serão removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-cycle">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingCycle && deleteCycleMutation.mutate(deletingCycle)}
              className="bg-destructive hover:bg-destructive/90"
              data-testid="button-confirm-delete-cycle"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
