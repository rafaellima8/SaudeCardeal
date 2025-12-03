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
  // Feature flag: Workflow instances persistence needs unit-scoped filtering
  // Return empty array until properly filtered by unitId
  // This prevents cross-tenant data exposure
  res.json([]);
});

router.post("/instances", enforceUnitScope({ requireUnitId: true }), async (req: Request, res: Response) => {
  // Feature flag: Workflow instances creation disabled until persistence is ready
  res.status(503).json({ 
    error: "Funcionalidade em desenvolvimento",
    message: "Criação de instâncias de workflow ainda está sendo implementada"
  });
});

router.post("/instances/:id/action", enforceUnitScope({ requireUnitId: true }), async (req: Request, res: Response) => {
  // Feature flag: Workflow actions disabled until persistence is ready
  res.status(503).json({ 
    error: "Funcionalidade em desenvolvimento",
    message: "Ações em workflows ainda estão sendo implementadas"
  });
});

router.get("/instances/:id/actions", enforceUnitScope({ requireUnitId: true }), async (req: Request, res: Response) => {
  // Feature flag: Return empty array until unit-scoped filtering is implemented
  res.json([]);
});

router.get("/stats", enforceUnitScope({ requireUnitId: true }), async (req: Request, res: Response) => {
  // Feature flag: Return empty stats until unit-scoped filtering is implemented
  res.json({
    total: 0,
    pending: 0,
    inProgress: 0,
    approved: 0,
    rejected: 0,
    byType: {},
  });
});

export default router;
