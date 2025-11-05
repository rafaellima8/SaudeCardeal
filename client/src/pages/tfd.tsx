import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Search, MapPin, Calendar, User, FileText } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface TFDRequest {
  id: string;
  patient: string;
  destination: string;
  procedure: string;
  requestDate: string;
  travelDate: string;
  status: 'pending' | 'approved' | 'scheduled' | 'completed' | 'cancelled';
  professional: string;
}

//todo: remove mock functionality
const mockTFDRequests: TFDRequest[] = [
  { id: '1', patient: 'João Silva Santos', destination: 'Salvador - BA', procedure: 'Ressonância Magnética', requestDate: '2025-01-10', travelDate: '2025-01-20', status: 'approved', professional: 'Dra. Maria Silva' },
  { id: '2', patient: 'Maria Oliveira Costa', destination: 'Feira de Santana - BA', procedure: 'Consulta Cardiologia', requestDate: '2025-01-12', travelDate: '2025-01-25', status: 'scheduled', professional: 'Dr. Carlos Santos' },
  { id: '3', patient: 'Pedro Almeida Souza', destination: 'Salvador - BA', procedure: 'Cirurgia Ortopédica', requestDate: '2025-01-14', travelDate: '', status: 'pending', professional: 'Dra. Ana Paula' },
  { id: '4', patient: 'Ana Paula Ferreira', destination: 'Aracaju - SE', procedure: 'Exame Neurológico', requestDate: '2025-01-08', travelDate: '2025-01-18', status: 'completed', professional: 'Dr. Roberto Lima' },
];

const statusConfig = {
  pending: { label: 'Pendente', variant: 'outline' as const },
  approved: { label: 'Aprovado', variant: 'default' as const },
  scheduled: { label: 'Agendado', variant: 'default' as const },
  completed: { label: 'Concluído', variant: 'secondary' as const },
  cancelled: { label: 'Cancelado', variant: 'destructive' as const },
};

export default function TFD() {
  const [searchTerm, setSearchTerm] = useState("");
  const [requests] = useState(mockTFDRequests);

  const filteredRequests = requests.filter(req =>
    req.patient.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.destination.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.procedure.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    pending: requests.filter(r => r.status === 'pending').length,
    approved: requests.filter(r => r.status === 'approved').length,
    scheduled: requests.filter(r => r.status === 'scheduled').length,
    completed: requests.filter(r => r.status === 'completed').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">TFD - Tratamento Fora do Domicílio</h1>
          <p className="text-muted-foreground mt-1">Gestão de viagens e procedimentos externos</p>
        </div>
        <Button size="default" data-testid="button-new-tfd">
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
          <div className="flex items-center gap-3">
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
          </div>
        </CardHeader>
        <CardContent>
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
              {filteredRequests.map((request) => (
                <TableRow key={request.id} data-testid={`row-tfd-${request.id}`}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      {request.patient}
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
                    {request.professional}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusConfig[request.status].variant}>
                      {statusConfig[request.status].label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" data-testid={`button-view-${request.id}`}>
                      Ver Detalhes
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
