import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, 
  Clock, 
  UserCheck, 
  AlertTriangle, 
  Megaphone,
  Play,
  SkipForward,
  CheckCircle2,
  XCircle,
  Timer,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { queryClient } from "@/lib/queryClient";

interface QueueTicket {
  id: number;
  ticketNumber: string;
  citizenId: string;
  citizenName: string;
  priority: 'normal' | 'priority' | 'emergency';
  status: 'waiting' | 'called' | 'in_service' | 'completed' | 'no_show';
  queueType: string;
  calledAt?: string;
  serviceStartedAt?: string;
  createdAt: string;
  estimatedWaitMinutes?: number;
  room?: string;
}

interface QueueStats {
  waiting: number;
  inService: number;
  completed: number;
  noShow: number;
  averageWaitMinutes: number;
}

const priorityConfig = {
  emergency: {
    label: "Emergência",
    className: "bg-red-500/10 border-red-500 text-red-700 dark:text-red-400",
    badgeVariant: "destructive" as const,
  },
  priority: {
    label: "Prioritário",
    className: "bg-yellow-500/10 border-yellow-500 text-yellow-700 dark:text-yellow-400",
    badgeVariant: "outline" as const,
  },
  normal: {
    label: "Normal",
    className: "bg-blue-500/10 border-blue-500 text-blue-700 dark:text-blue-400",
    badgeVariant: "secondary" as const,
  },
};

const statusConfig = {
  waiting: { label: "Aguardando", icon: Clock, color: "text-muted-foreground" },
  called: { label: "Chamado", icon: Megaphone, color: "text-yellow-600" },
  in_service: { label: "Em Atendimento", icon: Activity, color: "text-green-600" },
  completed: { label: "Finalizado", icon: CheckCircle2, color: "text-blue-600" },
  no_show: { label: "Não Compareceu", icon: XCircle, color: "text-red-600" },
};

interface QueuePanelProps {
  unitId?: string;
  professionalId?: string;
  room?: string;
  showControls?: boolean;
}

export function QueuePanel({
  unitId,
  professionalId,
  room,
  showControls = true,
}: QueuePanelProps) {
  const [selectedTab, setSelectedTab] = useState("waiting");
  const [announcedTicket, setAnnouncedTicket] = useState<string | null>(null);

  const { data: tickets = [], isLoading } = useQuery<QueueTicket[]>({
    queryKey: ['/api/queue', { status: selectedTab }],
    refetchInterval: 5000,
  });

  const { data: stats } = useQuery<QueueStats>({
    queryKey: ['/api/queue/stats'],
    refetchInterval: 10000,
  });

  const callNextMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/queue/call-next', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ room, professionalId }),
      });
      if (!response.ok) throw new Error('Failed to call next');
      return response.json();
    },
    onSuccess: (data) => {
      if (data.ticket) {
        setAnnouncedTicket(data.ticket.ticketNumber);
        announceTicket(data.ticket);
        setTimeout(() => setAnnouncedTicket(null), 5000);
      }
      queryClient.invalidateQueries({ queryKey: ['/api/queue'] });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ ticketId, status }: { ticketId: number; status: string }) => {
      const response = await fetch(`/api/queue/${ticketId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error('Failed to update status');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/queue'] });
    },
  });

  const announceTicket = useCallback((ticket: QueueTicket) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(
        `Senha ${ticket.ticketNumber}. ${ticket.citizenName}. ${ticket.room ? `Sala ${ticket.room}` : 'Por favor, dirija-se ao guichê.'}`
      );
      utterance.lang = 'pt-BR';
      utterance.rate = 0.9;
      speechSynthesis.speak(utterance);
    }
  }, []);

  const formatWaitTime = (minutes?: number) => {
    if (!minutes) return '--';
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}min`;
  };

  const waitingTickets = tickets.filter(t => t.status === 'waiting');
  const calledTickets = tickets.filter(t => t.status === 'called');
  const inServiceTickets = tickets.filter(t => t.status === 'in_service');

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="p-2 rounded-full bg-yellow-500/10">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats?.waiting || 0}</p>
              <p className="text-xs text-muted-foreground">Aguardando</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="p-2 rounded-full bg-green-500/10">
              <Activity className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats?.inService || 0}</p>
              <p className="text-xs text-muted-foreground">Em Atendimento</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="p-2 rounded-full bg-blue-500/10">
              <CheckCircle2 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats?.completed || 0}</p>
              <p className="text-xs text-muted-foreground">Finalizados</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="p-2 rounded-full bg-muted">
              <Timer className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold">{formatWaitTime(stats?.averageWaitMinutes)}</p>
              <p className="text-xs text-muted-foreground">Tempo Médio</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {showControls && (
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-3">
              <Button
                size="lg"
                onClick={() => callNextMutation.mutate()}
                disabled={callNextMutation.isPending || waitingTickets.length === 0}
                className="gap-2"
                data-testid="button-call-next"
              >
                <Megaphone className="h-5 w-5" />
                Chamar Próximo
              </Button>

              {calledTickets.length > 0 && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => updateStatusMutation.mutate({ 
                      ticketId: calledTickets[0].id, 
                      status: 'in_service' 
                    })}
                    disabled={updateStatusMutation.isPending}
                    className="gap-2"
                    data-testid="button-start-service"
                  >
                    <Play className="h-4 w-4" />
                    Iniciar Atendimento
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => updateStatusMutation.mutate({ 
                      ticketId: calledTickets[0].id, 
                      status: 'no_show' 
                    })}
                    disabled={updateStatusMutation.isPending}
                    className="gap-2 text-muted-foreground"
                    data-testid="button-no-show"
                  >
                    <XCircle className="h-4 w-4" />
                    Não Compareceu
                  </Button>
                </>
              )}

              {inServiceTickets.length > 0 && (
                <Button
                  variant="default"
                  onClick={() => updateStatusMutation.mutate({ 
                    ticketId: inServiceTickets[0].id, 
                    status: 'completed' 
                  })}
                  disabled={updateStatusMutation.isPending}
                  className="gap-2 bg-green-600 hover:bg-green-700"
                  data-testid="button-complete-service"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Finalizar Atendimento
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {announcedTicket && (
        <Card className="border-primary bg-primary/5 animate-pulse">
          <CardContent className="p-6 text-center">
            <Megaphone className="h-8 w-8 mx-auto mb-2 text-primary" />
            <p className="text-3xl font-bold">{announcedTicket}</p>
            <p className="text-muted-foreground">Chamando...</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Fila de Atendimento</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="w-full justify-start">
              <TabsTrigger value="waiting" className="gap-2">
                <Clock className="h-4 w-4" />
                Aguardando
                <Badge variant="secondary">{stats?.waiting || 0}</Badge>
              </TabsTrigger>
              <TabsTrigger value="called" className="gap-2">
                <Megaphone className="h-4 w-4" />
                Chamados
              </TabsTrigger>
              <TabsTrigger value="in_service" className="gap-2">
                <Activity className="h-4 w-4" />
                Em Atendimento
              </TabsTrigger>
            </TabsList>

            <TabsContent value={selectedTab} className="mt-4">
              <ScrollArea className="h-[400px]">
                {isLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <p className="text-muted-foreground">Carregando...</p>
                  </div>
                ) : tickets.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-center">
                    <Users className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">Nenhum paciente na fila</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {tickets.map((ticket, index) => {
                      const config = priorityConfig[ticket.priority];
                      const statusInfo = statusConfig[ticket.status];
                      const StatusIcon = statusInfo.icon;

                      return (
                        <div
                          key={ticket.id}
                          className={cn(
                            "flex items-center justify-between p-3 rounded-lg border",
                            config.className,
                            announcedTicket === ticket.ticketNumber && "ring-2 ring-primary"
                          )}
                          data-testid={`queue-ticket-${ticket.id}`}
                        >
                          <div className="flex items-center gap-4">
                            <div className="text-center min-w-[60px]">
                              <p className="font-mono text-lg font-bold">{ticket.ticketNumber}</p>
                              <Badge variant={config.badgeVariant} className="text-xs">
                                {config.label}
                              </Badge>
                            </div>
                            <div>
                              <p className="font-medium">{ticket.citizenName}</p>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <StatusIcon className={cn("h-4 w-4", statusInfo.color)} />
                                <span>{statusInfo.label}</span>
                                {ticket.room && (
                                  <>
                                    <span>•</span>
                                    <span>Sala {ticket.room}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-right text-sm">
                            <p className="text-muted-foreground">
                              {ticket.estimatedWaitMinutes
                                ? `~${ticket.estimatedWaitMinutes} min`
                                : `#${index + 1}`}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

export function QueueDisplay() {
  const { data: calledTickets = [] } = useQuery<QueueTicket[]>({
    queryKey: ['/api/queue', { status: 'called' }],
    refetchInterval: 3000,
  });

  const { data: inServiceTickets = [] } = useQuery<QueueTicket[]>({
    queryKey: ['/api/queue', { status: 'in_service' }],
    refetchInterval: 3000,
  });

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-2">Painel de Chamada</h1>
          <p className="text-muted-foreground">Aguarde sua senha ser chamada</p>
        </div>

        {calledTickets.length > 0 && (
          <Card className="border-primary bg-primary/5">
            <CardHeader>
              <CardTitle className="text-center flex items-center justify-center gap-2">
                <Megaphone className="h-6 w-6 text-primary animate-bounce" />
                Chamando Agora
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {calledTickets.map((ticket) => (
                  <div 
                    key={ticket.id}
                    className="text-center p-6 bg-card rounded-lg border animate-pulse"
                  >
                    <p className="text-5xl font-bold font-mono mb-2">{ticket.ticketNumber}</p>
                    <p className="text-xl">{ticket.citizenName}</p>
                    {ticket.room && (
                      <Badge className="mt-2 text-lg px-4 py-1">Sala {ticket.room}</Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {inServiceTickets.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-center flex items-center justify-center gap-2">
                <Activity className="h-5 w-5 text-green-600" />
                Em Atendimento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {inServiceTickets.map((ticket) => (
                  <div 
                    key={ticket.id}
                    className="text-center p-4 bg-muted rounded-lg"
                  >
                    <p className="text-2xl font-bold font-mono">{ticket.ticketNumber}</p>
                    {ticket.room && (
                      <p className="text-sm text-muted-foreground">Sala {ticket.room}</p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default QueuePanel;
