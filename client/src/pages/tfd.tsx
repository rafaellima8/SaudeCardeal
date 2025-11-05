
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, MapPin, Calendar, User, FileText, Loader2 } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface TFDRequest {
  id: string;
  citizenId: string;
  professionalId: string;
  unitId: string;
  destination: string;
  procedure: string;
  justification: string;
  requestDate: string;
  travelDate: string | null;
  returnDate: string | null;
  status: 'pending' | 'approved' | 'scheduled' | 'completed' | 'cancelled';
  transportType: string | null;
  companion: boolean;
  notes: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
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

const statusConfig = {
  pending: { label: 'Pendente', variant: 'outline' as const },
  approved: { label: 'Aprovado', variant: 'default' as const },
  scheduled: { label: 'Agendado', variant: 'default' as const },
  completed: { label: 'Concluído', variant: 'secondary' as const },
  cancelled: { label: 'Cancelado', variant: 'destructive' as const },
};

export default function TFD() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isNewRequestOpen, setIsNewRequestOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<TFDRequest | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch TFD requests
  const { data: requests = [], isLoading } = useQuery<TFDRequest[]>({
    queryKey: ['/api/tfd', statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      const response = await fetch(`/api/tfd?${params}`);
      if (!response.ok) throw new Error('Erro ao carregar solicitações TFD');
      return response.json();
    },
  });

  // Fetch citizens for the form
  const { data: citizens = [] } = useQuery<Citizen[]>({
    queryKey: ['/api/citizens'],
    queryFn: async () => {
      const response = await fetch('/api/citizens?limit=1000');
      if (!response.ok) throw new Error('Erro ao carregar cidadãos');
      return response.json();
    },
  });

  // Fetch professionals for the form
  const { data: professionals = [] } = useQuery<Professional[]>({
    queryKey: ['/api/professionals'],
    queryFn: async () => {
      const response = await fetch('/api/professionals');
      if (!response.ok) throw new Error('Erro ao carregar profissionais');
      return response.json();
    },
  });

  // Create TFD request mutation
  const createRequest = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/tfd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao criar solicitação');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tfd'] });
      setIsNewRequestOpen(false);
      toast({
        title: "Solicitação criada",
        description: "A solicitação TFD foi criada com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const filteredRequests = requests.filter(req => {
    const searchLower = searchTerm.toLowerCase();
    const citizen = citizens.find(c => c.id === req.citizenId);
    const citizenName = citizen?.name || '';
    
    return (
      citizenName.toLowerCase().includes(searchLower) ||
      req.destination.toLowerCase().includes(searchLower) ||
      req.procedure.toLowerCase().includes(searchLower)
    );
  });

  const stats = {
    pending: requests.filter(r => r.status === 'pending').length,
    approved: requests.filter(r => r.status === 'approved').length,
    scheduled: requests.filter(r => r.status === 'scheduled').length,
    completed: requests.filter(r => r.status === 'completed').length,
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const data = {
      citizenId: formData.get('citizenId') as string,
      professionalId: formData.get('professionalId') as string,
      unitId: formData.get('unitId') as string,
      destination: formData.get('destination') as string,
      procedure: formData.get('procedure') as string,
      justification: formData.get('justification') as string,
      transportType: formData.get('transportType') as string || null,
      companion: formData.get('companion') === 'true',
      notes: formData.get('notes') as string || null,
    };

    createRequest.mutate(data);
  };

  const getCitizenName = (citizenId: string) => {
    const citizen = citizens.find(c => c.id === citizenId);
    return citizen?.name || 'Carregando...';
  };

  const getProfessionalName = (professionalId: string) => {
    const professional = professionals.find(p => p.id === professionalId);
    return professional?.name || 'Carregando...';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">TFD - Tratamento Fora do Domicílio</h1>
          <p className="text-muted-foreground mt-1">Gestão de viagens e procedimentos externos</p>
        </div>
        <Button size="default" onClick={() => setIsNewRequestOpen(true)} data-testid="button-new-tfd">
          <Plus className="h-4 w-4 mr-2" />
          Nova Solicitação
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.pending}</div>
            <p className="text-xs text-muted-foreground mt-1">Aguardando aprovação</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aprovados</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.approved}</div>
            <p className="text-xs text-muted-foreground mt-1">Aguardando agendamento</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Agendados</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.scheduled}</div>
            <p className="text-xs text-muted-foreground mt-1">Viagens programadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Concluídos</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.completed}</div>
            <p className="text-xs text-muted-foreground mt-1">No último mês</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por paciente, destino ou procedimento..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-tfd"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">Pendentes</SelectItem>
                <SelectItem value="approved">Aprovados</SelectItem>
                <SelectItem value="scheduled">Agendados</SelectItem>
                <SelectItem value="completed">Concluídos</SelectItem>
                <SelectItem value="cancelled">Cancelados</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Procedimento</TableHead>
                  <TableHead>Destino</TableHead>
                  <TableHead>Data Solicitação</TableHead>
                  <TableHead>Data Viagem</TableHead>
                  <TableHead>Solicitante</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
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
                      <TableCell>{request.procedure}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {request.destination}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {new Date(request.requestDate).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {request.travelDate ? new Date(request.travelDate).toLocaleDateString('pt-BR') : '-'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {getProfessionalName(request.professionalId)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusConfig[request.status].variant}>
                          {statusConfig[request.status].label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setSelectedRequest(request)}
                          data-testid={`button-view-${request.id}`}
                        >
                          Ver Detalhes
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* New Request Dialog */}
      <Dialog open={isNewRequestOpen} onOpenChange={setIsNewRequestOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Solicitação TFD</DialogTitle>
            <DialogDescription>
              Preencha os dados para criar uma nova solicitação de Tratamento Fora do Domicílio
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="citizenId">Paciente *</Label>
                <Select name="citizenId" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o paciente" />
                  </SelectTrigger>
                  <SelectContent>
                    {citizens.map((citizen) => (
                      <SelectItem key={citizen.id} value={citizen.id}>
                        {citizen.name} - {citizen.cpf}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="professionalId">Profissional Solicitante *</Label>
                <Select name="professionalId" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o profissional" />
                  </SelectTrigger>
                  <SelectContent>
                    {professionals.map((prof) => (
                      <SelectItem key={prof.id} value={prof.id}>
                        {prof.name} - {prof.specialty}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="destination">Destino *</Label>
                <Input
                  id="destination"
                  name="destination"
                  placeholder="Ex: Salvador - BA"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="procedure">Procedimento *</Label>
                <Input
                  id="procedure"
                  name="procedure"
                  placeholder="Ex: Ressonância Magnética"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="justification">Justificativa *</Label>
                <Textarea
                  id="justification"
                  name="justification"
                  placeholder="Descreva a justificativa médica para o TFD"
                  required
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="transportType">Tipo de Transporte</Label>
                <Select name="transportType">
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo de transporte" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ambulancia">Ambulância</SelectItem>
                    <SelectItem value="onibus">Ônibus</SelectItem>
                    <SelectItem value="carro">Carro</SelectItem>
                    <SelectItem value="van">Van</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="companion">Acompanhante</Label>
                <Select name="companion" defaultValue="false">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="false">Não</SelectItem>
                    <SelectItem value="true">Sim</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  placeholder="Informações adicionais sobre a solicitação"
                  rows={2}
                />
              </div>

              <input type="hidden" name="unitId" value={professionals[0]?.unitId || ''} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsNewRequestOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createRequest.isPending}>
                {createRequest.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Criar Solicitação
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
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
                    <Badge variant={statusConfig[selectedRequest.status].variant}>
                      {statusConfig[selectedRequest.status].label}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Destino</Label>
                  <p className="font-medium">{selectedRequest.destination}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Procedimento</Label>
                  <p className="font-medium">{selectedRequest.procedure}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Solicitante</Label>
                  <p className="font-medium">{getProfessionalName(selectedRequest.professionalId)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Data da Solicitação</Label>
                  <p className="font-medium">{new Date(selectedRequest.requestDate).toLocaleDateString('pt-BR')}</p>
                </div>
                {selectedRequest.travelDate && (
                  <div>
                    <Label className="text-muted-foreground">Data da Viagem</Label>
                    <p className="font-medium">{new Date(selectedRequest.travelDate).toLocaleDateString('pt-BR')}</p>
                  </div>
                )}
                {selectedRequest.transportType && (
                  <div>
                    <Label className="text-muted-foreground">Tipo de Transporte</Label>
                    <p className="font-medium capitalize">{selectedRequest.transportType}</p>
                  </div>
                )}
                <div>
                  <Label className="text-muted-foreground">Acompanhante</Label>
                  <p className="font-medium">{selectedRequest.companion ? 'Sim' : 'Não'}</p>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Justificativa</Label>
                <p className="mt-1 text-sm">{selectedRequest.justification}</p>
              </div>
              {selectedRequest.notes && (
                <div>
                  <Label className="text-muted-foreground">Observações</Label>
                  <p className="mt-1 text-sm">{selectedRequest.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
