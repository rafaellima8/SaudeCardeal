import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../../client/src/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Activity, Home, AlertTriangle, TrendingUp } from "lucide-react";
import type { AceStatsResponse } from "../../server/schemas/stats.schema";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export default function AceDashboard() {
  const { data: stats, isLoading } = useQuery<AceStatsResponse>({
    queryKey: ['/api/ace/stats'],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Dashboard ACE</h1>
          <p className="text-muted-foreground">Agente Comunitário de Saúde - Estatísticas e Indicadores</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card data-testid="card-total-visits">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Visitas</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-visits">
              {stats?.total_visits || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Visitas domiciliares realizadas
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-total-foci">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Focos Vetoriais</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-foci">
              {stats?.total_foci || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Focos identificados
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-dwellings">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Imóveis Cadastrados</CardTitle>
            <Home className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-dwellings-count">
              {stats?.dwellings_by_status?.reduce((acc, item) => acc + item.count, 0) || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Total de domicílios
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-recent-activity">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Atividade Recente</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-activity-7days">
              {stats?.recent_activity?.last_7_days || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Últimos 7 dias ({stats?.recent_activity?.last_30_days || 0} em 30 dias)
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card data-testid="card-chart-dwellings">
          <CardHeader>
            <CardTitle>Imóveis por Status</CardTitle>
            <CardDescription>
              Classificação dos domicílios cadastrados
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.dwellings_by_status && stats.dwellings_by_status.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.dwellings_by_status}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="status" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#0088FE" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                Nenhum dado disponível
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-chart-visits">
          <CardHeader>
            <CardTitle>Visitas por Tipo</CardTitle>
            <CardDescription>
              Distribuição dos tipos de visita realizadas
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.visits_by_type && stats.visits_by_type.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={stats.visits_by_type}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.type}: ${entry.count}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {stats.visits_by_type.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                Nenhum dado disponível
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
