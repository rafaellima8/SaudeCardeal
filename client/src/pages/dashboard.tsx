import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
  AreaChart,
  Area,
} from "recharts";
import {
  Pill,
  Package,
  Users,
  Truck,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Activity,
  ClipboardList,
  Heart,
  Baby,
  FileText,
  Calendar,
  CheckCircle,
  Clock,
  XCircle,
  Home,
  MapPin,
} from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/hooks/use-current-user";
import { StatCard } from "@/components/stat-card";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d"];

interface KPICardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ReactNode;
  trend?: { value: number; direction: "up" | "down" | "neutral" };
  variant?: "default" | "success" | "warning" | "danger";
}

function KPICard({ title, value, description, icon, trend, variant = "default" }: KPICardProps) {
  const variantStyles = {
    default: "border-border",
    success: "border-green-200 dark:border-green-800",
    warning: "border-amber-200 dark:border-amber-800",
    danger: "border-red-200 dark:border-red-800",
  };

  return (
    <Card className={cn("hover-elevate", variantStyles[variant])}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
        {trend && (
          <div className={cn(
            "flex items-center text-xs mt-1",
            trend.direction === "up" && "text-green-600",
            trend.direction === "down" && "text-red-600",
            trend.direction === "neutral" && "text-muted-foreground"
          )}>
            {trend.direction === "up" && <TrendingUp className="h-3 w-3 mr-1" />}
            {trend.direction === "down" && <TrendingDown className="h-3 w-3 mr-1" />}
            <span>{trend.value}% vs mês anterior</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PrescriptionsDashboard() {
  const { data: prescriptions = [], isLoading: loadingPrescriptions } = useQuery<any[]>({
    queryKey: ["/api/prescriptions"],
  });

  const { data: dispensations = [] } = useQuery<any[]>({
    queryKey: ["/api/pharmacy/dispensations"],
  });

  const { data: renameCatalog = [] } = useQuery<any[]>({
    queryKey: ["/api/rename-catalog"],
  });

  const thisMonth = prescriptions.filter(p => {
    const date = new Date(p.createdAt);
    return date >= startOfMonth(new Date()) && date <= endOfMonth(new Date());
  });

  const lastMonth = prescriptions.filter(p => {
    const date = new Date(p.createdAt);
    const lastMonthStart = startOfMonth(subDays(new Date(), 30));
    const lastMonthEnd = endOfMonth(subDays(new Date(), 30));
    return date >= lastMonthStart && date <= lastMonthEnd;
  });

  const trend = lastMonth.length > 0 
    ? Math.round(((thisMonth.length - lastMonth.length) / lastMonth.length) * 100)
    : 0;

  const controlledMeds = prescriptions.filter(p => p.isControlled).length;
  const dispensed = dispensations.length;

  const medicationsByType = prescriptions.reduce((acc: any, p: any) => {
    const route = p.administrationRoute || "oral";
    acc[route] = (acc[route] || 0) + 1;
    return acc;
  }, {});

  const chartData = Object.entries(medicationsByType).map(([name, value]) => ({
    name: name === "oral" ? "Oral" : 
          name === "injectable" ? "Injetável" :
          name === "topical" ? "Tópica" :
          name === "inhalation" ? "Inalatória" : name,
    value,
  }));

  const weeklyData = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i);
    const count = prescriptions.filter(p => {
      const pDate = new Date(p.createdAt);
      return pDate.toDateString() === date.toDateString();
    }).length;
    return {
      name: format(date, "EEE", { locale: ptBR }),
      prescricoes: count,
    };
  });

  if (loadingPrescriptions) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Prescrições (Mês)"
          value={thisMonth.length}
          description={`Total geral: ${prescriptions.length}`}
          icon={<ClipboardList className="h-4 w-4 text-muted-foreground" />}
          trend={{ value: Math.abs(trend), direction: trend >= 0 ? "up" : "down" }}
        />
        <KPICard
          title="Controlados"
          value={controlledMeds}
          description="Portaria 344/98"
          icon={<AlertTriangle className="h-4 w-4 text-amber-500" />}
          variant="warning"
        />
        <KPICard
          title="Dispensados"
          value={dispensed}
          description="Medicamentos entregues"
          icon={<CheckCircle className="h-4 w-4 text-green-500" />}
          variant="success"
        />
        <KPICard
          title="Catálogo RENAME"
          value={renameCatalog.length}
          description="Medicamentos cadastrados"
          icon={<Pill className="h-4 w-4 text-muted-foreground" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Prescrições por Dia (Últimos 7 dias)</CardTitle>
            <CardDescription>Volume de prescrições emitidas</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="prescricoes" stroke="#8884d8" fill="#8884d8" fillOpacity={0.3} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Por Via de Administração</CardTitle>
            <CardDescription>Distribuição das prescrições</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {chartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function PharmacyDashboard() {
  const { data: medicationStock = [], isLoading: loadingStock } = useQuery<any[]>({
    queryKey: ["/api/pharmacy/stock"],
  });

  const { data: lowStock = [] } = useQuery<any[]>({
    queryKey: ["/api/pharmacy/stock/low"],
  });

  const { data: expiringStock = [] } = useQuery<any[]>({
    queryKey: ["/api/pharmacy/stock/expiring"],
  });

  const { data: diaperStock = [] } = useQuery<any[]>({
    queryKey: ["/api/pharmacy/diaper-stock"],
  });

  const { data: lowDiaperStock = [] } = useQuery<any[]>({
    queryKey: ["/api/pharmacy/diaper-stock/low"],
  });

  const totalMedications = medicationStock.reduce((acc: number, item: any) => acc + (item.currentQuantity || 0), 0);
  const totalDiapers = diaperStock.reduce((acc: number, item: any) => acc + (item.currentQuantity || 0), 0);

  const diaperBySize = diaperStock.reduce((acc: any, item: any) => {
    acc[item.size] = (acc[item.size] || 0) + (item.currentQuantity || 0);
    return acc;
  }, {});

  const diaperChartData = Object.entries(diaperBySize).map(([size, quantity]) => ({
    name: size,
    quantidade: quantity,
  }));

  if (loadingStock) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Medicamentos"
          value={totalMedications.toLocaleString("pt-BR")}
          description={`${medicationStock.length} itens cadastrados`}
          icon={<Pill className="h-4 w-4 text-muted-foreground" />}
        />
        <KPICard
          title="Estoque Baixo"
          value={lowStock.length}
          description="Itens abaixo do mínimo"
          icon={<AlertTriangle className="h-4 w-4 text-amber-500" />}
          variant={lowStock.length > 0 ? "warning" : "default"}
        />
        <KPICard
          title="Vencendo em 30 dias"
          value={expiringStock.length}
          description="Itens próximos ao vencimento"
          icon={<Calendar className="h-4 w-4 text-red-500" />}
          variant={expiringStock.length > 0 ? "danger" : "default"}
        />
        <KPICard
          title="Total Fraldas"
          value={totalDiapers.toLocaleString("pt-BR")}
          description={`${lowDiaperStock.length} tamanhos em baixa`}
          icon={<Baby className="h-4 w-4 text-muted-foreground" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Estoque de Fraldas por Tamanho</CardTitle>
            <CardDescription>Quantidade disponível</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={diaperChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="quantidade" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Alertas de Estoque
            </CardTitle>
            <CardDescription>Itens que requerem atenção</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[250px]">
              <div className="space-y-3">
                {lowStock.length === 0 && expiringStock.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                    <p>Nenhum alerta de estoque</p>
                  </div>
                ) : (
                  <>
                    {lowStock.slice(0, 5).map((item: any) => (
                      <div key={item.id} className="flex items-center justify-between p-2 rounded-lg bg-amber-50 dark:bg-amber-950">
                        <div>
                          <p className="font-medium text-sm">{item.name}</p>
                          <p className="text-xs text-muted-foreground">Estoque baixo</p>
                        </div>
                        <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                          {item.currentQuantity} un.
                        </Badge>
                      </div>
                    ))}
                    {expiringStock.slice(0, 5).map((item: any) => (
                      <div key={item.id} className="flex items-center justify-between p-2 rounded-lg bg-red-50 dark:bg-red-950">
                        <div>
                          <p className="font-medium text-sm">{item.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Vence em {format(new Date(item.expirationDate), "dd/MM/yyyy")}
                          </p>
                        </div>
                        <Badge variant="secondary" className="bg-red-100 text-red-800">
                          Vencendo
                        </Badge>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SocialAssistanceDashboard() {
  const { data: stats, isLoading: loadingStats } = useQuery<any>({
    queryKey: ["/api/social-assistance/stats"],
  });

  const { data: kpis } = useQuery<any>({
    queryKey: ["/api/social-assistance/reports/kpis"],
  });

  const { data: forecast = [] } = useQuery<any[]>({
    queryKey: ["/api/social-assistance/forecast"],
  });

  if (loadingStats) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  const forecastData = forecast.map((item: any) => ({
    name: item.size,
    previsao: item.forecastQuantity || 0,
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Beneficiários Ativos"
          value={kpis?.totalBeneficiaries || stats?.beneficiaries || 0}
          description="Famílias cadastradas"
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
        />
        <KPICard
          title="Autorizações (Mês)"
          value={kpis?.activeAuthorizations || stats?.authorizations || 0}
          description="Autorizações vigentes"
          icon={<FileText className="h-4 w-4 text-green-500" />}
          variant="success"
        />
        <KPICard
          title="Entregas (Mês)"
          value={kpis?.deliveriesThisMonth || stats?.deliveries || 0}
          description="Entregas realizadas"
          icon={<Package className="h-4 w-4 text-muted-foreground" />}
        />
        <KPICard
          title="Pendentes"
          value={stats?.pendingRequests || 0}
          description="Solicitações aguardando"
          icon={<Clock className="h-4 w-4 text-amber-500" />}
          variant={stats?.pendingRequests > 0 ? "warning" : "default"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Previsão de Demanda</CardTitle>
            <CardDescription>Estimativa para próximo mês por tamanho</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={forecastData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="previsao" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status das Solicitações</CardTitle>
            <CardDescription>Distribuição por status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-500" />
                  <span className="text-sm">Pendentes</span>
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={30} className="w-24" />
                  <span className="text-sm font-medium">{stats?.pendingRequests || 0}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Aprovadas</span>
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={50} className="w-24" />
                  <span className="text-sm font-medium">{stats?.approvedRequests || 0}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-500" />
                  <span className="text-sm">Rejeitadas</span>
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={20} className="w-24" />
                  <span className="text-sm font-medium">{stats?.rejectedRequests || 0}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function TFDDashboard() {
  const { data: summary, isLoading: loadingSummary } = useQuery<any>({
    queryKey: ["/api/tfd/summary"],
  });

  const { data: trips = [] } = useQuery<any[]>({
    queryKey: ["/api/tfd/trips"],
  });

  const { data: vehicles = [] } = useQuery<any[]>({
    queryKey: ["/api/tfd/vehicles"],
  });

  if (loadingSummary) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  const activeTrips = trips.filter((t: any) => t.status === "em_andamento" || t.status === "programada").length;
  const completedTrips = trips.filter((t: any) => t.status === "concluida").length;
  const availableVehicles = vehicles.filter((v: any) => v.status === "disponivel").length;

  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const date = subDays(new Date(), (5 - i) * 30);
    return {
      name: format(date, "MMM", { locale: ptBR }),
      viagens: Math.floor(Math.random() * 20) + 5,
      pacientes: Math.floor(Math.random() * 40) + 10,
    };
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Solicitações TFD"
          value={summary?.totalRequests || 0}
          description="Total de solicitações"
          icon={<FileText className="h-4 w-4 text-muted-foreground" />}
        />
        <KPICard
          title="Viagens Ativas"
          value={activeTrips}
          description={`${completedTrips} concluídas este mês`}
          icon={<Truck className="h-4 w-4 text-blue-500" />}
        />
        <KPICard
          title="Veículos Disponíveis"
          value={availableVehicles}
          description={`De ${vehicles.length} total`}
          icon={<Truck className="h-4 w-4 text-green-500" />}
          variant="success"
        />
        <KPICard
          title="Km Percorridos"
          value={summary?.totalKm?.toLocaleString("pt-BR") || 0}
          description="Este mês"
          icon={<Activity className="h-4 w-4 text-muted-foreground" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Viagens e Pacientes</CardTitle>
            <CardDescription>Últimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="viagens" stroke="#8884d8" name="Viagens" />
                <Line type="monotone" dataKey="pacientes" stroke="#82ca9d" name="Pacientes" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status da Frota</CardTitle>
            <CardDescription>Situação dos veículos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {vehicles.slice(0, 5).map((vehicle: any) => (
                <div key={vehicle.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <Truck className={cn(
                      "h-5 w-5",
                      vehicle.status === "disponivel" && "text-green-500",
                      vehicle.status === "em_viagem" && "text-blue-500",
                      vehicle.status === "manutencao" && "text-amber-500"
                    )} />
                    <div>
                      <p className="font-medium text-sm">{vehicle.plate}</p>
                      <p className="text-xs text-muted-foreground">{vehicle.model}</p>
                    </div>
                  </div>
                  <Badge variant={
                    vehicle.status === "disponivel" ? "default" :
                    vehicle.status === "em_viagem" ? "secondary" : "outline"
                  }>
                    {vehicle.status === "disponivel" ? "Disponível" :
                     vehicle.status === "em_viagem" ? "Em Viagem" : "Manutenção"}
                  </Badge>
                </div>
              ))}
              {vehicles.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Truck className="h-12 w-12 mx-auto mb-2" />
                  <p>Nenhum veículo cadastrado</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ACSDashboard() {
  const { data: aceStats } = useQuery<any>({
    queryKey: ['/api/ace/stats'],
  });

  return (
    <div className="space-y-6">
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
          icon={AlertTriangle}
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

export default function Dashboard() {
  const { user } = useCurrentUser();
  const isACS = user?.role === 'acs';

  if (isACS) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Activity className="h-8 w-8" />
            Dashboard - Agente Comunitário
          </h1>
          <p className="text-muted-foreground mt-1">
            Visão geral das suas atividades
          </p>
        </div>
        <ACSDashboard />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Activity className="h-8 w-8" />
          Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">
          Visão geral do sistema de saúde municipal
        </p>
      </div>

      <Tabs defaultValue="prescriptions" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="prescriptions" data-testid="tab-prescriptions">
            <Pill className="h-4 w-4 mr-2" />
            Prescrições
          </TabsTrigger>
          <TabsTrigger value="pharmacy" data-testid="tab-pharmacy">
            <Package className="h-4 w-4 mr-2" />
            Farmácia
          </TabsTrigger>
          <TabsTrigger value="social" data-testid="tab-social">
            <Heart className="h-4 w-4 mr-2" />
            Assistência Social
          </TabsTrigger>
          <TabsTrigger value="tfd" data-testid="tab-tfd">
            <Truck className="h-4 w-4 mr-2" />
            TFD
          </TabsTrigger>
        </TabsList>

        <TabsContent value="prescriptions" className="mt-6">
          <PrescriptionsDashboard />
        </TabsContent>

        <TabsContent value="pharmacy" className="mt-6">
          <PharmacyDashboard />
        </TabsContent>

        <TabsContent value="social" className="mt-6">
          <SocialAssistanceDashboard />
        </TabsContent>

        <TabsContent value="tfd" className="mt-6">
          <TFDDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
