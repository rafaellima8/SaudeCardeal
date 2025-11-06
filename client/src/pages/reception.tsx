import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Clock, Users, Activity, PhoneCall, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { AttendanceQueue, Citizen, Professional, HealthUnit } from "@shared/schema";

export default function Reception() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    citizenId: "",
    type: "Consulta Médica",
    priority: "normal" as "normal" | "urgent" | "emergency",
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: units } = useQuery<HealthUnit[]>({
    queryKey: ['/api/units'],
  });

  const defaultUnitId = units?.[0]?.id || "";

  const { data: queue = [], isLoading } = useQuery<AttendanceQueue[]>({
    queryKey: ['/api/queue', defaultUnitId],
    queryFn: async () => {
      if (!defaultUnitId) return [];
      const response = await fetch(`/api/queue/${defaultUnitId}`);
      if (!response.ok) throw new Error('Erro ao carregar fila');
      return response.json();
    },
    enabled: !!defaultUnitId,
  });

  const { data: citizens = [] } = useQuery<Citizen[]>({
    queryKey: ['/api/citizens'],
  });

  const { data: professionals = [] } = useQuery<Professional[]>({
    queryKey: ['/api/professionals'],
  });

  const createQueueEntry = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Erro ao adicionar na fila');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/queue'] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: "Paciente adicionado",
        description: "Paciente adicionado à fila de atendimento!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao adicionar paciente na fila",
        variant: "destructive",
      });
    },
  });

  const updateQueueEntry = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: any }) => {
      const response = await fetch(`/api/queue/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Erro ao atualizar fila');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/queue'] });
      toast({
        title: "Atualizado",
        description: "Status atualizado com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar status",
        variant: "destructive",
      });
    },
  });

  const deleteQueueEntry = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/queue/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Erro ao remover da fila');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/queue'] });
      toast({
        title: "Removido",
        description: "Paciente removido da fila!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao remover da fila",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      citizenId: "",
      type: "Consulta Médica",
      priority: "normal",
    });
  };

  const handleNewAttendance = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Generate ticket number
    const priorityPrefix = formData.priority === "urgent" || formData.priority === "emergency" ? "P" : "A";
    const ticketNumber = `${priorityPrefix}${String(queue.length + 1).padStart(3, '0')}`;

    createQueueEntry.mutate({
      ...formData,
      unitId: defaultUnitId,
      ticket: ticketNumber,
    });
  };

  const handleCall = (entry: AttendanceQueue) => {
    updateQueueEntry.mutate({
      id: entry.id,
      data: {
        status: "in_progress",
        calledAt: new Date().toISOString(),
      },
    });
  };

  const handleComplete = (entry: AttendanceQueue) => {
    updateQueueEntry.mutate({
      id: entry.id,
      data: {
        status: "completed",
        completedAt: new Date().toISOString(),
      },
    });
  };

  const handleRemove = (id: string) => {
    deleteQueueEntry.mutate(id);
  };

  const getCitizenName = (citizenId: string) => {
    const citizen = citizens.find(c => c.id === citizenId);
    return citizen?.name || 'Desconhecido';
  };

  const getProfessionalName = (professionalId?: string) => {
    if (!professionalId) return '-';
    const professional = professionals.find(p => p.id === professionalId);
    return professional?.name || 'Desconhecido';
  };

  const formatTime = (date?: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const waitingQueue = queue.filter(q => q.status === 'waiting');
  const inProgressQueue = queue.filter(q => q.status === 'in_progress');
  const completedToday = queue.filter(q => q.status === 'completed').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Recepção e Triagem</h1>
          <p className="text-muted-foreground mt-1">Controle de fila e gestão de senhas</p>
        </div>
        <Button size="default" onClick={handleNewAttendance} data-testid="button-new-attendance">
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
            <div className="text-2xl font-bold text-foreground">{inProgressQueue.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Pacientes sendo atendidos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Atendidos Hoje</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{completedToday}</div>
            <p className="text-xs text-muted-foreground mt-1">Atendimentos concluídos</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Fila de Espera ({waitingQueue.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <div className="text-center text-muted-foreground py-8">Carregando fila...</div>
            ) : waitingQueue.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">Nenhum paciente na fila</div>
            ) : (
              waitingQueue.map((entry) => (
                <Card key={entry.id} className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1">
                      <div className={`flex flex-col items-center justify-center rounded-lg px-3 py-2 min-w-[60px] ${
                        entry.priority === 'urgent' || entry.priority === 'emergency'
                          ? 'bg-destructive/10 border border-destructive' 
                          : 'bg-primary/10'
                      }`}>
                        <span className={`font-bold text-sm ${
                          entry.priority === 'urgent' || entry.priority === 'emergency' ? 'text-destructive' : 'text-primary'
                        }`}>
                          {entry.ticket}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-foreground truncate">{getCitizenName(entry.citizenId)}</h4>
                          {(entry.priority === 'urgent' || entry.priority === 'emergency') && (
                            <Badge variant="destructive" className="text-xs">Urgente</Badge>
                          )}
                        </div>
                        <div className="flex gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Chegada: {formatTime(entry.arrivedAt)}
                          </span>
                          <span>{entry.type}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleCall(entry)} data-testid={`button-call-${entry.id}`}>
                        <PhoneCall className="h-4 w-4 mr-1" />
                        Chamar
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleRemove(entry.id)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Em Atendimento ({inProgressQueue.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {inProgressQueue.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">Nenhum atendimento em andamento</div>
            ) : (
              inProgressQueue.map((entry) => (
                <Card key={entry.id} className="p-4 bg-accent/30">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src="" alt={getCitizenName(entry.citizenId)} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                        {getCitizenName(entry.citizenId).split(' ').map(n => n[0]).slice(0, 2).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h4 className="font-semibold text-foreground">{getCitizenName(entry.citizenId)}</h4>
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mt-1">
                        <span>{getProfessionalName(entry.professionalId || undefined)}</span>
                        <span>•</span>
                        <span>{entry.room || 'Sala não definida'}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTime(entry.calledAt || undefined)}
                        </span>
                      </div>
                    </div>
                    <Button size="sm" onClick={() => handleComplete(entry)}>
                      Finalizar
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo Atendimento</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="citizenId">Paciente *</Label>
              <Select value={formData.citizenId} onValueChange={(value) => setFormData({ ...formData, citizenId: value })} required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o paciente" />
                </SelectTrigger>
                <SelectContent>
                  {citizens.map((citizen) => (
                    <SelectItem key={citizen.id} value={citizen.id}>
                      {citizen.name} - {citizen.cns}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                  <SelectItem value="Urgência">Urgência</SelectItem>
                  <SelectItem value="Procedimento">Procedimento</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="priority">Prioridade *</Label>
              <Select value={formData.priority} onValueChange={(value: any) => setFormData({ ...formData, priority: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="urgent">Urgente</SelectItem>
                  <SelectItem value="emergency">Emergência</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createQueueEntry.isPending}>
                Adicionar à Fila
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
