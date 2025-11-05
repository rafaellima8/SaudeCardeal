import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Clock, User, MapPin } from "lucide-react";

interface Appointment {
  id: string;
  time: string;
  patient: string;
  professional: string;
  type: string;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
  unit: string;
}

//todo: remove mock functionality
const mockAppointments: Appointment[] = [
  { id: '1', time: '08:00', patient: 'João Silva Santos', professional: 'Dra. Maria Silva', type: 'Consulta Médica', status: 'completed', unit: 'UBS Centro' },
  { id: '2', time: '08:30', patient: 'Maria Oliveira Costa', professional: 'Dra. Maria Silva', type: 'Consulta Médica', status: 'completed', unit: 'UBS Centro' },
  { id: '3', time: '09:00', patient: 'Pedro Almeida Souza', professional: 'Dra. Maria Silva', type: 'Consulta Médica', status: 'confirmed', unit: 'UBS Centro' },
  { id: '4', time: '09:30', patient: 'Ana Paula Ferreira', professional: 'Dra. Maria Silva', type: 'Retorno', status: 'confirmed', unit: 'UBS Centro' },
  { id: '5', time: '10:00', patient: 'Carlos Eduardo Lima', professional: 'Dra. Maria Silva', type: 'Consulta Médica', status: 'scheduled', unit: 'UBS Centro' },
  { id: '6', time: '10:30', patient: 'Juliana Costa Reis', professional: 'Dra. Maria Silva', type: 'Primeira Consulta', status: 'scheduled', unit: 'UBS Centro' },
];

const statusConfig = {
  scheduled: { label: 'Agendado', variant: 'outline' as const },
  confirmed: { label: 'Confirmado', variant: 'default' as const },
  completed: { label: 'Atendido', variant: 'secondary' as const },
  cancelled: { label: 'Cancelado', variant: 'destructive' as const },
};

export function AppointmentCalendar() {
  const [currentDate] = useState(new Date());

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Agendamentos - {currentDate.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" data-testid="button-prev-day">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="default" data-testid="button-today">
                Hoje
              </Button>
              <Button variant="outline" size="icon" data-testid="button-next-day">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {mockAppointments.map((appointment) => (
              <Card key={appointment.id} className="hover-elevate cursor-pointer" data-testid={`card-appointment-${appointment.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-center justify-center bg-primary/10 rounded-md px-3 py-2 min-w-[70px]">
                      <Clock className="h-4 w-4 text-primary mb-1" />
                      <span className="font-mono font-semibold text-sm text-foreground">{appointment.time}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-foreground truncate">{appointment.patient}</h4>
                        <Badge variant={statusConfig[appointment.status].variant} className="text-xs">
                          {statusConfig[appointment.status].label}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {appointment.professional}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {appointment.unit}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className="text-xs">
                        {appointment.type}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
