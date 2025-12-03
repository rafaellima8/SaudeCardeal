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

export const workflowEngine = new WorkflowEngine();
