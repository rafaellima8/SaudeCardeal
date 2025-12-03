import * as schema from "@shared/schema";

export interface AlertCondition {
  field: string;
  operator: "eq" | "ne" | "gt" | "lt" | "gte" | "lte" | "contains" | "exists";
  value: any;
}

export interface AlertTriggerConfig {
  schedule?: string;
  eventType?: string;
  threshold?: number;
  deadlineField?: string;
  daysBeforeDeadline?: number[];
}

export interface AlertDefinition {
  id: string;
  name: string;
  slug: string;
  description?: string;
  category: "prazo" | "pendencia" | "risco_financeiro" | "edital" | "irregularidade" | "epidemiologico" | "estoque" | "compliance";
  triggerType: "scheduled" | "event" | "threshold" | "deadline";
  triggerConfig: AlertTriggerConfig;
  conditions?: AlertCondition[];
  severity: "info" | "warning" | "critical" | "urgent";
  targetRoles?: string[];
  targetUnits?: string[];
  notificationChannels: ("ui" | "email" | "sms")[];
}

export class AlertScheduler {
  private alertDefinitions: AlertDefinition[] = [];

  registerAlert(definition: AlertDefinition): void {
    const existing = this.alertDefinitions.findIndex(a => a.slug === definition.slug);
    if (existing >= 0) {
      this.alertDefinitions[existing] = definition;
    } else {
      this.alertDefinitions.push(definition);
    }
  }

  evaluateConditions(conditions: AlertCondition[] | undefined, data: Record<string, any>): boolean {
    if (!conditions || conditions.length === 0) return true;

    return conditions.every(condition => {
      const value = this.getNestedValue(data, condition.field);

      switch (condition.operator) {
        case "eq":
          return value === condition.value;
        case "ne":
          return value !== condition.value;
        case "gt":
          return Number(value) > Number(condition.value);
        case "lt":
          return Number(value) < Number(condition.value);
        case "gte":
          return Number(value) >= Number(condition.value);
        case "lte":
          return Number(value) <= Number(condition.value);
        case "contains":
          return String(value).includes(String(condition.value));
        case "exists":
          return value !== undefined && value !== null;
        default:
          return false;
      }
    });
  }

  private getNestedValue(obj: Record<string, any>, path: string): any {
    return path.split(".").reduce((current, key) => current?.[key], obj);
  }

  calculateDeadlineAlerts(deadline: Date, daysBeforeDeadline: number[]): Date[] {
    return daysBeforeDeadline.map(days => {
      const alertDate = new Date(deadline);
      alertDate.setDate(alertDate.getDate() - days);
      return alertDate;
    }).filter(date => date > new Date());
  }

  getSeverityPriority(severity: string): number {
    const priorities: Record<string, number> = {
      info: 1,
      warning: 2,
      critical: 3,
      urgent: 4,
    };
    return priorities[severity] || 0;
  }

  generateAlertMessage(definition: AlertDefinition, context: Record<string, any>): { title: string; message: string } {
    let title = definition.name;
    let message = definition.description || "";

    for (const [key, value] of Object.entries(context)) {
      title = title.replace(`{${key}}`, String(value));
      message = message.replace(`{${key}}`, String(value));
    }

    return { title, message };
  }
}

export const DEFAULT_ALERTS: AlertDefinition[] = [
  {
    id: "sinan_pendencia_72h",
    name: "Notificação SINAN Pendente há 72h",
    slug: "sinan_pendencia_72h",
    description: "Notificação SINAN não foi processada em 72 horas",
    category: "pendencia",
    triggerType: "deadline",
    triggerConfig: {
      deadlineField: "createdAt",
      daysBeforeDeadline: [3, 2, 1],
    },
    conditions: [
      { field: "status", operator: "eq", value: "rascunho" },
    ],
    severity: "warning",
    targetRoles: ["admin", "vigilancia", "gestor"],
    notificationChannels: ["ui", "email"],
  },
  {
    id: "sinan_prazo_sinan",
    name: "Prazo SINAN Vencendo",
    slug: "sinan_prazo_sinan",
    description: "O prazo para envio ao SINAN está próximo do vencimento",
    category: "prazo",
    triggerType: "deadline",
    triggerConfig: {
      deadlineField: "notificationDate",
      daysBeforeDeadline: [7, 3, 1],
    },
    conditions: [
      { field: "status", operator: "ne", value: "exportada" },
    ],
    severity: "critical",
    targetRoles: ["admin", "vigilancia"],
    notificationChannels: ["ui", "email"],
  },
  {
    id: "estoque_critico_fraldas",
    name: "Estoque Crítico de Fraldas",
    slug: "estoque_critico_fraldas",
    description: "Estoque de fraldas abaixo do mínimo em {unitName}",
    category: "estoque",
    triggerType: "threshold",
    triggerConfig: {
      threshold: 50,
    },
    conditions: [
      { field: "currentQuantity", operator: "lt", value: 50 },
      { field: "active", operator: "eq", value: true },
    ],
    severity: "warning",
    targetRoles: ["admin", "farmaceutico", "assistencia_social"],
    notificationChannels: ["ui"],
  },
  {
    id: "estoque_critico_medicamentos",
    name: "Estoque Crítico de Medicamentos",
    slug: "estoque_critico_medicamentos",
    description: "Medicamento {medicationName} abaixo do estoque mínimo",
    category: "estoque",
    triggerType: "threshold",
    triggerConfig: {
      threshold: 20,
    },
    conditions: [
      { field: "currentQuantity", operator: "lte", value: 20 },
      { field: "status", operator: "eq", value: "active" },
    ],
    severity: "warning",
    targetRoles: ["admin", "farmaceutico"],
    notificationChannels: ["ui"],
  },
  {
    id: "medicamento_vencendo",
    name: "Medicamento Próximo do Vencimento",
    slug: "medicamento_vencendo",
    description: "Lote {lotNumber} de {medicationName} vence em {daysUntilExpiry} dias",
    category: "prazo",
    triggerType: "deadline",
    triggerConfig: {
      deadlineField: "expirationDate",
      daysBeforeDeadline: [90, 60, 30, 15, 7],
    },
    conditions: [
      { field: "status", operator: "eq", value: "active" },
      { field: "currentQuantity", operator: "gt", value: 0 },
    ],
    severity: "warning",
    targetRoles: ["admin", "farmaceutico"],
    notificationChannels: ["ui"],
  },
  {
    id: "tfd_pendente_aprovacao",
    name: "TFD Pendente de Aprovação",
    slug: "tfd_pendente_aprovacao",
    description: "Solicitação TFD aguardando aprovação há mais de 48h",
    category: "pendencia",
    triggerType: "deadline",
    triggerConfig: {
      deadlineField: "createdAt",
      daysBeforeDeadline: [2, 1],
    },
    conditions: [
      { field: "status", operator: "eq", value: "solicitado" },
    ],
    severity: "warning",
    targetRoles: ["admin", "gestor"],
    notificationChannels: ["ui", "email"],
  },
  {
    id: "previne_indicador_baixo",
    name: "Indicador Previne Brasil Baixo",
    slug: "previne_indicador_baixo",
    description: "O indicador {indicatorName} está abaixo da meta: {currentValue}% (meta: {targetValue}%)",
    category: "risco_financeiro",
    triggerType: "threshold",
    triggerConfig: {
      threshold: 80,
    },
    severity: "critical",
    targetRoles: ["admin", "gestor"],
    notificationChannels: ["ui", "email"],
  },
  {
    id: "edital_aberto",
    name: "Novo Edital Disponível",
    slug: "edital_aberto",
    description: "Edital '{editalTitle}' com prazo até {closeDate}",
    category: "edital",
    triggerType: "event",
    triggerConfig: {
      eventType: "edital_created",
    },
    severity: "info",
    targetRoles: ["admin", "gestor"],
    notificationChannels: ["ui", "email"],
  },
  {
    id: "edital_vencendo",
    name: "Edital Próximo do Vencimento",
    slug: "edital_vencendo",
    description: "Edital '{editalTitle}' encerra em {daysRemaining} dias",
    category: "edital",
    triggerType: "deadline",
    triggerConfig: {
      deadlineField: "closeDate",
      daysBeforeDeadline: [30, 15, 7, 3, 1],
    },
    conditions: [
      { field: "status", operator: "eq", value: "aberto" },
    ],
    severity: "warning",
    targetRoles: ["admin", "gestor"],
    notificationChannels: ["ui", "email"],
  },
  {
    id: "prescricao_controlada_vencendo",
    name: "Prescrição Controlada Vencendo",
    slug: "prescricao_controlada_vencendo",
    description: "Prescrição de medicamento controlado para {patientName} vence em {daysRemaining} dias",
    category: "prazo",
    triggerType: "deadline",
    triggerConfig: {
      deadlineField: "validUntil",
      daysBeforeDeadline: [7, 3, 1],
    },
    conditions: [
      { field: "status", operator: "eq", value: "ativa" },
      { field: "isControlled", operator: "eq", value: true },
    ],
    severity: "warning",
    targetRoles: ["medico", "farmaceutico"],
    notificationChannels: ["ui"],
  },
];

export const alertScheduler = new AlertScheduler();

DEFAULT_ALERTS.forEach(alert => alertScheduler.registerAlert(alert));
