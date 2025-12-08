import { Router, Request, Response } from "express";
import { z } from "zod";
import { alertScheduler, DEFAULT_ALERTS } from "./alert-scheduler";
import { storage } from "../../server/storage";
import { requireAuth, getEffectiveUnitId, enforceUnitScope } from "../../server/auth";

const router = Router();

router.get("/rules", requireAuth, async (req: Request, res: Response) => {
  try {
    const { category } = req.query;
    
    const dbRules = await storage.getAlertRules({ 
      category: category as string | undefined,
      isActive: true 
    });
    
    const builtInRules = DEFAULT_ALERTS.map(rule => ({
      ...rule,
      isBuiltIn: true,
    }));
    
    const allRules = [...builtInRules, ...dbRules.map(r => ({ ...r, isBuiltIn: false }))];
    
    if (category) {
      res.json(allRules.filter(r => r.category === category));
    } else {
      res.json(allRules);
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/rules/:slug", requireAuth, async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    
    const dbRule = await storage.getAlertRuleBySlug(slug);
    if (dbRule) {
      return res.json({ ...dbRule, isBuiltIn: false });
    }
    
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
  try {
    const unitId = getEffectiveUnitId(req);
    const { severity, category } = req.query;
    
    const alerts = await storage.getAlertInstances({
      unitId: unitId!,
      severity: severity as string | undefined,
      category: category as string | undefined,
      status: "active",
    });
    
    res.json(alerts);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/all", enforceUnitScope({ requireUnitId: true }), async (req: Request, res: Response) => {
  try {
    const unitId = getEffectiveUnitId(req);
    const { severity, category, status } = req.query;
    
    const alerts = await storage.getAlertInstances({
      unitId: unitId!,
      severity: severity as string | undefined,
      category: category as string | undefined,
      status: status as string | undefined,
    });
    
    res.json(alerts);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/:id/acknowledge", enforceUnitScope({ requireUnitId: true }), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const unitId = getEffectiveUnitId(req);
    const user = req.session.user;
    
    const alert = await storage.getAlertInstanceById(id);
    if (!alert) {
      return res.status(404).json({ error: "Alerta não encontrado" });
    }
    
    if (alert.unitId !== unitId) {
      return res.status(403).json({ error: "Acesso negado a este alerta" });
    }
    
    const updated = await storage.updateAlertInstance(id, {
      status: "acknowledged",
      acknowledgedAt: new Date(),
      acknowledgedBy: user?.id,
    });
    
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/:id/resolve", enforceUnitScope({ requireUnitId: true }), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const unitId = getEffectiveUnitId(req);
    const user = req.session.user;
    
    const alert = await storage.getAlertInstanceById(id);
    if (!alert) {
      return res.status(404).json({ error: "Alerta não encontrado" });
    }
    
    if (alert.unitId !== unitId) {
      return res.status(403).json({ error: "Acesso negado a este alerta" });
    }
    
    const updated = await storage.updateAlertInstance(id, {
      status: "resolved",
      resolvedAt: new Date(),
      resolvedBy: user?.id,
    });
    
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/:id/dismiss", enforceUnitScope({ requireUnitId: true }), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const unitId = getEffectiveUnitId(req);
    
    const alert = await storage.getAlertInstanceById(id);
    if (!alert) {
      return res.status(404).json({ error: "Alerta não encontrado" });
    }
    
    if (alert.unitId !== unitId) {
      return res.status(403).json({ error: "Acesso negado a este alerta" });
    }
    
    const updated = await storage.updateAlertInstance(id, {
      status: "dismissed",
    });
    
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/stats", enforceUnitScope({ requireUnitId: true }), async (req: Request, res: Response) => {
  try {
    const unitId = getEffectiveUnitId(req);
    
    const allAlerts = await storage.getAlertInstances({ unitId: unitId! });
    
    const stats = {
      total: allAlerts.length,
      active: allAlerts.filter(a => a.status === "active").length,
      acknowledged: allAlerts.filter(a => a.status === "acknowledged").length,
      resolved: allAlerts.filter(a => a.status === "resolved").length,
      dismissed: allAlerts.filter(a => a.status === "dismissed").length,
      byCategory: {} as Record<string, number>,
      bySeverity: {} as Record<string, number>,
    };
    
    allAlerts.forEach(alert => {
      if (alert.category) {
        stats.byCategory[alert.category] = (stats.byCategory[alert.category] || 0) + 1;
      }
      if (alert.severity) {
        stats.bySeverity[alert.severity] = (stats.bySeverity[alert.severity] || 0) + 1;
      }
    });
    
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
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
