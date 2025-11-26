import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, AlertCircle, Info, CheckCircle2, X, Bell, BellOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { queryClient } from "@/lib/queryClient";

interface ClinicalAlert {
  id: string;
  category: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  recommendation?: string;
  protocolReference?: string;
  triggeredAt: Date;
  acknowledged: boolean;
}

interface Notification {
  id: string;
  type: string;
  priority: string;
  title: string;
  message: string;
  readAt: Date | null;
  createdAt: Date;
}

const severityConfig = {
  critical: {
    icon: AlertTriangle,
    className: "bg-destructive/10 border-destructive text-destructive",
    badgeVariant: "destructive" as const,
    label: "Crítico",
  },
  warning: {
    icon: AlertCircle,
    className: "bg-yellow-500/10 border-yellow-500 text-yellow-700 dark:text-yellow-400",
    badgeVariant: "outline" as const,
    label: "Atenção",
  },
  info: {
    icon: Info,
    className: "bg-blue-500/10 border-blue-500 text-blue-700 dark:text-blue-400",
    badgeVariant: "secondary" as const,
    label: "Info",
  },
};

interface ClinicalAlertsPanelProps {
  alerts?: ClinicalAlert[];
  showNotifications?: boolean;
  compact?: boolean;
}

export function ClinicalAlertsPanel({
  alerts = [],
  showNotifications = true,
  compact = false,
}: ClinicalAlertsPanelProps) {
  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ['/api/notifications', { unreadOnly: 'true' }],
    enabled: showNotifications,
    refetchInterval: 30000,
  });

  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ['/api/notifications/unread-count'],
    enabled: showNotifications,
    refetchInterval: 30000,
  });

  const unreadCount = unreadData?.count || 0;

  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/notifications/${id}/read`, { 
        method: 'PATCH',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to mark as read');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    },
  });

  const dismissMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/notifications/${id}/dismiss`, { 
        method: 'PATCH',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to dismiss');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    },
  });

  const criticalAlerts = alerts.filter(a => a.severity === 'critical');
  const warningAlerts = alerts.filter(a => a.severity === 'warning');
  const infoAlerts = alerts.filter(a => a.severity === 'info');

  const sortedAlerts = [...criticalAlerts, ...warningAlerts, ...infoAlerts];
  const totalAlerts = sortedAlerts.length + unreadCount;

  if (sortedAlerts.length === 0 && notifications.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-6 text-center">
          <CheckCircle2 className="h-8 w-8 text-green-500 mb-2" />
          <p className="text-sm text-muted-foreground">
            Nenhum alerta clínico ativo
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Alertas Clínicos
            {totalAlerts > 0 && (
              <Badge variant="destructive" className="ml-2">
                {totalAlerts}
              </Badge>
            )}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className={cn(compact ? "h-[200px]" : "h-[300px]")}>
          <div className="space-y-3">
            {sortedAlerts.map((alert) => {
              const config = severityConfig[alert.severity];
              const Icon = config.icon;

              return (
                <div
                  key={alert.id}
                  className={cn(
                    "rounded-lg border p-3",
                    config.className
                  )}
                  data-testid={`alert-${alert.severity}-${alert.id}`}
                >
                  <div className="flex items-start gap-3">
                    <Icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{alert.title}</span>
                        <Badge variant={config.badgeVariant} className="text-xs">
                          {config.label}
                        </Badge>
                      </div>
                      <p className="text-sm opacity-90">{alert.message}</p>
                      {alert.recommendation && (
                        <p className="text-xs mt-2 opacity-75">
                          <strong>Recomendação:</strong> {alert.recommendation}
                        </p>
                      )}
                      {alert.protocolReference && (
                        <p className="text-xs mt-1 opacity-60 italic">
                          Ref: {alert.protocolReference}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {showNotifications && notifications.map((notification) => (
              <div
                key={notification.id}
                className={cn(
                  "rounded-lg border p-3 bg-card",
                  !notification.readAt && "border-primary/50"
                )}
                data-testid={`notification-${notification.id}`}
              >
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 mt-0.5 flex-shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-medium text-sm">{notification.title}</span>
                      <div className="flex items-center gap-1">
                        {!notification.readAt && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => markAsReadMutation.mutate(notification.id)}
                            data-testid={`button-read-${notification.id}`}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => dismissMutation.mutate(notification.id)}
                          data-testid={`button-dismiss-${notification.id}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{notification.message}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export function AlertsBadge() {
  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ['/api/notifications/unread-count'],
    refetchInterval: 30000,
  });

  const unreadCount = unreadData?.count || 0;

  if (unreadCount === 0) {
    return (
      <Button variant="ghost" size="icon" className="relative">
        <BellOff className="h-5 w-5 text-muted-foreground" />
      </Button>
    );
  }

  return (
    <Button variant="ghost" size="icon" className="relative" data-testid="button-notifications">
      <Bell className="h-5 w-5" />
      <Badge
        variant="destructive"
        className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
      >
        {unreadCount > 9 ? '9+' : unreadCount}
      </Badge>
    </Button>
  );
}

export default ClinicalAlertsPanel;
