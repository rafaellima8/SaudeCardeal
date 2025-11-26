import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Activity, Home, AlertTriangle, Bug, Target, Shield, Info, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useCurrentUser } from "@/hooks/use-current-user";

interface LiraaClassification {
  risk: "low" | "medium" | "high" | "very_high";
  riskLabel: string;
  riskColor: string;
  description: string;
}

interface EndemicStats {
  indicators: {
    iip: number;
    ib: number;
    dwellingsInspected: number;
    dwellingsPositive: number;
    containersWithLarvae: number;
    liraa: LiraaClassification;
  };
  fociByType: Array<{ depositType: string; count: number }>;
  treatmentsByType: Array<{ treatmentType: string; count: number }>;
}

interface EndemicCycle {
  id: string;
  name: string;
  type: string;
  status: string;
  startDate: Date;
  endDate?: Date;
}

const DEPOSIT_COLORS: Record<string, string> = {
  A1: "hsl(var(--chart-1))",
  A2: "hsl(var(--chart-2))",
  B: "hsl(var(--chart-3))",
  C: "hsl(var(--chart-4))",
  D1: "hsl(var(--chart-5))",
  D2: "hsl(var(--primary))",
  E: "hsl(var(--destructive))",
};

const TREATMENT_COLORS: Record<string, string> = {
  focal: "hsl(var(--chart-1))",
  perifocal: "hsl(var(--chart-2))",
  nebulizacao: "hsl(var(--chart-3))",
  ubn: "hsl(var(--chart-4))",
};

function getRiskClassName(risk: string): string {
  switch (risk) {
    case "low": return "text-green-600 dark:text-green-400";
    case "medium": return "text-yellow-600 dark:text-yellow-400";
    case "high": return "text-orange-600 dark:text-orange-400";
    case "very_high": return "text-red-600 dark:text-red-400";
    default: return "text-muted-foreground";
  }
}

function getRiskBorderClassName(risk: string): string {
  switch (risk) {
    case "low": return "border-green-500 dark:border-green-600";
    case "medium": return "border-yellow-500 dark:border-yellow-600";
    case "high": return "border-orange-500 dark:border-orange-600";
    case "very_high": return "border-red-500 dark:border-red-600";
    default: return "border-border";
  }
}

function getRiskBgClassName(risk: string): string {
  switch (risk) {
    case "low": return "bg-green-100 dark:bg-green-900/30";
    case "medium": return "bg-yellow-100 dark:bg-yellow-900/30";
    case "high": return "bg-orange-100 dark:bg-orange-900/30";
    case "very_high": return "bg-red-100 dark:bg-red-900/30";
    default: return "bg-muted";
  }
}

function getRiskBadgeVariant(risk: string): "default" | "secondary" | "destructive" | "outline" {
  switch (risk) {
    case "low": return "outline";
    case "medium": return "default";
    case "high": return "secondary";
    case "very_high": return "destructive";
    default: return "outline";
  }
}

export default function AceDashboard() {
  const [selectedCycleId, setSelectedCycleId] = useState<string>("all");
  const { user, isLoading: userLoading } = useCurrentUser();

  const { data: cycles = [], isLoading: cyclesLoading, error: cyclesError, refetch: refetchCycles } = useQuery<EndemicCycle[]>({
    queryKey: ["/api/endemic/cycles"],
    queryFn: async () => apiRequest<EndemicCycle[]>("GET", "/api/endemic/cycles"),
    enabled: !userLoading && !!user,
  });

  const { data: stats, isLoading: statsLoading, error: statsError, refetch: refetchStats } = useQuery<EndemicStats>({
    queryKey: ["/api/endemic/stats", selectedCycleId],
    queryFn: async () => {
      const params = selectedCycleId !== "all" ? `?cycleId=${selectedCycleId}` : "";
      return apiRequest<EndemicStats>("GET", `/api/endemic/stats${params}`);
    },
    enabled: !userLoading && !!user,
  });

  const isLoading = userLoading || cyclesLoading || statsLoading;
  const hasError = cyclesError || statsError;

  if (!user && !userLoading) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Acesso Negado</AlertTitle>
          <AlertDescription>
            Você precisa estar autenticado para acessar o dashboard epidemiológico.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erro ao Carregar Dados</AlertTitle>
          <AlertDescription className="flex items-center gap-4">
            <span>Não foi possível carregar os indicadores epidemiológicos.</span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => { refetchCycles(); refetchStats(); }}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Tentar Novamente
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-48" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  const indicators = stats?.indicators || {
    iip: 0,
    ib: 0,
    dwellingsInspected: 0,
    dwellingsPositive: 0,
    containersWithLarvae: 0,
    liraa: { risk: "low" as const, riskLabel: "Baixo Risco", riskColor: "#22c55e", description: "Sem dados suficientes" }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2" data-testid="text-page-title">
            <Bug className="h-8 w-8" />
            Dashboard Epidemiológico
          </h1>
          <p className="text-muted-foreground">
            Indicadores LIRAa - Vigilância e Controle de Vetores
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <Select value={selectedCycleId} onValueChange={setSelectedCycleId}>
            <SelectTrigger className="w-[220px]" data-testid="select-cycle">
              <SelectValue placeholder="Selecione o ciclo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os ciclos</SelectItem>
              {cycles.map((cycle) => (
                <SelectItem key={cycle.id} value={cycle.id}>
                  {cycle.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className={`border-2 ${getRiskBorderClassName(indicators.liraa.risk)}`} data-testid="card-liraa-status">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Classificação LIRAa
            </CardTitle>
            <Badge 
              variant={getRiskBadgeVariant(indicators.liraa.risk)}
              className="text-sm px-3 py-1"
            >
              {indicators.liraa.riskLabel}
            </Badge>
          </div>
          <CardDescription className="flex items-center gap-2 mt-2">
            <Info className="h-4 w-4 shrink-0" />
            {indicators.liraa.description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className={`text-center p-3 rounded-lg ${getRiskBgClassName(indicators.liraa.risk)}`}>
              <div className={`text-2xl font-bold ${getRiskClassName(indicators.liraa.risk)}`}>
                {indicators.iip.toFixed(2)}%
              </div>
              <div className="text-xs text-muted-foreground">IIP</div>
              <div className="text-xs text-muted-foreground">Índice de Infestação Predial</div>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-primary">
                {indicators.ib.toFixed(2)}
              </div>
              <div className="text-xs text-muted-foreground">IB</div>
              <div className="text-xs text-muted-foreground">Índice de Breteau</div>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold">{indicators.dwellingsInspected}</div>
              <div className="text-xs text-muted-foreground">Imóveis Inspecionados</div>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-destructive">{indicators.dwellingsPositive}</div>
              <div className="text-xs text-muted-foreground">Imóveis Positivos</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card data-testid="card-iip">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">IIP - Índice de Infestação</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getRiskClassName(indicators.liraa.risk)}`}>
              {indicators.iip.toFixed(2)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Meta: &lt; 1% (Baixo Risco)
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-ib">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">IB - Índice de Breteau</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{indicators.ib.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Recipientes positivos / 100 imóveis
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-dwellings">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Imóveis Inspecionados</CardTitle>
            <Home className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{indicators.dwellingsInspected}</div>
            <p className="text-xs text-muted-foreground">
              {indicators.dwellingsPositive} positivos ({indicators.dwellingsInspected > 0 
                ? ((indicators.dwellingsPositive / indicators.dwellingsInspected) * 100).toFixed(1)
                : 0}%)
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-containers">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Criadouros com Larvas</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{indicators.containersWithLarvae}</div>
            <p className="text-xs text-muted-foreground">
              Recipientes com presença de Aedes
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card data-testid="card-chart-foci">
          <CardHeader>
            <CardTitle>Focos por Tipo de Depósito</CardTitle>
            <CardDescription>
              Classificação PNCD dos depósitos com focos
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.fociByType && stats.fociByType.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.fociByType}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="depositType" className="text-muted-foreground" />
                  <YAxis className="text-muted-foreground" />
                  <Tooltip 
                    formatter={(value: number) => [`${value} focos`, "Quantidade"]}
                    labelFormatter={(label) => `Tipo ${label}`}
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))">
                    {stats.fociByType.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={DEPOSIT_COLORS[entry.depositType] || "hsl(var(--primary))"} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                <Bug className="h-12 w-12 mb-2 opacity-20" />
                <p>Nenhum foco registrado</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-chart-treatments">
          <CardHeader>
            <CardTitle>Tratamentos Realizados</CardTitle>
            <CardDescription>
              Distribuição dos tipos de tratamento focal
            </CardDescription>
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
                    outerRadius={100}
                    fill="hsl(var(--primary))"
                    dataKey="count"
                    nameKey="treatmentType"
                  >
                    {stats.treatmentsByType.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={TREATMENT_COLORS[entry.treatmentType] || `hsl(var(--chart-${(index % 5) + 1}))`} 
                      />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                <Shield className="h-12 w-12 mb-2 opacity-20" />
                <p>Nenhum tratamento registrado</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Legenda de Classificação LIRAa</CardTitle>
          <CardDescription>
            Estratificação de risco baseada no Índice de Infestação Predial (IIP)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3 p-3 rounded-lg border border-green-500 dark:border-green-600">
              <div className="w-4 h-4 rounded-full bg-green-500 dark:bg-green-600" />
              <div>
                <div className="font-semibold text-sm">Baixo Risco</div>
                <div className="text-xs text-muted-foreground">IIP &lt; 1%</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg border border-yellow-500 dark:border-yellow-600">
              <div className="w-4 h-4 rounded-full bg-yellow-500 dark:bg-yellow-600" />
              <div>
                <div className="font-semibold text-sm">Médio Risco</div>
                <div className="text-xs text-muted-foreground">IIP 1% - 3,9%</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg border border-orange-500 dark:border-orange-600">
              <div className="w-4 h-4 rounded-full bg-orange-500 dark:bg-orange-600" />
              <div>
                <div className="font-semibold text-sm">Alto Risco</div>
                <div className="text-xs text-muted-foreground">IIP 3,9% - 4%</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg border border-red-500 dark:border-red-600">
              <div className="w-4 h-4 rounded-full bg-red-500 dark:bg-red-600" />
              <div>
                <div className="font-semibold text-sm">Muito Alto Risco</div>
                <div className="text-xs text-muted-foreground">IIP &ge; 4%</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
