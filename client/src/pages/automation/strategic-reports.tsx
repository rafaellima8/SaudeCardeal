import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  BarChart3,
  FileText,
  Play,
  Download,
  Eye,
  Filter,
  Loader2,
  TrendingUp,
  DollarSign,
  Heart,
  Activity,
  Building,
  Pill,
  Baby,
  Truck,
  Clock,
  CheckCircle2,
  Calendar,
} from "lucide-react";

interface ReportDefinition {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  exportFormats: string[];
  isBuiltIn: boolean;
}

interface ReportExecution {
  executionId: string;
  reportSlug: string;
  reportName: string;
  parameters?: Record<string, any>;
  executedAt: string;
  executedBy?: string;
  data: any[];
  aggregations: Record<string, any>;
  totalRows: number;
  executionTime: number;
}

interface ReportCategory {
  value: string;
  label: string;
  icon: string;
  count: number;
}

const categoryConfig: Record<string, { icon: any; color: string }> = {
  previne: { icon: Heart, color: "text-red-500" },
  mac: { icon: Activity, color: "text-blue-500" },
  aih: { icon: Building, color: "text-purple-500" },
  vigilancia: { icon: Eye, color: "text-orange-500" },
  suas_saude: { icon: Heart, color: "text-pink-500" },
  farmacia: { icon: Pill, color: "text-green-500" },
  financeiro: { icon: DollarSign, color: "text-yellow-500" },
};

export default function StrategicReportsPage() {
  const [selectedReport, setSelectedReport] = useState<ReportDefinition | null>(null);
  const [executionResult, setExecutionResult] = useState<ReportExecution | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const { toast } = useToast();

  const { data: definitions = [], isLoading: loadingDefinitions } = useQuery<ReportDefinition[]>({
    queryKey: ["/api/strategic-reports/definitions"],
  });

  const { data: categories = [] } = useQuery<ReportCategory[]>({
    queryKey: ["/api/strategic-reports/categories"],
  });

  const { data: executions = [] } = useQuery<any[]>({
    queryKey: ["/api/strategic-reports/executions"],
  });

  const executeMutation = useMutation({
    mutationFn: async ({ slug, parameters }: { slug: string; parameters?: Record<string, any> }) => {
      return apiRequest("POST", `/api/strategic-reports/execute/${slug}`, { parameters }) as Promise<ReportExecution>;
    },
    onSuccess: (data) => {
      setExecutionResult(data);
      toast({
        title: "Relatório gerado",
        description: `${data.reportName} executado com sucesso em ${data.executionTime}ms.`,
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao gerar relatório",
        description: error.message || "Não foi possível executar o relatório.",
      });
    },
  });

  const filteredDefinitions = categoryFilter === "all"
    ? definitions
    : definitions.filter(d => d.category === categoryFilter);

  const definitionsByCategory = filteredDefinitions.reduce((acc, def) => {
    const category = def.category;
    if (!acc[category]) acc[category] = [];
    acc[category].push(def);
    return acc;
  }, {} as Record<string, ReportDefinition[]>);

  const handleExecute = () => {
    if (!selectedReport) return;
    const parameters: Record<string, any> = {};
    if (startDate) parameters.startDate = startDate;
    if (endDate) parameters.endDate = endDate;
    executeMutation.mutate({ slug: selectedReport.slug, parameters });
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return "-";
    if (typeof value === "number") {
      if (value >= 1000) return value.toLocaleString("pt-BR");
      if (value % 1 !== 0) return value.toFixed(2);
      return value.toString();
    }
    return String(value);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">
            Relatórios Estratégicos
          </h1>
          <p className="text-muted-foreground">
            Dashboards e indicadores para captação de recursos e monitoramento
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1" data-testid="badge-report-count">
            <BarChart3 className="h-3 w-3" />
            {definitions.length} relatórios disponíveis
          </Badge>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card data-testid="card-stat-previne">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Previne Brasil</CardTitle>
            <Heart className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {definitions.filter(d => d.category === "previne").length}
            </div>
            <p className="text-xs text-muted-foreground">Indicadores de atenção primária</p>
          </CardContent>
        </Card>
        <Card data-testid="card-stat-mac">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Produção MAC</CardTitle>
            <Activity className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {definitions.filter(d => d.category === "mac").length}
            </div>
            <p className="text-xs text-muted-foreground">Faturamento ambulatorial</p>
          </CardContent>
        </Card>
        <Card data-testid="card-stat-vigilancia">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vigilância</CardTitle>
            <Eye className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {definitions.filter(d => d.category === "vigilancia").length}
            </div>
            <p className="text-xs text-muted-foreground">Epidemiologia e notificações</p>
          </CardContent>
        </Card>
        <Card data-testid="card-stat-financeiro">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Financeiro</CardTitle>
            <DollarSign className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {definitions.filter(d => d.category === "financeiro").length}
            </div>
            <p className="text-xs text-muted-foreground">Custos e receitas</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="catalog" className="space-y-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <TabsList data-testid="tabs-reports">
            <TabsTrigger value="catalog">Catálogo</TabsTrigger>
            <TabsTrigger value="history">Histórico</TabsTrigger>
          </TabsList>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full md:w-48" data-testid="select-category-filter">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as categorias</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label} ({cat.count})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <TabsContent value="catalog" className="space-y-6">
          {loadingDefinitions ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            Object.entries(definitionsByCategory).map(([category, categoryDefs]) => {
              const config = categoryConfig[category] || { icon: FileText, color: "text-muted-foreground" };
              const CategoryIcon = config.icon;
              return (
                <div key={category}>
                  <div className="flex items-center gap-2 mb-4">
                    <CategoryIcon className={`h-5 w-5 ${config.color}`} />
                    <h3 className="text-lg font-semibold capitalize">
                      {category.replace("_", " ")}
                    </h3>
                    <Badge variant="secondary">{categoryDefs.length}</Badge>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {categoryDefs.map((report) => (
                      <Card
                        key={report.id}
                        className="cursor-pointer hover-elevate"
                        onClick={() => setSelectedReport(report)}
                        data-testid={`card-report-${report.slug}`}
                      >
                        <CardHeader>
                          <CardTitle className="text-base">{report.name}</CardTitle>
                          <CardDescription className="line-clamp-2">
                            {report.description}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1">
                              {report.exportFormats.map((format) => (
                                <Badge key={format} variant="outline" className="text-xs">
                                  {format.toUpperCase()}
                                </Badge>
                              ))}
                            </div>
                            <Button variant="ghost" size="sm" data-testid={`button-run-${report.slug}`}>
                              <Play className="h-4 w-4 mr-1" />
                              Executar
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {executions.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">Nenhuma execução registrada</h3>
                <p className="text-muted-foreground text-center">
                  Execute um relatório para ver o histórico aqui.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {executions.map((exec) => (
                <Card key={exec.id} data-testid={`row-execution-${exec.id}`}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                        <BarChart3 className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium">{exec.reportName}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(exec.executedAt).toLocaleString("pt-BR")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary">{exec.rowCount} linhas</Badge>
                      <Badge variant="outline">{exec.executionTime}ms</Badge>
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!selectedReport && !executionResult} onOpenChange={() => setSelectedReport(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" data-testid="dialog-report-title">
              <BarChart3 className="h-5 w-5" />
              {selectedReport?.name}
            </DialogTitle>
            <DialogDescription>{selectedReport?.description}</DialogDescription>
          </DialogHeader>

          {selectedReport && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="capitalize">
                  {selectedReport.category.replace("_", " ")}
                </Badge>
                <Badge variant={selectedReport.isBuiltIn ? "secondary" : "outline"}>
                  {selectedReport.isBuiltIn ? "Built-in" : "Customizado"}
                </Badge>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="startDate">Data Inicial (opcional)</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="mt-1"
                    data-testid="input-start-date"
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">Data Final (opcional)</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="mt-1"
                    data-testid="input-end-date"
                  />
                </div>
              </div>

              <div>
                <Label>Formatos de Exportação</Label>
                <div className="flex items-center gap-2 mt-1">
                  {selectedReport.exportFormats.map((format) => (
                    <Badge key={format} variant="secondary">
                      {format.toUpperCase()}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedReport(null)}>
              Cancelar
            </Button>
            <Button
              onClick={handleExecute}
              disabled={executeMutation.isPending}
              data-testid="button-execute"
            >
              {executeMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-1" />
              )}
              Executar Relatório
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!executionResult} onOpenChange={() => { setExecutionResult(null); setSelectedReport(null); }}>
        <DialogContent className="max-w-5xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" data-testid="dialog-result-title">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              {executionResult?.reportName}
            </DialogTitle>
            <DialogDescription>
              Executado em {executionResult?.executionTime}ms • {executionResult?.totalRows} registros
            </DialogDescription>
          </DialogHeader>

          {executionResult && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-6 pr-4">
                {Object.keys(executionResult.aggregations).length > 0 && (
                  <div className="grid gap-4 md:grid-cols-3">
                    {Object.entries(executionResult.aggregations).map(([key, value]) => (
                      <Card key={key}>
                        <CardContent className="p-4">
                          <p className="text-sm text-muted-foreground">{key}</p>
                          <p className="text-2xl font-bold">
                            {typeof value === "number"
                              ? value.toLocaleString("pt-BR", { maximumFractionDigits: 2 })
                              : value}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {executionResult.data.length > 0 && (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {Object.keys(executionResult.data[0]).map((key) => (
                            <TableHead key={key} className="capitalize">
                              {key.replace(/_/g, " ")}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {executionResult.data.map((row, index) => (
                          <TableRow key={index}>
                            {Object.values(row).map((value, cellIndex) => (
                              <TableCell key={cellIndex}>
                                {formatValue(value)}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => { setExecutionResult(null); setSelectedReport(null); }}>
              Fechar
            </Button>
            <Button variant="outline" data-testid="button-export-csv">
              <Download className="h-4 w-4 mr-1" />
              Exportar CSV
            </Button>
            <Button data-testid="button-export-pdf">
              <Download className="h-4 w-4 mr-1" />
              Exportar PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
