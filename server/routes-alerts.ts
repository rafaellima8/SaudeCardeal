import { Router } from "express";
import { db } from "./db";
import { 
  clinicalProtocols, 
  protocolAlerts,
  insertClinicalProtocolSchema,
  updateProtocolAlertSchema,
} from "@shared/schema";
import { eq, and, desc, or, isNull } from "drizzle-orm";
import { requireAuth, enforceUnitScope, getEffectiveUnitId, requireRole } from "./auth";
import { protocolAlertService } from "./services/protocol-alert-drizzle.service";
import { z } from "zod";

const router = Router();

router.use(requireAuth);

// ============================================================================
// CLINICAL PROTOCOLS CRUD
// ============================================================================

// GET /api/protocols - Lista protocolos clínicos
router.get("/protocols", enforceUnitScope(), async (req, res) => {
  try {
    const effectiveUnitId = getEffectiveUnitId(req);
    
    let protocols;
    
    if (effectiveUnitId) {
      // Unit-specific: show global protocols (unitId null) + unit-specific protocols
      protocols = await db
        .select()
        .from(clinicalProtocols)
        .where(
          or(
            eq(clinicalProtocols.unitId, effectiveUnitId),
            isNull(clinicalProtocols.unitId)
          )
        )
        .orderBy(desc(clinicalProtocols.createdAt));
    } else {
      // Admin: show all protocols
      protocols = await db
        .select()
        .from(clinicalProtocols)
        .orderBy(desc(clinicalProtocols.createdAt));
    }
    
    res.json(protocols);
  } catch (error: any) {
    console.error("Error fetching protocols:", error);
    res.status(500).json({ error: "Erro ao buscar protocolos" });
  }
});

// GET /api/protocols/:id - Detalhes do protocolo
router.get("/protocols/:id", enforceUnitScope(), async (req, res) => {
  try {
    const protocol = await db
      .select()
      .from(clinicalProtocols)
      .where(eq(clinicalProtocols.id, req.params.id))
      .limit(1);

    if (protocol.length === 0) {
      return res.status(404).json({ error: "Protocolo não encontrado" });
    }

    res.json(protocol[0]);
  } catch (error: any) {
    console.error("Error fetching protocol:", error);
    res.status(500).json({ error: "Erro ao buscar protocolo" });
  }
});

// POST /api/protocols - Criar protocolo
router.post("/protocols", requireRole(["admin", "gestor", "medico"]), enforceUnitScope(), async (req, res) => {
  try {
    const effectiveUnitId = getEffectiveUnitId(req);
    const body = req.body;
    
    const protocolData = {
      name: body.name,
      description: body.description || null,
      category: body.category || "diagnosis",
      careLineId: body.careLineId || null,
      specialtyId: body.specialtyId || null,
      unitId: effectiveUnitId || body.unitId || null,
      triggerConditions: body.triggerConditions || null,
      alertMessage: body.alertMessage,
      alertLevel: body.alertLevel || "info",
      recommendation: body.recommendation || null,
      protocolReference: body.protocolReference || null,
      action: body.action || null,
      active: body.active !== false,
    };

    const [protocol] = await db
      .insert(clinicalProtocols)
      .values([protocolData as any])
      .returning();

    res.status(201).json(protocol);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: "Dados inválidos", 
        details: error.errors 
      });
    }
    console.error("Error creating protocol:", error);
    res.status(500).json({ error: "Erro ao criar protocolo" });
  }
});

// PATCH /api/protocols/:id - Atualizar protocolo
router.patch("/protocols/:id", requireRole(["admin", "gestor", "medico"]), enforceUnitScope(), async (req, res) => {
  try {
    const [protocol] = await db
      .update(clinicalProtocols)
      .set({
        ...req.body,
        updatedAt: new Date(),
      })
      .where(eq(clinicalProtocols.id, req.params.id))
      .returning();

    if (!protocol) {
      return res.status(404).json({ error: "Protocolo não encontrado" });
    }

    res.json(protocol);
  } catch (error: any) {
    console.error("Error updating protocol:", error);
    res.status(500).json({ error: "Erro ao atualizar protocolo" });
  }
});

// DELETE /api/protocols/:id - Desativar protocolo
router.delete("/protocols/:id", requireRole(["admin", "gestor"]), enforceUnitScope(), async (req, res) => {
  try {
    const [protocol] = await db
      .update(clinicalProtocols)
      .set({ active: false, updatedAt: new Date() })
      .where(eq(clinicalProtocols.id, req.params.id))
      .returning();

    if (!protocol) {
      return res.status(404).json({ error: "Protocolo não encontrado" });
    }

    res.json({ message: "Protocolo desativado com sucesso" });
  } catch (error: any) {
    console.error("Error deactivating protocol:", error);
    res.status(500).json({ error: "Erro ao desativar protocolo" });
  }
});

// ============================================================================
// PROTOCOL ALERTS
// ============================================================================

// POST /api/alerts/evaluate/:consultationId - Avaliar consulta contra protocolos
router.post("/alerts/evaluate/:consultationId", requireRole(["medico", "enfermeiro"]), async (req, res) => {
  try {
    const { consultationId } = req.params;
    const alerts = await protocolAlertService.evaluateConsultation(consultationId);
    
    res.json({
      success: true,
      alertsTriggered: alerts.length,
      alerts,
    });
  } catch (error: any) {
    console.error("Error evaluating consultation:", error);
    res.status(500).json({ error: "Erro ao avaliar consulta" });
  }
});

// GET /api/alerts/consultation/:consultationId - Alertas de uma consulta
router.get("/alerts/consultation/:consultationId", enforceUnitScope(), async (req, res) => {
  try {
    const alerts = await protocolAlertService.getAlertsForConsultation(req.params.consultationId);
    res.json(alerts);
  } catch (error: any) {
    console.error("Error fetching alerts:", error);
    res.status(500).json({ error: "Erro ao buscar alertas" });
  }
});

// GET /api/alerts/citizen/:citizenId - Alertas ativos de um cidadão
router.get("/alerts/citizen/:citizenId", enforceUnitScope(), async (req, res) => {
  try {
    const effectiveUnitId = getEffectiveUnitId(req);
    const alerts = await protocolAlertService.getActiveAlertsForCitizen(
      req.params.citizenId, 
      effectiveUnitId || undefined
    );
    res.json(alerts);
  } catch (error: any) {
    console.error("Error fetching citizen alerts:", error);
    res.status(500).json({ error: "Erro ao buscar alertas do paciente" });
  }
});

// GET /api/alerts/pending - Alertas pendentes (para painel)
router.get("/alerts/pending", enforceUnitScope(), async (req, res) => {
  try {
    const effectiveUnitId = getEffectiveUnitId(req);
    
    let conditions = [eq(protocolAlerts.status, "active")];
    if (effectiveUnitId) {
      conditions.push(eq(protocolAlerts.unitId, effectiveUnitId));
    }

    const alerts = await db
      .select()
      .from(protocolAlerts)
      .where(and(...conditions))
      .orderBy(desc(protocolAlerts.createdAt))
      .limit(50);

    res.json(alerts);
  } catch (error: any) {
    console.error("Error fetching pending alerts:", error);
    res.status(500).json({ error: "Erro ao buscar alertas pendentes" });
  }
});

// PATCH /api/alerts/:id/acknowledge - Reconhecer alerta
router.patch("/alerts/:id/acknowledge", requireRole(["medico", "enfermeiro"]), async (req, res) => {
  try {
    const user = req.session.user!;
    const professionalId = user.id; // Usar ID do usuário como profissional
    
    const alert = await protocolAlertService.acknowledgeAlert(req.params.id, professionalId);
    
    if (!alert) {
      return res.status(404).json({ error: "Alerta não encontrado" });
    }

    res.json(alert);
  } catch (error: any) {
    console.error("Error acknowledging alert:", error);
    res.status(500).json({ error: "Erro ao reconhecer alerta" });
  }
});

// PATCH /api/alerts/:id/dismiss - Ignorar alerta (requer justificativa)
router.patch("/alerts/:id/dismiss", requireRole(["medico", "enfermeiro"]), async (req, res) => {
  try {
    const { reason } = req.body;
    
    if (!reason || reason.trim().length < 10) {
      return res.status(400).json({ 
        error: "Justificativa obrigatória para ignorar alerta (mínimo 10 caracteres)" 
      });
    }

    const user = req.session.user!;
    const professionalId = user.id;
    
    const alert = await protocolAlertService.dismissAlert(req.params.id, professionalId, reason);
    
    if (!alert) {
      return res.status(404).json({ error: "Alerta não encontrado" });
    }

    res.json(alert);
  } catch (error: any) {
    console.error("Error dismissing alert:", error);
    res.status(500).json({ error: error.message || "Erro ao ignorar alerta" });
  }
});

// PATCH /api/alerts/:id/resolve - Resolver alerta
router.patch("/alerts/:id/resolve", requireRole(["medico", "enfermeiro"]), async (req, res) => {
  try {
    const alert = await protocolAlertService.resolveAlert(req.params.id);
    
    if (!alert) {
      return res.status(404).json({ error: "Alerta não encontrado" });
    }

    res.json(alert);
  } catch (error: any) {
    console.error("Error resolving alert:", error);
    res.status(500).json({ error: "Erro ao resolver alerta" });
  }
});

// ============================================================================
// STATS
// ============================================================================

// GET /api/alerts/stats - Estatísticas de alertas
router.get("/alerts/stats", enforceUnitScope(), async (req, res) => {
  try {
    const effectiveUnitId = getEffectiveUnitId(req);
    
    let conditions: any[] = [];
    if (effectiveUnitId) {
      conditions.push(eq(protocolAlerts.unitId, effectiveUnitId));
    }

    const allAlerts = await db
      .select()
      .from(protocolAlerts)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    const stats = {
      total: allAlerts.length,
      active: allAlerts.filter(a => a.status === "active").length,
      acknowledged: allAlerts.filter(a => a.status === "acknowledged").length,
      dismissed: allAlerts.filter(a => a.status === "dismissed").length,
      resolved: allAlerts.filter(a => a.status === "resolved").length,
      bySeverity: {
        critical: allAlerts.filter(a => a.alertLevel === "critical").length,
        warning: allAlerts.filter(a => a.alertLevel === "warning").length,
        info: allAlerts.filter(a => a.alertLevel === "info").length,
      },
    };

    res.json(stats);
  } catch (error: any) {
    console.error("Error fetching alert stats:", error);
    res.status(500).json({ error: "Erro ao buscar estatísticas" });
  }
});

export default router;
