import { useQuery } from "@tanstack/react-query";
import { StatCard } from "@/components/stat-card";
import { DashboardCharts } from "@/components/dashboard-charts";
import { Users, Calendar, AlertCircle, Activity, Home, MapPin } from "lucide-react";
import { useCurrentUser } from "@/hooks/use-current-user";

interface DashboardStats {
  appointmentsToday: number;
  queueWaiting: number;
  lowStockCount: number;
  totalCitizens: number;
}

interface ACEStats {
  totalVisits: number;
  focosVetoriais: number;
  totalDwellings: number;
  visitasRecentes: number;
}

export default function Dashboard() {
  const { user } = useCurrentUser();
  const isACS = user?.role === 'acs';

  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ['/api/stats/dashboard'],
    enabled: !isACS,
  });

  const { data: aceStats, isLoading: aceLoading } = useQuery<ACEStats>({
    queryKey: ['/api/ace/stats'],
    enabled: isACS,
  });

  if (isLoading || aceLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Carregando dados...</p>
        </div>
      </div>
    );
  }

  if (isACS) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard - Agente Comunitário</h1>
          <p className="text-muted-foreground mt-1">Visão geral das suas atividades</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Visitas Realizadas"
            value={aceStats?.totalVisits || 0}
            icon={Activity}
            description="Total de visitas domiciliares"
            data-testid="stat-visitas"
          />
          <StatCard
            title="Focos Vetoriais"
            value={aceStats?.focosVetoriais || 0}
            icon={AlertCircle}
            description="Focos identificados"
            data-testid="stat-focos"
          />
          <StatCard
            title="Imóveis Cadastrados"
            value={aceStats?.totalDwellings || 0}
            icon={Home}
            description="Total de domicílios"
            data-testid="stat-imoveis"
          />
          <StatCard
            title="Visitas Recentes"
            value={aceStats?.visitasRecentes || 0}
            icon={MapPin}
            description="Últimos 7 dias"
            data-testid="stat-recentes"
          />
        </div>

        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-xl font-semibold mb-4">Acesso Rápido</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a 
              href="/territorio" 
              className="flex items-center gap-3 p-4 rounded-md border hover-elevate active-elevate-2"
              data-testid="link-territorio"
            >
              <MapPin className="h-6 w-6 text-primary" />
              <div>
                <div className="font-medium">Gestão Territorial</div>
                <div className="text-sm text-muted-foreground">Cadastro de imóveis e famílias</div>
              </div>
            </a>
            <a 
              href="/ace" 
              className="flex items-center gap-3 p-4 rounded-md border hover-elevate active-elevate-2"
              data-testid="link-ace"
            >
              <Activity className="h-6 w-6 text-primary" />
              <div>
                <div className="font-medium">ACE Dashboard</div>
                <div className="text-sm text-muted-foreground">Relatórios e indicadores</div>
              </div>
            </a>
          </div>
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
          data-testid="stat-atendimentos"
        />
        <StatCard
          title="Fila de Espera"
          value={stats?.queueWaiting || 0}
          icon={Calendar}
          description="Aguardando atendimento"
          data-testid="stat-fila"
        />
        <StatCard
          title="Estoque Crítico"
          value={stats?.lowStockCount || 0}
          icon={AlertCircle}
          description="Medicamentos abaixo do mínimo"
          data-testid="stat-estoque"
        />
        <StatCard
          title="Pacientes Cadastrados"
          value={stats?.totalCitizens || 0}
          icon={Users}
          description="Total de cidadãos"
          data-testid="stat-pacientes"
        />
      </div>

      <DashboardCharts />
    </div>
  );
}
