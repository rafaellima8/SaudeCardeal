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

router.get("/instances", enforceUnitScope({ requireUnitId: true }), async (req: Request, res: Response) => {
  try {
    const unitId = getEffectiveUnitId(req);
    const { entityType, status } = req.query;
    
    const instances = await storage.getWorkflowInstances({
      unitId: unitId!,
      entityType: entityType as string | undefined,
      status: status as string | undefined,
    });
    
    res.json(instances);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/instances", enforceUnitScope({ requireUnitId: true }), async (req: Request, res: Response) => {
  try {
    const unitId = getEffectiveUnitId(req);
    const user = req.session.user;
    const validation = createInstanceSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.errors });
    }
    
    const { definitionSlug, entityType, entityId, metadata } = validation.data;
    
    const definition = await storage.getWorkflowDefinitionBySlug(definitionSlug);
    const builtInDef = DEFAULT_WORKFLOWS[definitionSlug as keyof typeof DEFAULT_WORKFLOWS];
    
    if (!definition && !builtInDef) {
      return res.status(404).json({ error: "Workflow não encontrado" });
    }
    
    const instance = await storage.createWorkflowInstance({
      definitionId: definition?.id || `builtin-${definitionSlug}`,
      entityType,
      entityId,
      unitId: unitId!,
      status: "pending",
      currentStep: 0,
      metadata: metadata || {},
      createdBy: user?.id,
    });
    
    res.status(201).json(instance);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/instances/:id/action", enforceUnitScope({ requireUnitId: true }), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const unitId = getEffectiveUnitId(req);
    const user = req.session.user;
    
    const validation = workflowActionSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.errors });
    }
    
    const { action, comment, metadata } = validation.data;
    
    const instance = await storage.getWorkflowInstanceById(id);
    if (!instance) {
      return res.status(404).json({ error: "Instância de workflow não encontrada" });
    }
    
    if (instance.unitId !== unitId) {
      return res.status(403).json({ error: "Acesso negado a esta instância" });
    }
    
    const canTransition = workflowEngine.canTransition(instance.status, action, user?.role || "admin");
    if (!canTransition) {
      return res.status(400).json({ error: "Transição não permitida para seu perfil" });
    }
    
    const nextStatus = workflowEngine.getNextStatus(instance.status, action);
    
    await storage.createWorkflowAction({
      instanceId: id,
      stepNumber: (instance.currentStep || 0) + 1,
      action,
      actionBy: user?.id,
      actionByName: user?.name || "Sistema",
      actionByRole: user?.role || "admin",
      comment: comment || null,
      metadata: metadata || {},
    });
    
    const updated = await storage.updateWorkflowInstance(id, {
      status: (nextStatus || instance.status) as any,
      currentStep: (instance.currentStep || 0) + 1,
    });
    
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/instances/:id/actions", enforceUnitScope({ requireUnitId: true }), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const unitId = getEffectiveUnitId(req);
    
    const instance = await storage.getWorkflowInstanceById(id);
    if (!instance) {
      return res.status(404).json({ error: "Instância não encontrada" });
    }
    
    if (instance.unitId !== unitId) {
      return res.status(403).json({ error: "Acesso negado" });
    }
    
    const actions = await storage.getWorkflowActions(id);
    res.json(actions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/stats", enforceUnitScope({ requireUnitId: true }), async (req: Request, res: Response) => {
  try {
    const unitId = getEffectiveUnitId(req);
    
    const instances = await storage.getWorkflowInstances({ unitId: unitId! });
    
    const stats = {
      total: instances.length,
      pending: instances.filter(i => i.status === "pending").length,
      inProgress: instances.filter(i => i.status === "in_progress").length,
      approved: instances.filter(i => i.status === "approved").length,
      rejected: instances.filter(i => i.status === "rejected").length,
      byType: {} as Record<string, number>,
    };
    
    instances.forEach(instance => {
      if (instance.entityType) {
        stats.byType[instance.entityType] = (stats.byType[instance.entityType] || 0) + 1;
      }
    });
    
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
