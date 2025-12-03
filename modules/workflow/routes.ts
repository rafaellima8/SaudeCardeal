import { Router, Request, Response } from "express";
import { z } from "zod";
import { storage } from "../../server/storage";
import { 
  workflowEngine, 
  DEFAULT_SINAN_WORKFLOW, 
  DEFAULT_TFD_WORKFLOW,
  DEFAULT_PRESCRIPTION_WORKFLOW,
  DEFAULT_DIAPER_REQUEST_WORKFLOW 
} from "./workflow-engine";
import { requireAuth, getEffectiveUnitId, enforceUnitScope } from "../../server/auth";

const router = Router();

const workflowActionSchema = z.object({
  action: z.enum(["submit", "approve", "reject", "request_changes", "forward", "comment"]),
  comment: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

const createInstanceSchema = z.object({
  definitionSlug: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  metadata: z.record(z.any()).optional(),
});

const DEFAULT_WORKFLOWS = {
  sinan: { 
    name: "Fluxo SINAN", 
    entityType: "sinan_notification", 
    steps: DEFAULT_SINAN_WORKFLOW,
    description: "Fluxo de aprovação para notificações SINAN: Unidade → Vigilância → CPD",
  },
  tfd: { 
    name: "Fluxo TFD", 
    entityType: "tfd_request", 
    steps: DEFAULT_TFD_WORKFLOW,
    description: "Fluxo de aprovação para solicitações TFD: Unidade → Gestor → Agendamento",
  },
  prescription: { 
    name: "Fluxo Prescrição", 
    entityType: "prescription", 
    steps: DEFAULT_PRESCRIPTION_WORKFLOW,
    description: "Fluxo de prescrição: Profissional → Farmácia",
  },
  diaper: { 
    name: "Fluxo Fraldas", 
    entityType: "diaper_request", 
    steps: DEFAULT_DIAPER_REQUEST_WORKFLOW,
    description: "Fluxo de solicitação de fraldas: Assistência Social → Autorização → Entrega",
  },
};

router.get("/definitions", requireAuth, async (_req: Request, res: Response) => {
  try {
    const dbDefinitions = await storage.getWorkflowDefinitions({ isActive: true });
    
    const builtInDefinitions = Object.entries(DEFAULT_WORKFLOWS).map(([slug, def]) => ({
      id: `builtin-${slug}`,
      slug,
      isBuiltIn: true,
      ...def,
    }));

    res.json([...builtInDefinitions, ...dbDefinitions.map(d => ({ ...d, isBuiltIn: false }))]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/definitions/:slug", requireAuth, async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    
    const dbDef = await storage.getWorkflowDefinitionBySlug(slug);
    if (dbDef) {
      return res.json({ ...dbDef, isBuiltIn: false });
    }

    if (DEFAULT_WORKFLOWS[slug as keyof typeof DEFAULT_WORKFLOWS]) {
      return res.json({
        id: `builtin-${slug}`,
        slug,
        isBuiltIn: true,
        ...DEFAULT_WORKFLOWS[slug as keyof typeof DEFAULT_WORKFLOWS],
      });
    }

    res.status(404).json({ error: "Workflow não encontrado" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/available-actions", requireAuth, async (req: Request, res: Response) => {
  try {
    const { status, role } = req.query;
    
    if (!status || !role) {
      return res.status(400).json({ error: "Status e role são obrigatórios" });
    }

    const actions = workflowEngine.getAvailableActions(
      status as string, 
      role as string
    );

    res.json({ status, role, availableActions: actions });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/validate-transition", requireAuth, async (req: Request, res: Response) => {
  try {
    const { currentStatus, action, userRole } = req.body;
    
    const canTransition = workflowEngine.canTransition(currentStatus, action, userRole);
    const nextStatus = workflowEngine.getNextStatus(currentStatus, action);

    res.json({
      canTransition,
      nextStatus,
      currentStatus,
      action,
      userRole,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/instances", requireAuth, async (req: Request, res: Response) => {
  try {
    const effectiveUnitId = getEffectiveUnitId(req);
    const { entityType, status } = req.query;

    const instances = await storage.getWorkflowInstances({
      unitId: effectiveUnitId || undefined,
      entityType: entityType as string,
      status: status as string,
    });

    res.json(instances);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/instances", requireAuth, async (req: Request, res: Response) => {
  try {
    const effectiveUnitId = getEffectiveUnitId(req);
    const userId = req.session?.user?.id;
    
    if (!effectiveUnitId || !userId) {
      return res.status(401).json({ error: "Não autorizado" });
    }

    const data = createInstanceSchema.parse(req.body);
    
    let definitionId = `builtin-${data.definitionSlug}`;
    const dbDef = await storage.getWorkflowDefinitionBySlug(data.definitionSlug);
    if (dbDef) {
      definitionId = dbDef.id;
    }

    const instance = await storage.createWorkflowInstance({
      definitionId,
      entityType: data.entityType,
      entityId: data.entityId,
      unitId: effectiveUnitId,
      currentStep: 0,
      status: "pending",
      metadata: data.metadata,
      createdBy: userId,
    });

    res.status(201).json(instance);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Dados inválidos", details: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
});

router.post("/instances/:id/action", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.session?.user;
    
    if (!user) {
      return res.status(401).json({ error: "Não autorizado" });
    }

    const data = workflowActionSchema.parse(req.body);
    
    const instance = await storage.getWorkflowInstanceById(id);
    if (!instance) {
      return res.status(404).json({ error: "Instância de workflow não encontrada" });
    }

    const canTransition = workflowEngine.canTransition(instance.status, data.action, user.role);
    if (!canTransition) {
      return res.status(403).json({ error: "Ação não permitida para este status/role" });
    }

    const nextStatus = workflowEngine.getNextStatus(instance.status, data.action);
    
    await storage.createWorkflowAction({
      instanceId: id,
      stepNumber: instance.currentStep,
      action: data.action,
      comment: data.comment,
      metadata: data.metadata,
      actionBy: user.id,
      actionByName: user.name,
      actionByRole: user.role,
    });

    const updatedInstance = await storage.updateWorkflowInstance(id, {
      status: nextStatus as any,
      currentStep: data.action === "approve" ? instance.currentStep + 1 : instance.currentStep,
      completedAt: nextStatus === "approved" || nextStatus === "rejected" ? new Date() : undefined,
    });

    res.json(updatedInstance);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Dados inválidos", details: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
});

router.get("/instances/:id/actions", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const actions = await storage.getWorkflowActions(id);
    res.json(actions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/stats", requireAuth, async (req: Request, res: Response) => {
  try {
    const effectiveUnitId = getEffectiveUnitId(req);

    const allInstances = await storage.getWorkflowInstances({
      unitId: effectiveUnitId || undefined,
    });

    const stats = {
      total: allInstances.length,
      pending: allInstances.filter(i => i.status === "pending").length,
      inProgress: allInstances.filter(i => i.status === "in_progress").length,
      approved: allInstances.filter(i => i.status === "approved").length,
      rejected: allInstances.filter(i => i.status === "rejected").length,
      byType: {} as Record<string, { pending: number; inProgress: number; approved: number }>,
    };

    for (const instance of allInstances) {
      if (!stats.byType[instance.entityType]) {
        stats.byType[instance.entityType] = { pending: 0, inProgress: 0, approved: 0 };
      }
      if (instance.status === "pending") stats.byType[instance.entityType].pending++;
      if (instance.status === "in_progress") stats.byType[instance.entityType].inProgress++;
      if (instance.status === "approved") stats.byType[instance.entityType].approved++;
    }

    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
