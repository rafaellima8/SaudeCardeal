import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, TrendingUp, Users, Clock, Activity, Pill } from "lucide-react";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import type { HealthUnit } from "@shared/schema";

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4'];

interface DashboardStats {
  appointmentsToday: number;
  queueWaiting: number;
  lowStockCount: number;
  totalCitizens: number;
}

export default function Indicators() {
  const [selectedPeriod, setSelectedPeriod] = useState("30");
  const [selectedUnit, setSelectedUnit] = useState("all");

  const { data: units = [] } = useQuery<HealthUnit[]>({
    queryKey: ["/api/units"],
  });

  const { data: dashboardStats } = useQuery<DashboardStats>({
    queryKey: ["/api/stats/dashboard", selectedUnit !== "all" ? selectedUnit : undefined],
    queryFn: async () => {
      const url = selectedUnit !== "all" 
        ? `/api/stats/dashboard?unitId=${selectedUnit}` 
        : "/api/stats/dashboard";
      const response = await fetch(url);
      if (!response.ok) throw new Error("Erro ao carregar estatísticas");
      return response.json();
    },
  });

  const { data: reports } = useQuery({
    queryKey: ["/api/reports", selectedPeriod, selectedUnit !== "all" ? selectedUnit : undefined],
    queryFn: async () => {
      const url = selectedUnit !== "all" 
        ? `/api/reports?period=${selectedPeriod}&unitId=${selectedUnit}` 
        : `/api/reports?period=${selectedPeriod}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Erro ao carregar relatórios");
      return response.json();
    },
  });

  const operationalKPIs = [
    {
      title: "Atendimentos Hoje",
      value: dashboardStats?.appointmentsToday || 0,
      icon: Activity,
      description: "Agendamentos do dia",
      color: "text-green-600",
    },
    {
      title: "Fila de Espera",
      value: dashboardStats?.queueWaiting || 0,
      icon: Clock,
      description: "Pacientes aguardando",
      color: "text-blue-600",
    },
    {
      title: "Total de Pacientes",
      value: dashboardStats?.totalCitizens || 0,
      icon: Users,
      description: "Cadastrados no sistema",
      color: "text-purple-600",
    },
    {
      title: "Estoque Crítico",
      value: dashboardStats?.lowStockCount || 0,
      icon: Pill,
      description: "Medicamentos abaixo do mínimo",
      color: "text-red-600",
    },
  ];

  const clinicalKPIs = [
    {
      title: "Consultas Realizadas",
      value: reports?.summary?.totalConsultations || 0,
      period: `Últimos ${selectedPeriod} dias`,
    },
    {
      title: "Prescrições Emitidas",
      value: reports?.summary?.totalPrescriptions || 0,
      period: `Últimos ${selectedPeriod} dias`,
    },
    {
      title: "Exames Solicitados",
      value: reports?.summary?.totalExams || 0,
      period: `Últimos ${selectedPeriod} dias`,
    },
    {
      title: "Solicitações TFD",
      value: reports?.summary?.tfdRequests || 0,
      period: `Últimos ${selectedPeriod} dias`,
    },
  ];

  const managementKPIs = [
    {
      title: "Total de Pacientes",
      value: reports?.summary?.totalPatients || 0,
      description: "Pacientes cadastrados",
    },
    {
      title: "Novos Cadastros",
      value: reports?.summary?.newPatients || 0,
      description: `Últimos ${selectedPeriod} dias`,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Indicadores e KPIs</h1>
          <p className="text-muted-foreground">Métricas operacionais, clínicas e de gestão</p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
              <SelectItem value="365">Último ano</SelectItem>
            </SelectContent>
          </Select>
          <Combobox
            value={selectedUnit}
            onValueChange={setSelectedUnit}
            options={[
              { value: "all", label: "Todas as unidades" },
              ...units.map((unit) => ({
                value: unit.id,
                label: unit.name
              }))
            ]}
            placeholder="Selecionar unidade"
            searchPlaceholder="Buscar unidade..."
            emptyMessage="Nenhuma unidade encontrada"
            className="w-[200px]"
          />
        </div>
      </div>

      <Tabs defaultValue="operational" className="space-y-4">
        <TabsList>
          <TabsTrigger value="operational">Operacionais</TabsTrigger>
          <TabsTrigger value="clinical">Clínicos</TabsTrigger>
          <TabsTrigger value="management">Gestão</TabsTrigger>
        </TabsList>

        <TabsContent value="operational" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {operationalKPIs.map((kpi, index) => (
              <Card key={index}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
                  <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{kpi.value}</div>
                  <p className="text-xs text-muted-foreground">{kpi.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Consultas por Tipo</CardTitle>
                <CardDescription>Distribuição dos atendimentos</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={reports?.consultationsByType || []}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ type, percent }) => `${type}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {(reports?.consultationsByType || []).map((_: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Distribuição Etária</CardTitle>
                <CardDescription>Pacientes por faixa etária</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={reports?.ageDistribution || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="range" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="clinical" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {clinicalKPIs.map((kpi, index) => (
              <Card key={index}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{kpi.value}</div>
                  <p className="text-xs text-muted-foreground">{kpi.period}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Top 5 Diagnósticos</CardTitle>
                <CardDescription>Diagnósticos mais frequentes</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={reports?.topDiagnoses || []} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="diagnosis" type="category" width={150} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Medicamentos Mais Prescritos</CardTitle>
                <CardDescription>Top 5 medicamentos</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={reports?.medicationUsage || []} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="medication" type="category" width={150} />
                    <Tooltip />
                    <Bar dataKey="quantity" fill="#8b5cf6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="management" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {managementKPIs.map((kpi, index) => (
              <Card key={index}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
                  <BarChart3 className="h-4 w-4 text-purple-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{kpi.value}</div>
                  <p className="text-xs text-muted-foreground">{kpi.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Resumo do Período</CardTitle>
              <CardDescription>Métricas consolidadas dos últimos {selectedPeriod} dias</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="flex flex-col space-y-2">
                  <span className="text-sm font-medium text-muted-foreground">Total de Consultas</span>
                  <span className="text-3xl font-bold">{reports?.summary?.totalConsultations || 0}</span>
                </div>
                <div className="flex flex-col space-y-2">
                  <span className="text-sm font-medium text-muted-foreground">Prescrições</span>
                  <span className="text-3xl font-bold">{reports?.summary?.totalPrescriptions || 0}</span>
                </div>
                <div className="flex flex-col space-y-2">
                  <span className="text-sm font-medium text-muted-foreground">Exames</span>
                  <span className="text-3xl font-bold">{reports?.summary?.totalExams || 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
