import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, Search, MapPin, Calendar, User, FileText, Loader2, 
  Car, Users, Route, CheckCircle2, XCircle, Clock, AlertTriangle,
  Fuel, Gauge, Edit, Trash2, Play, Square, Download, Calculator,
  FileSpreadsheet, AlertCircle, BarChart3
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { HybridDateInput } from "@/components/ui/hybrid-date-input";
import { format } from "date-fns";

interface TFDRequest {
  id: string;
  citizenId: string;
  professionalId: string;
  unitId: string;
  originUnitId: string | null;
  tripId: string | null;
  destination: string;
  destinationMunicipality: string | null;
  destinationFacility: string | null;
  procedure: string | null;
  reason: string;
  reasonDetail: string | null;
  justification: string | null;
  requestDate: string;
  desiredDate: string | null;
  travelDate: string | null;
  returnDate: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'scheduled' | 'in_transit' | 'completed' | 'cancelled' | 'no_show';
  urgencyLevel: 'eletivo' | 'urgente' | 'emergencia';
  transportType: string | null;
  companion: boolean;
  companionJustification: string | null;
  companionName: string | null;
  companionCpf: string | null;
  companionCns: string | null;
  companionPhone: string | null;
  accompaniedBy: string | null;
  pernoite: boolean;
  pernoiteQuantity: number | null;
  pernoiteNotes: string | null;
  budgetVerified: boolean;
  approvedBy: string | null;
  approvedAt: string | null;
  approvalJustification: string | null;
  rejectedBy: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  observations: string | null;
  createdAt: string;
  updatedAt: string;
}

interface TFDVehicle {
  id: string;
  unitId: string;
  plate: string;
  model: string;
  brand: string;
  year: number;
  capacity: number;
  vehicleType: string;
  fuelType: string;
  currentKm: number;
  status: 'disponivel' | 'em_viagem' | 'manutencao' | 'inativo';
  active: boolean;
  observations: string | null;
}

interface TFDDriver {
  id: string;
  unitId: string;
  name: string;
  cpf: string;
  cnh: string;
  cnhCategory: string;
  cnhExpiry: string;
  phone: string;
  status: 'disponivel' | 'em_viagem' | 'ferias' | 'afastado' | 'inativo';
  active: boolean;
  observations: string | null;
}

interface TFDTrip {
  id: string;
  unitId: string;
  vehicleId: string;
  driverId: string;
  scheduledDeparture: string;
  scheduledReturn: string | null;
  actualDeparture: string | null;
  actualReturn: string | null;
  origin: string;
  destination: string;
  route: string | null;
  initialKm: number | null;
  finalKm: number | null;
  totalKm: number | null;
  fuelLiters: number | null;
  fuelCost: number | null;
  tollCost: number | null;
  totalCost: number | null;
  passengersCount: number;
  status: 'agendada' | 'em_andamento' | 'concluida' | 'cancelada';
  tripReport: string | null;
  incidents: string | null;
}

interface Citizen {
  id: string;
  name: string;
  cpf: string;
  cns: string;
}

interface Professional {
  id: string;
  name: string;
  specialty: string;
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'Pendente', variant: 'outline' },
  approved: { label: 'Aprovado', variant: 'default' },
  rejected: { label: 'Rejeitado', variant: 'destructive' },
  scheduled: { label: 'Agendado', variant: 'default' },
  in_transit: { label: 'Em Viagem', variant: 'secondary' },
  completed: { label: 'Concluído', variant: 'secondary' },
  cancelled: { label: 'Cancelado', variant: 'destructive' },
  no_show: { label: 'Não Compareceu', variant: 'destructive' },
};

const vehicleStatusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  disponivel: { label: 'Disponível', variant: 'default' },
  em_viagem: { label: 'Em Viagem', variant: 'secondary' },
  manutencao: { label: 'Manutenção', variant: 'outline' },
  inativo: { label: 'Inativo', variant: 'destructive' },
};

const tripStatusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  agendada: { label: 'Agendada', variant: 'outline' },
  em_andamento: { label: 'Em Andamento', variant: 'secondary' },
  concluida: { label: 'Concluída', variant: 'default' },
  cancelada: { label: 'Cancelada', variant: 'destructive' },
};

interface SigtapProcedure {
  codigo: string;
  nome: string;
  grupo: string;
  valorTotal: number;
  modalidade: string;
  descricao: string;
}

interface TfdSummary {
  totalRequests: number;
  completedRequests: number;
  totalTrips: number;
  completedTrips: number;
  totalPassengers: number;
  totalKm: number;
  totalCost: number;
  procedureBreakdown: Array<{
    codigo: string;
    nome: string;
    quantidade: number;
    valorTotal: number;
  }>;
}

interface TfdCalculation {
  procedures: Array<{
    codigo: string;
    nome: string;
    quantidade: number;
    valorUnitario: number;
    valorTotal: number;
  }>;
  totalValue: number;
}

function SusExportsTab() {
  const { toast } = useToast();
  const [exportType, setExportType] = useState<'bpa-i' | 'bpa-c' | 'apac'>('bpa-i');
  const [competencia, setCompetencia] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [distanceKm, setDistanceKm] = useState(100);
  const [hasCompanion, setHasCompanion] = useState(false);
  const [requiresOvernight, setRequiresOvernight] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const MIN_DISTANCE_KM = 50;

  const { data: sigtapCatalog = [] } = useQuery<SigtapProcedure[]>({
    queryKey: ['/api/tfd/sigtap'],
  });

  const { data: summary } = useQuery<TfdSummary>({
    queryKey: ['/api/tfd/summary'],
  });

  const { data: calculation, error: calculationError } = useQuery<TfdCalculation>({
    queryKey: ['/api/tfd/calculate', distanceKm, hasCompanion, requiresOvernight],
    queryFn: async () => {
      const response = await fetch('/api/tfd/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ distanceKm, hasCompanion, requiresOvernight }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erro ao calcular' }));
        throw new Error(errorData.error || 'Erro ao calcular');
      }
      return response.json();
    },
    enabled: distanceKm >= MIN_DISTANCE_KM,
    retry: false,
  });

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const [year, month] = competencia.split('-');
      const competenciaDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      
      // Map export type to endpoint path
      const endpointPath = exportType === 'bpa-i' ? 'bpa' : exportType === 'bpa-c' ? 'bpa-c' : 'apac';
      const endpoint = `/api/tfd/exports/${endpointPath}/pdf`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          competencia: competenciaDate.toISOString(),
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erro ao gerar formulário' }));
        throw new Error(errorData.error || 'Erro ao gerar formulário');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const formType = exportType === 'bpa-i' ? 'BPA-I' : exportType === 'bpa-c' ? 'BPA-C' : 'APAC';
      a.download = `Formulario_${formType}_${competencia.replace('-', '')}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: 'Formulário gerado',
        description: `Formulário ${formType} gerado com sucesso. Imprima e insira os dados no sistema DATASUS BPA.`,
      });
    } catch (error: any) {
      toast({ title: 'Erro ao gerar formulário', description: error.message, variant: 'destructive' });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Resumo TFD
          </CardTitle>
          <CardDescription>Estatísticas do módulo de transporte</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-muted rounded-md">
              <p className="text-sm text-muted-foreground">Solicitações</p>
              <p className="text-2xl font-bold">{summary?.totalRequests || 0}</p>
              <p className="text-xs text-muted-foreground">{summary?.completedRequests || 0} concluídas</p>
            </div>
            <div className="p-3 bg-muted rounded-md">
              <p className="text-sm text-muted-foreground">Viagens</p>
              <p className="text-2xl font-bold">{summary?.totalTrips || 0}</p>
              <p className="text-xs text-muted-foreground">{summary?.completedTrips || 0} concluídas</p>
            </div>
            <div className="p-3 bg-muted rounded-md">
              <p className="text-sm text-muted-foreground">Passageiros</p>
              <p className="text-2xl font-bold">{summary?.totalPassengers || 0}</p>
            </div>
            <div className="p-3 bg-muted rounded-md">
              <p className="text-sm text-muted-foreground">Km Percorridos</p>
              <p className="text-2xl font-bold">{summary?.totalKm?.toLocaleString('pt-BR') || 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Calculadora TFD
          </CardTitle>
          <CardDescription>Calcule valores SIGTAP para deslocamentos</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Distância (km) - mínimo {MIN_DISTANCE_KM}km</Label>
            <Input
              type="number"
              value={distanceKm}
              onChange={(e) => setDistanceKm(Number(e.target.value))}
              min={MIN_DISTANCE_KM}
              data-testid="input-distance"
            />
            {distanceKm > 0 && distanceKm < MIN_DISTANCE_KM && (
              <p className="text-xs text-destructive">
                Distância mínima: {MIN_DISTANCE_KM}km (Portaria SAS/MS nº 55/1999)
              </p>
            )}
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={hasCompanion}
                onChange={(e) => setHasCompanion(e.target.checked)}
                className="rounded border-input"
                data-testid="checkbox-companion"
              />
              Acompanhante
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={requiresOvernight}
                onChange={(e) => setRequiresOvernight(e.target.checked)}
                className="rounded border-input"
                data-testid="checkbox-overnight"
              />
              Pernoite
            </label>
          </div>

          {calculation && (
            <div className="border rounded-md p-3 space-y-2">
              <p className="text-sm font-medium">Procedimentos:</p>
              {calculation.procedures.map((proc, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span className="text-muted-foreground truncate max-w-[200px]" title={proc.nome}>
                    {proc.codigo}
                  </span>
                  <span>
                    {proc.quantidade}x R$ {proc.valorUnitario.toFixed(2)} = R$ {proc.valorTotal.toFixed(2)}
                  </span>
                </div>
              ))}
              <div className="border-t pt-2 flex justify-between font-medium">
                <span>Total SIGTAP</span>
                <span className="text-primary">R$ {calculation.totalValue.toFixed(2)}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Formulários para Impressão
          </CardTitle>
          <CardDescription>Gere formulários BPA-I e APAC preenchidos para impressão e inserção manual no sistema DATASUS BPA</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-4 mb-4">
            <div className="space-y-2">
              <Label>Tipo de Formulário</Label>
              <Select value={exportType} onValueChange={(v) => setExportType(v as 'bpa-i' | 'bpa-c' | 'apac')}>
                <SelectTrigger data-testid="select-export-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bpa-i">BPA-I (Individualizado)</SelectItem>
                  <SelectItem value="bpa-c">BPA-C (Consolidado)</SelectItem>
                  <SelectItem value="apac">APAC Laudo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Competência</Label>
              <Input
                type="month"
                value={competencia}
                onChange={(e) => setCompetencia(e.target.value)}
                data-testid="input-competencia"
              />
            </div>
            <div className="space-y-2">
              <Label>Data Início</Label>
              <HybridDateInput
                value={startDate ? new Date(startDate) : undefined}
                onChange={(d) => setStartDate(d ? format(d, "yyyy-MM-dd") : "")}
                data-testid="input-start-date"
              />
            </div>
            <div className="space-y-2">
              <Label>Data Fim</Label>
              <HybridDateInput
                value={endDate ? new Date(endDate) : undefined}
                onChange={(d) => setEndDate(d ? format(d, "yyyy-MM-dd") : "")}
                data-testid="input-end-date"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button
              onClick={handleExport}
              disabled={isExporting}
              data-testid="button-export"
            >
              {isExporting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileText className="mr-2 h-4 w-4" />
              )}
              Gerar Formulário PDF
            </Button>
          </div>

          <div className="mt-4 p-3 bg-muted/50 rounded-md">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium">Como funciona:</p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Este sistema gera formulários <strong>preenchidos</strong> em PDF para impressão</li>
                  <li>Imprima os formulários e insira os dados manualmente no sistema BPA do DATASUS</li>
                  <li><strong>BPA-I:</strong> Produção ambulatorial individualizada (por paciente)</li>
                  <li><strong>BPA-C:</strong> Produção ambulatorial consolidada (totais por procedimento)</li>
                  <li><strong>APAC:</strong> Laudo de solicitação/autorização para alta complexidade</li>
                  <li>Distância mínima TFD: 50km (Portaria SAS/MS nº 55/1999)</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Catálogo SIGTAP TFD
          </CardTitle>
          <CardDescription>Procedimentos disponíveis para Tratamento Fora do Domicílio</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Modalidade</TableHead>
                <TableHead className="text-right">Valor SP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sigtapCatalog.map((proc) => (
                <TableRow key={proc.codigo} data-testid={`row-sigtap-${proc.codigo}`}>
                  <TableCell className="font-mono">{proc.codigo}</TableCell>
                  <TableCell className="max-w-[300px] truncate" title={proc.nome}>{proc.nome}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{proc.modalidade}</Badge>
                  </TableCell>
                  <TableCell className="text-right">R$ {proc.valorTotal.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export default function TFD() {
  const [activeTab, setActiveTab] = useState("requests");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isNewRequestOpen, setIsNewRequestOpen] = useState(false);
  const [isNewVehicleOpen, setIsNewVehicleOpen] = useState(false);
  const [isNewDriverOpen, setIsNewDriverOpen] = useState(false);
  const [isNewTripOpen, setIsNewTripOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<TFDRequest | null>(null);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [completeTripDialogOpen, setCompleteTripDialogOpen] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<TFDTrip | null>(null);
  const [formCompanion, setFormCompanion] = useState(false);
  const [formPernoite, setFormPernoite] = useState(false);
  const [formDesiredDate, setFormDesiredDate] = useState<Date | undefined>();
  const [formCnhExpiry, setFormCnhExpiry] = useState<Date | undefined>();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: requests = [], isLoading: requestsLoading } = useQuery<TFDRequest[]>({
    queryKey: ['/api/tfd/requests', statusFilter],
  });

  const { data: vehicles = [], isLoading: vehiclesLoading } = useQuery<TFDVehicle[]>({
    queryKey: ['/api/tfd/vehicles'],
  });

  const { data: drivers = [], isLoading: driversLoading } = useQuery<TFDDriver[]>({
    queryKey: ['/api/tfd/drivers'],
  });

  const { data: trips = [], isLoading: tripsLoading } = useQuery<TFDTrip[]>({
    queryKey: ['/api/tfd/trips'],
  });

  const { data: citizens = [] } = useQuery<Citizen[]>({
    queryKey: ['/api/citizens'],
  });

  const { data: professionals = [] } = useQuery<Professional[]>({
    queryKey: ['/api/professionals'],
  });

  const createRequest = useMutation({
    mutationFn: async (data: any) => apiRequest('POST', '/api/tfd/requests', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/api/tfd/requests'] });
      setIsNewRequestOpen(false);
      toast({ title: "Solicitação criada", description: "A solicitação TFD foi criada com sucesso." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const approveRequest = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => 
      apiRequest('PATCH', `/api/tfd/requests/${id}`, { ...data, status: 'approved' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/api/tfd/requests'] });
      setApprovalDialogOpen(false);
      setSelectedRequest(null);
      toast({ title: "Solicitação aprovada", description: "A solicitação foi aprovada com sucesso." });
    },
  });

  const rejectRequest = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => 
      apiRequest('PATCH', `/api/tfd/requests/${id}`, { status: 'rejected', rejectionReason: reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/api/tfd/requests'] });
      setRejectDialogOpen(false);
      setSelectedRequest(null);
      toast({ title: "Solicitação rejeitada" });
    },
  });

  const scheduleRequest = useMutation({
    mutationFn: async ({ id, tripId }: { id: string; tripId: string }) => 
      apiRequest('PATCH', `/api/tfd/requests/${id}`, { status: 'scheduled', tripId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/api/tfd/requests'] });
      setScheduleDialogOpen(false);
      setSelectedRequest(null);
      toast({ title: "Solicitação agendada" });
    },
  });

  const createVehicle = useMutation({
    mutationFn: async (data: any) => apiRequest('POST', '/api/tfd/vehicles', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/api/tfd/vehicles'] });
      setIsNewVehicleOpen(false);
      toast({ title: "Veículo cadastrado" });
    },
  });

  const createDriver = useMutation({
    mutationFn: async (data: any) => apiRequest('POST', '/api/tfd/drivers', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/api/tfd/drivers'] });
      setIsNewDriverOpen(false);
      toast({ title: "Motorista cadastrado" });
    },
  });

  const createTrip = useMutation({
    mutationFn: async (data: any) => apiRequest('POST', '/api/tfd/trips', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/api/tfd/trips'] });
      setIsNewTripOpen(false);
      toast({ title: "Viagem criada" });
    },
  });

  const startTrip = useMutation({
    mutationFn: async ({ id, initialKm }: { id: string; initialKm: number }) => 
      apiRequest('PATCH', `/api/tfd/trips/${id}`, { status: 'em_andamento', initialKm }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/api/tfd/trips'] });
      qc.invalidateQueries({ queryKey: ['/api/tfd/vehicles'] });
      qc.invalidateQueries({ queryKey: ['/api/tfd/drivers'] });
      toast({ title: "Viagem iniciada" });
    },
  });

  const completeTrip = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => 
      apiRequest('PATCH', `/api/tfd/trips/${id}`, { ...data, status: 'concluida' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/api/tfd/trips'] });
      qc.invalidateQueries({ queryKey: ['/api/tfd/vehicles'] });
      qc.invalidateQueries({ queryKey: ['/api/tfd/drivers'] });
      qc.invalidateQueries({ queryKey: ['/api/tfd/requests'] });
      setCompleteTripDialogOpen(false);
      setSelectedTrip(null);
      toast({ title: "Viagem concluída" });
    },
  });

  const filteredRequests = requests.filter(req => {
    if (statusFilter !== 'all' && req.status !== statusFilter) return false;
    const searchLower = searchTerm.toLowerCase();
    const citizen = citizens.find(c => c.id === req.citizenId);
    return (
      citizen?.name.toLowerCase().includes(searchLower) ||
      req.destination.toLowerCase().includes(searchLower) ||
      req.procedure?.toLowerCase().includes(searchLower)
    );
  });

  const stats = {
    pending: requests.filter(r => r.status === 'pending').length,
    approved: requests.filter(r => r.status === 'approved').length,
    scheduled: requests.filter(r => r.status === 'scheduled').length,
    inTransit: requests.filter(r => r.status === 'in_transit').length,
    completed: requests.filter(r => r.status === 'completed').length,
    vehiclesAvailable: vehicles.filter(v => v.status === 'disponivel' && v.active).length,
    driversAvailable: drivers.filter(d => d.status === 'disponivel' && d.active).length,
    activeTrips: trips.filter(t => t.status === 'em_andamento').length,
  };

  const getCitizenName = (citizenId: string) => citizens.find(c => c.id === citizenId)?.name || 'Carregando...';
  const getVehicleName = (vehicleId: string) => {
    const v = vehicles.find(v => v.id === vehicleId);
    return v ? `${v.plate} - ${v.model}` : 'N/A';
  };
  const getDriverName = (driverId: string) => drivers.find(d => d.id === driverId)?.name || 'N/A';

  const handleRequestSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createRequest.mutate({
      citizenId: formData.get('citizenId'),
      professionalId: formData.get('professionalId'),
      destination: formData.get('destination'),
      destinationMunicipality: formData.get('destinationMunicipality'),
      reason: formData.get('reason'),
      reasonDetail: formData.get('reasonDetail'),
      procedure: formData.get('procedure'),
      justification: formData.get('justification'),
      urgencyLevel: formData.get('urgencyLevel') || 'eletivo',
      transportType: formData.get('transportType'),
      companion: formCompanion,
      companionJustification: formCompanion ? formData.get('companionJustification') : null,
      companionName: formCompanion ? formData.get('companionName') : null,
      companionCpf: formCompanion ? formData.get('companionCpf') : null,
      companionCns: formCompanion ? formData.get('companionCns') : null,
      companionPhone: formCompanion ? formData.get('companionPhone') : null,
      pernoite: formPernoite,
      pernoiteQuantity: formPernoite ? parseInt(formData.get('pernoiteQuantity') as string) || 1 : null,
      pernoiteNotes: formPernoite ? formData.get('pernoiteNotes') : null,
      desiredDate: formDesiredDate ? formDesiredDate.toISOString() : null,
      requestDate: new Date().toISOString(),
    });
    setFormDesiredDate(undefined);
  };

  const handleVehicleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createVehicle.mutate({
      plate: formData.get('plate'),
      model: formData.get('model'),
      brand: formData.get('brand'),
      year: parseInt(formData.get('year') as string),
      capacity: parseInt(formData.get('capacity') as string),
      vehicleType: formData.get('vehicleType'),
      fuelType: formData.get('fuelType'),
      currentKm: parseInt(formData.get('currentKm') as string) || 0,
    });
  };

  const handleDriverSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formCnhExpiry) {
      toast({ title: "Erro", description: "Validade CNH é obrigatória", variant: "destructive" });
      return;
    }
    const formData = new FormData(e.currentTarget);
    createDriver.mutate({
      name: formData.get('name'),
      cpf: formData.get('cpf'),
      cnh: formData.get('cnh'),
      cnhCategory: formData.get('cnhCategory'),
      cnhExpiry: formCnhExpiry.toISOString(),
      phone: formData.get('phone'),
    });
    setFormCnhExpiry(undefined);
  };

  const handleTripSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createTrip.mutate({
      vehicleId: formData.get('vehicleId'),
      driverId: formData.get('driverId'),
      origin: formData.get('origin'),
      destination: formData.get('destination'),
      scheduledDeparture: new Date(formData.get('scheduledDeparture') as string),
      scheduledReturn: formData.get('scheduledReturn') ? new Date(formData.get('scheduledReturn') as string) : null,
      route: formData.get('route'),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">TFD - Tratamento Fora do Domicílio</h1>
          <p className="text-muted-foreground mt-1">Gestão completa de transporte e viagens intermunicipais</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-xs font-medium">Pendentes</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-xs font-medium">Aprovados</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.approved}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-xs font-medium">Agendados</CardTitle>
            <Calendar className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.scheduled}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-xs font-medium">Em Viagem</CardTitle>
            <Route className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inTransit}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-xs font-medium">Concluídos</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-xs font-medium">Veículos Disp.</CardTitle>
            <Car className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.vehiclesAvailable}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-xs font-medium">Motoristas Disp.</CardTitle>
            <Users className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.driversAvailable}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-xs font-medium">Viagens Ativas</CardTitle>
            <Route className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeTrips}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="flex-wrap gap-1">
          <TabsTrigger value="requests" data-testid="tab-requests">Solicitações</TabsTrigger>
          <TabsTrigger value="vehicles" data-testid="tab-vehicles">Frota</TabsTrigger>
          <TabsTrigger value="drivers" data-testid="tab-drivers">Motoristas</TabsTrigger>
          <TabsTrigger value="trips" data-testid="tab-trips">Viagens</TabsTrigger>
          <TabsTrigger value="exports" data-testid="tab-exports">Exportações SUS</TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por paciente, destino..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                      data-testid="input-search-tfd"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filtrar status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="pending">Pendentes</SelectItem>
                      <SelectItem value="approved">Aprovados</SelectItem>
                      <SelectItem value="scheduled">Agendados</SelectItem>
                      <SelectItem value="in_transit">Em Viagem</SelectItem>
                      <SelectItem value="completed">Concluídos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={() => { setFormCompanion(false); setFormPernoite(false); setIsNewRequestOpen(true); }} data-testid="button-new-tfd">
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Solicitação
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {requestsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Paciente</TableHead>
                      <TableHead>Destino</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead>Urgência</TableHead>
                      <TableHead>Data Solicitação</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRequests.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          Nenhuma solicitação encontrada
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredRequests.map((request) => (
                        <TableRow key={request.id} data-testid={`row-tfd-${request.id}`}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              {getCitizenName(request.citizenId)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              {request.destination}
                            </div>
                          </TableCell>
                          <TableCell className="capitalize">{request.reason}</TableCell>
                          <TableCell>
                            <Badge variant={request.urgencyLevel === 'emergencia' ? 'destructive' : request.urgencyLevel === 'urgente' ? 'secondary' : 'outline'}>
                              {request.urgencyLevel}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {new Date(request.requestDate).toLocaleDateString('pt-BR')}
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusConfig[request.status]?.variant || 'outline'}>
                              {statusConfig[request.status]?.label || request.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {request.status === 'pending' && (
                                <>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => { setSelectedRequest(request); setApprovalDialogOpen(true); }}
                                    data-testid={`button-approve-${request.id}`}
                                  >
                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => { setSelectedRequest(request); setRejectDialogOpen(true); }}
                                    data-testid={`button-reject-${request.id}`}
                                  >
                                    <XCircle className="h-4 w-4 text-red-500" />
                                  </Button>
                                </>
                              )}
                              {request.status === 'approved' && (
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => { setSelectedRequest(request); setScheduleDialogOpen(true); }}
                                  data-testid={`button-schedule-${request.id}`}
                                >
                                  <Calendar className="h-4 w-4 text-blue-500" />
                                </Button>
                              )}
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => setSelectedRequest(request)}
                                data-testid={`button-view-${request.id}`}
                              >
                                Ver
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vehicles" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Frota de Veículos</CardTitle>
                  <CardDescription>Gerenciamento dos veículos disponíveis para TFD</CardDescription>
                </div>
                <Button onClick={() => setIsNewVehicleOpen(true)} data-testid="button-new-vehicle">
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Veículo
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {vehiclesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Placa</TableHead>
                      <TableHead>Modelo</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Capacidade</TableHead>
                      <TableHead>Km Atual</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vehicles.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          Nenhum veículo cadastrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      vehicles.map((vehicle) => (
                        <TableRow key={vehicle.id} data-testid={`row-vehicle-${vehicle.id}`}>
                          <TableCell className="font-mono font-bold">{vehicle.plate}</TableCell>
                          <TableCell>{vehicle.brand} {vehicle.model}</TableCell>
                          <TableCell className="capitalize">{vehicle.vehicleType.replace('_', ' ')}</TableCell>
                          <TableCell>{vehicle.capacity} lugares</TableCell>
                          <TableCell className="font-mono">{vehicle.currentKm.toLocaleString()} km</TableCell>
                          <TableCell>
                            <Badge variant={vehicleStatusConfig[vehicle.status]?.variant || 'outline'}>
                              {vehicleStatusConfig[vehicle.status]?.label || vehicle.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="drivers" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Motoristas</CardTitle>
                  <CardDescription>Cadastro e gerenciamento de motoristas</CardDescription>
                </div>
                <Button onClick={() => setIsNewDriverOpen(true)} data-testid="button-new-driver">
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Motorista
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {driversLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>CNH</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Validade CNH</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {drivers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          Nenhum motorista cadastrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      drivers.map((driver) => (
                        <TableRow key={driver.id} data-testid={`row-driver-${driver.id}`}>
                          <TableCell className="font-medium">{driver.name}</TableCell>
                          <TableCell className="font-mono">{driver.cnh}</TableCell>
                          <TableCell>{driver.cnhCategory}</TableCell>
                          <TableCell className="font-mono">
                            {new Date(driver.cnhExpiry).toLocaleDateString('pt-BR')}
                          </TableCell>
                          <TableCell>{driver.phone}</TableCell>
                          <TableCell>
                            <Badge variant={vehicleStatusConfig[driver.status]?.variant || 'outline'}>
                              {vehicleStatusConfig[driver.status]?.label || driver.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trips" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Viagens</CardTitle>
                  <CardDescription>Agendamento e controle de viagens</CardDescription>
                </div>
                <Button onClick={() => setIsNewTripOpen(true)} data-testid="button-new-trip">
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Viagem
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {tripsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Veículo</TableHead>
                      <TableHead>Motorista</TableHead>
                      <TableHead>Destino</TableHead>
                      <TableHead>Saída Prevista</TableHead>
                      <TableHead>Passageiros</TableHead>
                      <TableHead>Km Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trips.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                          Nenhuma viagem cadastrada
                        </TableCell>
                      </TableRow>
                    ) : (
                      trips.map((trip) => (
                        <TableRow key={trip.id} data-testid={`row-trip-${trip.id}`}>
                          <TableCell className="font-mono">{getVehicleName(trip.vehicleId)}</TableCell>
                          <TableCell>{getDriverName(trip.driverId)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-muted-foreground" />
                              {trip.destination}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {new Date(trip.scheduledDeparture).toLocaleString('pt-BR')}
                          </TableCell>
                          <TableCell>{trip.passengersCount}</TableCell>
                          <TableCell className="font-mono">
                            {trip.totalKm ? `${trip.totalKm} km` : '-'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={tripStatusConfig[trip.status]?.variant || 'outline'}>
                              {tripStatusConfig[trip.status]?.label || trip.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {trip.status === 'agendada' && (
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => {
                                    const km = prompt('Informe a quilometragem inicial:');
                                    if (km) startTrip.mutate({ id: trip.id, initialKm: parseInt(km) });
                                  }}
                                  data-testid={`button-start-trip-${trip.id}`}
                                >
                                  <Play className="h-4 w-4 text-green-500" />
                                </Button>
                              )}
                              {trip.status === 'em_andamento' && (
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => { setSelectedTrip(trip); setCompleteTripDialogOpen(true); }}
                                  data-testid={`button-complete-trip-${trip.id}`}
                                >
                                  <Square className="h-4 w-4 text-orange-500" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="exports" className="space-y-4">
          <SusExportsTab />
        </TabsContent>
      </Tabs>

      {/* New Request Dialog */}
      <Dialog open={isNewRequestOpen} onOpenChange={(open) => { setIsNewRequestOpen(open); if (!open) { setFormDesiredDate(undefined); setFormCompanion(false); setFormPernoite(false); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Solicitação TFD</DialogTitle>
            <DialogDescription>Preencha os dados para criar uma nova solicitação</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRequestSubmit}>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label>Paciente *</Label>
                <Select name="citizenId" required>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {citizens.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Profissional Solicitante *</Label>
                <Select name="professionalId" required>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {professionals.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Destino *</Label>
                <Input name="destination" placeholder="Ex: Salvador - BA" required />
              </div>
              <div className="space-y-2">
                <Label>Município de Destino</Label>
                <Input name="destinationMunicipality" placeholder="Ex: Salvador" />
              </div>
              <div className="space-y-2">
                <Label>Motivo *</Label>
                <Select name="reason" required>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="consulta">Consulta</SelectItem>
                    <SelectItem value="exame">Exame</SelectItem>
                    <SelectItem value="internacao">Internação</SelectItem>
                    <SelectItem value="quimioterapia">Quimioterapia</SelectItem>
                    <SelectItem value="radioterapia">Radioterapia</SelectItem>
                    <SelectItem value="hemodialise">Hemodiálise</SelectItem>
                    <SelectItem value="cirurgia">Cirurgia</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Urgência</Label>
                <Select name="urgencyLevel" defaultValue="eletivo">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="eletivo">Eletivo</SelectItem>
                    <SelectItem value="urgente">Urgente</SelectItem>
                    <SelectItem value="emergencia">Emergência</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Procedimento</Label>
                <Input name="procedure" placeholder="Ex: Ressonância Magnética" />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Justificativa Médica *</Label>
                <Textarea name="justification" placeholder="Descreva a justificativa médica" required rows={3} />
              </div>
              <div className="space-y-2">
                <Label>Data Desejada</Label>
                <HybridDateInput
                  value={formDesiredDate}
                  onChange={setFormDesiredDate}
                  data-testid="input-desired-date"
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo de Transporte</Label>
                <Select name="transportType">
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ambulancia">Ambulância</SelectItem>
                    <SelectItem value="van">Van</SelectItem>
                    <SelectItem value="onibus">Ônibus</SelectItem>
                    <SelectItem value="carro">Carro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Acompanhante</Label>
                <Select value={formCompanion ? "true" : "false"} onValueChange={(v) => setFormCompanion(v === "true")}>
                  <SelectTrigger data-testid="select-companion"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="false">Não</SelectItem>
                    <SelectItem value="true">Sim</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Pernoite</Label>
                <Select value={formPernoite ? "true" : "false"} onValueChange={(v) => setFormPernoite(v === "true")}>
                  <SelectTrigger data-testid="select-pernoite"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="false">Não</SelectItem>
                    <SelectItem value="true">Sim</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {formCompanion && (
                <>
                  <div className="col-span-2 border-t pt-4">
                    <p className="text-sm font-medium text-muted-foreground mb-3">Dados do Acompanhante</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Nome do Acompanhante *</Label>
                    <Input name="companionName" placeholder="Nome completo" required data-testid="input-companion-name" />
                  </div>
                  <div className="space-y-2">
                    <Label>CPF do Acompanhante</Label>
                    <Input name="companionCpf" placeholder="000.000.000-00" data-testid="input-companion-cpf" />
                  </div>
                  <div className="space-y-2">
                    <Label>CNS do Acompanhante</Label>
                    <Input name="companionCns" placeholder="Cartão Nacional de Saúde" data-testid="input-companion-cns" />
                  </div>
                  <div className="space-y-2">
                    <Label>Telefone do Acompanhante</Label>
                    <Input name="companionPhone" placeholder="(00) 00000-0000" data-testid="input-companion-phone" />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Justificativa do Acompanhante</Label>
                    <Input name="companionJustification" placeholder="Ex: Paciente menor de idade, necessita auxílio" data-testid="input-companion-justification" />
                  </div>
                </>
              )}

              {formPernoite && (
                <>
                  <div className="col-span-2 border-t pt-4">
                    <p className="text-sm font-medium text-muted-foreground mb-3">Dados do Pernoite</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Quantidade de Diárias</Label>
                    <Input name="pernoiteQuantity" type="number" min="1" defaultValue="1" placeholder="1" data-testid="input-pernoite-quantity" />
                  </div>
                  <div className="space-y-2">
                    <Label>Observações do Pernoite</Label>
                    <Input name="pernoiteNotes" placeholder="Informações adicionais" data-testid="input-pernoite-notes" />
                  </div>
                </>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setIsNewRequestOpen(false); setFormDesiredDate(undefined); setFormCompanion(false); setFormPernoite(false); }}>Cancelar</Button>
              <Button type="submit" disabled={createRequest.isPending}>
                {createRequest.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Criar Solicitação
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* New Vehicle Dialog */}
      <Dialog open={isNewVehicleOpen} onOpenChange={setIsNewVehicleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Veículo</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleVehicleSubmit}>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label>Placa *</Label>
                <Input name="plate" placeholder="ABC-1234" required />
              </div>
              <div className="space-y-2">
                <Label>Tipo *</Label>
                <Select name="vehicleType" required>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ambulancia">Ambulância</SelectItem>
                    <SelectItem value="van">Van</SelectItem>
                    <SelectItem value="onibus">Ônibus</SelectItem>
                    <SelectItem value="carro">Carro</SelectItem>
                    <SelectItem value="micro_onibus">Micro-ônibus</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Marca *</Label>
                <Input name="brand" placeholder="Ex: Renault" required />
              </div>
              <div className="space-y-2">
                <Label>Modelo *</Label>
                <Input name="model" placeholder="Ex: Master" required />
              </div>
              <div className="space-y-2">
                <Label>Ano *</Label>
                <Input name="year" type="number" placeholder="2024" required />
              </div>
              <div className="space-y-2">
                <Label>Capacidade *</Label>
                <Input name="capacity" type="number" placeholder="16" required />
              </div>
              <div className="space-y-2">
                <Label>Combustível</Label>
                <Select name="fuelType" defaultValue="diesel">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gasolina">Gasolina</SelectItem>
                    <SelectItem value="etanol">Etanol</SelectItem>
                    <SelectItem value="diesel">Diesel</SelectItem>
                    <SelectItem value="flex">Flex</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Km Atual</Label>
                <Input name="currentKm" type="number" placeholder="0" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsNewVehicleOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={createVehicle.isPending}>
                {createVehicle.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Cadastrar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* New Driver Dialog */}
      <Dialog open={isNewDriverOpen} onOpenChange={(open) => { setIsNewDriverOpen(open); if (!open) { setFormCnhExpiry(undefined); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Motorista</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleDriverSubmit}>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2 col-span-2">
                <Label>Nome Completo *</Label>
                <Input name="name" placeholder="Nome completo" required />
              </div>
              <div className="space-y-2">
                <Label>CPF *</Label>
                <Input name="cpf" placeholder="000.000.000-00" required />
              </div>
              <div className="space-y-2">
                <Label>Telefone *</Label>
                <Input name="phone" placeholder="(00) 00000-0000" required />
              </div>
              <div className="space-y-2">
                <Label>CNH *</Label>
                <Input name="cnh" placeholder="Número da CNH" required />
              </div>
              <div className="space-y-2">
                <Label>Categoria CNH *</Label>
                <Select name="cnhCategory" required>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="B">B</SelectItem>
                    <SelectItem value="C">C</SelectItem>
                    <SelectItem value="D">D</SelectItem>
                    <SelectItem value="E">E</SelectItem>
                    <SelectItem value="AB">AB</SelectItem>
                    <SelectItem value="AD">AD</SelectItem>
                    <SelectItem value="AE">AE</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Validade CNH *</Label>
                <HybridDateInput
                  value={formCnhExpiry}
                  onChange={setFormCnhExpiry}
                  data-testid="input-cnh-expiry"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setIsNewDriverOpen(false); setFormCnhExpiry(undefined); }}>Cancelar</Button>
              <Button type="submit" disabled={createDriver.isPending}>
                {createDriver.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Cadastrar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* New Trip Dialog */}
      <Dialog open={isNewTripOpen} onOpenChange={setIsNewTripOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Viagem</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleTripSubmit}>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label>Veículo *</Label>
                <Select name="vehicleId" required>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {vehicles.filter(v => v.status === 'disponivel' && v.active).map((v) => (
                      <SelectItem key={v.id} value={v.id}>{v.plate} - {v.model}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Motorista *</Label>
                <Select name="driverId" required>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {drivers.filter(d => d.status === 'disponivel' && d.active).map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Origem *</Label>
                <Input name="origin" placeholder="Ex: UBS Central" required />
              </div>
              <div className="space-y-2">
                <Label>Destino *</Label>
                <Input name="destination" placeholder="Ex: Hospital Salvador" required />
              </div>
              <div className="space-y-2">
                <Label>Saída Prevista *</Label>
                <Input name="scheduledDeparture" type="datetime-local" required />
              </div>
              <div className="space-y-2">
                <Label>Retorno Previsto</Label>
                <Input name="scheduledReturn" type="datetime-local" />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Rota</Label>
                <Input name="route" placeholder="Descrição da rota" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsNewTripOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={createTrip.isPending}>
                {createTrip.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Criar Viagem
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Approval Dialog */}
      <AlertDialog open={approvalDialogOpen} onOpenChange={setApprovalDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Aprovar Solicitação TFD</AlertDialogTitle>
            <AlertDialogDescription>
              Confirma a aprovação desta solicitação de TFD?
              {selectedRequest && (
                <div className="mt-2 p-3 bg-muted rounded-md">
                  <p><strong>Paciente:</strong> {getCitizenName(selectedRequest.citizenId)}</p>
                  <p><strong>Destino:</strong> {selectedRequest.destination}</p>
                  <p><strong>Motivo:</strong> {selectedRequest.reason}</p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => selectedRequest && approveRequest.mutate({ id: selectedRequest.id, data: { budgetVerified: true } })}>
              Aprovar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Dialog */}
      <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rejeitar Solicitação TFD</AlertDialogTitle>
            <AlertDialogDescription>
              Informe o motivo da rejeição:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Textarea id="rejectReason" placeholder="Motivo da rejeição..." rows={3} />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-destructive text-destructive-foreground"
              onClick={() => {
                const reason = (document.getElementById('rejectReason') as HTMLTextAreaElement)?.value;
                if (selectedRequest && reason) {
                  rejectRequest.mutate({ id: selectedRequest.id, reason });
                }
              }}
            >
              Rejeitar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Schedule Dialog */}
      <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agendar Solicitação</DialogTitle>
            <DialogDescription>Selecione a viagem para agendar esta solicitação</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>Viagem</Label>
            <Select onValueChange={(tripId) => {
              if (selectedRequest) {
                scheduleRequest.mutate({ id: selectedRequest.id, tripId });
              }
            }}>
              <SelectTrigger><SelectValue placeholder="Selecione uma viagem" /></SelectTrigger>
              <SelectContent>
                {trips.filter(t => t.status === 'agendada').map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {new Date(t.scheduledDeparture).toLocaleDateString('pt-BR')} - {t.destination} ({getVehicleName(t.vehicleId)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </DialogContent>
      </Dialog>

      {/* Complete Trip Dialog */}
      <Dialog open={completeTripDialogOpen} onOpenChange={setCompleteTripDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Concluir Viagem</DialogTitle>
            <DialogDescription>Preencha os dados de conclusão da viagem</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            if (selectedTrip) {
              completeTrip.mutate({
                id: selectedTrip.id,
                data: {
                  finalKm: parseInt(formData.get('finalKm') as string),
                  fuelLiters: parseFloat(formData.get('fuelLiters') as string) || null,
                  fuelCost: parseFloat(formData.get('fuelCost') as string) || null,
                  tollCost: parseFloat(formData.get('tollCost') as string) || null,
                  tripReport: formData.get('tripReport'),
                  incidents: formData.get('incidents'),
                }
              });
            }
          }}>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label>Km Final *</Label>
                <Input name="finalKm" type="number" placeholder="Ex: 150000" required />
              </div>
              <div className="space-y-2">
                <Label>Litros Combustível</Label>
                <Input name="fuelLiters" type="number" step="0.01" placeholder="Ex: 50.5" />
              </div>
              <div className="space-y-2">
                <Label>Custo Combustível (R$)</Label>
                <Input name="fuelCost" type="number" step="0.01" placeholder="Ex: 250.00" />
              </div>
              <div className="space-y-2">
                <Label>Custo Pedágio (R$)</Label>
                <Input name="tollCost" type="number" step="0.01" placeholder="Ex: 30.00" />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Relatório da Viagem</Label>
                <Textarea name="tripReport" placeholder="Observações sobre a viagem..." rows={2} />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Incidentes</Label>
                <Textarea name="incidents" placeholder="Registre qualquer incidente ocorrido..." rows={2} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCompleteTripDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={completeTrip.isPending}>
                {completeTrip.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Concluir Viagem
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Request Details Dialog */}
      <Dialog open={!!selectedRequest && !approvalDialogOpen && !rejectDialogOpen && !scheduleDialogOpen} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes da Solicitação TFD</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Paciente</Label>
                  <p className="font-medium">{getCitizenName(selectedRequest.citizenId)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <div className="mt-1">
                    <Badge variant={statusConfig[selectedRequest.status]?.variant}>
                      {statusConfig[selectedRequest.status]?.label}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Destino</Label>
                  <p className="font-medium">{selectedRequest.destination}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Motivo</Label>
                  <p className="font-medium capitalize">{selectedRequest.reason}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Urgência</Label>
                  <p className="font-medium capitalize">{selectedRequest.urgencyLevel}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Data Solicitação</Label>
                  <p className="font-medium">{new Date(selectedRequest.requestDate).toLocaleDateString('pt-BR')}</p>
                </div>
                {selectedRequest.travelDate && (
                  <div>
                    <Label className="text-muted-foreground">Data Viagem</Label>
                    <p className="font-medium">{new Date(selectedRequest.travelDate).toLocaleDateString('pt-BR')}</p>
                  </div>
                )}
                <div>
                  <Label className="text-muted-foreground">Acompanhante</Label>
                  <p className="font-medium">{selectedRequest.companion ? 'Sim' : 'Não'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Pernoite</Label>
                  <p className="font-medium">
                    {selectedRequest.pernoite 
                      ? `Sim (${selectedRequest.pernoiteQuantity || 1} diária${(selectedRequest.pernoiteQuantity || 1) > 1 ? 's' : ''})` 
                      : 'Não'}
                  </p>
                </div>
              </div>
              
              {selectedRequest.companion && selectedRequest.companionName && (
                <div className="p-3 bg-muted/50 rounded-md">
                  <Label className="text-muted-foreground">Dados do Acompanhante</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                    <div><span className="text-muted-foreground">Nome:</span> {selectedRequest.companionName}</div>
                    {selectedRequest.companionCpf && <div><span className="text-muted-foreground">CPF:</span> {selectedRequest.companionCpf}</div>}
                    {selectedRequest.companionCns && <div><span className="text-muted-foreground">CNS:</span> {selectedRequest.companionCns}</div>}
                    {selectedRequest.companionPhone && <div><span className="text-muted-foreground">Telefone:</span> {selectedRequest.companionPhone}</div>}
                    {selectedRequest.companionJustification && <div className="col-span-2"><span className="text-muted-foreground">Justificativa:</span> {selectedRequest.companionJustification}</div>}
                  </div>
                </div>
              )}
              
              {selectedRequest.justification && (
                <div>
                  <Label className="text-muted-foreground">Justificativa Médica</Label>
                  <p className="mt-1 text-sm">{selectedRequest.justification}</p>
                </div>
              )}
              {selectedRequest.rejectionReason && (
                <div className="p-3 bg-destructive/10 rounded-md">
                  <Label className="text-destructive">Motivo da Rejeição</Label>
                  <p className="mt-1 text-sm">{selectedRequest.rejectionReason}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
