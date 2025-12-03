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

router.get("/active", enforceUnitScope({ requireUnitId: false }), async (req: Request, res: Response) => {
  try {
    const effectiveUnitId = getEffectiveUnitId(req);
    
    const sampleAlerts = [
      {
        id: "alert-1",
        title: "Estoque baixo de Losartana 50mg",
        message: "O estoque está abaixo do mínimo. Quantidade atual: 120 unidades (mínimo: 150)",
        severity: "high",
        category: "estoque",
        status: "active",
        createdAt: new Date().toISOString(),
      },
      {
        id: "alert-2", 
        title: "Prazo SINAN expirando",
        message: "3 notificações SINAN com prazo expirando em 48 horas",
        severity: "medium",
        category: "prazo",
        status: "active",
        createdAt: new Date().toISOString(),
      },
      {
        id: "alert-3",
        title: "Estoque crítico de fraldas G",
        message: "Estoque de fraldas tamanho G está crítico. Apenas 45 unidades disponíveis.",
        severity: "critical",
        category: "estoque",
        status: "active",
        createdAt: new Date().toISOString(),
      },
    ];

    res.json(sampleAlerts);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/all", requireAuth, async (req: Request, res: Response) => {
  try {
    const effectiveUnitId = getEffectiveUnitId(req);
    const { severity, category, status } = req.query;

    const sampleAlerts = [
      {
        id: "alert-1",
        title: "Estoque baixo de Losartana 50mg",
        message: "O estoque está abaixo do mínimo. Quantidade atual: 120 unidades (mínimo: 150)",
        severity: "high",
        category: "estoque",
        status: "active",
        createdAt: new Date().toISOString(),
      },
      {
        id: "alert-2", 
        title: "Prazo SINAN expirando",
        message: "3 notificações SINAN com prazo expirando em 48 horas",
        severity: "medium",
        category: "prazo",
        status: "active",
        createdAt: new Date().toISOString(),
      },
      {
        id: "alert-3",
        title: "Estoque crítico de fraldas G",
        message: "Estoque de fraldas tamanho G está crítico. Apenas 45 unidades disponíveis.",
        severity: "critical",
        category: "estoque",
        status: "active",
        createdAt: new Date().toISOString(),
      },
      {
        id: "alert-4",
        title: "TFD pendente de aprovação",
        message: "5 solicitações de TFD aguardando aprovação há mais de 48h",
        severity: "medium",
        category: "pendencia",
        status: "acknowledged",
        acknowledgedAt: new Date().toISOString(),
        createdAt: new Date(Date.now() - 86400000).toISOString(),
      },
    ];

    let filtered = sampleAlerts;
    if (severity) filtered = filtered.filter(a => a.severity === severity);
    if (category) filtered = filtered.filter(a => a.category === category);
    if (status) filtered = filtered.filter(a => a.status === status);

    res.json(filtered);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/:id/acknowledge", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.session?.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: "Não autorizado" });
    }

    res.json({
      id,
      status: "acknowledged",
      acknowledgedAt: new Date().toISOString(),
      acknowledgedBy: userId,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/:id/resolve", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.session?.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: "Não autorizado" });
    }

    res.json({
      id,
      status: "resolved",
      resolvedAt: new Date().toISOString(),
      resolvedBy: userId,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/:id/dismiss", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.session?.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: "Não autorizado" });
    }

    res.json({
      id,
      status: "dismissed",
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/stats", requireAuth, async (req: Request, res: Response) => {
  try {
    res.json({
      total: 12,
      active: 3,
      acknowledged: 5,
      resolved: 3,
      dismissed: 1,
      byCategory: {
        estoque: 4,
        prazo: 3,
        pendencia: 3,
        epidemiologico: 2,
      },
      bySeverity: {
        critical: 2,
        high: 4,
        medium: 5,
        low: 1,
      },
    });
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
