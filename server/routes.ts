import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  loginSchema, 
  insertHealthUnitSchema, 
  insertUserSchema,
  insertCitizenSchema,
  insertAppointmentSchema,
  insertAttendanceQueueSchema,
  insertConsultationSchema,
  insertPrescriptionSchema,
  insertExamSchema,
  insertMedicalReferralSchema,
  insertTfdRequestSchema,
  insertProfessionalSchema,
  insertDwellingSchema,
  insertFamilySchema,
  insertFamilyMemberSchema,
  insertHomeVisitSchema,
  insertEndemicCycleSchema,
  insertFadEvaluationSchema,
  insertFocusSchema,
  insertFocalTreatmentSchema,
  insertCitizenProblemSchema,
} from "@shared/schema";
import * as schema from "@shared/schema";
import { z } from "zod";
import { generateExport } from "./integrations/esus/exporter";
import seedSIGTAPMappings from "./seed-sigtap";
import { 
  authenticateUser, 
  requireAuth, 
  requireRole, 
  enforceUnitScope, 
  getEffectiveUnitId,
  validateEntityAccess,
  CROSS_UNIT_ROLES
} from "./auth";
import aiRoutes from "./routes-ai";
import { generatePrescriptionPDF, generateMedicalCertificatePDF } from "./services/pdf-generator";
import { CareLineResolutionService } from "./services/care-line-resolution";
import { ProtocolAlertService } from "./services/protocol-alert.service";
import { rawSqlite, db } from "./db";
import { sugerirEspecialidades, invalidateRulesCache } from "./services/sugestorEspecialidade";
import * as ciap2Cid10Service from "./services/ciap2Cid10Service";
import * as notificationService from "./services/notificationService";
import * as digitalSignatureService from "./services/digitalSignatureService";
import * as examValidationService from "./services/examValidationService";
import * as clinicalJourneyService from "./services/clinicalJourneyService";
import * as documentValidationService from "./services/documentValidationService";
import { eq, and, sql } from "drizzle-orm";
import { specialtySuggestionInputSchema, insertReferralRuleSchema } from "@shared/schema";

// Initialize Protocol Alert Service using SHARED SQLite instance (transactional consistency) ✅
const protocolAlertService = new ProtocolAlertService(rawSqlite);

export async function registerRoutes(app: Express): Promise<Server> {
  // ============================================================================
  // AUTHENTICATION API - Must be registered BEFORE global protection middleware
  // ============================================================================
  
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = loginSchema.parse(req.body);
      
      const user = await authenticateUser(email, password);
      
      if (!user) {
        return res.status(401).json({ error: "Email ou senha inválidos" });
      }

      req.session.user = user;
      res.json(user);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Dados inválidos", details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Erro ao fazer logout" });
      }
      res.json({ message: "Logout realizado com sucesso" });
    });
  });

  app.get("/api/auth/me", (req, res) => {
    if (!req.session.user) {
      return res.status(401).json({ error: "Não autenticado" });
    }
    res.json(req.session.user);
  });

  // ============================================================================
  // GLOBAL PROTECTION MIDDLEWARE - All routes after this require authentication
  // ============================================================================
  app.use("/api", (req, res, next) => {
    // Exact list of allowed unauthenticated endpoints
    const allowedPaths = ["/auth/login", "/auth/logout", "/auth/me"];
    if (allowedPaths.includes(req.path)) {
      return next();
    }
    // Require authentication for all other API routes
    return requireAuth(req, res, next);
  });

  // ============================================================================
  // PROTECTED API ROUTES - All routes below require authentication
  // ============================================================================

  // ============================================================================
  // AI MEDICAL ASSISTANT ROUTES
  // ============================================================================
  app.use("/api/ai", aiRoutes);

  // Citizens API
  // Note: Citizens may be shared across units (e.g., patient transfers), 
  // but listing is scoped to unit via appointments/consultations association.
  // Cross-unit roles (admin/gestor) can access all citizens.
  app.get("/api/citizens", enforceUnitScope({ requireUnitId: false }), async (req, res) => {
    try {
      const { search, limit, offset, unitId } = req.query;
      const effectiveUnitId = getEffectiveUnitId(req);
      
      const citizens = await storage.getCitizens({
        search: search as string,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
        unitId: effectiveUnitId || undefined,
      });
      res.json(citizens);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/citizens/:id", enforceUnitScope({ requireUnitId: false }), async (req, res) => {
    try {
      const citizen = await storage.getCitizenById(req.params.id);
      if (!citizen) {
        return res.status(404).json({ error: "Cidadão não encontrado" });
      }
      
      // For non-cross-unit users, validate access via citizen's unit if set
      if (citizen.unitId && !validateEntityAccess(req, citizen.unitId)) {
        return res.status(403).json({ error: "Acesso negado: cidadão de outra unidade" });
      }
      
      res.json(citizen);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // SECURITY: Multi-tenant enforcement on citizen mutations
  app.post("/api/citizens", enforceUnitScope({ requireUnitId: false }), async (req, res) => {
    try {
      const sessionUnitId = req.session?.user?.unitId;
      const data = insertCitizenSchema.parse(req.body);
      
      // Associate citizen with user's unit if not cross-unit user
      if (sessionUnitId && !CROSS_UNIT_ROLES.includes(req.session?.user?.role as any)) {
        data.unitId = sessionUnitId;
      }
      
      // Check if CPF or CNS already exists
      const existingCpf = await storage.getCitizenByCpf(data.cpf);
      if (existingCpf) {
        return res.status(400).json({ error: "CPF já cadastrado" });
      }
      
      if (data.cns) {
        const existingCns = await storage.getCitizenByCns(data.cns);
        if (existingCns) {
          return res.status(400).json({ error: "CNS já cadastrado" });
        }
      }

      const citizen = await storage.createCitizen(data);
      res.status(201).json(citizen);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Dados inválidos", details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/citizens/:id", enforceUnitScope({ requireUnitId: false }), async (req, res) => {
    try {
      // Validate citizen belongs to user's unit
      const existing = await storage.getCitizenById(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: "Cidadão não encontrado" });
      }
      if (existing.unitId && !validateEntityAccess(req, existing.unitId)) {
        return res.status(403).json({ error: "Acesso negado: cidadão de outra unidade" });
      }
      
      const citizen = await storage.updateCitizen(req.params.id, req.body);
      res.json(citizen);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/citizens/:id", enforceUnitScope({ requireUnitId: false }), async (req, res) => {
    try {
      // Validate citizen belongs to user's unit before deletion
      const existing = await storage.getCitizenById(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: "Cidadão não encontrado" });
      }
      if (existing.unitId && !validateEntityAccess(req, existing.unitId)) {
        return res.status(403).json({ error: "Acesso negado: cidadão de outra unidade" });
      }
      
      const success = await storage.deleteCitizen(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get patient medical history (for medical attendance sidebar)
  app.get("/api/citizens/:id/medical-history", async (req, res) => {
    try {
      const citizenId = req.params.id;
      
      // SECURITY: Multi-tenant validation
      const sessionUnitId = req.session?.user?.unitId;
      if (!sessionUnitId) {
        return res.status(401).json({ error: "Sessão inválida - unitId não encontrado" });
      }

      const history = await storage.getPatientHistory(citizenId, sessionUnitId);
      res.json(history);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Appointments API
  // SECURITY: Multi-tenant enforcement - scope to session unitId
  app.get("/api/appointments", enforceUnitScope(), async (req, res) => {
    try {
      const { citizenId, professionalId, date, status, limit } = req.query;
      const effectiveUnitId = getEffectiveUnitId(req);
      
      const appointments = await storage.getAppointments({
        citizenId: citizenId as string,
        professionalId: professionalId as string,
        unitId: effectiveUnitId || undefined,
        date: date ? new Date(date as string) : undefined,
        status: status as string,
        limit: limit ? parseInt(limit as string) : undefined,
      });
      res.json(appointments);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/appointments/:id", enforceUnitScope(), async (req, res) => {
    try {
      const appointment = await storage.getAppointmentById(req.params.id);
      if (!appointment) {
        return res.status(404).json({ error: "Agendamento não encontrado" });
      }
      
      // Validate appointment belongs to user's unit
      if (!validateEntityAccess(req, appointment.unitId)) {
        return res.status(403).json({ error: "Acesso negado: agendamento de outra unidade" });
      }
      
      res.json(appointment);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // SECURITY: Multi-tenant enforcement on mutations
  app.post("/api/appointments", enforceUnitScope(), async (req, res) => {
    try {
      const sessionUnitId = req.session?.user?.unitId;
      const data = insertAppointmentSchema.parse(req.body);
      
      // Enforce session unitId for non-cross-unit users
      if (sessionUnitId && !CROSS_UNIT_ROLES.includes(req.session?.user?.role as any)) {
        if (data.unitId && data.unitId !== sessionUnitId) {
          return res.status(403).json({ error: "Não é permitido criar agendamento em outra unidade" });
        }
        data.unitId = sessionUnitId;
      }
      
      const appointment = await storage.createAppointment(data);
      res.status(201).json(appointment);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Dados inválidos", details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/appointments/:id", enforceUnitScope(), async (req, res) => {
    try {
      // Validate existing appointment belongs to user's unit
      const existing = await storage.getAppointmentById(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: "Agendamento não encontrado" });
      }
      if (!validateEntityAccess(req, existing.unitId)) {
        return res.status(403).json({ error: "Acesso negado: agendamento de outra unidade" });
      }
      
      const appointment = await storage.updateAppointment(req.params.id, req.body);
      res.json(appointment);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/appointments/:id", enforceUnitScope(), async (req, res) => {
    try {
      // Validate appointment belongs to user's unit before deletion
      const existing = await storage.getAppointmentById(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: "Agendamento não encontrado" });
      }
      if (!validateEntityAccess(req, existing.unitId)) {
        return res.status(403).json({ error: "Acesso negado: agendamento de outra unidade" });
      }
      
      const success = await storage.deleteAppointment(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Attendance Queue API
  app.get("/api/queue/:unitId", async (req, res) => {
    try {
      // SECURITY: Multi-tenant validation - verify session user belongs to requested unit ✅
      if (req.session.user?.unitId !== req.params.unitId) {
        return res.status(403).json({ 
          error: "Acesso negado: usuário não pertence à unidade solicitada" 
        });
      }

      const { status } = req.query;
      const queue = await storage.getAttendanceQueue({
        unitId: req.params.unitId,
        status: status as string,
      });
      res.json(queue);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/queue", async (req, res) => {
    try {
      const data = insertAttendanceQueueSchema.parse(req.body);
      
      // SECURITY: Multi-tenant validation - verify user is creating in their own unit ✅
      if (req.session.user?.unitId !== data.unitId) {
        return res.status(403).json({ 
          error: "Acesso negado: usuário não pode criar entradas em outra unidade" 
        });
      }

      const entry = await storage.createQueueEntry(data);
      res.status(201).json(entry);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Dados inválidos", details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/queue/:id", async (req, res) => {
    try {
      // SECURITY: Multi-tenant validation - verify queue belongs to user's unit ✅
      const queueEntry = await storage.getQueueEntry(req.params.id);
      if (!queueEntry) {
        return res.status(404).json({ error: "Entrada na fila não encontrada" });
      }

      if (req.session.user?.unitId !== queueEntry.unitId) {
        return res.status(403).json({ 
          error: "Acesso negado: entrada pertence a outra unidade" 
        });
      }

      const entry = await storage.updateQueueEntry(req.params.id, req.body);
      res.json(entry);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/queue/:id", async (req, res) => {
    try {
      // SECURITY: Multi-tenant validation - verify queue belongs to user's unit ✅
      const queueEntry = await storage.getQueueEntry(req.params.id);
      if (!queueEntry) {
        return res.status(404).json({ error: "Entrada na fila não encontrada" });
      }

      if (req.session.user?.unitId !== queueEntry.unitId) {
        return res.status(403).json({ 
          error: "Acesso negado: entrada pertence a outra unidade" 
        });
      }

      const success = await storage.deleteQueueEntry(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Consultations API
  // SECURITY: Multi-tenant enforcement - scope consultations to session unitId
  app.get("/api/consultations", enforceUnitScope(), async (req, res) => {
    try {
      const { citizenId, professionalId, limit } = req.query;
      const effectiveUnitId = getEffectiveUnitId(req);
      
      const consultations = await storage.getConsultations({
        citizenId: citizenId as string,
        professionalId: professionalId as string,
        unitId: effectiveUnitId || undefined,
        limit: limit ? parseInt(limit as string) : undefined,
      });
      res.json(consultations);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/consultations/:id", enforceUnitScope(), async (req, res) => {
    try {
      const consultation = await storage.getConsultationById(req.params.id);
      if (!consultation) {
        return res.status(404).json({ error: "Consulta não encontrada" });
      }
      
      // Validate consultation belongs to user's unit
      if (!validateEntityAccess(req, consultation.unitId)) {
        return res.status(403).json({ error: "Acesso negado: consulta de outra unidade" });
      }
      
      res.json(consultation);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // DYNAMIC FORMS - Auto-detect care line and template for consultation
  app.get("/api/consultations/:id/dynamic-form", async (req, res) => {
    try {
      const sessionUnitId = req.session?.user?.unitId;
      if (!sessionUnitId) {
        return res.status(401).json({ error: "Unidade não identificada na sessão" });
      }

      // SECURITY: First verify consultation ownership via storage
      const consultation = await storage.getConsultationById(req.params.id);
      if (!consultation) {
        return res.status(404).json({ error: "Consulta não encontrada" });
      }

      if (consultation.unitId !== sessionUnitId) {
        return res.status(403).json({ error: "Acesso negado: consulta de outra unidade" });
      }

      // Resolve care line using server-side algorithm (MULTI-TENANT SECURE)
      const resolution = await CareLineResolutionService.resolveForConsultation(
        req.params.id,
        sessionUnitId
      );

      // Fetch template fields if template exists (already scoped by care line which is unit-validated)
      let fields: any[] = [];
      if (resolution.template) {
        fields = await storage.getTemplateFieldsByTemplateId(resolution.template.id);
      }

      // Fetch existing field data (scoped by consultation which is already validated)
      const fieldData = await storage.getConsultationFieldData(req.params.id);

      res.json({
        careLine: resolution.careLine,
        template: resolution.template,
        fields,
        fieldData,
        matchReason: resolution.matchReason,
        matchDetails: resolution.matchDetails,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // SECURITY: Multi-tenant enforcement on consultations
  app.post("/api/consultations", enforceUnitScope(), async (req, res) => {
    try {
      const sessionUnitId = req.session?.user?.unitId;
      const data = insertConsultationSchema.parse(req.body);
      
      // Enforce session unitId for non-cross-unit users
      if (sessionUnitId && !CROSS_UNIT_ROLES.includes(req.session?.user?.role as any)) {
        if (data.unitId && data.unitId !== sessionUnitId) {
          return res.status(403).json({ error: "Não é permitido criar consulta em outra unidade" });
        }
        data.unitId = sessionUnitId;
      }
      
      const consultation = await storage.createConsultation(data);
      
      // CLINICAL DECISION SUPPORT: Evaluate protocols and trigger alerts ✅
      let alerts: any[] = [];
      try {
        alerts = await protocolAlertService.evaluateConsultation(consultation.id);
      } catch (alertError: any) {
        console.warn('[PROTOCOL ALERTS] Aviso: Falha ao avaliar protocolos:', alertError.message);
      }
      
      res.status(201).json({ ...consultation, alerts });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Dados inválidos", details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });

  // SECURITY: Multi-tenant enforcement on transactional consultation creation
  app.post("/api/consultations-with-prescriptions", enforceUnitScope(), async (req, res) => {
    try {
      const sessionUnitId = req.session?.user?.unitId;
      const { consultation, prescriptions } = req.body;
      
      // Validar consulta
      const validatedConsultation = insertConsultationSchema.parse(consultation);
      
      // Enforce session unitId for non-cross-unit users
      if (sessionUnitId && !CROSS_UNIT_ROLES.includes(req.session?.user?.role as any)) {
        if (validatedConsultation.unitId && validatedConsultation.unitId !== sessionUnitId) {
          return res.status(403).json({ error: "Não é permitido criar consulta em outra unidade" });
        }
        validatedConsultation.unitId = sessionUnitId;
      }
      
      // Validar prescrições (parcialmente, sem consultationId/citizenId/professionalId)
      const validatedPrescriptions = prescriptions.map((p: any) =>
        insertPrescriptionSchema
          .omit({ consultationId: true, citizenId: true, professionalId: true })
          .parse(p)
      );
      
      const result = await storage.createConsultationWithPrescriptions(
        validatedConsultation,
        validatedPrescriptions
      );
      
      // CLINICAL DECISION SUPPORT: Evaluate protocols and trigger alerts ✅
      let alerts: any[] = [];
      try {
        alerts = await protocolAlertService.evaluateConsultation(result.consultation.id);
      } catch (alertError: any) {
        console.warn('[PROTOCOL ALERTS] Aviso: Falha ao avaliar protocolos:', alertError.message);
      }
      
      res.status(201).json({ ...result, alerts });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Dados inválidos", details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/consultations/:id", enforceUnitScope(), async (req, res) => {
    try {
      // Validate consultation belongs to user's unit before deletion
      const existing = await storage.getConsultationById(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: "Consulta não encontrada" });
      }
      if (!validateEntityAccess(req, existing.unitId)) {
        return res.status(403).json({ error: "Acesso negado: consulta de outra unidade" });
      }
      
      const success = await storage.deleteConsultation(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Atualizar consulta (enquanto em andamento)
  app.put("/api/consultations/:id", async (req, res) => {
    try {
      // Buscar consulta existente para validação
      const existing = await storage.getConsultationById(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: "Consulta não encontrada" });
      }

      // SECURITY: Multi-tenant validation
      const sessionUnitId = req.session?.user?.unitId;
      if (sessionUnitId && existing.unitId !== sessionUnitId) {
        return res.status(403).json({ error: "Acesso negado: consulta de outra unidade" });
      }

      // Permitir atualização parcial de campos clínicos
      const allowedFields = insertConsultationSchema.partial();
      const updateData = allowedFields.parse(req.body);

      const updated = await storage.updateConsultation(req.params.id, updateData);
      if (!updated) {
        return res.status(404).json({ error: "Consulta não encontrada" });
      }

      // CLINICAL DECISION SUPPORT: Re-evaluate protocols after update ✅
      let alerts: any[] = [];
      try {
        alerts = await protocolAlertService.evaluateConsultation(updated.id);
      } catch (alertError: any) {
        console.warn('[PROTOCOL ALERTS] Aviso: Falha ao avaliar protocolos:', alertError.message);
      }

      res.json({ ...updated, alerts });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Dados inválidos", details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });

  // Finalizar atendimento
  app.post("/api/consultations/:id/finalize", async (req, res) => {
    try {
      // Buscar consulta existente
      const existing = await storage.getConsultationById(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: "Consulta não encontrada" });
      }

      // SECURITY: Multi-tenant validation
      const sessionUnitId = req.session?.user?.unitId;
      if (sessionUnitId && existing.unitId !== sessionUnitId) {
        return res.status(403).json({ error: "Acesso negado: consulta de outra unidade" });
      }

      // Validar que possui pelo menos um diagnóstico
      const hasDiagnosis = (existing.ciap2Codes && existing.ciap2Codes.length > 0) ||
                          (existing.cid10Codes && existing.cid10Codes.length > 0) ||
                          existing.diagnosis;

      if (!hasDiagnosis) {
        return res.status(400).json({ 
          error: "Não é possível finalizar: consulta precisa ter pelo menos um diagnóstico (CIAP-2, CID-10 ou diagnóstico descritivo)" 
        });
      }

      // Atualizar consulta com dados finais se fornecidos no body
      let finalData = req.body || {};
      
      const finalized = await storage.updateConsultation(req.params.id, finalData);
      if (!finalized) {
        return res.status(404).json({ error: "Consulta não encontrada" });
      }

      // CLINICAL DECISION SUPPORT: Evaluate protocols on finalization ✅
      let alerts: any[] = [];
      try {
        alerts = await protocolAlertService.evaluateConsultation(finalized.id);
      } catch (alertError: any) {
        console.warn('[PROTOCOL ALERTS] Aviso: Falha ao avaliar protocolos:', alertError.message);
      }

      res.json({ ...finalized, alerts });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Dados inválidos", details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // PRINT ROUTES - PDF Generation
  // ============================================================================

  // Imprimir receita médica
  app.get("/api/consultations/:id/print-prescription", async (req, res) => {
    try {
      // Buscar consulta
      const consultation = await storage.getConsultationById(req.params.id);
      if (!consultation) {
        return res.status(404).json({ error: "Consulta não encontrada" });
      }

      // SECURITY: Multi-tenant validation
      const sessionUnitId = req.session?.user?.unitId;
      if (sessionUnitId && consultation.unitId !== sessionUnitId) {
        return res.status(403).json({ error: "Acesso negado: consulta de outra unidade" });
      }

      // Buscar dados relacionados
      const citizen = await storage.getCitizenById(consultation.citizenId);
      if (!citizen) {
        return res.status(404).json({ error: "Cidadão não encontrado" });
      }

      const professional = await storage.getProfessionalById(consultation.professionalId);
      if (!professional) {
        return res.status(404).json({ error: "Profissional não encontrado" });
      }

      const unit = await storage.getHealthUnitById(consultation.unitId);
      if (!unit) {
        return res.status(404).json({ error: "Unidade não encontrada" });
      }

      // Buscar prescrições da consulta
      const prescriptions = await storage.getPrescriptions({ consultationId: req.params.id });

      // Gerar PDF
      const pdfBuffer = generatePrescriptionPDF({
        consultation,
        citizen,
        professional,
        unit,
        prescriptions,
      });

      // Enviar PDF como resposta
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="receita_${citizen.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf"`);
      res.send(pdfBuffer);
    } catch (error: any) {
      console.error('Erro ao gerar receita:', error);
      res.status(500).json({ error: error.message || 'Erro ao gerar receita' });
    }
  });

  // Gerar atestado médico
  app.post("/api/consultations/:id/print-medical-certificate", async (req, res) => {
    try {
      // Validar dados do atestado
      const certificateSchema = z.object({
        type: z.enum(['trabalho', 'escola', 'outros']),
        startDate: z.string().transform(str => new Date(str)),
        endDate: z.string().transform(str => new Date(str)),
        reason: z.string().optional(),
      });

      const { type, startDate, endDate, reason } = certificateSchema.parse(req.body);

      // Buscar consulta
      const consultation = await storage.getConsultationById(req.params.id);
      if (!consultation) {
        return res.status(404).json({ error: "Consulta não encontrada" });
      }

      // SECURITY: Multi-tenant validation
      const sessionUnitId = req.session?.user?.unitId;
      if (sessionUnitId && consultation.unitId !== sessionUnitId) {
        return res.status(403).json({ error: "Acesso negado: consulta de outra unidade" });
      }

      // Buscar dados relacionados
      const citizen = await storage.getCitizenById(consultation.citizenId);
      if (!citizen) {
        return res.status(404).json({ error: "Cidadão não encontrado" });
      }

      const professional = await storage.getProfessionalById(consultation.professionalId);
      if (!professional) {
        return res.status(404).json({ error: "Profissional não encontrado" });
      }

      const unit = await storage.getHealthUnitById(consultation.unitId);
      if (!unit) {
        return res.status(404).json({ error: "Unidade não encontrada" });
      }

      // Gerar PDF
      const pdfBuffer = generateMedicalCertificatePDF({
        consultation,
        citizen,
        professional,
        unit,
        certificateType: type,
        startDate,
        endDate,
        reason,
      });

      // Enviar PDF como resposta
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="atestado_${citizen.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf"`);
      res.send(pdfBuffer);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Dados inválidos", details: error.errors });
      }
      console.error('Erro ao gerar atestado:', error);
      res.status(500).json({ error: error.message || 'Erro ao gerar atestado' });
    }
  });

  // ============================================================================
  // e-SUS AB / SISAB EXPORT API
  // ============================================================================

  // Exportar atendimento no formato Ficha de Atendimento Individual (FAI)
  app.get("/api/consultations/:id/export-fai", async (req, res) => {
    try {
      const { mapConsultationToFAI, validateExportData } = await import('./services/esus-export');
      
      // Buscar consulta
      const consultation = await storage.getConsultationById(req.params.id);
      if (!consultation) {
        return res.status(404).json({ error: "Consulta não encontrada" });
      }

      // SECURITY: Multi-tenant validation
      const sessionUnitId = req.session?.user?.unitId;
      if (sessionUnitId && consultation.unitId !== sessionUnitId) {
        return res.status(403).json({ error: "Acesso negado: consulta de outra unidade" });
      }

      // Buscar dados relacionados
      const citizen = await storage.getCitizenById(consultation.citizenId);
      if (!citizen) {
        return res.status(404).json({ error: "Cidadão não encontrado" });
      }

      const professional = await storage.getProfessionalById(consultation.professionalId);
      if (!professional) {
        return res.status(404).json({ error: "Profissional não encontrado" });
      }

      const unit = await storage.getHealthUnitById(consultation.unitId);
      if (!unit) {
        return res.status(404).json({ error: "Unidade não encontrada" });
      }

      // Buscar prescrições, encaminhamentos e exames da consulta
      const prescriptions = await storage.getPrescriptions({ consultationId: req.params.id });
      const referrals = await storage.getMedicalReferrals({ consultationId: req.params.id });
      const exams = await storage.getExams({ consultationId: req.params.id });

      // Configuração do tenant (dados da unidade de saúde)
      // TODO: Mover para configurações do sistema/tenant
      const tenantConfig = {
        codigoIbgeMunicipio: unit.ibgeCode || '2906501', // Cardeal da Silva/BA
        cnesUnidade: unit.cnes || '',
        ine: unit.ine || null,
      };

      // Mapear para formato FAI
      const faiData = mapConsultationToFAI({
        consultation,
        citizen,
        professional,
        unit,
        prescriptions: prescriptions.map(p => ({
          id: p.id,
          consultationId: p.consultationId,
          citizenId: p.citizenId,
          professionalId: p.professionalId,
          medication: p.medication,
          dosage: p.dosage,
          frequency: p.frequency,
          duration: p.duration,
          quantity: p.quantity,
          instructions: p.instructions,
          createdAt: p.createdAt,
        })),
        referrals,
        exams,
        tenantConfig,
      });

      // Validar dados exportados
      const validation = validateExportData(faiData);
      if (!validation.valid) {
        return res.status(400).json({ 
          error: "Dados incompletos para exportação e-SUS", 
          details: validation.errors 
        });
      }

      // Retornar JSON estruturado
      res.json({
        success: true,
        data: faiData,
        validation,
      });
    } catch (error: any) {
      console.error('Erro ao exportar para e-SUS:', error);
      res.status(500).json({ error: error.message || 'Erro ao exportar dados' });
    }
  });

  // ============================================================================
  // MEDICAL ATTENDANCE API (Atendimento Médico - e-SUS PEC) ✅
  // ============================================================================

  // Listar fila de atendimento (filtrada por profissional/unidade)
  app.get("/api/attendance-queue", async (req, res) => {
    try {
      const { unitId, professionalId, status } = req.query;

      // SECURITY: Multi-tenant validation - force unitId from session
      const sessionUnitId = req.session?.user?.unitId;
      if (!sessionUnitId) {
        return res.status(401).json({ error: "Sessão inválida - unitId não encontrado" });
      }

      // Buscar fila filtrada
      const queue = await storage.getAttendanceQueue({
        unitId: sessionUnitId, // Sempre usar unitId da sessão
        professionalId: professionalId as string,
        status: status as string,
      });

      res.json(queue);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Listar fila de atendimento POR LINHA DE CUIDADO ✅
  app.get("/api/care-line-queue/:careLineId", async (req, res) => {
    try {
      const { careLineId } = req.params;
      const { status } = req.query;

      // SECURITY: Multi-tenant validation - FORCE session unitId (prevent cross-unit access)
      const sessionUnitId = req.session?.user?.unitId;
      if (!sessionUnitId) {
        return res.status(401).json({ error: "Sessão inválida - unitId não encontrado" });
      }

      // CRITICAL: Always use sessionUnitId (never trust URL params for multi-tenant security)
      const queue = await storage.getAttendanceQueueByCareLine({
        unitId: sessionUnitId, // ✅ ENFORCE session unitId
        careLineId, // OK to trust careLineId since it's filtered by unitId
        status: status as string,
      });

      res.json(queue);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Buscar próximo paciente da fila
  app.get("/api/attendance/next", async (req, res) => {
    try {
      const { unitId, professionalId } = req.query;
      
      if (!unitId) {
        return res.status(400).json({ error: "unitId é obrigatório" });
      }

      // SECURITY: Multi-tenant validation - verify session user belongs to requested unit ✅
      if (req.session.user?.unitId !== unitId) {
        return res.status(403).json({ 
          error: "Acesso negado: usuário não pertence à unidade solicitada" 
        });
      }

      const nextPatient = await storage.getNextPatientInQueue(
        unitId as string,
        professionalId as string | undefined
      );
      
      if (!nextPatient) {
        return res.status(404).json({ error: "Nenhum paciente aguardando" });
      }

      res.json(nextPatient);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Iniciar atendimento médico (cria consulta a partir da fila)
  app.post("/api/attendance/start", async (req, res) => {
    try {
      const { queueId, professionalId } = req.body;

      if (!queueId || !professionalId) {
        return res.status(400).json({ error: "queueId e professionalId são obrigatórios" });
      }

      // SECURITY: Multi-tenant validation - verify queue belongs to user's unit ✅
      const queueEntry = await storage.getQueueEntry(queueId);
      if (!queueEntry) {
        return res.status(404).json({ error: "Entrada da fila não encontrada" });
      }

      if (req.session.user?.unitId !== queueEntry.unitId) {
        return res.status(403).json({ 
          error: "Acesso negado: paciente pertence a outra unidade" 
        });
      }

      const result = await storage.startConsultation(queueId, professionalId, queueEntry.unitId);
      res.status(201).json(result);
    } catch (error: any) {
      if (error.message.includes('não encontrado')) {
        return res.status(404).json({ error: error.message });
      }
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // QUEUE MANAGEMENT API - Chamada de Senhas e Estatísticas
  // ============================================================================

  // Listar fila de atendimento (usa unitId da sessão)
  app.get("/api/queue", enforceUnitScope(), async (req, res) => {
    try {
      const { status } = req.query;
      const unitId = getEffectiveUnitId(req);
      
      if (!unitId) {
        return res.status(401).json({ error: "Sessão inválida - unitId não encontrado" });
      }
      
      const queue = await storage.getAttendanceQueue({
        unitId,
        status: status as string,
      });
      
      // Enriquecer com nomes dos cidadãos e números de senha
      const enrichedQueue = await Promise.all(queue.map(async (entry, index) => {
        let citizenName = 'Paciente';
        try {
          const citizen = await storage.getCitizenById(entry.citizenId);
          if (citizen) citizenName = citizen.name;
        } catch {}
        
        return {
          ...entry,
          citizenName,
          ticketNumber: `${entry.priority === 'priority' ? 'P' : 'N'}${String(entry.id).padStart(3, '0')}`,
          estimatedWaitMinutes: index * 10,
        };
      }));
      
      res.json(enrichedQueue);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Chamar próximo paciente da fila
  app.post("/api/queue/call-next", enforceUnitScope(), async (req, res) => {
    try {
      const { room, professionalId } = req.body;
      const unitId = req.session?.user?.unitId;
      
      if (!unitId) {
        return res.status(401).json({ error: "Sessão inválida" });
      }
      
      const nextPatient = await storage.getNextPatientInQueue(unitId, professionalId);
      
      if (!nextPatient) {
        return res.json({ success: true, ticket: null, message: "Nenhum paciente aguardando" });
      }
      
      await storage.updateQueueEntry(nextPatient.id, {
        status: 'called',
        calledAt: new Date().toISOString(),
        room: room || undefined,
      });
      
      const updatedEntry = await storage.getQueueEntry(nextPatient.id);
      
      res.json({ 
        success: true, 
        ticket: {
          ...updatedEntry,
          ticketNumber: `${updatedEntry?.priority === 'priority' ? 'P' : 'N'}${String(updatedEntry?.id || 0).padStart(3, '0')}`,
          citizenName: updatedEntry?.citizenId || 'Paciente',
          room,
        }
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Atualizar status do ticket
  app.patch("/api/queue/:id/status", enforceUnitScope(), async (req, res) => {
    try {
      const { status } = req.body;
      const validStatuses = ['waiting', 'called', 'in_service', 'completed', 'no_show'];
      
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: "Status inválido" });
      }
      
      const queueEntry = await storage.getQueueEntry(req.params.id);
      if (!queueEntry) {
        return res.status(404).json({ error: "Entrada não encontrada" });
      }
      
      if (req.session.user?.unitId !== queueEntry.unitId) {
        return res.status(403).json({ error: "Acesso negado" });
      }
      
      const updateData: any = { status };
      if (status === 'in_service') {
        updateData.serviceStartedAt = new Date().toISOString();
      }
      if (status === 'completed') {
        updateData.completedAt = new Date().toISOString();
      }
      
      await storage.updateQueueEntry(req.params.id, updateData);
      const updated = await storage.getQueueEntry(req.params.id);
      
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Estatísticas da fila
  app.get("/api/queue/stats", enforceUnitScope(), async (req, res) => {
    try {
      const unitId = getEffectiveUnitId(req);
      
      const allQueue = await storage.getAttendanceQueue({
        unitId: unitId || undefined,
      });
      
      const waiting = allQueue.filter(q => q.status === 'waiting').length;
      const inService = allQueue.filter(q => q.status === 'in_service').length;
      const completed = allQueue.filter(q => q.status === 'completed').length;
      const noShow = allQueue.filter(q => q.status === 'no_show').length;
      
      const completedToday = allQueue.filter(q => {
        if (q.status !== 'completed') return false;
        const today = new Date().toDateString();
        return new Date(q.createdAt || '').toDateString() === today;
      });
      
      let averageWaitMinutes = 0;
      if (completedToday.length > 0) {
        const totalWait = completedToday.reduce((sum, q) => {
          if (q.calledAt && q.createdAt) {
            const wait = new Date(q.calledAt).getTime() - new Date(q.createdAt).getTime();
            return sum + (wait / 60000);
          }
          return sum;
        }, 0);
        averageWaitMinutes = Math.round(totalWait / completedToday.length);
      }
      
      res.json({
        waiting,
        inService,
        completed,
        noShow,
        averageWaitMinutes,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Buscar histórico completo do paciente
  app.get("/api/citizens/:id/history", async (req, res) => {
    try {
      // SECURITY: Multi-tenant validation - verify session user belongs to citizen's unit ✅
      const citizen = await storage.getCitizenById(req.params.id);
      if (!citizen) {
        return res.status(404).json({ error: "Cidadão não encontrado" });
      }

      if (req.session.user?.unitId !== citizen.unitId) {
        return res.status(403).json({ 
          error: "Acesso negado: cidadão pertence a outra unidade" 
        });
      }

      const history = await storage.getPatientHistory(req.params.id, citizen.unitId);
      res.json(history);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // CITIZEN PROBLEMS API (Problemas do Cidadão - CIAP-2) ✅
  // ============================================================================

  // Listar problemas/condições do cidadão
  app.get("/api/citizens/:id/problems", async (req, res) => {
    try {
      // SECURITY: Multi-tenant validation - verify session user belongs to citizen's unit ✅
      const citizen = await storage.getCitizenById(req.params.id);
      if (!citizen) {
        return res.status(404).json({ error: "Cidadão não encontrado" });
      }

      if (req.session.user?.unitId !== citizen.unitId) {
        return res.status(403).json({ 
          error: "Acesso negado: cidadão pertence a outra unidade" 
        });
      }

      const problems = await storage.getCitizenProblems(req.params.id, citizen.unitId);
      res.json(problems);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Criar problema/condição do cidadão
  app.post("/api/citizens/:id/problems", async (req, res) => {
    try {
      // SECURITY: Multi-tenant validation - verify session user belongs to citizen's unit ✅
      const citizen = await storage.getCitizenById(req.params.id);
      if (!citizen) {
        return res.status(404).json({ error: "Cidadão não encontrado" });
      }

      if (req.session.user?.unitId !== citizen.unitId) {
        return res.status(403).json({ 
          error: "Acesso negado: cidadão pertence a outra unidade" 
        });
      }

      const data = insertCitizenProblemSchema.parse({
        ...req.body,
        citizenId: req.params.id,
        unitId: citizen.unitId, // Multi-tenant safety
      });
      const problem = await storage.createCitizenProblem(data);
      res.status(201).json(problem);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Dados inválidos", details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });

  // Atualizar problema/condição do cidadão
  app.patch("/api/citizens/:citizenId/problems/:problemId", async (req, res) => {
    try {
      // SECURITY: Multi-tenant validation - verify session user belongs to citizen's unit ✅
      const citizen = await storage.getCitizenById(req.params.citizenId);
      if (!citizen) {
        return res.status(404).json({ error: "Cidadão não encontrado" });
      }

      if (req.session.user?.unitId !== citizen.unitId) {
        return res.status(403).json({ 
          error: "Acesso negado: cidadão pertence a outra unidade" 
        });
      }

      // Validar schema (excluindo citizenId, unitId e campos auto-gerenciados)
      const data = insertCitizenProblemSchema
        .omit({ citizenId: true, unitId: true, createdAt: true, updatedAt: true })
        .partial()
        .parse(req.body);

      // SEGURANÇA: Garantir que citizenId do path não pode ser alterado
      if (req.body.citizenId && req.body.citizenId !== req.params.citizenId) {
        return res.status(400).json({ 
          error: "Não é permitido alterar o cidadão do problema" 
        });
      }

      // STORAGE-LAYER SECURITY: Passa citizenId para WHERE clause ✅
      const problem = await storage.updateCitizenProblem(
        req.params.problemId,
        req.params.citizenId,
        data
      );
      
      if (!problem) {
        return res.status(404).json({ 
          error: "Problema não encontrado ou não pertence ao cidadão" 
        });
      }

      res.json(problem);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Dados inválidos", details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });

  // Deletar problema/condição do cidadão
  app.delete("/api/citizens/:citizenId/problems/:problemId", async (req, res) => {
    try {
      // SECURITY: Multi-tenant validation - verify session user belongs to citizen's unit ✅
      const citizen = await storage.getCitizenById(req.params.citizenId);
      if (!citizen) {
        return res.status(404).json({ error: "Cidadão não encontrado" });
      }

      if (req.session.user?.unitId !== citizen.unitId) {
        return res.status(403).json({ 
          error: "Acesso negado: cidadão pertence a outra unidade" 
        });
      }

      // STORAGE-LAYER SECURITY: Passa citizenId para WHERE clause ✅
      const success = await storage.deleteCitizenProblem(
        req.params.problemId,
        req.params.citizenId
      );
      
      if (!success) {
        return res.status(404).json({ 
          error: "Problema não encontrado ou não pertence ao cidadão" 
        });
      }
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Prescriptions API
  // SECURITY: Multi-tenant enforcement - scope prescriptions to session unitId
  app.get("/api/prescriptions", enforceUnitScope(), async (req, res) => {
    try {
      const { citizenId, consultationId, professionalId, startDate, endDate } = req.query;
      const effectiveUnitId = getEffectiveUnitId(req);
      
      const prescriptions = await storage.getPrescriptions({
        citizenId: citizenId as string,
        consultationId: consultationId as string,
        professionalId: professionalId as string,
        startDate: startDate as string,
        endDate: endDate as string,
        unitId: effectiveUnitId || undefined,
      });
      res.json(prescriptions);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // SECURITY: Multi-tenant enforcement on prescription mutations
  app.post("/api/prescriptions", enforceUnitScope(), async (req, res) => {
    try {
      const sessionUnitId = req.session?.user?.unitId;
      const data = insertPrescriptionSchema.parse(req.body);
      
      // Enforce session unitId for non-cross-unit users
      if (sessionUnitId && !CROSS_UNIT_ROLES.includes(req.session?.user?.role as any)) {
        if (data.unitId && data.unitId !== sessionUnitId) {
          return res.status(403).json({ error: "Não é permitido criar prescrição em outra unidade" });
        }
        data.unitId = sessionUnitId;
      }
      
      const prescription = await storage.createPrescription(data);
      res.status(201).json(prescription);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Dados inválidos", details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/prescriptions/:id", enforceUnitScope(), async (req, res) => {
    try {
      // Validate prescription belongs to user's unit
      const existing = await storage.getPrescriptionById(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: "Prescrição não encontrada" });
      }
      if (!validateEntityAccess(req, existing.unitId)) {
        return res.status(403).json({ error: "Acesso negado: prescrição de outra unidade" });
      }
      
      const prescription = await storage.updatePrescription(req.params.id, req.body);
      res.json(prescription);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/prescriptions/:id", enforceUnitScope(), async (req, res) => {
    try {
      // Validate prescription belongs to user's unit before deletion
      const existing = await storage.getPrescriptionById(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: "Prescrição não encontrada" });
      }
      if (!validateEntityAccess(req, existing.unitId)) {
        return res.status(403).json({ error: "Acesso negado: prescrição de outra unidade" });
      }
      
      const success = await storage.deletePrescription(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Medical Referrals API
  app.get("/api/medical-referrals", async (req, res) => {
    try {
      const { citizenId, consultationId, status } = req.query;
      
      // Forçar filtro por unitId da sessão (multi-tenant) - ignorar unitId do cliente
      const sessionUnitId = req.session?.user?.unitId;
      if (!sessionUnitId) {
        return res.status(401).json({ error: "Sessão inválida - unitId não encontrado" });
      }
      
      // Se consultationId fornecida, validar que pertence à unidade da sessão
      if (consultationId) {
        const consultation = await storage.getConsultationById(consultationId as string);
        if (!consultation) {
          return res.status(404).json({ error: "Consulta não encontrada" });
        }
        if (consultation.unitId !== sessionUnitId) {
          return res.status(403).json({ error: "Acesso negado: consulta de outra unidade" });
        }
      }
      
      const referrals = await storage.getMedicalReferrals({
        citizenId: citizenId as string,
        consultationId: consultationId as string,
        unitId: sessionUnitId, // Sempre usar unitId da sessão
        status: status as string,
      });
      res.json(referrals);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/medical-referrals/:id", async (req, res) => {
    try {
      const referral = await storage.getMedicalReferralById(req.params.id);
      if (!referral) {
        return res.status(404).json({ error: "Encaminhamento não encontrado" });
      }
      
      // Validação multi-tenant: verificar se referral pertence à unidade do usuário autenticado
      const sessionUnitId = req.session?.user?.unitId;
      if (sessionUnitId && referral.unitId !== sessionUnitId) {
        return res.status(403).json({ error: "Acesso negado: encaminhamento de outra unidade" });
      }
      
      res.json(referral);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/medical-referrals", async (req, res) => {
    try {
      // Validar apenas campos permitidos do cliente
      const allowedFields = z.object({
        consultationId: z.string().uuid(),
        destination: z.string().min(1),
        specialty: z.string().optional(),
        reason: z.string().min(10),
        priority: z.enum(["normal", "urgent", "emergency"]),
        observations: z.string().optional(),
      });
      
      const clientData = allowedFields.parse(req.body);
      
      // Buscar consulta para validação e derivação de dados
      const consultation = await storage.getConsultationById(clientData.consultationId);
      if (!consultation) {
        return res.status(404).json({ error: "Consulta não encontrada" });
      }
      
      // Validação multi-tenant: verificar se consulta pertence à unidade do profissional autenticado
      const sessionUnitId = req.session?.user?.unitId;
      if (sessionUnitId && consultation.unitId !== sessionUnitId) {
        return res.status(403).json({ error: "Acesso negado: consulta de outra unidade" });
      }
      
      // Derivar dados da consulta (fonte confiável) ao invés de confiar no cliente
      const referralData = {
        ...clientData,
        consultationId: consultation.id,
        citizenId: consultation.citizenId,
        professionalId: consultation.professionalId,
        unitId: consultation.unitId,
        referralDate: new Date(), // Sempre definido pelo servidor
        status: "pending" as const, // Sempre inicia como pending
      };
      
      const referral = await storage.createMedicalReferral(referralData);
      res.status(201).json(referral);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Dados inválidos", details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/medical-referrals/:id", async (req, res) => {
    try {
      // Buscar referral existente para validação
      const existingReferral = await storage.getMedicalReferralById(req.params.id);
      if (!existingReferral) {
        return res.status(404).json({ error: "Encaminhamento não encontrado" });
      }
      
      // Validação multi-tenant: verificar se referral pertence à unidade do usuário autenticado
      const sessionUnitId = req.session?.user?.unitId;
      if (sessionUnitId && existingReferral.unitId !== sessionUnitId) {
        return res.status(403).json({ error: "Acesso negado: encaminhamento de outra unidade" });
      }
      
      // Validar campos permitidos para atualização
      const allowedUpdateFields = z.object({
        destination: z.string().min(1).optional(),
        specialty: z.string().optional(),
        reason: z.string().min(10).optional(),
        priority: z.enum(["normal", "urgent", "emergency"]).optional(),
        observations: z.string().optional(),
        status: z.enum(["pending", "scheduled", "in_progress", "completed", "cancelled"]).optional(),
        scheduledDate: z.coerce.date().optional(),
      });
      
      const updateData = allowedUpdateFields.parse(req.body);
      
      // Estados finais (completed/cancelled) não podem ser atualizados de forma alguma
      if (existingReferral.status === "completed" || existingReferral.status === "cancelled") {
        return res.status(400).json({ 
          error: `Encaminhamento ${existingReferral.status} não pode ser alterado` 
        });
      }
      
      // Validar transição de status se fornecido
      if (updateData.status) {
        // Validar transições permitidas (apenas progressão + cancelamento)
        const validTransitions: Record<string, string[]> = {
          pending: ["scheduled", "cancelled"],
          scheduled: ["in_progress", "cancelled"],
          in_progress: ["completed", "cancelled"],
        };
        
        const allowedStatuses = validTransitions[existingReferral.status] || [];
        if (!allowedStatuses.includes(updateData.status)) {
          return res.status(400).json({ 
            error: `Transição inválida: ${existingReferral.status} → ${updateData.status}. Transições permitidas: ${allowedStatuses.join(", ") || "nenhuma"}` 
          });
        }
      }
      
      const referral = await storage.updateMedicalReferral(req.params.id, updateData);
      res.json(referral);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Dados inválidos", details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/medical-referrals/:id", enforceUnitScope(), async (req, res) => {
    try {
      const existingReferral = await storage.getMedicalReferralById(req.params.id);
      if (!existingReferral) {
        return res.status(404).json({ error: "Encaminhamento não encontrado" });
      }
      
      if (!validateEntityAccess(req, existingReferral.unitId)) {
        return res.status(403).json({ error: "Acesso negado: encaminhamento de outra unidade" });
      }
      
      const success = await storage.deleteMedicalReferral(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Encaminhamento não encontrado" });
      }
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // REFERRAL WORKFLOW - Contra-Referência & Fila de Linha de Cuidado
  // ============================================================================
  
  app.post("/api/medical-referrals/:id/add-to-queue", enforceUnitScope(), async (req, res) => {
    try {
      const { careLineId } = req.body;
      if (!careLineId) {
        return res.status(400).json({ error: "careLineId é obrigatório" });
      }
      
      const existingReferral = await storage.getMedicalReferralById(req.params.id);
      if (!existingReferral) {
        return res.status(404).json({ error: "Encaminhamento não encontrado" });
      }
      
      if (!validateEntityAccess(req, existingReferral.unitId)) {
        return res.status(403).json({ error: "Acesso negado" });
      }
      
      const { referralWorkflowService } = await import("./services/referralWorkflowService");
      const result = await referralWorkflowService.addToCareLine(req.params.id, careLineId, {
        referralId: req.params.id,
        userId: req.session?.user?.id || "",
        userName: req.session?.user?.name || "",
        unitId: req.session?.user?.unitId || "",
      });
      
      if (!result.success) {
        return res.status(400).json({ error: result.message });
      }
      
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.post("/api/medical-referrals/:id/change-status", enforceUnitScope(), async (req, res) => {
    try {
      const { status, reason } = req.body;
      if (!status) {
        return res.status(400).json({ error: "status é obrigatório" });
      }
      
      const existingReferral = await storage.getMedicalReferralById(req.params.id);
      if (!existingReferral) {
        return res.status(404).json({ error: "Encaminhamento não encontrado" });
      }
      
      if (!validateEntityAccess(req, existingReferral.unitId)) {
        return res.status(403).json({ error: "Acesso negado" });
      }
      
      const { referralWorkflowService } = await import("./services/referralWorkflowService");
      const result = await referralWorkflowService.changeStatus(req.params.id, status, {
        referralId: req.params.id,
        userId: req.session?.user?.id || "",
        userName: req.session?.user?.name || "",
        unitId: req.session?.user?.unitId || "",
      }, reason);
      
      if (!result.success) {
        return res.status(400).json({ error: result.message });
      }
      
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.post("/api/medical-referrals/:id/counter-referral", enforceUnitScope(), async (req, res) => {
    try {
      const { report, diagnosis, conducts, followUp, attachments } = req.body;
      if (!report) {
        return res.status(400).json({ error: "report (laudo) é obrigatório" });
      }
      
      const existingReferral = await storage.getMedicalReferralById(req.params.id);
      if (!existingReferral) {
        return res.status(404).json({ error: "Encaminhamento não encontrado" });
      }
      
      const { referralWorkflowService } = await import("./services/referralWorkflowService");
      const result = await referralWorkflowService.registerCounterReferral(
        req.params.id,
        { report, diagnosis, conducts, followUp, attachments },
        {
          referralId: req.params.id,
          userId: req.session?.user?.id || "",
          userName: req.session?.user?.name || "",
          unitId: req.session?.user?.unitId || "",
        }
      );
      
      if (!result.success) {
        return res.status(400).json({ error: result.message });
      }
      
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.get("/api/care-line-queue/:careLineId/referrals", enforceUnitScope(), async (req, res) => {
    try {
      const unitId = getEffectiveUnitId(req);
      const { referralWorkflowService } = await import("./services/referralWorkflowService");
      const queue = await referralWorkflowService.getQueueByCareLine(req.params.careLineId, unitId || undefined);
      res.json(queue);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.get("/api/referral-indicators", enforceUnitScope(), async (req, res) => {
    try {
      const unitId = getEffectiveUnitId(req);
      if (!unitId) {
        return res.status(400).json({ error: "Unidade não identificada" });
      }
      
      const { startDate, endDate } = req.query;
      const { referralWorkflowService } = await import("./services/referralWorkflowService");
      const indicators = await referralWorkflowService.getIndicators(
        unitId,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );
      res.json(indicators);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // ENCAMINHAMENTO INTELIGENTE - Sugestão de Especialidade
  // ============================================================================
  
  /**
   * POST /api/encaminhamentos/sugerir-especialidades
   * 
   * Motor rule-based para sugestão automática de especialidades.
   * Analisa motivo do encaminhamento, hipótese diagnóstica e CID para
   * sugerir especialidades com score de relevância e justificativa.
   */
  app.post("/api/encaminhamentos/sugerir-especialidades", async (req, res) => {
    try {
      if (!req.session?.user) {
        return res.status(401).json({ error: "Não autenticado" });
      }
      
      const validatedInput = specialtySuggestionInputSchema.safeParse(req.body);
      if (!validatedInput.success) {
        return res.status(400).json({ 
          error: "Dados inválidos",
          details: validatedInput.error.flatten().fieldErrors 
        });
      }
      
      const sugestoes = await sugerirEspecialidades(validatedInput.data);
      res.json({ sugestoes });
    } catch (error: any) {
      console.error("[Encaminhamento Inteligente] Erro:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  /**
   * GET /api/especialidades
   * Lista todas as especialidades disponíveis para encaminhamento.
   */
  app.get("/api/especialidades", async (req, res) => {
    try {
      const especialidades = await storage.getSpecialties({ active: true });
      res.json(especialidades);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  /**
   * GET /api/referral-rules
   * Lista regras de encaminhamento (apenas admin/gestor).
   */
  app.get("/api/referral-rules", async (req, res) => {
    try {
      if (req.session?.user?.role !== "admin" && req.session?.user?.role !== "gestor") {
        return res.status(403).json({ error: "Acesso negado" });
      }
      
      const { specialtyId, active } = req.query;
      const rules = await storage.getReferralRules({
        specialtyId: specialtyId as string,
        active: active === "true" ? true : active === "false" ? false : undefined,
      });
      res.json(rules);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  /**
   * POST /api/referral-rules
   * Cria nova regra de encaminhamento (apenas admin).
   */
  app.post("/api/referral-rules", async (req, res) => {
    try {
      if (req.session?.user?.role !== "admin") {
        return res.status(403).json({ error: "Acesso negado" });
      }
      
      const validatedData = insertReferralRuleSchema.parse(req.body);
      const rule = await storage.createReferralRule(validatedData);
      invalidateRulesCache();
      res.status(201).json(rule);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ error: "Dados inválidos", details: error.flatten() });
      }
      res.status(500).json({ error: error.message });
    }
  });
  
  /**
   * PATCH /api/referral-rules/:id
   * Atualiza regra de encaminhamento (apenas admin).
   */
  app.patch("/api/referral-rules/:id", async (req, res) => {
    try {
      if (req.session?.user?.role !== "admin") {
        return res.status(403).json({ error: "Acesso negado" });
      }
      
      const existingRule = await storage.getReferralRuleById(req.params.id);
      if (!existingRule) {
        return res.status(404).json({ error: "Regra não encontrada" });
      }
      
      const updated = await storage.updateReferralRule(req.params.id, req.body);
      invalidateRulesCache();
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  /**
   * DELETE /api/referral-rules/:id
   * Remove regra de encaminhamento (apenas admin).
   */
  app.delete("/api/referral-rules/:id", async (req, res) => {
    try {
      if (req.session?.user?.role !== "admin") {
        return res.status(403).json({ error: "Acesso negado" });
      }
      
      const success = await storage.deleteReferralRule(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Regra não encontrada" });
      }
      invalidateRulesCache();
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Medications API
  app.get("/api/medications", async (req, res) => {
    try {
      const { search, unitId } = req.query;
      const medications = await storage.getMedications({
        search: search as string,
        unitId: unitId as string,
      });
      res.json(medications);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/medications/stock/low/:unitId", async (req, res) => {
    try {
      const lowStock = await storage.getLowStockMedications(req.params.unitId);
      res.json(lowStock);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/medications/:id/stock", async (req, res) => {
    try {
      const stock = await storage.getMedicationStock(req.params.id);
      res.json(stock);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // PHARMACY STOCK API (Estoque de Medicamentos) ✅
  // ============================================================================

  app.get("/api/pharmacy/stock", enforceUnitScope(), async (req, res) => {
    try {
      const effectiveUnitId = getEffectiveUnitId(req);
      const { search, status, includeExpired } = req.query;

      const stock = await storage.getAllMedicationStock({
        unitId: effectiveUnitId || undefined,
        search: search as string,
        status: status as string,
        includeExpired: includeExpired === "true",
      });

      res.json(stock);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/pharmacy/stock/low", enforceUnitScope(), async (req, res) => {
    try {
      const effectiveUnitId = getEffectiveUnitId(req);
      if (!effectiveUnitId) {
        return res.status(400).json({ error: "Unidade de saúde não especificada" });
      }

      const lowStock = await storage.getLowStockMedications(effectiveUnitId);
      res.json(lowStock);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/pharmacy/stock/expiring", enforceUnitScope(), async (req, res) => {
    try {
      const effectiveUnitId = getEffectiveUnitId(req);
      if (!effectiveUnitId) {
        return res.status(400).json({ error: "Unidade de saúde não especificada" });
      }

      const { days } = req.query;
      const daysAhead = days ? parseInt(days as string) : 90;

      const expiringStock = await storage.getExpiringStock(effectiveUnitId, daysAhead);
      res.json(expiringStock);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/pharmacy/stock/:id", async (req, res) => {
    try {
      const stock = await storage.getMedicationStock(req.params.id);
      res.json(stock);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/pharmacy/stock", enforceUnitScope(), async (req, res) => {
    try {
      const sessionUnitId = req.session?.user?.unitId;
      if (!sessionUnitId) {
        return res.status(401).json({ error: "Não autenticado" });
      }

      const stockData = {
        ...req.body,
        unitId: sessionUnitId,
      };

      const created = await storage.createMedicationStock(stockData);
      res.status(201).json(created);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/pharmacy/stock/:id", enforceUnitScope(), async (req, res) => {
    try {
      const updated = await storage.updateMedicationStock(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ error: "Estoque não encontrado" });
      }
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/pharmacy/stock/:id", enforceUnitScope(), async (req, res) => {
    try {
      const deleted = await storage.deleteMedicationStock(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Estoque não encontrado" });
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Pharmacy Dispensation API
  app.post("/api/pharmacy/dispense", async (req, res) => {
    try {
      const { prescriptionId, quantity } = req.body;
      
      if (!prescriptionId || !quantity) {
        return res.status(400).json({ error: "prescriptionId e quantity são obrigatórios" });
      }

      // Buscar prescrição
      const prescription = await storage.getPrescriptionById(prescriptionId);
      if (!prescription) {
        return res.status(404).json({ error: "Prescrição não encontrada" });
      }

      // SECURITY: Multi-tenant validation
      const sessionUnitId = req.session?.user?.unitId;
      if (sessionUnitId && prescription.unitId !== sessionUnitId) {
        return res.status(403).json({ error: "Acesso negado: prescrição de outra unidade" });
      }

      // Verificar se prescrição já foi dispensada
      if (prescription.status === "dispensed") {
        return res.status(400).json({ error: "Prescrição já foi dispensada" });
      }

      // Registrar dispensação
      const dispensation = await storage.createDispensation({
        prescriptionId,
        citizenId: prescription.citizenId,
        professionalId: req.session?.user?.id || prescription.professionalId,
        unitId: prescription.unitId,
        medication: prescription.medication,
        quantity,
        dispensedAt: new Date(),
      });

      // Atualizar status da prescrição
      await storage.updatePrescription(prescriptionId, { status: "dispensed" });

      res.status(201).json(dispensation);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get dispensation history
  app.get("/api/pharmacy/dispensations", async (req, res) => {
    try {
      const { citizenId, startDate, endDate, limit } = req.query;
      
      const sessionUnitId = req.session?.user?.unitId;
      
      const dispensations = await storage.getDispensations({
        unitId: sessionUnitId,
        citizenId: citizenId as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
      });
      
      res.json(dispensations);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Stock movements
  app.post("/api/pharmacy/stock-movements", async (req, res) => {
    try {
      // SECURITY: Multi-tenant enforcement - force unitId from session
      const sessionUnitId = req.session?.user?.unitId;
      if (!sessionUnitId) {
        return res.status(401).json({ error: "Usuário não autenticado" });
      }

      // Validate with Zod and enforce unitId from session
      const validation = schema.stockMovementSchema.safeParse({
        ...req.body,
        unitId: sessionUnitId, // Force unitId from session (security)
      });

      if (!validation.success) {
        return res.status(400).json({ 
          error: "Dados inválidos",
          details: validation.error.errors 
        });
      }

      const { medicationId, movementType, quantity, batchNumber, expirationDate, reason } = validation.data;

      const movement = {
        medicationId,
        unitId: sessionUnitId, // Use session unitId (security-enforced)
        professionalId: req.session?.user?.id,
        type: movementType,
        quantity: movementType === "saida" ? -Math.abs(quantity) : Math.abs(quantity),
        batchNumber,
        expirationDate,
        reason,
        createdAt: new Date(),
      };

      const created = await storage.createStockMovement(movement);
      res.status(201).json(created);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/pharmacy/stock-movements", async (req, res) => {
    try {
      const sessionUnitId = req.session?.user?.unitId;
      const movements = await storage.getStockMovements({ unitId: sessionUnitId, limit: 50 });
      res.json(movements);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Exams API
  // ============================================================================
  // EXAMS API (Exames) ✅
  // ============================================================================

  app.get("/api/exams", async (req, res) => {
    try {
      const { citizenId, consultationId, unitId } = req.query;
      
      // SECURITY: Multi-tenant validation
      const sessionUnitId = req.session?.user?.unitId;
      if (sessionUnitId && unitId && unitId !== sessionUnitId) {
        return res.status(403).json({ error: "Acesso negado: unidade diferente da sessão" });
      }

      const exams = await storage.getExams({
        citizenId: citizenId as string,
        consultationId: consultationId as string,
        unitId: (unitId || sessionUnitId) as string,
      });
      res.json(exams);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/exams/:id", async (req, res) => {
    try {
      const exam = await storage.getExamById(req.params.id);
      if (!exam) {
        return res.status(404).json({ error: "Exame não encontrado" });
      }

      // SECURITY: Multi-tenant validation
      const sessionUnitId = req.session?.user?.unitId;
      if (sessionUnitId && exam.unitId !== sessionUnitId) {
        return res.status(403).json({ error: "Acesso negado: exame de outra unidade" });
      }

      res.json(exam);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // SECURITY: Multi-tenant enforcement on exam mutations
  app.post("/api/exams", enforceUnitScope(), async (req, res) => {
    try {
      const sessionUnitId = req.session?.user?.unitId;
      
      // Enforce session unitId for non-cross-unit users
      const dataWithUnit = {
        ...req.body,
        unitId: sessionUnitId && !CROSS_UNIT_ROLES.includes(req.session?.user?.role as any)
          ? sessionUnitId 
          : (req.body.unitId || sessionUnitId),
      };

      const data = insertExamSchema.parse(dataWithUnit);
      const exam = await storage.createExam(data);
      res.status(201).json(exam);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Dados inválidos", details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/exams/:id", enforceUnitScope(), async (req, res) => {
    try {
      const existing = await storage.getExamById(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: "Exame não encontrado" });
      }
      if (!validateEntityAccess(req, existing.unitId)) {
        return res.status(403).json({ error: "Acesso negado: exame de outra unidade" });
      }

      const exam = await storage.updateExam(req.params.id, req.body);
      res.json(exam);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/exams/:id", enforceUnitScope(), async (req, res) => {
    try {
      const existing = await storage.getExamById(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: "Exame não encontrado" });
      }
      if (!validateEntityAccess(req, existing.unitId)) {
        return res.status(403).json({ error: "Acesso negado: exame de outra unidade" });
      }

      const success = await storage.deleteExam(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // TFD API
  // SECURITY: Multi-tenant enforcement - scope TFD requests to session unitId
  app.get("/api/tfd", enforceUnitScope(), async (req, res) => {
    try {
      const { citizenId, status } = req.query;
      const effectiveUnitId = getEffectiveUnitId(req);
      
      const requests = await storage.getTfdRequests({
        citizenId: citizenId as string,
        status: status as string,
        unitId: effectiveUnitId || undefined,
      });
      res.json(requests);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/tfd/:id", enforceUnitScope(), async (req, res) => {
    try {
      const request = await storage.getTfdRequestById(req.params.id);
      if (!request) {
        return res.status(404).json({ error: "Solicitação TFD não encontrada" });
      }
      
      // Validate TFD request belongs to user's unit
      if (!validateEntityAccess(req, request.originUnitId)) {
        return res.status(403).json({ error: "Acesso negado: solicitação TFD de outra unidade" });
      }
      
      res.json(request);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // SECURITY: Multi-tenant enforcement on TFD mutations
  app.post("/api/tfd", enforceUnitScope(), async (req, res) => {
    try {
      const sessionUnitId = req.session?.user?.unitId;
      const data = insertTfdRequestSchema.parse(req.body);
      
      // Enforce originUnitId for non-cross-unit users
      if (sessionUnitId && !CROSS_UNIT_ROLES.includes(req.session?.user?.role as any)) {
        if (data.originUnitId && data.originUnitId !== sessionUnitId) {
          return res.status(403).json({ error: "Não é permitido criar solicitação TFD de outra unidade" });
        }
        data.originUnitId = sessionUnitId;
      }
      
      const request = await storage.createTfdRequest(data);
      res.status(201).json(request);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Dados inválidos", details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/tfd/:id", enforceUnitScope(), async (req, res) => {
    try {
      const existing = await storage.getTfdRequestById(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: "Solicitação TFD não encontrada" });
      }
      if (!validateEntityAccess(req, existing.originUnitId)) {
        return res.status(403).json({ error: "Acesso negado: solicitação TFD de outra unidade" });
      }
      
      const request = await storage.updateTfdRequest(req.params.id, req.body);
      res.json(request);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/tfd/:id", enforceUnitScope(), async (req, res) => {
    try {
      const existing = await storage.getTfdRequestById(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: "Solicitação TFD não encontrada" });
      }
      if (!validateEntityAccess(req, existing.originUnitId)) {
        return res.status(403).json({ error: "Acesso negado: solicitação TFD de outra unidade" });
      }
      
      const success = await storage.deleteTfdRequest(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Health Units API
  app.get("/api/units", async (req, res) => {
    try {
      const units = await storage.getHealthUnits();
      res.json(units);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/units/:id", async (req, res) => {
    try {
      const unit = await storage.getHealthUnitById(req.params.id);
      if (!unit) {
        return res.status(404).json({ error: "Unidade não encontrada" });
      }
      res.json(unit);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/units", async (req, res) => {
    try {
      const data = insertHealthUnitSchema.parse(req.body);
      const unit = await storage.createHealthUnit(data);
      res.status(201).json(unit);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Dados inválidos", details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/units/:id", async (req, res) => {
    try {
      const data = insertHealthUnitSchema.partial().parse(req.body);
      const filteredData = Object.fromEntries(
        Object.entries(data).filter(([_, value]) => value !== undefined)
      );
      const unit = await storage.updateHealthUnit(req.params.id, filteredData);
      if (!unit) {
        return res.status(404).json({ error: "Unidade não encontrada" });
      }
      res.json(unit);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Dados inválidos", details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/units/:id", async (req, res) => {
    try {
      const success = await storage.deleteHealthUnit(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Unidade não encontrada" });
      }
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Professionals API
  app.get("/api/professionals", async (req, res) => {
    try {
      const { unitId } = req.query;
      const professionals = await storage.getProfessionals(unitId as string);
      res.json(professionals);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/professionals/:id", async (req, res) => {
    try {
      const professional = await storage.getProfessionalById(req.params.id);
      if (!professional) {
        return res.status(404).json({ error: "Profissional não encontrado" });
      }
      res.json(professional);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/professionals", async (req, res) => {
    try {
      const data = insertProfessionalSchema.parse(req.body);
      const professional = await storage.createProfessional(data);
      res.status(201).json(professional);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Dados inválidos", details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/professionals/:id", async (req, res) => {
    try {
      const data = insertProfessionalSchema.partial().parse(req.body);
      const filteredData = Object.fromEntries(
        Object.entries(data).filter(([_, value]) => value !== undefined)
      );
      const professional = await storage.updateProfessional(req.params.id, filteredData);
      if (!professional) {
        return res.status(404).json({ error: "Profissional não encontrado" });
      }
      res.json(professional);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Dados inválidos", details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/professionals/:id", async (req, res) => {
    try {
      const success = await storage.deleteProfessional(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Profissional não encontrado" });
      }
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Dashboard Stats API
  // SECURITY: Multi-tenant enforcement - scope dashboard stats to session unitId
  app.get("/api/stats/dashboard", enforceUnitScope(), async (req, res) => {
    try {
      const effectiveUnitId = getEffectiveUnitId(req);
      const stats = await storage.getDashboardStats(effectiveUnitId || undefined);
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Reports API
  // SECURITY: Multi-tenant enforcement - scope reports to session unitId
  app.get("/api/reports", enforceUnitScope(), async (req, res) => {
    try {
      const { period } = req.query;
      const effectiveUnitId = getEffectiveUnitId(req);
      const days = period ? parseInt(period as string) : 30;
      const reports = await storage.getReports(days, effectiveUnitId || undefined);
      res.json(reports);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // e-SUS APS Export API
  // ============================================================================
  
  // Gerar nova exportação e-SUS
  app.post("/api/esus/export", requireRole(["admin", "gestor"]), async (req, res) => {
    try {
      const { startDate, endDate, format = "json", includeTypes } = req.body;
      
      // Validar parâmetros
      if (!startDate || !endDate) {
        return res.status(400).json({ 
          error: "Parâmetros 'startDate' e 'endDate' são obrigatórios (formato: YYYY-MM-DD)" 
        });
      }
      
      // Validar formato de data
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
        return res.status(400).json({ 
          error: "Formato de data inválido. Use YYYY-MM-DD" 
        });
      }
      
      console.log(`[e-SUS] Gerando exportação: ${startDate} a ${endDate} (formato: ${format})`);
      
      // Gerar exportação
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      const { batch, errors } = await generateExport({
        startDate: start,
        endDate: end,
        format: format as "json" | "xml",
        includeTypes: includeTypes || ["citizens", "consultations", "procedures", "exams", "tfd"],
      });
      
      console.log(`[e-SUS] Exportação gerada com sucesso: ${batch.batchId}`);
      console.log(`[e-SUS] Total de registros: ${
        batch.totalRegistros.cidadaos +
        batch.totalRegistros.atendimentos +
        batch.totalRegistros.procedimentos +
        batch.totalRegistros.exames +
        batch.totalRegistros.solicitacoesTFD
      }`);
      
      if (errors.length > 0) {
        console.warn(`[e-SUS] ${errors.length} avisos de validação`);
      }
      
      res.json({
        success: true,
        batch,
        warnings: errors.length > 0 ? errors : undefined,
      });
      
    } catch (error: any) {
      console.error("[e-SUS] Erro ao gerar exportação:", error);
      res.status(500).json({ 
        error: "Erro ao gerar exportação e-SUS", 
        details: error.message 
      });
    }
  });
  
  // Endpoint interno para testes (requer autenticação + role admin/gestor)
  app.get("/api/internal/esus/generate", requireRole(["admin", "gestor"]), async (req, res) => {
    try {
      const { from, to, format = "json" } = req.query;
      
      // Validar parâmetros
      if (!from || !to) {
        return res.status(400).json({ 
          error: "Parâmetros 'from' e 'to' são obrigatórios (formato: YYYY-MM-DD)" 
        });
      }
      
      // Validar formato de data
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(from as string) || !dateRegex.test(to as string)) {
        return res.status(400).json({ 
          error: "Formato de data inválido. Use YYYY-MM-DD" 
        });
      }
      
      console.log(`[e-SUS] Exportação interna: ${from} a ${to}`);
      
      // Gerar exportação
      const start = new Date(from as string);
      const end = new Date(to as string);
      
      const { batch, errors } = await generateExport({
        startDate: start,
        endDate: end,
        format: format as "json" | "xml",
      });
      
      res.json({
        success: true,
        batch,
        warnings: errors.length > 0 ? errors : undefined,
      });
      
    } catch (error: any) {
      console.error("[e-SUS] Erro na exportação interna:", error);
      res.status(500).json({ 
        error: "Erro ao gerar exportação e-SUS", 
        details: error.message 
      });
    }
  });

  // ============================================================================
  // e-SUS Export Management API
  // ============================================================================

  // Listar histórico de exports
  app.get("/api/esus/exports", async (req, res) => {
    try {
      const { limit, offset } = req.query;
      const exports = await storage.getEsusExports({
        limit: limit ? parseInt(limit as string) : 50,
        offset: offset ? parseInt(offset as string) : 0,
      });
      res.json(exports);
    } catch (error: any) {
      console.error("[API] Error fetching e-SUS exports:", error);
      res.status(500).json({ error: "Erro ao buscar histórico de exportações" });
    }
  });

  // Download de arquivo de export (JSON ou XML)
  app.get("/api/esus/exports/:id/download", async (req, res) => {
    try {
      const { id } = req.params;
      const { type } = req.query; // 'json' ou 'xml'
      
      const exportRecord = await storage.getEsusExportById(id);
      
      if (!exportRecord) {
        return res.status(404).json({ error: "Exportação não encontrada" });
      }
      
      if (exportRecord.status !== "completed") {
        return res.status(400).json({ 
          error: "Exportação ainda não concluída ou falhou",
          status: exportRecord.status 
        });
      }
      
      const filePath = type === "xml" ? exportRecord.xmlPath : exportRecord.jsonPath;
      
      if (!filePath) {
        return res.status(404).json({ error: "Arquivo não encontrado" });
      }
      
      // Verificar se arquivo existe
      const fs = await import("fs/promises");
      try {
        await fs.access(filePath);
      } catch {
        return res.status(404).json({ error: "Arquivo não existe no sistema" });
      }
      
      // Enviar arquivo
      const fileName = `esus_export_${exportRecord.batchId}.${type === "xml" ? "xml" : "json"}`;
      res.download(filePath, fileName);
      
    } catch (error: any) {
      console.error("[API] Error downloading e-SUS export:", error);
      res.status(500).json({ error: "Erro ao fazer download do arquivo" });
    }
  });

  // ============================================================================
  // ADMINISTRATIVE API - Seed and Data Management
  // ============================================================================

  // Seed SIGTAP mappings (admin only)
  app.post("/api/admin/seed-sigtap", requireRole(["admin"]), async (req, res) => {
    try {
      console.log("[ADMIN] Executando seed SIGTAP mappings...");
      
      const result = await seedSIGTAPMappings();
      
      res.json({
        success: true,
        message: `${result.count} códigos SIGTAP inseridos/atualizados com sucesso`,
        count: result.count,
      });
    } catch (error: any) {
      console.error("[ADMIN] Erro ao executar seed SIGTAP:", error);
      res.status(500).json({ 
        error: "Erro ao executar seed SIGTAP",
        details: error.message 
      });
    }
  });

  // ============================================
  // GESTÃO TERRITORIAL (e-SUS Território)
  // ============================================

  // Dwellings (Imóveis)
  app.get("/api/dwellings", async (req, res) => {
    try {
      const { unitId, microarea, search, limit, offset } = req.query;
      const dwellings = await storage.getDwellings({
        unitId: unitId as string,
        microarea: microarea as string,
        search: search as string,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
      });
      res.json(dwellings);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/dwellings/:id", async (req, res) => {
    try {
      const dwelling = await storage.getDwellingById(req.params.id);
      if (!dwelling) {
        return res.status(404).json({ error: "Imóvel não encontrado" });
      }
      res.json(dwelling);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/dwellings", async (req, res) => {
    try {
      const data = insertDwellingSchema.parse(req.body);
      const dwelling = await storage.createDwelling(data);
      res.status(201).json(dwelling);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Dados inválidos", details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/dwellings/:id", async (req, res) => {
    try {
      const dwelling = await storage.updateDwelling(req.params.id, req.body);
      if (!dwelling) {
        return res.status(404).json({ error: "Imóvel não encontrado" });
      }
      res.json(dwelling);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/dwellings/:id", async (req, res) => {
    try {
      const success = await storage.deleteDwelling(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Imóvel não encontrado" });
      }
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Families (Famílias)
  app.get("/api/families", async (req, res) => {
    try {
      const { dwellingId, unitId, search, limit, offset } = req.query;
      const families = await storage.getFamilies({
        dwellingId: dwellingId as string,
        unitId: unitId as string,
        search: search as string,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
      });
      res.json(families);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/families/:id", async (req, res) => {
    try {
      const family = await storage.getFamilyById(req.params.id);
      if (!family) {
        return res.status(404).json({ error: "Família não encontrada" });
      }
      res.json(family);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/families", async (req, res) => {
    try {
      const data = insertFamilySchema.parse(req.body);
      const family = await storage.createFamily(data);
      res.status(201).json(family);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Dados inválidos", details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/families/:id", async (req, res) => {
    try {
      const family = await storage.updateFamily(req.params.id, req.body);
      if (!family) {
        return res.status(404).json({ error: "Família não encontrada" });
      }
      res.json(family);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/families/:id", async (req, res) => {
    try {
      const success = await storage.deleteFamily(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Família não encontrada" });
      }
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Family Members (Membros da Família)
  app.get("/api/families/:familyId/members", async (req, res) => {
    try {
      const members = await storage.getFamilyMembers(req.params.familyId);
      res.json(members);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/citizens/:citizenId/family", async (req, res) => {
    try {
      const familyMembership = await storage.getCitizenFamilyMembership(req.params.citizenId);
      if (!familyMembership) {
        return res.status(404).json({ error: "Cidadão não vinculado a nenhuma família" });
      }
      res.json(familyMembership);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/families/:familyId/members", async (req, res) => {
    try {
      const data = insertFamilyMemberSchema.parse({
        ...req.body,
        familyId: req.params.familyId,
      });
      const member = await storage.addFamilyMember(data);
      res.status(201).json(member);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Dados inválidos", details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/family-members/:id", async (req, res) => {
    try {
      const member = await storage.updateFamilyMember(req.params.id, req.body);
      if (!member) {
        return res.status(404).json({ error: "Membro não encontrado" });
      }
      res.json(member);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/family-members/:id", async (req, res) => {
    try {
      const success = await storage.removeFamilyMember(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Membro não encontrado" });
      }
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/families/:familyId/hierarchy", async (req, res) => {
    try {
      const hierarchy = await storage.getFamilyHierarchy(req.params.familyId);
      res.json(hierarchy);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // ============================================================================
  // TERRITORIAL INTEGRATION (Complete Hierarchy)
  // ============================================================================
  
  // Get complete territorial hierarchy: Dwelling → Families → Citizens
  app.get("/api/dwellings/:id/hierarchy", async (req, res) => {
    try {
      const hierarchy = await storage.getTerritorialHierarchy(req.params.id);
      res.json(hierarchy);
    } catch (error: any) {
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get family with all members and dwelling info
  app.get("/api/families/:id/with-members", async (req, res) => {
    try {
      const result = await storage.getFamilyWithMembers(req.params.id);
      res.json(result);
    } catch (error: any) {
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get dwelling with all families and their members
  app.get("/api/dwellings/:id/with-families", async (req, res) => {
    try {
      const result = await storage.getDwellingWithFamilies(req.params.id);
      res.json(result);
    } catch (error: any) {
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }
      res.status(500).json({ error: error.message });
    }
  });
  
  // Transfer family member from one family to another
  app.post("/api/family-members/:id/transfer", async (req, res) => {
    try {
      const { newFamilyId } = req.body;
      if (!newFamilyId) {
        return res.status(400).json({ error: "newFamilyId é obrigatório" });
      }
      
      const member = await storage.transferFamilyMember(req.params.id, newFamilyId);
      if (!member) {
        return res.status(404).json({ error: "Membro não encontrado" });
      }
      
      res.json(member);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Home Visits (Visitas Domiciliares)
  app.get("/api/home-visits", async (req, res) => {
    try {
      const { familyId, dwellingId, professionalId, limit, offset } = req.query;
      const visits = await storage.getHomeVisits({
        familyId: familyId as string,
        dwellingId: dwellingId as string,
        professionalId: professionalId as string,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
      });
      res.json(visits);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/home-visits/:id", async (req, res) => {
    try {
      const visit = await storage.getHomeVisitById(req.params.id);
      if (!visit) {
        return res.status(404).json({ error: "Visita não encontrada" });
      }
      res.json(visit);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/home-visits", async (req, res) => {
    try {
      const data = insertHomeVisitSchema.parse(req.body);
      const visit = await storage.createHomeVisit(data);
      res.status(201).json(visit);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Dados inválidos", details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/home-visits/:id", async (req, res) => {
    try {
      const visit = await storage.updateHomeVisit(req.params.id, req.body);
      if (!visit) {
        return res.status(404).json({ error: "Visita não encontrada" });
      }
      res.json(visit);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/home-visits/:id", async (req, res) => {
    try {
      const success = await storage.deleteHomeVisit(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Visita não encontrada" });
      }
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // ENDEMIC CONTROL ROUTES
  // SECURITY: All endemic routes enforce multi-tenant isolation
  // ============================================================================

  // Endemic Cycles
  app.get("/api/endemic/cycles", enforceUnitScope(), async (req, res) => {
    try {
      const { status, limit, offset } = req.query;
      const effectiveUnitId = getEffectiveUnitId(req);
      const cycles = await storage.getEndemicCycles({
        unitId: effectiveUnitId || undefined,
        status: status as string,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
      });
      res.json(cycles);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/endemic/cycles/:id", enforceUnitScope(), async (req, res) => {
    try {
      const cycle = await storage.getEndemicCycleById(req.params.id);
      if (!cycle) {
        return res.status(404).json({ error: "Ciclo não encontrado" });
      }
      if (!validateEntityAccess(req, cycle.unitId)) {
        return res.status(403).json({ error: "Acesso negado: ciclo de outra unidade" });
      }
      res.json(cycle);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/endemic/cycles", enforceUnitScope(), async (req, res) => {
    try {
      const sessionUnitId = req.session?.user?.unitId;
      const data = insertEndemicCycleSchema.parse(req.body);
      
      // Enforce session unitId for non-cross-unit users
      if (sessionUnitId && !CROSS_UNIT_ROLES.includes(req.session?.user?.role as any)) {
        data.unitId = sessionUnitId;
      }
      
      const cycle = await storage.createEndemicCycle(data);
      res.status(201).json(cycle);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Dados inválidos", details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/endemic/cycles/:id", enforceUnitScope(), async (req, res) => {
    try {
      const existing = await storage.getEndemicCycleById(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: "Ciclo não encontrado" });
      }
      if (!validateEntityAccess(req, existing.unitId)) {
        return res.status(403).json({ error: "Acesso negado: ciclo de outra unidade" });
      }
      
      const data = insertEndemicCycleSchema.partial().parse(req.body);
      const cycle = await storage.updateEndemicCycle(req.params.id, data);
      res.json(cycle);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Dados inválidos", details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/endemic/cycles/:id", enforceUnitScope(), async (req, res) => {
    try {
      const existing = await storage.getEndemicCycleById(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: "Ciclo não encontrado" });
      }
      if (!validateEntityAccess(req, existing.unitId)) {
        return res.status(403).json({ error: "Acesso negado: ciclo de outra unidade" });
      }
      
      const success = await storage.deleteEndemicCycle(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // FAD Evaluations - SECURITY: Multi-tenant isolation via cycle.unitId
  app.get("/api/endemic/fad-evaluations", enforceUnitScope(), async (req, res) => {
    try {
      const { cycleId, dwellingId, professionalId, limit, offset } = req.query;
      const effectiveUnitId = getEffectiveUnitId(req);
      const evaluations = await storage.getFadEvaluations({
        cycleId: cycleId as string,
        dwellingId: dwellingId as string,
        professionalId: professionalId as string,
        unitId: effectiveUnitId || undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
      });
      res.json(evaluations);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/endemic/fad-evaluations/:id", enforceUnitScope(), async (req, res) => {
    try {
      const evaluation = await storage.getFadEvaluationById(req.params.id);
      if (!evaluation) {
        return res.status(404).json({ error: "Avaliação FAD não encontrada" });
      }
      // Validate via cycle's unitId
      if (evaluation.cycleId) {
        const cycle = await storage.getEndemicCycleById(evaluation.cycleId);
        if (cycle && !validateEntityAccess(req, cycle.unitId)) {
          return res.status(403).json({ error: "Acesso negado: avaliação FAD de outra unidade" });
        }
      }
      res.json(evaluation);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/endemic/fad-evaluations", enforceUnitScope(), async (req, res) => {
    try {
      const data = insertFadEvaluationSchema.parse(req.body);
      
      // Validate cycle belongs to user's unit
      if (data.cycleId) {
        const cycle = await storage.getEndemicCycleById(data.cycleId);
        if (cycle && !validateEntityAccess(req, cycle.unitId)) {
          return res.status(403).json({ error: "Acesso negado: ciclo de outra unidade" });
        }
      }
      
      const evaluation = await storage.createFadEvaluation(data);
      res.status(201).json(evaluation);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Dados inválidos", details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/endemic/fad-evaluations/:id", enforceUnitScope(), async (req, res) => {
    try {
      const existing = await storage.getFadEvaluationById(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: "Avaliação FAD não encontrada" });
      }
      // Validate via cycle's unitId
      if (existing.cycleId) {
        const cycle = await storage.getEndemicCycleById(existing.cycleId);
        if (cycle && !validateEntityAccess(req, cycle.unitId)) {
          return res.status(403).json({ error: "Acesso negado: avaliação FAD de outra unidade" });
        }
      }
      
      const data = insertFadEvaluationSchema.partial().parse(req.body);
      const evaluation = await storage.updateFadEvaluation(req.params.id, data);
      res.json(evaluation);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Dados inválidos", details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/endemic/fad-evaluations/:id", enforceUnitScope(), async (req, res) => {
    try {
      const existing = await storage.getFadEvaluationById(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: "Avaliação FAD não encontrada" });
      }
      // Validate via cycle's unitId
      if (existing.cycleId) {
        const cycle = await storage.getEndemicCycleById(existing.cycleId);
        if (cycle && !validateEntityAccess(req, cycle.unitId)) {
          return res.status(403).json({ error: "Acesso negado: avaliação FAD de outra unidade" });
        }
      }
      
      const success = await storage.deleteFadEvaluation(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Foci - SECURITY: Multi-tenant isolation via FAD evaluation's cycle
  app.get("/api/endemic/foci", enforceUnitScope(), async (req, res) => {
    try {
      const { fadId, dwellingId, depositType, limit, offset } = req.query;
      const effectiveUnitId = getEffectiveUnitId(req);
      const foci = await storage.getFoci({
        fadId: fadId as string,
        dwellingId: dwellingId as string,
        depositType: depositType as string,
        unitId: effectiveUnitId || undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
      });
      res.json(foci);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/endemic/foci/:id", enforceUnitScope(), async (req, res) => {
    try {
      const focus = await storage.getFocusById(req.params.id);
      if (!focus) {
        return res.status(404).json({ error: "Foco não encontrado" });
      }
      // Validate via FAD evaluation's cycle's unitId
      if (focus.fadId) {
        const fad = await storage.getFadEvaluationById(focus.fadId);
        if (fad?.cycleId) {
          const cycle = await storage.getEndemicCycleById(fad.cycleId);
          if (cycle && !validateEntityAccess(req, cycle.unitId)) {
            return res.status(403).json({ error: "Acesso negado: foco de outra unidade" });
          }
        }
      }
      res.json(focus);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/endemic/foci", enforceUnitScope(), async (req, res) => {
    try {
      const data = insertFocusSchema.parse(req.body);
      
      // Validate FAD belongs to user's unit via cycle
      if (data.fadId) {
        const fad = await storage.getFadEvaluationById(data.fadId);
        if (fad?.cycleId) {
          const cycle = await storage.getEndemicCycleById(fad.cycleId);
          if (cycle && !validateEntityAccess(req, cycle.unitId)) {
            return res.status(403).json({ error: "Acesso negado: avaliação FAD de outra unidade" });
          }
        }
      }
      
      const focus = await storage.createFocus(data);
      res.status(201).json(focus);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Dados inválidos", details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/endemic/foci/:id", enforceUnitScope(), async (req, res) => {
    try {
      const existing = await storage.getFocusById(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: "Foco não encontrado" });
      }
      // Validate via FAD evaluation's cycle's unitId
      if (existing.fadId) {
        const fad = await storage.getFadEvaluationById(existing.fadId);
        if (fad?.cycleId) {
          const cycle = await storage.getEndemicCycleById(fad.cycleId);
          if (cycle && !validateEntityAccess(req, cycle.unitId)) {
            return res.status(403).json({ error: "Acesso negado: foco de outra unidade" });
          }
        }
      }
      
      const data = insertFocusSchema.partial().parse(req.body);
      const focus = await storage.updateFocus(req.params.id, data);
      res.json(focus);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Dados inválidos", details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/endemic/foci/:id", enforceUnitScope(), async (req, res) => {
    try {
      const existing = await storage.getFocusById(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: "Foco não encontrado" });
      }
      // Validate via FAD evaluation's cycle's unitId
      if (existing.fadId) {
        const fad = await storage.getFadEvaluationById(existing.fadId);
        if (fad?.cycleId) {
          const cycle = await storage.getEndemicCycleById(fad.cycleId);
          if (cycle && !validateEntityAccess(req, cycle.unitId)) {
            return res.status(403).json({ error: "Acesso negado: foco de outra unidade" });
          }
        }
      }
      
      const success = await storage.deleteFocus(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Focal Treatments - SECURITY: Multi-tenant isolation via cycle.unitId
  app.get("/api/endemic/treatments", enforceUnitScope(), async (req, res) => {
    try {
      const { cycleId, dwellingId, professionalId, limit, offset } = req.query;
      const effectiveUnitId = getEffectiveUnitId(req);
      const treatments = await storage.getFocalTreatments({
        cycleId: cycleId as string,
        dwellingId: dwellingId as string,
        professionalId: professionalId as string,
        unitId: effectiveUnitId || undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
      });
      res.json(treatments);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/endemic/treatments/:id", enforceUnitScope(), async (req, res) => {
    try {
      const treatment = await storage.getFocalTreatmentById(req.params.id);
      if (!treatment) {
        return res.status(404).json({ error: "Tratamento não encontrado" });
      }
      // Validate via cycle's unitId
      if (treatment.cycleId) {
        const cycle = await storage.getEndemicCycleById(treatment.cycleId);
        if (cycle && !validateEntityAccess(req, cycle.unitId)) {
          return res.status(403).json({ error: "Acesso negado: tratamento de outra unidade" });
        }
      }
      res.json(treatment);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/endemic/treatments", enforceUnitScope(), async (req, res) => {
    try {
      const data = insertFocalTreatmentSchema.parse(req.body);
      
      // Validate cycle belongs to user's unit
      if (data.cycleId) {
        const cycle = await storage.getEndemicCycleById(data.cycleId);
        if (cycle && !validateEntityAccess(req, cycle.unitId)) {
          return res.status(403).json({ error: "Acesso negado: ciclo de outra unidade" });
        }
      }
      
      const treatment = await storage.createFocalTreatment(data);
      res.status(201).json(treatment);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Dados inválidos", details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/endemic/treatments/:id", enforceUnitScope(), async (req, res) => {
    try {
      const existing = await storage.getFocalTreatmentById(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: "Tratamento não encontrado" });
      }
      // Validate via cycle's unitId
      if (existing.cycleId) {
        const cycle = await storage.getEndemicCycleById(existing.cycleId);
        if (cycle && !validateEntityAccess(req, cycle.unitId)) {
          return res.status(403).json({ error: "Acesso negado: tratamento de outra unidade" });
        }
      }
      
      const data = insertFocalTreatmentSchema.partial().parse(req.body);
      const treatment = await storage.updateFocalTreatment(req.params.id, data);
      res.json(treatment);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Dados inválidos", details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/endemic/treatments/:id", enforceUnitScope(), async (req, res) => {
    try {
      const existing = await storage.getFocalTreatmentById(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: "Tratamento não encontrado" });
      }
      // Validate via cycle's unitId
      if (existing.cycleId) {
        const cycle = await storage.getEndemicCycleById(existing.cycleId);
        if (cycle && !validateEntityAccess(req, cycle.unitId)) {
          return res.status(403).json({ error: "Acesso negado: tratamento de outra unidade" });
        }
      }
      
      const success = await storage.deleteFocalTreatment(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Endemic Statistics - SECURITY: Multi-tenant enforcement
  app.get("/api/endemic/stats", enforceUnitScope(), async (req, res) => {
    try {
      const { cycleId, startDate, endDate } = req.query;
      const effectiveUnitId = getEffectiveUnitId(req);
      const stats = await storage.getEndemicStats({
        unitId: effectiveUnitId || undefined,
        cycleId: cycleId as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
      });
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ACE Module - Guard check to avoid duplicate mounts  
  try {
    const { aceRouter} = await import("../modules/ace/server/routes");
    app.use("/api/ace", aceRouter);
  } catch (error: any) {
    console.warn("ACE module routes already mounted or failed to load:", error.message);
  }

  // ===================================================================
  // DYNAMIC FORMS SYSTEM ROUTES
  // ===================================================================

  // Specialties
  app.get("/api/specialties", async (req, res) => {
    try {
      const { active } = req.query;
      const specialties = await storage.getSpecialties({ 
        active: active ? active === 'true' : undefined 
      });
      res.json(specialties);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Care Lines
  app.get("/api/care-lines", async (req, res) => {
    try {
      const { specialtyId, active } = req.query;
      const careLines = await storage.getCareLines({ 
        specialtyId: specialtyId as string,
        active: active ? active === 'true' : undefined 
      });
      res.json(careLines);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Consultation Templates
  app.get("/api/consultation-templates", async (req, res) => {
    try {
      const { specialtyId, careLineId, active } = req.query;
      const templates = await storage.getConsultationTemplates({ 
        specialtyId: specialtyId as string,
        careLineId: careLineId as string,
        active: active ? active === 'true' : undefined 
      });
      res.json(templates);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get template with fields (commonly used endpoint)
  app.get("/api/consultation-templates/:id/with-fields", async (req, res) => {
    try {
      const template = await storage.getConsultationTemplateById(req.params.id);
      if (!template) {
        return res.status(404).json({ error: "Template não encontrado" });
      }
      
      const fields = await storage.getTemplateFields(req.params.id);
      
      res.json({ template, fields });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Consultation Field Data (get field data for a consultation)
  app.get("/api/consultations/:consultationId/field-data", async (req, res) => {
    try {
      // Multi-tenant security: verify consultation belongs to user's unit
      const consultation = await storage.getConsultationById(req.params.consultationId);
      if (!consultation) {
        return res.status(404).json({ error: "Consulta não encontrada" });
      }
      if (consultation.unitId !== req.session.user?.unitId) {
        return res.status(403).json({ error: "Acesso negado: consulta não pertence à sua unidade" });
      }
      
      const fieldData = await storage.getConsultationFieldData(req.params.consultationId);
      res.json(fieldData);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get consultation dynamic form (server-resolved template)
  app.get("/api/consultations/:consultationId/dynamic-form", async (req, res) => {
    try {
      // Multi-tenant security
      const consultation = await storage.getConsultationById(req.params.consultationId);
      if (!consultation) {
        return res.status(404).json({ error: "Consulta não encontrada" });
      }
      if (consultation.unitId !== req.session.user?.unitId) {
        return res.status(403).json({ error: "Acesso negado: consulta não pertence à sua unidade" });
      }

      // Resolve care line and template (SECURITY: pass unitId)
      const { CareLineResolutionService } = await import("./services/care-line-resolution");
      const resolution = await CareLineResolutionService.resolveForConsultation(
        req.params.consultationId,
        req.session.user.unitId // SECURITY: enforce multi-tenant isolation
      );

      if (!resolution.careLineId || !resolution.template) {
        return res.json({
          careLineId: null,
          careLine: null,
          template: null,
          fields: [],
          fieldData: [],
          matchReason: resolution.matchReason,
          matchDetails: resolution.matchDetails,
        });
      }

      // Load template fields
      const fields = await storage.getTemplateFields(resolution.template.id);

      // Load existing field data
      const fieldData = await storage.getConsultationFieldData(req.params.consultationId);

      res.json({
        careLineId: resolution.careLineId,
        careLine: resolution.careLine,
        template: resolution.template,
        fields,
        fieldData,
        matchReason: resolution.matchReason,
        matchDetails: resolution.matchDetails,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Assign care line to consultation
  app.post("/api/consultations/:consultationId/care-line", async (req, res) => {
    try {
      const { careLineId } = req.body;

      if (!careLineId) {
        return res.status(400).json({ error: "careLineId é obrigatório" });
      }

      // Multi-tenant security
      const consultation = await storage.getConsultationById(req.params.consultationId);
      if (!consultation) {
        return res.status(404).json({ error: "Consulta não encontrada" });
      }
      if (consultation.unitId !== req.session.user?.unitId) {
        return res.status(403).json({ error: "Acesso negado: consulta não pertence à sua unidade" });
      }

      // Assign care line
      const { CareLineResolutionService } = await import("./services/care-line-resolution");
      await CareLineResolutionService.assignCareLineToConsultation(
        req.params.consultationId,
        careLineId,
        req.session.user.unitId
      );

      res.json({ success: true, careLineId });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Save consultation field data
  app.post("/api/consultations/:consultationId/field-data", async (req, res) => {
    try {
      const { fieldData, templateId } = req.body;
      
      if (!Array.isArray(fieldData)) {
        return res.status(400).json({ error: "fieldData deve ser um array" });
      }
      
      // Multi-tenant security: verify consultation belongs to user's unit
      const consultation = await storage.getConsultationById(req.params.consultationId);
      if (!consultation) {
        return res.status(404).json({ error: "Consulta não encontrada" });
      }
      if (consultation.unitId !== req.session.user?.unitId) {
        return res.status(403).json({ error: "Acesso negado: consulta não pertence à sua unidade" });
      }
      
      // VALIDATION: If templateId provided, validate field data against template schema
      if (templateId) {
        const template = await storage.getConsultationTemplateById(templateId);
        if (!template) {
          return res.status(404).json({ error: "Template não encontrado" });
        }
        
        const templateFields = await storage.getTemplateFields(templateId);
        
        // Validate each field data entry against template fields
        const templateFieldsMap = new Map(templateFields.map((f: any) => [f.id, f]));
        const validationErrors: string[] = [];
        
        for (const field of fieldData) {
          const templateField = templateFieldsMap.get(field.fieldId);
          
          if (!templateField) {
            validationErrors.push(`Campo ${field.fieldId} não existe no template`);
            continue;
          }
          
          // Validate required fields
          if (templateField.required && (field.value === null || field.value === undefined || field.value === '')) {
            validationErrors.push(`Campo '${templateField.fieldLabel || templateField.label}' é obrigatório`);
          }
          
          // Validate field type
          if (field.value !== null && field.value !== undefined && field.value !== '') {
            const fieldType = templateField.fieldType;
            const value = field.value;
            
            if (fieldType === 'number' && typeof value !== 'number') {
              validationErrors.push(`Campo '${templateField.fieldLabel || templateField.label}' deve ser um número`);
            }
            
            if (fieldType === 'checkbox' && typeof value !== 'boolean') {
              validationErrors.push(`Campo '${templateField.fieldLabel || templateField.label}' deve ser verdadeiro ou falso`);
            }
            
            if (fieldType === 'date' && isNaN(Date.parse(value))) {
              validationErrors.push(`Campo '${templateField.fieldLabel || templateField.label}' deve ser uma data válida`);
            }
          }
        }
        
        if (validationErrors.length > 0) {
          return res.status(400).json({ 
            error: "Erro de validação dos campos", 
            validationErrors 
          });
        }
      }
      
      const saved = await storage.saveConsultationFieldData(req.params.consultationId, fieldData);
      res.status(201).json(saved);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Clinical Protocols - Evaluate protocols against field data
  app.post("/api/clinical-protocols/evaluate", async (req, res) => {
    try {
      const { fieldData, careLineId, specialtyId } = req.body;
      
      if (!fieldData || typeof fieldData !== 'object') {
        return res.status(400).json({ error: "fieldData deve ser um objeto" });
      }
      
      const triggeredProtocols = await storage.evaluateProtocols(
        fieldData, 
        careLineId, 
        specialtyId
      );
      
      res.json(triggeredProtocols);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Therapeutic Plans
  app.get("/api/therapeutic-plans", async (req, res) => {
    try {
      const { citizenId, careLineId, status } = req.query;
      
      // Multi-tenant security: force unitId to user's unit
      const plans = await storage.getTherapeuticPlans({ 
        citizenId: citizenId as string,
        careLineId: careLineId as string,
        status: status as string,
        unitId: req.session.user?.unitId, // Force user's unit
      });
      res.json(plans);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/therapeutic-plans", async (req, res) => {
    try {
      // Multi-tenant security: force unitId to user's unit
      if (req.body.unitId && req.body.unitId !== req.session.user?.unitId) {
        return res.status(403).json({ error: "Acesso negado: não é possível criar plano em outra unidade" });
      }
      
      const plan = await storage.createTherapeuticPlan({
        ...req.body,
        unitId: req.session.user?.unitId, // Force user's unit
        createdBy: req.session.user?.professionalId, // Auto-set creator
      });
      res.status(201).json(plan);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/therapeutic-plans/:id", async (req, res) => {
    try {
      // Multi-tenant security: verify plan belongs to user's unit
      const existingPlan = await storage.getTherapeuticPlanById(req.params.id);
      if (!existingPlan) {
        return res.status(404).json({ error: "Plano terapêutico não encontrado" });
      }
      if (existingPlan.unitId !== req.session.user?.unitId) {
        return res.status(403).json({ error: "Acesso negado: plano não pertence à sua unidade" });
      }
      
      const plan = await storage.updateTherapeuticPlan(req.params.id, req.body);
      res.json(plan);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Therapeutic Plan Items
  app.get("/api/therapeutic-plans/:planId/items", async (req, res) => {
    try {
      // Multi-tenant security: verify plan belongs to user's unit
      const plan = await storage.getTherapeuticPlanById(req.params.planId);
      if (!plan) {
        return res.status(404).json({ error: "Plano terapêutico não encontrado" });
      }
      if (plan.unitId !== req.session.user?.unitId) {
        return res.status(403).json({ error: "Acesso negado: plano não pertence à sua unidade" });
      }
      
      const items = await storage.getTherapeuticPlanItems(req.params.planId);
      res.json(items);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/therapeutic-plans/:planId/items", async (req, res) => {
    try {
      // Multi-tenant security: verify plan belongs to user's unit
      const plan = await storage.getTherapeuticPlanById(req.params.planId);
      if (!plan) {
        return res.status(404).json({ error: "Plano terapêutico não encontrado" });
      }
      if (plan.unitId !== req.session.user?.unitId) {
        return res.status(403).json({ error: "Acesso negado: plano não pertence à sua unidade" });
      }
      
      const item = await storage.createTherapeuticPlanItem({ ...req.body, planId: req.params.planId });
      res.status(201).json(item);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // CLINICAL PROTOCOLS API (Admin CRUD) ✅
  // ============================================================================

  app.get("/api/clinical-protocols", async (req, res) => {
    try {
      // Note: Clinical protocols are system-wide (não são multi-tenant por unidade)
      const protocols = await storage.getClinicalProtocols({ active: undefined });
      res.json(protocols);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/clinical-protocols", async (req, res) => {
    try {
      // Admin-only endpoint - validate role
      if (req.session?.user?.role !== "admin" && req.session?.user?.role !== "gestor") {
        return res.status(403).json({ error: "Acesso negado: apenas administradores podem criar protocolos" });
      }

      // Validate with Zod schema
      const validation = schema.insertClinicalProtocolSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          error: "Dados inválidos",
          details: validation.error.errors 
        });
      }
      
      const protocol = await storage.createClinicalProtocol(validation.data);
      res.status(201).json(protocol);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/clinical-protocols/:id", async (req, res) => {
    try {
      // Admin-only endpoint
      if (req.session?.user?.role !== "admin" && req.session?.user?.role !== "gestor") {
        return res.status(403).json({ error: "Acesso negado: apenas administradores podem atualizar protocolos" });
      }

      // Partial validation (allow partial updates)
      const validation = schema.insertClinicalProtocolSchema.partial().safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          error: "Dados inválidos",
          details: validation.error.errors 
        });
      }

      const protocol = await storage.updateClinicalProtocol(req.params.id, validation.data);
      if (!protocol) {
        return res.status(404).json({ error: "Protocolo não encontrado" });
      }
      res.json(protocol);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/clinical-protocols/:id", async (req, res) => {
    try {
      // Admin-only endpoint
      if (req.session?.user?.role !== "admin" && req.session?.user?.role !== "gestor") {
        return res.status(403).json({ error: "Acesso negado: apenas administradores podem deletar protocolos" });
      }

      const success = await storage.deleteClinicalProtocol(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Protocolo não encontrado" });
      }
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // CONSULTATION TEMPLATES API (Dynamic Forms Admin) ✅
  // ============================================================================

  app.get("/api/consultation-templates", async (req, res) => {
    try {
      const templates = await storage.getConsultationTemplates({});
      res.json(templates);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/consultation-templates/:id/fields", async (req, res) => {
    try {
      const fields = await storage.getTemplateFields(req.params.id);
      res.json(fields);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/consultation-templates", async (req, res) => {
    try {
      // Admin-only endpoint - validate role
      if (req.session?.user?.role !== "admin" && req.session?.user?.role !== "gestor") {
        return res.status(403).json({ error: "Acesso negado: apenas administradores podem criar templates" });
      }

      // Validate with Zod schema
      const validation = schema.insertConsultationTemplateSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          error: "Dados inválidos",
          details: validation.error.errors 
        });
      }
      
      const template = await storage.createConsultationTemplate(validation.data);
      res.status(201).json(template);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/consultation-templates/:id", async (req, res) => {
    try {
      // Admin-only endpoint
      if (req.session?.user?.role !== "admin" && req.session?.user?.role !== "gestor") {
        return res.status(403).json({ error: "Acesso negado: apenas administradores podem atualizar templates" });
      }

      // Partial validation (allow partial updates)
      const validation = schema.insertConsultationTemplateSchema.partial().safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          error: "Dados inválidos",
          details: validation.error.errors 
        });
      }

      const template = await storage.updateConsultationTemplate(req.params.id, validation.data);
      if (!template) {
        return res.status(404).json({ error: "Template não encontrado" });
      }
      res.json(template);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/consultation-templates/:id", async (req, res) => {
    try {
      // Admin-only endpoint
      if (req.session?.user?.role !== "admin" && req.session?.user?.role !== "gestor") {
        return res.status(403).json({ error: "Acesso negado: apenas administradores podem deletar templates" });
      }

      const success = await storage.deleteConsultationTemplate(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Template não encontrado" });
      }
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // CIAP-2 / CID-10 AUTOCOMPLETE API
  // ============================================================================

  app.get("/api/ciap2/search", async (req, res) => {
    try {
      const { q, limit } = req.query;
      if (!q || typeof q !== 'string') {
        return res.status(400).json({ error: "Parâmetro 'q' obrigatório" });
      }
      const results = ciap2Cid10Service.searchCiap2(q, parseInt(limit as string) || 10);
      res.json(results);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/cid10/search", async (req, res) => {
    try {
      const { q, limit } = req.query;
      if (!q || typeof q !== 'string') {
        return res.status(400).json({ error: "Parâmetro 'q' obrigatório" });
      }
      const results = ciap2Cid10Service.searchCid10(q, parseInt(limit as string) || 10);
      res.json(results);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/ciap2/:code", async (req, res) => {
    try {
      const code = ciap2Cid10Service.getCiap2ByCode(req.params.code);
      if (!code) {
        return res.status(404).json({ error: "Código CIAP-2 não encontrado" });
      }
      res.json(code);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/cid10/:code", async (req, res) => {
    try {
      const code = ciap2Cid10Service.getCid10ByCode(req.params.code);
      if (!code) {
        return res.status(404).json({ error: "Código CID-10 não encontrado" });
      }
      res.json(code);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/ciap2/:code/cid10-mappings", async (req, res) => {
    try {
      const mappings = ciap2Cid10Service.getCid10MappingsForCiap2(req.params.code);
      res.json(mappings);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // NOTIFICATIONS API
  // ============================================================================

  app.get("/api/notifications", enforceUnitScope(), async (req, res) => {
    try {
      const userId = req.session?.user?.id;
      const unitId = getEffectiveUnitId(req);
      const { unreadOnly, type, limit } = req.query;
      
      const notifications = await notificationService.getUserNotifications({
        userId,
        unitId,
        unreadOnly: unreadOnly === 'true',
        type: type as string,
        limit: parseInt(limit as string) || 50,
      });
      res.json(notifications);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/notifications/unread-count", enforceUnitScope(), async (req, res) => {
    try {
      const userId = req.session?.user?.id;
      const unitId = getEffectiveUnitId(req);
      const count = await notificationService.getUnreadCount(userId, unitId);
      res.json({ count });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/notifications/:id/read", enforceUnitScope(), async (req, res) => {
    try {
      const success = await notificationService.markAsRead(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Notificação não encontrada" });
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/notifications/:id/dismiss", enforceUnitScope(), async (req, res) => {
    try {
      const success = await notificationService.dismissNotification(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Notificação não encontrada" });
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/notifications/mark-all-read", enforceUnitScope(), async (req, res) => {
    try {
      const userId = req.session?.user?.id;
      const unitId = getEffectiveUnitId(req);
      const count = await notificationService.markAllAsRead(userId, unitId);
      res.json({ markedCount: count });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // DIGITAL SIGNATURES API
  // ============================================================================

  app.get("/api/signatures/validate/:code", async (req, res) => {
    try {
      const validation = await digitalSignatureService.validateSignatureByCode(req.params.code);
      res.json(validation);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/signatures/document/:type/:id", enforceUnitScope(), async (req, res) => {
    try {
      const signature = await digitalSignatureService.getDocumentSignature(
        req.params.type,
        req.params.id
      );
      if (!signature) {
        return res.status(404).json({ error: "Assinatura não encontrada" });
      }
      res.json(signature);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/signatures/sign", enforceUnitScope(), async (req, res) => {
    try {
      const { documentType, documentId, content } = req.body;
      
      if (!documentType || !documentId || !content) {
        return res.status(400).json({ error: "Campos obrigatórios: documentType, documentId, content" });
      }
      
      // Buscar profissional do usuário
      const professionalId = req.session?.user?.professionalId;
      if (!professionalId) {
        return res.status(403).json({ error: "Usuário não vinculado a um profissional" });
      }
      
      const professional = await db
        .select()
        .from(schema.professionals)
        .where(eq(schema.professionals.id, professionalId))
        .limit(1);
      
      if (professional.length === 0) {
        return res.status(404).json({ error: "Profissional não encontrado" });
      }
      
      const unitId = req.session?.user?.unitId;
      if (!unitId) {
        return res.status(403).json({ error: "Usuário sem unidade definida" });
      }
      
      const signature = await digitalSignatureService.signDocument({
        type: documentType,
        id: documentId,
        content,
        signerId: professionalId,
        signerName: professional[0].name,
        signerCRM: professional[0].registrationNumber || undefined,
        unitId,
      });
      
      res.status(201).json(signature);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ============================================================================
  // MEDICAL CERTIFICATES API (Atestados Médicos)
  // ============================================================================

  app.get("/api/medical-certificates", enforceUnitScope(), async (req, res) => {
    try {
      const unitId = getEffectiveUnitId(req);
      const { citizenId, professionalId, status, startDate, endDate } = req.query;
      
      const conditions: any[] = [];
      if (unitId) {
        conditions.push(eq(schema.medicalCertificates.unitId, unitId));
      }
      if (citizenId) {
        conditions.push(eq(schema.medicalCertificates.citizenId, citizenId as string));
      }
      if (professionalId) {
        conditions.push(eq(schema.medicalCertificates.professionalId, professionalId as string));
      }
      if (status) {
        conditions.push(eq(schema.medicalCertificates.status, status as any));
      }
      
      const certificates = await db
        .select()
        .from(schema.medicalCertificates)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(sql`${schema.medicalCertificates.createdAt} DESC`)
        .limit(100);
      
      res.json(certificates);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/medical-certificates/:id", enforceUnitScope(), async (req, res) => {
    try {
      const certificate = await db
        .select()
        .from(schema.medicalCertificates)
        .where(eq(schema.medicalCertificates.id, req.params.id))
        .limit(1);
      
      if (certificate.length === 0) {
        return res.status(404).json({ error: "Atestado não encontrado" });
      }
      
      // Multi-tenant validation
      const unitId = getEffectiveUnitId(req);
      if (unitId && certificate[0].unitId !== unitId) {
        return res.status(403).json({ error: "Acesso negado a esta unidade" });
      }
      
      res.json(certificate[0]);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/medical-certificates", enforceUnitScope(), async (req, res) => {
    try {
      const unitId = req.session?.user?.unitId;
      if (!unitId) {
        return res.status(403).json({ error: "Usuário sem unidade definida" });
      }
      
      const data = {
        ...req.body,
        unitId,
        startDate: new Date(req.body.startDate),
        endDate: new Date(req.body.endDate),
      };
      
      const result = await db.insert(schema.medicalCertificates).values(data).returning();
      res.status(201).json(result[0]);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/medical-certificates/:id", enforceUnitScope(), async (req, res) => {
    try {
      const certificate = await db
        .select()
        .from(schema.medicalCertificates)
        .where(eq(schema.medicalCertificates.id, req.params.id))
        .limit(1);
      
      if (certificate.length === 0) {
        return res.status(404).json({ error: "Atestado não encontrado" });
      }
      
      const unitId = getEffectiveUnitId(req);
      if (unitId && certificate[0].unitId !== unitId) {
        return res.status(403).json({ error: "Acesso negado a esta unidade" });
      }
      
      const updateData = { ...req.body };
      if (req.body.startDate) updateData.startDate = new Date(req.body.startDate);
      if (req.body.endDate) updateData.endDate = new Date(req.body.endDate);
      
      const result = await db
        .update(schema.medicalCertificates)
        .set(updateData)
        .where(eq(schema.medicalCertificates.id, req.params.id))
        .returning();
      
      res.json(result[0]);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/medical-certificates/:id/sign", enforceUnitScope(), async (req, res) => {
    try {
      const certificate = await db
        .select()
        .from(schema.medicalCertificates)
        .where(eq(schema.medicalCertificates.id, req.params.id))
        .limit(1);
      
      if (certificate.length === 0) {
        return res.status(404).json({ error: "Atestado não encontrado" });
      }
      
      const unitId = getEffectiveUnitId(req);
      if (unitId && certificate[0].unitId !== unitId) {
        return res.status(403).json({ error: "Acesso negado a esta unidade" });
      }
      
      // Buscar profissional
      const professionalId = req.session?.user?.professionalId;
      if (!professionalId) {
        return res.status(403).json({ error: "Usuário não vinculado a um profissional" });
      }
      
      const professional = await db
        .select()
        .from(schema.professionals)
        .where(eq(schema.professionals.id, professionalId))
        .limit(1);
      
      if (professional.length === 0) {
        return res.status(404).json({ error: "Profissional não encontrado" });
      }
      
      // Criar assinatura digital
      const content = JSON.stringify({
        id: certificate[0].id,
        certificateType: certificate[0].certificateType,
        citizenId: certificate[0].citizenId,
        startDate: certificate[0].startDate,
        endDate: certificate[0].endDate,
        daysCount: certificate[0].daysCount,
      });
      
      const signature = await digitalSignatureService.signDocument({
        type: 'certificate',
        id: certificate[0].id,
        content,
        signerId: professionalId,
        signerName: professional[0].name,
        signerCRM: professional[0].registrationNumber || undefined,
        unitId: certificate[0].unitId,
      });
      
      // Atualizar status do atestado
      const result = await db
        .update(schema.medicalCertificates)
        .set({ 
          status: 'signed',
          signatureId: signature.documentId, // usar o ID do documento assinado
        })
        .where(eq(schema.medicalCertificates.id, req.params.id))
        .returning();
      
      res.json({ certificate: result[0], signature });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ============================================================================
  // EXAM VALIDATION API
  // ============================================================================

  app.post("/api/exams/validate", enforceUnitScope(), async (req, res) => {
    try {
      const { examType, citizenId, sigtapCode, ciap2Codes, cid10Codes } = req.body;
      
      if (!examType || !citizenId) {
        return res.status(400).json({ error: "Campos obrigatórios: examType, citizenId" });
      }
      
      // Buscar dados do cidadão
      const citizen = await db
        .select()
        .from(schema.citizens)
        .where(eq(schema.citizens.id, citizenId))
        .limit(1);
      
      if (citizen.length === 0) {
        return res.status(404).json({ error: "Cidadão não encontrado" });
      }
      
      const citizenData = citizen[0];
      const citizenAge = citizenData.birthDate 
        ? Math.floor((Date.now() - new Date(citizenData.birthDate).getTime()) / (1000 * 60 * 60 * 24 * 365))
        : 0;
      
      const validation = await examValidationService.validateExamRequest({
        examType,
        sigtapCode,
        citizenId,
        citizenAge,
        citizenSex: citizenData.sex as 'M' | 'F',
        consultationId: req.body.consultationId || '',
        ciap2Codes,
        cid10Codes,
        isPregnant: citizenData.isPregnant || false,
        chronicConditions: citizenData.chronicConditions as string[] || [],
      });
      
      res.json(validation);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/exams/suggestions/:citizenId", enforceUnitScope(), async (req, res) => {
    try {
      const citizen = await db
        .select()
        .from(schema.citizens)
        .where(eq(schema.citizens.id, req.params.citizenId))
        .limit(1);
      
      if (citizen.length === 0) {
        return res.status(404).json({ error: "Cidadão não encontrado" });
      }
      
      const citizenData = citizen[0];
      const citizenAge = citizenData.birthDate 
        ? Math.floor((Date.now() - new Date(citizenData.birthDate).getTime()) / (1000 * 60 * 60 * 24 * 365))
        : 0;
      
      const { ciap2Codes, cid10Codes } = req.query;
      
      const suggestions = examValidationService.suggestComplementaryExams({
        ciap2Codes: ciap2Codes ? (ciap2Codes as string).split(',') : undefined,
        cid10Codes: cid10Codes ? (cid10Codes as string).split(',') : undefined,
        citizenAge,
        citizenSex: citizenData.sex as 'M' | 'F',
        chronicConditions: citizenData.chronicConditions as string[] || [],
      });
      
      res.json(suggestions);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/exams/history/:citizenId", enforceUnitScope(), async (req, res) => {
    try {
      const { examType, startDate, endDate, limit } = req.query;
      
      const history = await examValidationService.getExamHistory({
        citizenId: req.params.citizenId,
        examType: examType as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        limit: parseInt(limit as string) || 50,
      });
      
      res.json(history);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // CLINICAL JOURNEY API
  // ============================================================================

  app.post("/api/clinical-journey/start", enforceUnitScope(), async (req, res) => {
    try {
      const { consultationId, citizenId, citizenName } = req.body;
      
      if (!consultationId || !citizenId) {
        return res.status(400).json({ error: "Campos obrigatórios: consultationId, citizenId" });
      }
      
      const context = {
        consultationId,
        citizenId,
        citizenName: citizenName || '',
        professionalId: req.session?.user?.professionalId || '',
        professionalName: req.session?.user?.name || '',
        unitId: req.session?.user?.unitId || '',
        userId: req.session?.user?.id || '',
        userRole: req.session?.user?.role || '',
      };
      
      const result = await clinicalJourneyService.startJourney(context);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/clinical-journey/triage", enforceUnitScope(), async (req, res) => {
    try {
      const { consultationId, citizenId, citizenName, triageData } = req.body;
      
      const context = {
        consultationId,
        citizenId,
        citizenName: citizenName || '',
        professionalId: req.session?.user?.professionalId || '',
        professionalName: req.session?.user?.name || '',
        unitId: req.session?.user?.unitId || '',
        userId: req.session?.user?.id || '',
        userRole: req.session?.user?.role || '',
      };
      
      const result = await clinicalJourneyService.processTriageStep(context, triageData);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/clinical-journey/consultation", enforceUnitScope(), async (req, res) => {
    try {
      const { consultationId, citizenId, citizenName, consultationData } = req.body;
      
      const context = {
        consultationId,
        citizenId,
        citizenName: citizenName || '',
        professionalId: req.session?.user?.professionalId || '',
        professionalName: req.session?.user?.name || '',
        unitId: req.session?.user?.unitId || '',
        userId: req.session?.user?.id || '',
        userRole: req.session?.user?.role || '',
      };
      
      const result = await clinicalJourneyService.processConsultationStep(context, consultationData);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/clinical-journey/finalize", enforceUnitScope(), async (req, res) => {
    try {
      const { consultationId, citizenId, citizenName, signPrescriptions, signCertificates, signReferrals } = req.body;
      
      const context = {
        consultationId,
        citizenId,
        citizenName: citizenName || '',
        professionalId: req.session?.user?.professionalId || '',
        professionalName: req.session?.user?.name || '',
        unitId: req.session?.user?.unitId || '',
        userId: req.session?.user?.id || '',
        userRole: req.session?.user?.role || '',
      };
      
      const result = await clinicalJourneyService.finalizeJourney(context, {
        signPrescriptions,
        signCertificates,
        signReferrals,
      });
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // RENAME CATALOG & PRESCRIPTION VALIDATION API
  // ============================================================================

  // Busca inteligente no catálogo RENAME (protegido por autenticação)
  app.get("/api/rename/search", enforceUnitScope(), async (req, res) => {
    try {
      const { q, limit } = req.query;
      if (!q || typeof q !== "string") {
        return res.status(400).json({ error: "Parâmetro de busca 'q' é obrigatório" });
      }
      
      const prescriptionService = await import("./services/prescriptionValidationService");
      const results = await prescriptionService.searchRENAMECatalog(q, Number(limit) || 20);
      res.json(results);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Obter medicamento RENAME por ID (protegido)
  app.get("/api/rename/:id", enforceUnitScope(), async (req, res) => {
    try {
      const medication = await db
        .select()
        .from(schema.renameCatalog)
        .where(eq(schema.renameCatalog.id, req.params.id))
        .limit(1);
      
      if (!medication[0]) {
        return res.status(404).json({ error: "Medicamento não encontrado" });
      }
      res.json(medication[0]);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Listar medicamentos controlados (Portaria 344/98) - protegido
  app.get("/api/rename/controlled/list", enforceUnitScope(), async (req, res) => {
    try {
      const medications = await db
        .select()
        .from(schema.renameCatalog)
        .where(
          and(
            eq(schema.renameCatalog.isControlled, true),
            eq(schema.renameCatalog.active, true)
          )
        );
      res.json(medications);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Validação completa de prescrição
  app.post("/api/prescriptions/validate", enforceUnitScope(), async (req, res) => {
    try {
      const { medicationName, dosage, frequency, citizenId, existingMedications } = req.body;
      
      if (!medicationName || !dosage || !frequency || !citizenId) {
        return res.status(400).json({ error: "Campos obrigatórios: medicationName, dosage, frequency, citizenId" });
      }
      
      // Obter dados do cidadão para validação
      const citizen = await storage.getCitizenById(citizenId);
      if (!citizen) {
        return res.status(404).json({ error: "Cidadão não encontrado" });
      }
      
      // Calcular idade
      let citizenAge: number | undefined;
      if (citizen.birthDate) {
        const birth = new Date(citizen.birthDate);
        citizenAge = Math.floor((Date.now() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      }
      
      const prescriptionService = await import("./services/prescriptionValidationService");
      const result = await prescriptionService.validatePrescription({
        medicationName,
        dosage,
        frequency,
        citizenId,
        citizenAge,
        citizenWeight: undefined, // Pode ser passado opcionalmente
        existingMedications,
      });
      
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Gerar QR Code para prescrição
  app.get("/api/prescriptions/:id/qrcode", enforceUnitScope(), async (req, res) => {
    try {
      const [prescription] = await db
        .select()
        .from(schema.prescriptions)
        .where(eq(schema.prescriptions.id, req.params.id))
        .limit(1);
      
      if (!prescription) {
        return res.status(404).json({ error: "Prescrição não encontrada" });
      }
      
      const valid = await validateEntityAccess(req, prescription.unitId);
      if (!valid) {
        return res.status(403).json({ error: "Acesso negado" });
      }
      
      const prescriptionService = await import("./services/prescriptionValidationService");
      const qrData = await prescriptionService.generateQRCodeData(prescription.id);
      
      res.json({ qrData, prescriptionId: prescription.id });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Validar QR Code de prescrição
  app.post("/api/prescriptions/validate-qr", async (req, res) => {
    try {
      const { qrData } = req.body;
      if (!qrData) {
        return res.status(400).json({ error: "QR Data é obrigatório" });
      }
      
      const prescriptionService = await import("./services/prescriptionValidationService");
      const result = await prescriptionService.validateQRCode(qrData);
      
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // CITIZEN ALLERGIES API
  // ============================================================================

  // Listar alergias do cidadão
  app.get("/api/citizens/:citizenId/allergies", enforceUnitScope(), async (req, res) => {
    try {
      const allergies = await db
        .select()
        .from(schema.citizenAllergies)
        .where(
          and(
            eq(schema.citizenAllergies.citizenId, req.params.citizenId),
            eq(schema.citizenAllergies.active, true)
          )
        );
      res.json(allergies);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Adicionar alergia ao cidadão
  app.post("/api/citizens/:citizenId/allergies", enforceUnitScope(), async (req, res) => {
    try {
      const { allergyType, allergen, severity, reaction, notes } = req.body;
      
      if (!allergyType || !allergen || !severity) {
        return res.status(400).json({ error: "Campos obrigatórios: allergyType, allergen, severity" });
      }
      
      const [allergy] = await db
        .insert(schema.citizenAllergies)
        .values({
          citizenId: req.params.citizenId,
          allergyType,
          allergen,
          severity,
          reaction,
          notes,
          active: true,
          diagnosedDate: new Date(),
        })
        .returning();
      
      res.status(201).json(allergy);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Remover alergia (soft delete)
  app.delete("/api/citizens/:citizenId/allergies/:id", enforceUnitScope(), async (req, res) => {
    try {
      await db
        .update(schema.citizenAllergies)
        .set({ active: false })
        .where(eq(schema.citizenAllergies.id, req.params.id));
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // EXAMS WORKFLOW API - Status Transitions
  // ============================================================================

  // Agendar exame (requested → scheduled)
  app.patch("/api/exams/:id/schedule", enforceUnitScope(), async (req, res) => {
    try {
      const { scheduledDate } = req.body;
      
      const [exam] = await db
        .select()
        .from(schema.exams)
        .where(eq(schema.exams.id, req.params.id))
        .limit(1);
      
      if (!exam) {
        return res.status(404).json({ error: "Exame não encontrado" });
      }
      
      const valid = await validateEntityAccess(req, exam.unitId);
      if (!valid) {
        return res.status(403).json({ error: "Acesso negado" });
      }
      
      if (exam.status !== "requested") {
        return res.status(400).json({ error: "Exame deve estar no status 'solicitado' para agendar" });
      }
      
      const [updated] = await db
        .update(schema.exams)
        .set({
          status: "scheduled",
          scheduledDate: scheduledDate ? new Date(scheduledDate) : new Date(),
          updatedAt: new Date(),
        })
        .where(eq(schema.exams.id, req.params.id))
        .returning();
      
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Registrar coleta (scheduled → collected)
  app.patch("/api/exams/:id/collect", enforceUnitScope(), async (req, res) => {
    try {
      const professionalId = req.session?.user?.professionalId;
      
      const [exam] = await db
        .select()
        .from(schema.exams)
        .where(eq(schema.exams.id, req.params.id))
        .limit(1);
      
      if (!exam) {
        return res.status(404).json({ error: "Exame não encontrado" });
      }
      
      const valid = await validateEntityAccess(req, exam.unitId);
      if (!valid) {
        return res.status(403).json({ error: "Acesso negado" });
      }
      
      if (!["requested", "scheduled"].includes(exam.status)) {
        return res.status(400).json({ error: "Exame deve estar agendado ou solicitado para registrar coleta" });
      }
      
      const [updated] = await db
        .update(schema.exams)
        .set({
          status: "collected",
          collectedDate: new Date(),
          collectedBy: professionalId || null,
          updatedAt: new Date(),
        })
        .where(eq(schema.exams.id, req.params.id))
        .returning();
      
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Registrar resultado (collected → result_available)
  app.patch("/api/exams/:id/result", enforceUnitScope(), async (req, res) => {
    try {
      const { result, resultValue, resultUnit, referenceRange, isAbnormal, observations } = req.body;
      const professionalId = req.session?.user?.professionalId;
      
      const [exam] = await db
        .select()
        .from(schema.exams)
        .where(eq(schema.exams.id, req.params.id))
        .limit(1);
      
      if (!exam) {
        return res.status(404).json({ error: "Exame não encontrado" });
      }
      
      const valid = await validateEntityAccess(req, exam.unitId);
      if (!valid) {
        return res.status(403).json({ error: "Acesso negado" });
      }
      
      if (!["collected", "scheduled", "requested"].includes(exam.status)) {
        return res.status(400).json({ error: "Exame deve estar coletado para registrar resultado" });
      }
      
      const [updated] = await db
        .update(schema.exams)
        .set({
          status: "result_available",
          result,
          resultValue,
          resultUnit,
          referenceRange,
          isAbnormal,
          observations,
          resultDate: new Date(),
          analyzedBy: professionalId || null,
          updatedAt: new Date(),
        })
        .where(eq(schema.exams.id, req.params.id))
        .returning();
      
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Upload anexo de resultado
  app.patch("/api/exams/:id/attachment", enforceUnitScope(), async (req, res) => {
    try {
      const { attachmentUrl, attachmentFileName } = req.body;
      
      const [exam] = await db
        .select()
        .from(schema.exams)
        .where(eq(schema.exams.id, req.params.id))
        .limit(1);
      
      if (!exam) {
        return res.status(404).json({ error: "Exame não encontrado" });
      }
      
      const valid = await validateEntityAccess(req, exam.unitId);
      if (!valid) {
        return res.status(403).json({ error: "Acesso negado" });
      }
      
      const [updated] = await db
        .update(schema.exams)
        .set({
          attachmentUrl,
          attachmentFileName,
          updatedAt: new Date(),
        })
        .where(eq(schema.exams.id, req.params.id))
        .returning();
      
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Finalizar exame (result_available → completed)
  app.patch("/api/exams/:id/complete", enforceUnitScope(), async (req, res) => {
    try {
      const [exam] = await db
        .select()
        .from(schema.exams)
        .where(eq(schema.exams.id, req.params.id))
        .limit(1);
      
      if (!exam) {
        return res.status(404).json({ error: "Exame não encontrado" });
      }
      
      const valid = await validateEntityAccess(req, exam.unitId);
      if (!valid) {
        return res.status(403).json({ error: "Acesso negado" });
      }
      
      if (exam.status !== "result_available") {
        return res.status(400).json({ error: "Exame deve ter resultado disponível para finalizar" });
      }
      
      const [updated] = await db
        .update(schema.exams)
        .set({
          status: "completed",
          updatedAt: new Date(),
        })
        .where(eq(schema.exams.id, req.params.id))
        .returning();
      
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Notificar paciente sobre resultado
  app.post("/api/exams/:id/notify", enforceUnitScope(), async (req, res) => {
    try {
      const [exam] = await db
        .select()
        .from(schema.exams)
        .where(eq(schema.exams.id, req.params.id))
        .limit(1);
      
      if (!exam) {
        return res.status(404).json({ error: "Exame não encontrado" });
      }
      
      const valid = await validateEntityAccess(req, exam.unitId);
      if (!valid) {
        return res.status(403).json({ error: "Acesso negado" });
      }
      
      // Aqui integraria com serviço de notificação (SMS/WhatsApp)
      // Por enquanto apenas marca como notificado
      const [updated] = await db
        .update(schema.exams)
        .set({
          patientNotified: true,
          notificationSentAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(schema.exams.id, req.params.id))
        .returning();
      
      res.json({ success: true, exam: updated, message: "Notificação enviada" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // DOCUMENT VALIDATION API
  // ============================================================================

  app.post("/api/validate/cpf", async (req, res) => {
    try {
      const { cpf } = req.body;
      if (!cpf) {
        return res.status(400).json({ error: "CPF é obrigatório" });
      }
      const result = documentValidationService.validateCPF(cpf);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/validate/cns", async (req, res) => {
    try {
      const { cns } = req.body;
      if (!cns) {
        return res.status(400).json({ error: "CNS é obrigatório" });
      }
      const result = documentValidationService.validateCNS(cns);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/validate/cep", async (req, res) => {
    try {
      const { cep } = req.body;
      if (!cep) {
        return res.status(400).json({ error: "CEP é obrigatório" });
      }
      const result = await documentValidationService.validateCEP(cep);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/validate/cep/:cep", async (req, res) => {
    try {
      const result = await documentValidationService.validateCEP(req.params.cep);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // PROFESSIONAL SCHEDULE API (Agenda Profissional)
  // ============================================================================

  app.get("/api/schedules", enforceUnitScope(), async (req, res) => {
    try {
      const effectiveUnitId = getEffectiveUnitId(req);
      const { professionalId, dayOfWeek } = req.query;

      const conditions = [eq(schema.professionalSchedules.active, true)];
      
      if (effectiveUnitId) {
        conditions.push(eq(schema.professionalSchedules.unitId, effectiveUnitId));
      }
      if (professionalId) {
        conditions.push(eq(schema.professionalSchedules.professionalId, professionalId as string));
      }
      if (dayOfWeek !== undefined) {
        conditions.push(eq(schema.professionalSchedules.dayOfWeek, parseInt(dayOfWeek as string)));
      }

      const schedules = await db.query.professionalSchedules.findMany({
        where: and(...conditions),
        orderBy: [asc(schema.professionalSchedules.dayOfWeek), asc(schema.professionalSchedules.startTime)],
      });

      res.json(schedules);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/schedules", enforceUnitScope(), async (req, res) => {
    try {
      const sessionUnitId = req.session?.user?.unitId;
      if (!sessionUnitId) {
        return res.status(401).json({ error: "Não autenticado" });
      }

      const data = schema.insertProfessionalScheduleSchema.parse({
        ...req.body,
        unitId: sessionUnitId,
      });

      const [created] = await db.insert(schema.professionalSchedules).values(data).returning();
      res.status(201).json(created);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/schedules/:id", enforceUnitScope(), async (req, res) => {
    try {
      const schedule = await db.query.professionalSchedules.findFirst({
        where: eq(schema.professionalSchedules.id, req.params.id),
      });

      if (!schedule) {
        return res.status(404).json({ error: "Agenda não encontrada" });
      }

      const valid = await validateEntityAccess(req, schedule.unitId);
      if (!valid) {
        return res.status(403).json({ error: "Acesso negado" });
      }

      const updateData = schema.updateProfessionalScheduleSchema.parse(req.body);

      const [updated] = await db
        .update(schema.professionalSchedules)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(schema.professionalSchedules.id, req.params.id))
        .returning();

      res.json(updated);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ error: "Dados inválidos", details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/schedules/:id", enforceUnitScope(), async (req, res) => {
    try {
      const schedule = await db.query.professionalSchedules.findFirst({
        where: eq(schema.professionalSchedules.id, req.params.id),
      });

      if (!schedule) {
        return res.status(404).json({ error: "Agenda não encontrada" });
      }

      const valid = await validateEntityAccess(req, schedule.unitId);
      if (!valid) {
        return res.status(403).json({ error: "Acesso negado" });
      }

      await db.delete(schema.professionalSchedules).where(eq(schema.professionalSchedules.id, req.params.id));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/schedules/slots/:professionalId/:date", enforceUnitScope(), async (req, res) => {
    try {
      const effectiveUnitId = getEffectiveUnitId(req);
      if (!effectiveUnitId) {
        return res.status(400).json({ error: "Unidade não especificada" });
      }

      const { QueueRoutingService } = await import("./services/queue-routing");
      const slots = await QueueRoutingService.getAvailableSlots(
        req.params.professionalId,
        effectiveUnitId,
        new Date(req.params.date)
      );

      res.json(slots);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // WAITING LIST API (Lista de Espera)
  // ============================================================================

  app.get("/api/waiting-list", enforceUnitScope(), async (req, res) => {
    try {
      const effectiveUnitId = getEffectiveUnitId(req);
      const { status, professionalId, specialtyId, careLineId } = req.query;

      const conditions = [];
      
      if (effectiveUnitId) {
        conditions.push(eq(schema.waitingList.unitId, effectiveUnitId));
      }
      if (status) {
        conditions.push(eq(schema.waitingList.status, status as any));
      }
      if (professionalId) {
        conditions.push(eq(schema.waitingList.professionalId, professionalId as string));
      }
      if (specialtyId) {
        conditions.push(eq(schema.waitingList.specialtyId, specialtyId as string));
      }
      if (careLineId) {
        conditions.push(eq(schema.waitingList.careLineId, careLineId as string));
      }

      const entries = await db.query.waitingList.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        orderBy: [desc(schema.waitingList.requestDate)],
      });

      res.json(entries);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/waiting-list", enforceUnitScope(), async (req, res) => {
    try {
      const sessionUnitId = req.session?.user?.unitId;
      if (!sessionUnitId) {
        return res.status(401).json({ error: "Não autenticado" });
      }

      const data = schema.insertWaitingListSchema.parse({
        ...req.body,
        unitId: sessionUnitId,
        requestDate: new Date(),
      });

      const [created] = await db.insert(schema.waitingList).values(data).returning();
      res.status(201).json(created);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/waiting-list/:id", enforceUnitScope(), async (req, res) => {
    try {
      const entry = await db.query.waitingList.findFirst({
        where: eq(schema.waitingList.id, req.params.id),
      });

      if (!entry) {
        return res.status(404).json({ error: "Entrada não encontrada" });
      }

      const valid = await validateEntityAccess(req, entry.unitId);
      if (!valid) {
        return res.status(403).json({ error: "Acesso negado" });
      }

      const updateData = schema.updateWaitingListSchema.parse(req.body);

      const [updated] = await db
        .update(schema.waitingList)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(schema.waitingList.id, req.params.id))
        .returning();

      res.json(updated);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ error: "Dados inválidos", details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/waiting-list/process", enforceUnitScope(), async (req, res) => {
    try {
      const effectiveUnitId = getEffectiveUnitId(req);
      if (!effectiveUnitId) {
        return res.status(400).json({ error: "Unidade não especificada" });
      }

      const { QueueRoutingService } = await import("./services/queue-routing");
      const scheduledCount = await QueueRoutingService.processWaitingList(effectiveUnitId);

      res.json({ success: true, scheduledCount, message: `${scheduledCount} pacientes agendados automaticamente` });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // QUEUE ROUTING RULES API (Regras de Roteamento de Fila)
  // ============================================================================

  app.get("/api/queue-routing-rules", enforceUnitScope(), async (req, res) => {
    try {
      const effectiveUnitId = getEffectiveUnitId(req);

      const conditions = [eq(schema.queueRoutingRules.active, true)];
      if (effectiveUnitId) {
        conditions.push(eq(schema.queueRoutingRules.unitId, effectiveUnitId));
      }

      const rules = await db.query.queueRoutingRules.findMany({
        where: and(...conditions),
        orderBy: [desc(schema.queueRoutingRules.priority)],
      });

      res.json(rules);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/queue-routing-rules", enforceUnitScope(), async (req, res) => {
    try {
      const sessionUnitId = req.session?.user?.unitId;
      if (!sessionUnitId) {
        return res.status(401).json({ error: "Não autenticado" });
      }

      const data = schema.insertQueueRoutingRuleSchema.parse({
        ...req.body,
        unitId: sessionUnitId,
      });

      const [created] = await db.insert(schema.queueRoutingRules).values(data).returning();
      res.status(201).json(created);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/queue-routing-rules/:id", enforceUnitScope(), async (req, res) => {
    try {
      const rule = await db.query.queueRoutingRules.findFirst({
        where: eq(schema.queueRoutingRules.id, req.params.id),
      });

      if (!rule) {
        return res.status(404).json({ error: "Regra não encontrada" });
      }

      const valid = await validateEntityAccess(req, rule.unitId);
      if (!valid) {
        return res.status(403).json({ error: "Acesso negado" });
      }

      const updateData = schema.updateQueueRoutingRuleSchema.parse(req.body);

      const [updated] = await db
        .update(schema.queueRoutingRules)
        .set(updateData)
        .where(eq(schema.queueRoutingRules.id, req.params.id))
        .returning();

      res.json(updated);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ error: "Dados inválidos", details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/queue-routing-rules/:id", enforceUnitScope(), async (req, res) => {
    try {
      const rule = await db.query.queueRoutingRules.findFirst({
        where: eq(schema.queueRoutingRules.id, req.params.id),
      });

      if (!rule) {
        return res.status(404).json({ error: "Regra não encontrada" });
      }

      const valid = await validateEntityAccess(req, rule.unitId);
      if (!valid) {
        return res.status(403).json({ error: "Acesso negado" });
      }

      await db.delete(schema.queueRoutingRules).where(eq(schema.queueRoutingRules.id, req.params.id));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/queue/routed", enforceUnitScope(), async (req, res) => {
    try {
      const sessionUnitId = req.session?.user?.unitId;
      if (!sessionUnitId) {
        return res.status(401).json({ error: "Não autenticado" });
      }

      const { QueueRoutingService } = await import("./services/queue-routing");
      
      const entryData = schema.insertAttendanceQueueSchema.parse({
        ...req.body,
        unitId: sessionUnitId,
      });

      const result = await QueueRoutingService.createRoutedQueueEntry(entryData, {
        appointmentId: req.body.appointmentId,
        consultationId: req.body.consultationId,
      });

      res.status(201).json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // 404 handler for undefined API routes
  app.use("/api/*", (req, res) => {
    res.status(404).json({ error: "Endpoint não encontrado" });
  });

  const httpServer = createServer(app);
  return httpServer;
}
