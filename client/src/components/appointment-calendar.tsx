import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Clock, User, MapPin, Plus, Edit, Trash2, MoreVertical } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import type { Appointment, Citizen, Professional, HealthUnit } from "@shared/schema";

const statusConfig = {
  scheduled: { label: 'Agendado', variant: 'outline' as const },
  confirmed: { label: 'Confirmado', variant: 'default' as const },
  completed: { label: 'Atendido', variant: 'secondary' as const },
  cancelled: { label: 'Cancelado', variant: 'destructive' as const },
  no_show: { label: 'Faltou', variant: 'destructive' as const },
};

export function AppointmentCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [formData, setFormData] = useState({
    citizenId: "",
    professionalId: "",
    unitId: "",
    appointmentDate: "",
    type: "Consulta Médica",
    status: "scheduled" as const,
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: appointments, isLoading } = useQuery<Appointment[]>({
    queryKey: ['/api/appointments', { date: currentDate.toISOString() }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('date', currentDate.toISOString());
      const response = await fetch(`/api/appointments?${params}`);
      if (!response.ok) throw new Error('Erro ao buscar agendamentos');
      return response.json();
    },
  });

  const { data: citizens } = useQuery<Citizen[]>({
    queryKey: ['/api/citizens'],
  });

  const { data: professionals } = useQuery<Professional[]>({
    queryKey: ['/api/professionals'],
  });

  const { data: units } = useQuery<HealthUnit[]>({
    queryKey: ['/api/units'],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Erro ao criar agendamento');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: "Agendamento criado",
        description: "Agendamento criado com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao criar agendamento",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: any }) => {
      const response = await fetch(`/api/appointments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Erro ao atualizar agendamento');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      setIsDialogOpen(false);
      setSelectedAppointment(null);
      resetForm();
      toast({
        title: "Agendamento atualizado",
        description: "Agendamento atualizado com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar agendamento",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/appointments/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Erro ao excluir agendamento');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      setIsDeleteDialogOpen(false);
      setSelectedAppointment(null);
      toast({
        title: "Agendamento excluído",
        description: "Agendamento excluído com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao excluir agendamento",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      citizenId: "",
      professionalId: "",
      unitId: "",
      appointmentDate: "",
      type: "Consulta Médica",
      status: "scheduled",
    });
  };

  const handlePrevDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 1);
    setCurrentDate(newDate);
  };

  const handleNextDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 1);
    setCurrentDate(newDate);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleNewAppointment = () => {
    resetForm();
    setSelectedAppointment(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (appointment: Appointment, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedAppointment(appointment);
    setFormData({
      citizenId: appointment.citizenId,
      professionalId: appointment.professionalId,
      unitId: appointment.unitId,
      appointmentDate: new Date(appointment.appointmentDate).toISOString().slice(0, 16),
      type: appointment.type,
      status: appointment.status,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (appointment: Appointment, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedAppointment(appointment);
    setIsDeleteDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedAppointment) {
      updateMutation.mutate({ id: selectedAppointment.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const confirmDelete = () => {
    if (selectedAppointment) {
      deleteMutation.mutate(selectedAppointment.id);
    }
  };

  const getCitizenName = (citizenId: string) => {
    const citizen = citizens?.find(c => c.id === citizenId);
    return citizen?.name || 'Desconhecido';
  };

  const getProfessionalName = (professionalId: string) => {
    const professional = professionals?.find(p => p.id === professionalId);
    return professional?.name || 'Desconhecido';
  };

  const getUnitName = (unitId: string) => {
    const unit = units?.find(u => u.id === unitId);
    return unit?.name || 'Desconhecido';
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              Agendamentos - {currentDate.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={handlePrevDay} data-testid="button-prev-day">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="default" onClick={handleToday} data-testid="button-today">
                Hoje
              </Button>
              <Button variant="outline" size="icon" onClick={handleNextDay} data-testid="button-next-day">
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button size="default" onClick={handleNewAppointment} data-testid="button-new-appointment">
                <Plus className="h-4 w-4 mr-2" />
                Novo Agendamento
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center text-muted-foreground py-8">Carregando agendamentos...</div>
          ) : appointments && appointments.length > 0 ? (
            <div className="space-y-3">
              {appointments.map((appointment) => (
                <Card key={appointment.id} className="hover-elevate cursor-pointer" data-testid={`card-appointment-${appointment.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col items-center justify-center bg-primary/10 rounded-md px-3 py-2 min-w-[70px]">
                        <Clock className="h-4 w-4 text-primary mb-1" />
                        <span className="font-mono font-semibold text-sm text-foreground">
                          {formatTime(appointment.appointmentDate)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-foreground truncate">{getCitizenName(appointment.citizenId)}</h4>
                          <Badge variant={statusConfig[appointment.status].variant} className="text-xs">
                            {statusConfig[appointment.status].label}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {getProfessionalName(appointment.professionalId)}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {getUnitName(appointment.unitId)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {appointment.type}
                        </Badge>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => handleEdit(appointment, e)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => handleDelete(appointment, e)} className="text-destructive">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              Nenhum agendamento para esta data
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedAppointment ? 'Editar Agendamento' : 'Novo Agendamento'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="citizenId">Paciente *</Label>
              <Select value={formData.citizenId} onValueChange={(value) => setFormData({ ...formData, citizenId: value })} required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o paciente" />
                </SelectTrigger>
                <SelectContent>
                  {citizens?.map((citizen) => (
                    <SelectItem key={citizen.id} value={citizen.id}>
                      {citizen.name} - {citizen.cns}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="professionalId">Profissional *</Label>
              <Select value={formData.professionalId} onValueChange={(value) => setFormData({ ...formData, professionalId: value })} required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o profissional" />
                </SelectTrigger>
                <SelectContent>
                  {professionals?.map((professional) => (
                    <SelectItem key={professional.id} value={professional.id}>
                      {professional.name} - {professional.specialty}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="unitId">Unidade de Saúde *</Label>
              <Select value={formData.unitId} onValueChange={(value) => setFormData({ ...formData, unitId: value })} required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a unidade" />
                </SelectTrigger>
                <SelectContent>
                  {units?.map((unit) => (
                    <SelectItem key={unit.id} value={unit.id}>
                      {unit.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="appointmentDate">Data e Hora *</Label>
              <Input
                id="appointmentDate"
                type="datetime-local"
                required
                value={formData.appointmentDate}
                onChange={(e) => setFormData({ ...formData, appointmentDate: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="type">Tipo de Atendimento *</Label>
              <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Consulta Médica">Consulta Médica</SelectItem>
                  <SelectItem value="Consulta Enfermagem">Consulta Enfermagem</SelectItem>
                  <SelectItem value="Retorno">Retorno</SelectItem>
                  <SelectItem value="Primeira Consulta">Primeira Consulta</SelectItem>
                  <SelectItem value="Procedimento">Procedimento</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value: any) => setFormData({ ...formData, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">Agendado</SelectItem>
                  <SelectItem value="confirmed">Confirmado</SelectItem>
                  <SelectItem value="completed">Atendido</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                  <SelectItem value="no_show">Faltou</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {selectedAppointment ? 'Atualizar' : 'Agendar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente este agendamento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
