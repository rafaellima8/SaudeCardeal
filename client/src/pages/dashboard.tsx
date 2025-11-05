import { useQuery } from "@tanstack/react-query";
import { StatCard } from "@/components/stat-card";
import { DashboardCharts } from "@/components/dashboard-charts";
import { Users, Calendar, AlertCircle, Activity } from "lucide-react";

interface DashboardStats {
  appointmentsToday: number;
  queueWaiting: number;
  lowStockCount: number;
  totalCitizens: number;
}

export default function Dashboard() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ['/api/stats/dashboard'],
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Carregando dados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Visão geral dos atendimentos municipais</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Atendimentos Hoje"
          value={stats?.appointmentsToday || 0}
          icon={Activity}
          description="Consultas e procedimentos agendados"
        />
        <StatCard
          title="Fila de Espera"
          value={stats?.queueWaiting || 0}
          icon={Calendar}
          description="Aguardando atendimento"
        />
        <StatCard
          title="Estoque Crítico"
          value={stats?.lowStockCount || 0}
          icon={AlertCircle}
          description="Medicamentos abaixo do mínimo"
        />
        <StatCard
          title="Pacientes Cadastrados"
          value={stats?.totalCitizens || 0}
          icon={Users}
          description="Total de cidadãos"
        />
      </div>

      <DashboardCharts />
    </div>
  );
}
