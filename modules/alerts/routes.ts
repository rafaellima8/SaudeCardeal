import { Router, Request, Response } from "express";
import { z } from "zod";
import { alertScheduler, DEFAULT_ALERTS } from "./alert-scheduler";
import { requireAuth, getEffectiveUnitId, enforceUnitScope } from "../../server/auth";

const router = Router();

router.get("/rules", requireAuth, async (req: Request, res: Response) => {
  try {
    const { category } = req.query;
    
    const builtInRules = DEFAULT_ALERTS.map(rule => ({
      ...rule,
      isBuiltIn: true,
    }));
    
    if (category) {
      res.json(builtInRules.filter(r => r.category === category));
    } else {
      res.json(builtInRules);
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/rules/:slug", requireAuth, async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    
    const builtInRule = DEFAULT_ALERTS.find(a => a.slug === slug);
    if (builtInRule) {
      return res.json({ ...builtInRule, isBuiltIn: true });
    }

    res.status(404).json({ error: "Regra de alerta não encontrada" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/active", enforceUnitScope({ requireUnitId: true }), async (req: Request, res: Response) => {
  // Feature flag: Alerts data persistence not yet implemented
  // Return empty array until storage-backed queries are ready
  // This prevents cross-tenant data exposure through mock data
  res.json([]);
});

router.get("/all", enforceUnitScope({ requireUnitId: true }), async (req: Request, res: Response) => {
  // Feature flag: Alerts data persistence not yet implemented
  // Return empty array until storage-backed queries are ready
  // This prevents cross-tenant data exposure through mock data
  res.json([]);
});

router.post("/:id/acknowledge", enforceUnitScope({ requireUnitId: true }), async (req: Request, res: Response) => {
  // Feature flag: Alerts persistence not yet implemented
  // Return 503 until storage-backed operations are ready
  // This prevents fabricated responses without verifying tenant-bound records
  res.status(503).json({ 
    error: "Funcionalidade em desenvolvimento",
    message: "O sistema de alertas ainda está sendo implementado"
  });
});

router.post("/:id/resolve", enforceUnitScope({ requireUnitId: true }), async (req: Request, res: Response) => {
  // Feature flag: Alerts persistence not yet implemented
  // Return 503 until storage-backed operations are ready
  res.status(503).json({ 
    error: "Funcionalidade em desenvolvimento",
    message: "O sistema de alertas ainda está sendo implementado"
  });
});

router.post("/:id/dismiss", enforceUnitScope({ requireUnitId: true }), async (req: Request, res: Response) => {
  // Feature flag: Alerts persistence not yet implemented
  res.status(503).json({ 
    error: "Funcionalidade em desenvolvimento",
    message: "O sistema de alertas ainda está sendo implementado"
  });
});

router.get("/stats", enforceUnitScope({ requireUnitId: true }), async (req: Request, res: Response) => {
  // Feature flag: Return empty stats until storage-backed queries are ready
  res.json({
    total: 0,
    active: 0,
    acknowledged: 0,
    resolved: 0,
    dismissed: 0,
    byCategory: {},
    bySeverity: {},
  });
});

router.get("/categories", requireAuth, async (_req: Request, res: Response) => {
  res.json([
    { value: "prazo", label: "Prazos", icon: "clock" },
    { value: "pendencia", label: "Pendências", icon: "alert-circle" },
    { value: "risco_financeiro", label: "Risco Financeiro", icon: "dollar-sign" },
    { value: "edital", label: "Editais", icon: "file-text" },
    { value: "irregularidade", label: "Irregularidades", icon: "alert-triangle" },
    { value: "epidemiologico", label: "Epidemiológico", icon: "activity" },
    { value: "estoque", label: "Estoque", icon: "package" },
    { value: "compliance", label: "Compliance", icon: "shield" },
  ]);
});

export default router;
