import { Router } from "express";
import {
  suggestDiagnosis,
  checkDrugInteractions,
  validatePrescription,
  generateCarePlan
} from "./services/medical-ai";
import {
  diagnosisRequestSchema,
  drugInteractionRequestSchema,
  prescriptionValidationRequestSchema,
  carePlanRequestSchema,
} from "@shared/ai-schemas";
import { z } from "zod";
import { requireRole } from "./auth";
import { aiRateLimiter } from "./middlewares/ai-rate-limiter";

const router = Router();

// ============================================================================
// RBAC MIDDLEWARE - Apenas profissionais clínicos podem usar IA médica
// ============================================================================
const requireClinicalRole = requireRole(["doctor", "nurse"]);

// Apply rate limiting to all AI routes
router.use(aiRateLimiter);

// ============================================================================
// AI MEDICAL ASSISTANT ROUTES
// ============================================================================

// POST /api/ai/diagnose - Sugestão de diagnósticos (CID-10/CIAP-2)
router.post("/diagnose", requireClinicalRole, async (req, res) => {
  const startTime = Date.now();
  const user = req.session.user!;
  
  try {
    // Validar payload de entrada
    const validatedData = diagnosisRequestSchema.parse(req.body);

    // Chamar IA com dados validados
    const result = await suggestDiagnosis(
      validatedData.subjective,
      validatedData.objective,
      validatedData.vitalSigns
    );

    // Audit log
    await import("./services/ai-audit").then(({ logAIInteraction }) => 
      logAIInteraction({
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        operation: "diagnose",
        inputData: JSON.stringify(validatedData),
        success: result.success,
        errorCode: result.error?.code || null,
        errorMessage: result.error?.message || null,
        completionTokens: null,
        latencyMs: Date.now() - startTime,
        citizenId: null,
        consultationId: null,
      })
    );

    if (!result.success) {
      return res.status(503).json({
        error: "Serviço de IA indisponível no momento",
        message: result.error?.message,
        code: result.error?.code,
        details: result.error?.details,
      });
    }

    res.json({
      success: true,
      suggestions: result.data || [],
      disclaimer: "⚠️ Sugestões geradas por IA. A decisão diagnóstica final é do profissional de saúde.",
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: "Dados de entrada inválidos",
        details: error.errors.map(e => ({ field: e.path.join('.'), message: e.message })),
      });
    }
    console.error("Erro na rota /ai/diagnose:", error);
    res.status(500).json({ error: "Erro interno ao processar diagnóstico com IA" });
  }
});

// POST /api/ai/check-interactions - Verificar interações medicamentosas
router.post("/check-interactions", requireClinicalRole, async (req, res) => {
  const startTime = Date.now();
  const user = req.session.user!;
  
  try {
    // Validar payload de entrada
    const validatedData = drugInteractionRequestSchema.parse(req.body);

    // Chamar IA com dados validados
    const result = await checkDrugInteractions(validatedData.medications);

    // Audit log
    await import("./services/ai-audit").then(({ logAIInteraction }) => 
      logAIInteraction({
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        operation: "drug_interactions",
        inputData: JSON.stringify(validatedData),
        success: result.success,
        errorCode: result.error?.code || null,
        errorMessage: result.error?.message || null,
        completionTokens: null,
        latencyMs: Date.now() - startTime,
        citizenId: null,
        consultationId: null,
      })
    );

    if (!result.success) {
      return res.status(503).json({
        error: "Serviço de IA indisponível no momento",
        message: result.error?.message,
        code: result.error?.code,
        details: result.error?.details,
      });
    }

    res.json({
      success: true,
      interactions: result.data || [],
      disclaimer: "⚠️ Análise gerada por IA. A decisão de prescrição é do profissional de saúde.",
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: "Dados de entrada inválidos",
        details: error.errors.map(e => ({ field: e.path.join('.'), message: e.message })),
      });
    }
    console.error("Erro na rota /ai/check-interactions:", error);
    res.status(500).json({ error: "Erro interno ao verificar interações medicamentosas" });
  }
});

// POST /api/ai/validate-prescription - Validar prescrição
router.post("/validate-prescription", requireClinicalRole, async (req, res) => {
  const startTime = Date.now();
  const user = req.session.user!;
  
  try {
    // Validar payload de entrada
    const validatedData = prescriptionValidationRequestSchema.parse(req.body);

    // Chamar IA com dados validados
    const result = await validatePrescription(
      validatedData.medication,
      validatedData.dosage,
      validatedData.frequency,
      validatedData.patientAge,
      validatedData.patientWeight,
      validatedData.comorbidities
    );

    // Audit log
    await import("./services/ai-audit").then(({ logAIInteraction }) => 
      logAIInteraction({
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        operation: "validate_prescription",
        inputData: JSON.stringify(validatedData),
        success: result.success,
        errorCode: result.error?.code || null,
        errorMessage: result.error?.message || null,
        completionTokens: null,
        latencyMs: Date.now() - startTime,
        citizenId: null,
        consultationId: null,
      })
    );

    if (!result.success) {
      return res.status(503).json({
        error: "Serviço de IA indisponível no momento",
        message: result.error?.message,
        code: result.error?.code,
        details: result.error?.details,
      });
    }

    res.json({
      success: true,
      alerts: result.data || [],
      disclaimer: "⚠️ Validação gerada por IA. A decisão de prescrição é do profissional de saúde.",
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: "Dados de entrada inválidos",
        details: error.errors.map(e => ({ field: e.path.join('.'), message: e.message })),
      });
    }
    console.error("Erro na rota /ai/validate-prescription:", error);
    res.status(500).json({ error: "Erro interno ao validar prescrição" });
  }
});

// POST /api/ai/generate-plan - Gerar plano de cuidados
router.post("/generate-plan", requireClinicalRole, async (req, res) => {
  const startTime = Date.now();
  const user = req.session.user!;
  
  try {
    // Validar payload de entrada
    const validatedData = carePlanRequestSchema.parse(req.body);

    // Chamar IA com dados validados
    const result = await generateCarePlan(
      validatedData.subjective,
      validatedData.objective,
      validatedData.assessment
    );

    // Audit log
    await import("./services/ai-audit").then(({ logAIInteraction }) => 
      logAIInteraction({
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        operation: "generate_care_plan",
        inputData: JSON.stringify(validatedData),
        success: result.success,
        errorCode: result.error?.code || null,
        errorMessage: result.error?.message || null,
        completionTokens: null,
        latencyMs: Date.now() - startTime,
        citizenId: null,
        consultationId: null,
      })
    );

    if (!result.success) {
      return res.status(503).json({
        error: "Serviço de IA indisponível no momento",
        message: result.error?.message,
        code: result.error?.code,
        details: result.error?.details,
      });
    }

    res.json({
      success: true,
      plan: result.data || "",
      disclaimer: "⚠️ Plano gerado por IA. A decisão terapêutica final é do profissional de saúde.",
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: "Dados de entrada inválidos",
        details: error.errors.map(e => ({ field: e.path.join('.'), message: e.message })),
      });
    }
    console.error("Erro na rota /ai/generate-plan:", error);
    res.status(500).json({ error: "Erro interno ao gerar plano de cuidados" });
  }
});

export default router;
