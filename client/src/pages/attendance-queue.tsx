import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/ui/combobox";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  ArrowRight,
  User,
  Building2,
  Stethoscope,
  Ticket,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { type AttendanceQueue, type Citizen, type Professional, type HealthUnit } from "@shared/schema";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useCurrentUser } from "@/hooks/use-current-user";
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

// Configuração de status da fila de atendimento
const queueStatusConfig = {
  waiting: {
    label: "Aguardando",
    color: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
    icon: Clock,
    actionLabel: "Iniciar Atendimento",
  },
  in_progress: {
    label: "Em Atendimento",
    color: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20",
    icon: AlertCircle,
    actionLabel: "Continuar",
  },
  completed: {
    label: "Concluído",
    color: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
    icon: CheckCircle2,
  },
  cancelled: {
    label: "Cancelado",
    color: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
    icon: XCircle,
  },
};

// Configuração de prioridade
const priorityConfig = {
  emergency: {
    label: "Emergência",
    color: "bg-red-600 text-white",
  },
  urgent: {
    label: "Urgente",
    color: "bg-orange-600 text-white",
  },
  normal: {
    label: "Normal",
    color: "bg-blue-600 text-white",
  },
};

export default function AttendanceQueue() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { user } = useCurrentUser();
  const [selectedProfessional, setSelectedProfessional] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("waiting");
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    queueId: string;
    action: "start";
  }>({ open: false, queueId: "", action: "start" });

  // Buscar fila de atendimento
  const { data: queue = [], isLoading } = useQuery<AttendanceQueue[]>({
    queryKey: [
      "/api/attendance-queue",
      {
        professionalId: selectedProfessional !== "all" ? selectedProfessional : undefined,
        status: selectedStatus !== "all" ? selectedStatus : undefined,
      },
    ],
  });

  // Buscar dados de cidadãos (para exibir informações)
  const { data: citizens = [] } = useQuery<Citizen[]>({
    queryKey: ["/api/citizens", { limit: 1000 }],
  });

  // Buscar profissionais
  const { data: professionals = [] } = useQuery<Professional[]>({
    queryKey: ["/api/professionals", { limit: 100 }],
  });

  // Mutation para iniciar atendimento
  const startConsultationMutation = useMutation({
    mutationFn: async ({ queueId }: { queueId: string }) => {
      const response = await fetch("/api/attendance/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          queueId, 
          professionalId: user?.id 
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao iniciar atendimento");
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance-queue"] });
      setConfirmDialog({ open: false, queueId: "", action: "start" });
      toast({
        title: "Atendimento Iniciado",
        description: "Redirecionando para tela de atendimento...",
      });
      // Redirecionar para página de atendimento médico
      setLocation(`/atendimento-medico/${data.consultation.id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao Iniciar Atendimento",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleStartAttendance = (queueId: string) => {
    setConfirmDialog({ open: true, queueId, action: "start" });
  };

  const handleConfirmStart = () => {
    startConsultationMutation.mutate({ queueId: confirmDialog.queueId });
  };

  // Função para buscar dados do cidadão
  const getCitizen = (citizenId: string) => {
    return citizens.find((c) => c.id === citizenId);
  };

  // Calcular idade
  const calculateAge = (birthDate: Date | string | null) => {
    if (!birthDate) return "N/A";
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  // Estatísticas da fila
  const stats = {
    total: queue.length,
    waiting: queue.filter((q) => q.status === "waiting").length,
    inProgress: queue.filter((q) => q.status === "in_progress").length,
    completed: queue.filter((q) => q.status === "completed").length,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Carregando fila de atendimento...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">
          Fila de Atendimento Médico
        </h1>
        <p className="text-muted-foreground">
          Gerencie a fila de pacientes aguardando atendimento
        </p>
      </div>

      {/* Estatísticas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total na Fila</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-queue">
              {stats.total}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aguardando</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600" data-testid="text-waiting">
              {stats.waiting}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Atendimento</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600" data-testid="text-in-progress">
              {stats.inProgress}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Concluídos Hoje</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" data-testid="text-completed">
              {stats.completed}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Profissional</Label>
              <Combobox
                value={selectedProfessional}
                onValueChange={setSelectedProfessional}
                options={[
                  { value: "all", label: "Todos os profissionais" },
                  ...professionals.map((p) => ({
                    value: p.id,
                    label: `${p.name} - ${p.specialty}`,
                  })),
                ]}
                placeholder="Selecionar profissional"
                data-testid="combobox-professional"
              />
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Combobox
                value={selectedStatus}
                onValueChange={setSelectedStatus}
                options={[
                  { value: "all", label: "Todos os status" },
                  { value: "waiting", label: "Aguardando" },
                  { value: "in_progress", label: "Em Atendimento" },
                  { value: "completed", label: "Concluído" },
                  { value: "cancelled", label: "Cancelado" },
                ]}
                placeholder="Selecionar status"
                data-testid="combobox-status"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Pacientes na Fila */}
      <Card>
        <CardHeader>
          <CardTitle>Pacientes na Fila</CardTitle>
        </CardHeader>
        <CardContent>
          {queue.length === 0 ? (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-4 text-lg font-medium">Nenhum paciente na fila</p>
              <p className="text-sm text-muted-foreground">
                Não há pacientes aguardando atendimento no momento.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {queue.map((queueItem) => {
                const citizen = getCitizen(queueItem.citizenId);
                const status = queueStatusConfig[queueItem.status];
                const priority = priorityConfig[queueItem.priority];
                const StatusIcon = status.icon;

                return (
                  <Card key={queueItem.id} className="hover-elevate" data-testid={`card-queue-${queueItem.id}`}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          {/* Ticket Number */}
                          <div className="flex items-center justify-center bg-primary/10 rounded-lg p-3">
                            <div className="text-center">
                              <Ticket className="h-5 w-5 text-primary mb-1" />
                              <div className="text-xl font-bold text-primary">
                                {queueItem.ticket}
                              </div>
                            </div>
                          </div>

                          {/* Patient Info */}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="text-lg font-semibold" data-testid={`text-patient-name-${queueItem.id}`}>
                                {citizen?.name || "Nome não disponível"}
                              </h3>
                              {queueItem.priority !== "normal" && (
                                <Badge className={priority.color}>
                                  {priority.label}
                                </Badge>
                              )}
                              <Badge className={status.color} variant="outline">
                                <StatusIcon className="w-3 h-3 mr-1" />
                                {status.label}
                              </Badge>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4" />
                                <span>
                                  {citizen?.gender === "M" ? "Masculino" : "Feminino"}, {calculateAge(citizen?.birthDate || null)} anos
                                </span>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4" />
                                <span>CNS: {citizen?.cns || "Não informado"}</span>
                              </div>

                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                <span>
                                  Chegada: {format(new Date(queueItem.arrivedAt), "HH:mm", { locale: ptBR })}
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                <Stethoscope className="h-4 w-4" />
                                <span>{queueItem.type}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div>
                          {queueItem.status === "waiting" && (
                            <Button
                              onClick={() => handleStartAttendance(queueItem.id)}
                              data-testid={`button-start-${queueItem.id}`}
                            >
                              Iniciar Atendimento
                              <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                          )}
                          {queueItem.status === "in_progress" && queueItem.consultationId && (
                            <Button
                              variant="outline"
                              onClick={() => setLocation(`/atendimento-medico/${queueItem.consultationId}`)}
                              data-testid={`button-continue-${queueItem.id}`}
                            >
                              Continuar Atendimento
                              <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => !open && setConfirmDialog({ open: false, queueId: "", action: "start" })}>
        <AlertDialogContent data-testid="alert-start-attendance">
          <AlertDialogHeader>
            <AlertDialogTitle>Iniciar Atendimento</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja iniciar o atendimento deste paciente? Uma nova consulta será criada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="alert-cancel">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmStart}
              disabled={startConsultationMutation.isPending}
              data-testid="alert-confirm"
            >
              {startConsultationMutation.isPending ? "Iniciando..." : "Iniciar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
