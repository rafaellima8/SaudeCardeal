import { StatCard } from "@/components/stat-card";
import { DashboardCharts } from "@/components/dashboard-charts";
import { Users, Calendar, AlertCircle, Activity } from "lucide-react";

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Visão geral dos atendimentos municipais</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Atendimentos Hoje"
          value="127"
          icon={Activity}
          description="52 consultas, 45 procedimentos, 30 visitas"
          trend={{ value: 12, isPositive: true }}
        />
        <StatCard
          title="Fila de Espera"
          value="23"
          icon={Calendar}
          description="Aguardando atendimento"
          trend={{ value: 5, isPositive: false }}
        />
        <StatCard
          title="Estoque Crítico"
          value="8"
          icon={AlertCircle}
          description="Medicamentos abaixo do mínimo"
        />
        <StatCard
          title="Pacientes Cadastrados"
          value="12.547"
          icon={Users}
          description="Total de cidadãos"
          trend={{ value: 3, isPositive: true }}
        />
      </div>

      <DashboardCharts />
    </div>
  );
}
