import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Clock, Users, Activity } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

//todo: remove mock functionality
const waitingQueue = [
  { id: '1', name: 'Carlos Eduardo Lima', ticket: 'A001', arrived: '08:15', priority: 'normal', type: 'Consulta Médica' },
  { id: '2', name: 'Juliana Costa Reis', ticket: 'A002', arrived: '08:25', priority: 'normal', type: 'Primeira Consulta' },
  { id: '3', name: 'Roberto Santos Silva', ticket: 'P001', arrived: '08:30', priority: 'urgent', type: 'Urgência' },
  { id: '4', name: 'Fernanda Alves Souza', ticket: 'A003', arrived: '08:40', priority: 'normal', type: 'Retorno' },
];

const ongoingAttendance = [
  { id: '1', name: 'João Silva Santos', professional: 'Dra. Maria Silva', room: 'Consultório 1', startTime: '08:00' },
  { id: '2', name: 'Ana Paula Ferreira', professional: 'Enf. Carlos Santos', room: 'Enfermagem', startTime: '08:20' },
];

export default function Reception() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Recepção e Triagem</h1>
          <p className="text-muted-foreground mt-1">Controle de fila e gestão de senhas</p>
        </div>
        <Button size="default" data-testid="button-new-attendance">
          <UserPlus className="h-4 w-4 mr-2" />
          Novo Atendimento
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Na Fila</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{waitingQueue.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Aguardando atendimento</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Atendimento</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{ongoingAttendance.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Pacientes sendo atendidos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tempo Médio</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">18 min</div>
            <p className="text-xs text-muted-foreground mt-1">Tempo de espera médio</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Fila de Espera</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {waitingQueue.map((patient) => (
              <Card key={patient.id} className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1">
                    <div className={`flex flex-col items-center justify-center rounded-lg px-3 py-2 min-w-[60px] ${
                      patient.priority === 'urgent' 
                        ? 'bg-destructive/10 border border-destructive' 
                        : 'bg-primary/10'
                    }`}>
                      <span className={`font-bold text-sm ${
                        patient.priority === 'urgent' ? 'text-destructive' : 'text-primary'
                      }`}>
                        {patient.ticket}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-foreground truncate">{patient.name}</h4>
                        {patient.priority === 'urgent' && (
                          <Badge variant="destructive" className="text-xs">Urgente</Badge>
                        )}
                      </div>
                      <div className="flex gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Chegada: {patient.arrived}
                        </span>
                        <span>{patient.type}</span>
                      </div>
                    </div>
                  </div>
                  <Button size="sm" data-testid={`button-call-${patient.id}`}>
                    Chamar
                  </Button>
                </div>
              </Card>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Em Atendimento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {ongoingAttendance.map((attendance) => (
              <Card key={attendance.id} className="p-4 bg-accent/30">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src="" alt={attendance.name} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                      {attendance.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h4 className="font-semibold text-foreground">{attendance.name}</h4>
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mt-1">
                      <span>{attendance.professional}</span>
                      <span>•</span>
                      <span>{attendance.room}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {attendance.startTime}
                      </span>
                    </div>
                  </div>
                  <Badge variant="default" className="bg-status-info">Em atendimento</Badge>
                </div>
              </Card>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
