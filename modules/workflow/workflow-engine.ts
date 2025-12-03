import * as schema from "@shared/schema";

export interface WorkflowStep {
  order: number;
  name: string;
  role: string;
  action: "approve" | "reject" | "review" | "forward";
  autoApproveAfterHours?: number;
  requiredFields?: string[];
}

export interface WorkflowTransition {
  from: string;
  to: string;
  action: string;
  allowedRoles: string[];
}

export class WorkflowEngine {
  private readonly transitions: WorkflowTransition[] = [
    { from: "pending", to: "in_progress", action: "submit", allowedRoles: ["*"] },
    { from: "in_progress", to: "approved", action: "approve", allowedRoles: ["admin", "gestor", "vigilancia"] },
    { from: "in_progress", to: "rejected", action: "reject", allowedRoles: ["admin", "gestor", "vigilancia"] },
    { from: "in_progress", to: "pending", action: "request_changes", allowedRoles: ["admin", "gestor", "vigilancia"] },
    { from: "rejected", to: "in_progress", action: "resubmit", allowedRoles: ["*"] },
    { from: "approved", to: "cancelled", action: "cancel", allowedRoles: ["admin"] },
  ];

  canTransition(currentStatus: string, action: string, userRole: string): boolean {
    const transition = this.transitions.find(
      t => t.from === currentStatus && t.action === action
    );

    if (!transition) return false;

    return transition.allowedRoles.includes("*") || transition.allowedRoles.includes(userRole);
  }

  getNextStatus(currentStatus: string, action: string): string | null {
    const transition = this.transitions.find(
      t => t.from === currentStatus && t.action === action
    );

    return transition?.to || null;
  }

  getAvailableActions(currentStatus: string, userRole: string): string[] {
    return this.transitions
      .filter(t => t.from === currentStatus)
      .filter(t => t.allowedRoles.includes("*") || t.allowedRoles.includes(userRole))
      .map(t => t.action);
  }

  validateStepCompletion(steps: WorkflowStep[], currentStep: number, payload: Record<string, any>): { valid: boolean; missingFields: string[] } {
    const step = steps[currentStep];
    if (!step || !step.requiredFields) {
      return { valid: true, missingFields: [] };
    }

    const missingFields: string[] = [];
    for (const field of step.requiredFields) {
      if (payload[field] === undefined || payload[field] === null || payload[field] === "") {
        missingFields.push(field);
      }
    }

    return { valid: missingFields.length === 0, missingFields };
  }

  calculateDueDate(steps: WorkflowStep[], currentStep: number, startDate: Date): Date | null {
    const step = steps[currentStep];
    if (!step || !step.autoApproveAfterHours) {
      return null;
    }

    const dueDate = new Date(startDate);
    dueDate.setHours(dueDate.getHours() + step.autoApproveAfterHours);
    return dueDate;
  }

  shouldAutoApprove(steps: WorkflowStep[], currentStep: number, startDate: Date): boolean {
    const dueDate = this.calculateDueDate(steps, currentStep, startDate);
    if (!dueDate) return false;
    return new Date() > dueDate;
  }
}

export const DEFAULT_SINAN_WORKFLOW: WorkflowStep[] = [
  {
    order: 0,
    name: "Preenchimento na Unidade",
    role: "acs,enfermeiro,medico,recepcao",
    action: "review",
  },
  {
    order: 1,
    name: "Validação pela Vigilância",
    role: "vigilancia,gestor",
    action: "approve",
    autoApproveAfterHours: 72,
  },
  {
    order: 2,
    name: "Digitação no CPD",
    role: "cpd,admin",
    action: "approve",
  },
];

export const DEFAULT_TFD_WORKFLOW: WorkflowStep[] = [
  {
    order: 0,
    name: "Solicitação na Unidade",
    role: "recepcao,medico,enfermeiro",
    action: "review",
    requiredFields: ["cidPrimary", "destinationMunicipality", "procedureCode"],
  },
  {
    order: 1,
    name: "Autorização do Gestor",
    role: "gestor,admin",
    action: "approve",
    autoApproveAfterHours: 48,
  },
  {
    order: 2,
    name: "Agendamento",
    role: "recepcao,gestor",
    action: "forward",
  },
];

export const DEFAULT_PRESCRIPTION_WORKFLOW: WorkflowStep[] = [
  {
    order: 0,
    name: "Prescrição pelo Profissional",
    role: "medico,enfermeiro",
    action: "approve",
    requiredFields: ["citizenId", "professionalId", "items"],
  },
  {
    order: 1,
    name: "Dispensação pela Farmácia",
    role: "farmaceutico,admin",
    action: "approve",
  },
];

export const DEFAULT_DIAPER_REQUEST_WORKFLOW: WorkflowStep[] = [
  {
    order: 0,
    name: "Solicitação pelo Assistente Social",
    role: "assistencia_social,acs",
    action: "review",
    requiredFields: ["beneficiaryId", "diaperSize", "quantityRequested"],
  },
  {
    order: 1,
    name: "Autorização",
    role: "assistencia_social,gestor",
    action: "approve",
  },
  {
    order: 2,
    name: "Entrega",
    role: "assistencia_social,farmaceutico",
    action: "approve",
  },
];

export const WORKFLOW_DEFINITIONS = [
  {
    id: "builtin-sinan",
    slug: "sinan",
    name: "Fluxo SINAN",
    entityType: "sinan_notification",
    description: "Fluxo de aprovação para notificações SINAN: Unidade → Vigilância → CPD",
    isBuiltIn: true,
    steps: DEFAULT_SINAN_WORKFLOW,
  },
  {
    id: "builtin-tfd",
    slug: "tfd",
    name: "Fluxo TFD",
    entityType: "tfd_request",
    description: "Fluxo de aprovação para solicitações TFD: Unidade → Gestor → Agendamento",
    isBuiltIn: true,
    steps: DEFAULT_TFD_WORKFLOW,
  },
  {
    id: "builtin-prescription",
    slug: "prescription",
    name: "Fluxo Prescrição",
    entityType: "prescription",
    description: "Fluxo de prescrição: Profissional → Farmácia",
    isBuiltIn: true,
    steps: DEFAULT_PRESCRIPTION_WORKFLOW,
  },
  {
    id: "builtin-diaper",
    slug: "diaper",
    name: "Fluxo Fraldas",
    entityType: "diaper_request",
    description: "Fluxo de solicitação de fraldas: Assistência Social → Autorização → Entrega",
    isBuiltIn: true,
    steps: DEFAULT_DIAPER_REQUEST_WORKFLOW,
  },
];

class ExtendedWorkflowEngine extends WorkflowEngine {
  getWorkflowBySlug(slug: string) {
    return WORKFLOW_DEFINITIONS.find(w => w.slug === slug) || null;
  }

  getAvailableActionsForWorkflow(workflowSlug: string, status: string, role: string): string[] {
    const workflow = WORKFLOW_DEFINITIONS.find(w => w.slug === workflowSlug);
    if (!workflow) return [];
    return this.getAvailableActions(status, role);
  }

  validateWorkflowTransition(workflowSlug: string, fromStatus: string, toStatus: string, role: string) {
    const workflow = WORKFLOW_DEFINITIONS.find(w => w.slug === workflowSlug);
    if (!workflow) {
      return { isValid: false, reason: "Workflow não encontrado" };
    }
    
    const availableActions = this.getAvailableActions(fromStatus, role);
    if (availableActions.length === 0) {
      return { isValid: false, reason: "Nenhuma ação disponível para este status e papel" };
    }
    
    const nextStatus = this.getNextStatus(fromStatus, availableActions[0]);
    if (nextStatus !== toStatus && toStatus !== "approved" && toStatus !== "in_progress") {
      return { isValid: false, reason: "Transição de status inválida" };
    }
    
    return { isValid: true };
  }
}

export const workflowEngine = new ExtendedWorkflowEngine();
