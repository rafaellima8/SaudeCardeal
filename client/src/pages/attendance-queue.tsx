import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  ArrowRight,
  Calendar as CalendarIcon,
  User,
  Building2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { type Appointment, type Citizen, type Professional, type HealthUnit } from "@shared/schema";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
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

const statusConfig = {
  scheduled: {
    label: "Agendados",
    color: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
    icon: Clock,
    nextStatus: "confirmed" as const,
    nextLabel: "Confirmar Presença",
  },
  confirmed: {
    label: "Confirmados",
    color: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
    icon: CheckCircle2,
    nextStatus: "in_progress" as const,
    nextLabel: "Iniciar Atendimento",
  },
  in_progress: {
    label: "Em Atendimento",
    color: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20",
    icon: AlertCircle,
    nextStatus: "completed" as const,
    nextLabel: "Finalizar",
  },
  completed: {
    label: "Concluídos",
    color: "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20",
    icon: CheckCircle2,
  },
  cancelled: {
    label: "Cancelados",
    color: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
    icon: XCircle,
  },
  no_show: {
    label: "Faltou",
    color: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20",
    icon: XCircle,
  },
};

export default function AttendanceQueue() {
  const { toast } = useToast();
  const [selectedProfessional, setSelectedProfessional] = useState<string>("all");
  const [selectedUnit, setSelectedUnit] = useState<string>("all");
  const [selectedDate] = useState<Date>(new Date());
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    appointmentId: string;
    action: "confirm" | "start" | "complete" | "cancel" | "no-show";
  }>({ open: false, appointmentId: "", action: "confirm" });

  const { data: appointments = [], isLoading } = useQuery<Appointment[]>({
    queryKey: [
      "/api/appointments",
      {
        date: format(selectedDate, "yyyy-MM-dd"),
        professionalId: selectedProfessional !== "all" ? selectedProfessional : undefined,
        unitId: selectedUnit !== "all" ? selectedUnit : undefined,
      },
    ],
  });

  const { data: citizens = [] } = useQuery<Citizen[]>({
    queryKey: ["/api/citizens", { limit: 1000 }],
  });

  const { data: professionals = [] } = useQuery<Professional[]>({
    queryKey: ["/api/professionals", { limit: 100 }],
  });

  const { data: units = [] } = useQuery<HealthUnit[]>({
    queryKey: ["/api/units"],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await fetch(`/api/appointments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error("Erro ao atualizar status");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      toast({
        title: "Sucesso",
        description: "Status atualizado com sucesso",
      });
      setConfirmDialog({ open: false, appointmentId: "", action: "confirm" });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleStatusChange = (id: string, newStatus: string) => {
    updateStatusMutation.mutate({ id, status: newStatus });
  };

  const handleConfirmAction = () => {
    const statusMap = {
      confirm: "confirmed",
      start: "in_progress",
      complete: "completed",
      cancel: "cancelled",
      "no-show": "no_show",
    };
    handleStatusChange(confirmDialog.appointmentId, statusMap[confirmDialog.action]);
  };

  const groupedAppointments = {
    scheduled: appointments.filter((a) => a.status === "scheduled"),
    confirmed: appointments.filter((a) => a.status === "confirmed"),
    in_progress: appointments.filter((a) => a.status === "in_progress"),
    completed: appointments.filter((a) => a.status === "completed"),
    cancelled: appointments.filter((a) => a.status === "cancelled"),
    no_show: appointments.filter((a) => a.status === "no_show"),
  };

  const renderAppointmentCard = (apt: Appointment) => {
    const citizen = citizens.find((c) => c.id === apt.citizenId);
    const professional = professionals.find((p) => p.id === apt.professionalId);
    const unit = units.find((u) => u.id === apt.unitId);
    const config = statusConfig[apt.status as keyof typeof statusConfig];
    const Icon = config?.icon || Clock;

    return (
      <Card key={apt.id} className="hover-elevate" data-testid={`appointment-card-${apt.id}`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <Icon className="w-5 h-5 text-muted-foreground" />
              <span className="font-semibold text-lg">
                {format(new Date(apt.appointmentDate), "HH:mm")}
              </span>
            </div>
            <Badge className={config?.color}>{config?.label}</Badge>
          </div>

          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-2 text-sm">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">{citizen?.name || "Desconhecido"}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Building2 className="w-4 h-4" />
              <span>{professional?.name}</span>
            </div>
            {apt.type && (
              <div className="text-sm text-muted-foreground">
                <strong>Tipo:</strong> {apt.type}
              </div>
            )}
          </div>

          {apt.status !== "completed" && apt.status !== "cancelled" && apt.status !== "no_show" && (
            <div className="flex gap-2 flex-wrap">
              {"nextStatus" in config && config.nextStatus && (
                <Button
                  size="sm"
                  onClick={() =>
                    setConfirmDialog({
                      open: true,
                      appointmentId: apt.id,
                      action: apt.status === "scheduled" ? "confirm" : apt.status === "confirmed" ? "start" : "complete",
                    })
                  }
                  data-testid={`button-next-${apt.id}`}
                >
                  <ArrowRight className="w-4 h-4 mr-1" />
                  {"nextLabel" in config ? config.nextLabel : "Próximo"}
                </Button>
              )}
              {apt.status !== "in_progress" && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setConfirmDialog({
                        open: true,
                        appointmentId: apt.id,
                        action: "cancel",
                      })
                    }
                    data-testid={`button-cancel-${apt.id}`}
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setConfirmDialog({
                        open: true,
                        appointmentId: apt.id,
                        action: "no-show",
                      })
                    }
                    data-testid={`button-no-show-${apt.id}`}
                  >
                    <AlertCircle className="w-4 h-4 mr-1" />
                    Faltou
                  </Button>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="w-8 h-8" />
            Fila de Atendimento
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerenciamento de pacientes do dia
          </p>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <CalendarIcon className="w-5 h-5" />
          <span className="font-medium">
            {format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </span>
        </div>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Profissional</Label>
              <Select value={selectedProfessional} onValueChange={setSelectedProfessional}>
                <SelectTrigger data-testid="filter-professional">
                  <SelectValue placeholder="Todos os profissionais" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {professionals.map((prof) => (
                    <SelectItem key={prof.id} value={prof.id}>
                      {prof.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Unidade</Label>
              <Select value={selectedUnit} onValueChange={setSelectedUnit}>
                <SelectTrigger data-testid="filter-unit">
                  <SelectValue placeholder="Todas as unidades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {units.map((unit) => (
                    <SelectItem key={unit.id} value={unit.id}>
                      {unit.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(["scheduled", "confirmed", "in_progress"] as const).map((status) => {
          const config = statusConfig[status];
          const Icon = config.icon;
          const statusAppointments = groupedAppointments[status].sort(
            (a, b) => new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime()
          );

          return (
            <Card key={status}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon className="w-5 h-5" />
                  {config.label}
                  <Badge variant="secondary" className="ml-auto">
                    {statusAppointments.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Carregando...
                  </div>
                ) : statusAppointments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum agendamento
                  </div>
                ) : (
                  statusAppointments.map(renderAppointmentCard)
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        {(["completed", "cancelled", "no_show"] as const).map((status) => {
          const config = statusConfig[status];
          const Icon = config.icon;
          const statusAppointments = groupedAppointments[status];

          return (
            <Card key={status}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon className="w-5 h-5" />
                  {config.label}
                  <Badge variant="secondary" className="ml-auto">
                    {statusAppointments.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {statusAppointments.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    Nenhum registro
                  </div>
                ) : (
                  <div className="space-y-2">
                    {statusAppointments.map((apt) => {
                      const citizen = citizens.find((c) => c.id === apt.citizenId);
                      return (
                        <div key={apt.id} className="text-sm p-2 rounded-lg bg-muted/50">
                          <div className="font-medium">{citizen?.name}</div>
                          <div className="text-muted-foreground text-xs">
                            {format(new Date(apt.appointmentDate), "HH:mm")}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Ação</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.action === "confirm" && "Deseja confirmar a presença do paciente?"}
              {confirmDialog.action === "start" && "Deseja iniciar o atendimento?"}
              {confirmDialog.action === "complete" && "Deseja finalizar o atendimento?"}
              {confirmDialog.action === "cancel" && "Deseja cancelar este agendamento?"}
              {confirmDialog.action === "no-show" && "Deseja marcar como falta?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="dialog-cancel">Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmAction} 
              data-testid="dialog-confirm"
              disabled={updateStatusMutation.isPending}
            >
              {updateStatusMutation.isPending ? "Processando..." : "Confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
