import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Calendar, Clock, Plus, Trash2, Settings, AlertCircle, Users } from "lucide-react";
import type { ProfessionalSchedule, Professional, CareLine } from "@shared/schema";

interface ScheduleFormData {
  professionalId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDuration: number;
  maxAppointments: number;
  appointmentType: string;
  careLineId?: string;
  observations?: string;
}

const DAYS_OF_WEEK = [
  { value: 0, label: "Domingo" },
  { value: 1, label: "Segunda-feira" },
  { value: 2, label: "Terça-feira" },
  { value: 3, label: "Quarta-feira" },
  { value: 4, label: "Quinta-feira" },
  { value: 5, label: "Sexta-feira" },
  { value: 6, label: "Sábado" },
];

const APPOINTMENT_TYPES = [
  { value: "consulta", label: "Consulta" },
  { value: "retorno", label: "Retorno" },
  { value: "procedimento", label: "Procedimento" },
  { value: "triagem", label: "Triagem" },
  { value: "urgencia", label: "Urgência" },
];

export default function ScheduleConfig() {
  const { user, isLoading: userLoading } = useCurrentUser();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedProfessional, setSelectedProfessional] = useState<string>("all");
  const [formData, setFormData] = useState<ScheduleFormData>({
    professionalId: "",
    dayOfWeek: 1,
    startTime: "08:00",
    endTime: "12:00",
    slotDuration: 30,
    maxAppointments: 8,
    appointmentType: "consulta",
  });

  const { data: professionals = [], isLoading: professionalsLoading } = useQuery<Professional[]>({
    queryKey: ["/api/professionals"],
    enabled: !!user,
  });

  const { data: careLines = [] } = useQuery<CareLine[]>({
    queryKey: ["/api/care-lines"],
    enabled: !!user,
  });

  const { data: schedules = [], isLoading: schedulesLoading, error } = useQuery<ProfessionalSchedule[]>({
    queryKey: ["/api/schedules", selectedProfessional],
    queryFn: async () => {
      const params = selectedProfessional && selectedProfessional !== "all" ? `?professionalId=${selectedProfessional}` : "";
      return apiRequest<ProfessionalSchedule[]>("GET", `/api/schedules${params}`);
    },
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: async (data: ScheduleFormData) => {
      return apiRequest<ProfessionalSchedule>("POST", "/api/schedules", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedules"] });
      setIsDialogOpen(false);
      toast({ title: "Sucesso", description: "Horário cadastrado com sucesso" });
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/schedules/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedules"] });
      toast({ title: "Sucesso", description: "Horário removido" });
    },
    onError: (error: any) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      return apiRequest("PATCH", `/api/schedules/${id}`, { active });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedules"] });
    },
    onError: (error: any) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      professionalId: selectedProfessional === "all" ? "" : selectedProfessional,
      dayOfWeek: 1,
      startTime: "08:00",
      endTime: "12:00",
      slotDuration: 30,
      maxAppointments: 8,
      appointmentType: "consulta",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      ...formData,
      professionalId: formData.professionalId || selectedProfessional,
    });
  };

  const getDayLabel = (day: number) => {
    return DAYS_OF_WEEK.find(d => d.value === day)?.label || "Desconhecido";
  };

  const getAppointmentTypeLabel = (type: string) => {
    return APPOINTMENT_TYPES.find(t => t.value === type)?.label || type;
  };

  const groupedSchedules = schedules.reduce((acc, schedule) => {
    const day = schedule.dayOfWeek;
    if (!acc[day]) acc[day] = [];
    acc[day].push(schedule);
    return acc;
  }, {} as Record<number, ProfessionalSchedule[]>);

  if (!user && !userLoading) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Acesso Negado</AlertTitle>
          <AlertDescription>
            Você precisa estar autenticado para acessar a configuração de agenda.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (userLoading || professionalsLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2" data-testid="text-page-title">
            <Settings className="h-8 w-8" />
            Configuração de Agenda
          </h1>
          <p className="text-muted-foreground">
            Configure os horários de atendimento dos profissionais
          </p>
        </div>

        <div className="flex items-center gap-4">
          <Select value={selectedProfessional} onValueChange={setSelectedProfessional}>
            <SelectTrigger className="w-[280px]" data-testid="select-professional">
              <SelectValue placeholder="Selecione o profissional" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os profissionais</SelectItem>
              {professionals.map((prof) => (
                <SelectItem key={prof.id} value={prof.id}>
                  {prof.name} - {prof.specialty}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-schedule">
                <Plus className="h-4 w-4 mr-2" />
                Novo Horário
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Adicionar Horário de Atendimento</DialogTitle>
                <DialogDescription>
                  Configure um novo turno de atendimento para o profissional
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label>Profissional</Label>
                    <Select
                      value={formData.professionalId || (selectedProfessional !== "all" ? selectedProfessional : "")}
                      onValueChange={(v) => setFormData({ ...formData, professionalId: v })}
                    >
                      <SelectTrigger data-testid="input-professional">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {professionals.map((prof) => (
                          <SelectItem key={prof.id} value={prof.id}>
                            {prof.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Dia da Semana</Label>
                    <Select
                      value={String(formData.dayOfWeek)}
                      onValueChange={(v) => setFormData({ ...formData, dayOfWeek: parseInt(v) })}
                    >
                      <SelectTrigger data-testid="input-day">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DAYS_OF_WEEK.map((day) => (
                          <SelectItem key={day.value} value={String(day.value)}>
                            {day.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Tipo de Atendimento</Label>
                    <Select
                      value={formData.appointmentType}
                      onValueChange={(v) => setFormData({ ...formData, appointmentType: v })}
                    >
                      <SelectTrigger data-testid="input-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {APPOINTMENT_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Hora Início</Label>
                    <Input
                      type="time"
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                      data-testid="input-start-time"
                    />
                  </div>

                  <div>
                    <Label>Hora Fim</Label>
                    <Input
                      type="time"
                      value={formData.endTime}
                      onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                      data-testid="input-end-time"
                    />
                  </div>

                  <div>
                    <Label>Duração (min)</Label>
                    <Input
                      type="number"
                      min={5}
                      max={120}
                      value={formData.slotDuration}
                      onChange={(e) => setFormData({ ...formData, slotDuration: parseInt(e.target.value) })}
                      data-testid="input-duration"
                    />
                  </div>

                  <div>
                    <Label>Vagas Máximas</Label>
                    <Input
                      type="number"
                      min={1}
                      max={50}
                      value={formData.maxAppointments}
                      onChange={(e) => setFormData({ ...formData, maxAppointments: parseInt(e.target.value) })}
                      data-testid="input-max-appointments"
                    />
                  </div>

                  <div className="col-span-2">
                    <Label>Linha de Cuidado (opcional)</Label>
                    <Select
                      value={formData.careLineId || "all"}
                      onValueChange={(v) => setFormData({ ...formData, careLineId: v === "all" ? undefined : v })}
                    >
                      <SelectTrigger data-testid="input-care-line">
                        <SelectValue placeholder="Todas as linhas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas as linhas</SelectItem>
                        {careLines.map((cl) => (
                          <SelectItem key={cl.id} value={cl.id}>
                            {cl.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit">
                    {createMutation.isPending ? "Salvando..." : "Salvar"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erro ao carregar horários</AlertTitle>
          <AlertDescription>Não foi possível carregar a configuração de agenda.</AlertDescription>
        </Alert>
      )}

      {schedulesLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : schedules.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
            <p className="text-muted-foreground">Nenhum horário configurado</p>
            <p className="text-sm text-muted-foreground">
              Clique em "Novo Horário" para começar
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {DAYS_OF_WEEK.map((day) => {
            const daySchedules = groupedSchedules[day.value] || [];
            if (daySchedules.length === 0) return null;

            return (
              <Card key={day.value} data-testid={`card-day-${day.value}`}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    {day.label}
                  </CardTitle>
                  <CardDescription>
                    {daySchedules.length} turno{daySchedules.length > 1 ? "s" : ""} configurado{daySchedules.length > 1 ? "s" : ""}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {daySchedules.map((schedule) => {
                    const prof = professionals.find(p => p.id === schedule.professionalId);
                    return (
                      <div
                        key={schedule.id}
                        className="flex items-center justify-between p-3 rounded-lg border"
                        data-testid={`schedule-${schedule.id}`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {schedule.startTime} - {schedule.endTime}
                            </span>
                          </div>
                          {prof && (
                            <p className="text-sm text-muted-foreground">{prof.name}</p>
                          )}
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {getAppointmentTypeLabel(schedule.appointmentType)}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              <Users className="h-3 w-3 mr-1" />
                              {schedule.maxAppointments} vagas
                            </Badge>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Switch
                            checked={schedule.active}
                            onCheckedChange={(checked) => 
                              toggleActiveMutation.mutate({ id: schedule.id, active: checked })
                            }
                            data-testid={`toggle-${schedule.id}`}
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => deleteMutation.mutate(schedule.id)}
                            disabled={deleteMutation.isPending}
                            data-testid={`delete-${schedule.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
