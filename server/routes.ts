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
import { z } from "zod";
import { generateExport } from "./integrations/esus/exporter";
import seedSIGTAPMappings from "./seed-sigtap";
import { authenticateUser, requireAuth, requireRole } from "./auth";
import aiRoutes from "./routes-ai";
import { generatePrescriptionPDF, generateMedicalCertificatePDF } from "./services/pdf-generator";
import { CareLineResolutionService } from "./services/care-line-resolution";
import { ProtocolAlertService } from "./services/protocol-alert.service";
import { rawSqlite } from "./db";
import { sugerirEspecialidades, invalidateRulesCache } from "./services/sugestorEspecialidade";
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
  app.get("/api/citizens", async (req, res) => {
    try {
      const { search, limit, offset } = req.query;
      const citizens = await storage.getCitizens({
        search: search as string,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
      });
      res.json(citizens);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/citizens/:id", async (req, res) => {
    try {
      const citizen = await storage.getCitizenById(req.params.id);
      if (!citizen) {
        return res.status(404).json({ error: "Cidadão não encontrado" });
      }
      res.json(citizen);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/citizens", async (req, res) => {
    try {
      const data = insertCitizenSchema.parse(req.body);
      
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

  app.patch("/api/citizens/:id", async (req, res) => {
    try {
      const citizen = await storage.updateCitizen(req.params.id, req.body);
      if (!citizen) {
        return res.status(404).json({ error: "Cidadão não encontrado" });
      }
      res.json(citizen);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/citizens/:id", async (req, res) => {
    try {
      const success = await storage.deleteCitizen(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Cidadão não encontrado" });
      }
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
  app.get("/api/appointments", async (req, res) => {
    try {
      const { citizenId, professionalId, unitId, date, status, limit } = req.query;
      const appointments = await storage.getAppointments({
        citizenId: citizenId as string,
        professionalId: professionalId as string,
        unitId: unitId as string,
        date: date ? new Date(date as string) : undefined,
        status: status as string,
        limit: limit ? parseInt(limit as string) : undefined,
      });
      res.json(appointments);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/appointments/:id", async (req, res) => {
    try {
      const appointment = await storage.getAppointmentById(req.params.id);
      if (!appointment) {
        return res.status(404).json({ error: "Agendamento não encontrado" });
      }
      res.json(appointment);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/appointments", async (req, res) => {
    try {
      const data = insertAppointmentSchema.parse(req.body);
      const appointment = await storage.createAppointment(data);
      res.status(201).json(appointment);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Dados inválidos", details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/appointments/:id", async (req, res) => {
    try {
      const appointment = await storage.updateAppointment(req.params.id, req.body);
      if (!appointment) {
        return res.status(404).json({ error: "Agendamento não encontrado" });
      }
      res.json(appointment);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/appointments/:id", async (req, res) => {
    try {
      const success = await storage.deleteAppointment(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Agendamento não encontrado" });
      }
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
  app.get("/api/consultations", async (req, res) => {
    try {
      const { citizenId, professionalId, limit } = req.query;
      const consultations = await storage.getConsultations({
        citizenId: citizenId as string,
        professionalId: professionalId as string,
        limit: limit ? parseInt(limit as string) : undefined,
      });
      res.json(consultations);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/consultations/:id", async (req, res) => {
    try {
      const consultation = await storage.getConsultationById(req.params.id);
      if (!consultation) {
        return res.status(404).json({ error: "Consulta não encontrada" });
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

  app.post("/api/consultations", async (req, res) => {
    try {
      const data = insertConsultationSchema.parse(req.body);
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

  // Endpoint transacional para criar consulta + prescrições atomicamente
  app.post("/api/consultations-with-prescriptions", async (req, res) => {
    try {
      const { consultation, prescriptions } = req.body;
      
      // Validar consulta
      const validatedConsultation = insertConsultationSchema.parse(consultation);
      
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

  app.delete("/api/consultations/:id", async (req, res) => {
    try {
      const success = await storage.deleteConsultation(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Consulta não encontrada" });
      }
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
  app.get("/api/prescriptions", async (req, res) => {
    try {
      const { citizenId, consultationId, professionalId, startDate, endDate } = req.query;
      const prescriptions = await storage.getPrescriptions({
        citizenId: citizenId as string,
        consultationId: consultationId as string,
        professionalId: professionalId as string,
        startDate: startDate as string,
        endDate: endDate as string,
      });
      res.json(prescriptions);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/prescriptions", async (req, res) => {
    try {
      const data = insertPrescriptionSchema.parse(req.body);
      const prescription = await storage.createPrescription(data);
      res.status(201).json(prescription);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Dados inválidos", details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/prescriptions/:id", async (req, res) => {
    try {
      const prescription = await storage.updatePrescription(req.params.id, req.body);
      if (!prescription) {
        return res.status(404).json({ error: "Prescrição não encontrada" });
      }
      res.json(prescription);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/prescriptions/:id", async (req, res) => {
    try {
      const success = await storage.deletePrescription(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Prescrição não encontrada" });
      }
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

  app.delete("/api/medical-referrals/:id", async (req, res) => {
    try {
      // Buscar referral existente para validação multi-tenant
      const existingReferral = await storage.getMedicalReferralById(req.params.id);
      if (!existingReferral) {
        return res.status(404).json({ error: "Encaminhamento não encontrado" });
      }
      
      // Validação multi-tenant: verificar se referral pertence à unidade do usuário autenticado
      const sessionUnitId = req.session?.user?.unitId;
      if (sessionUnitId && existingReferral.unitId !== sessionUnitId) {
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

  app.post("/api/exams", async (req, res) => {
    try {
      // Merge session unitId if not provided
      const dataWithUnit = {
        ...req.body,
        unitId: req.body.unitId || req.session?.user?.unitId,
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

  app.patch("/api/exams/:id", async (req, res) => {
    try {
      // Verify ownership before update
      const existing = await storage.getExamById(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: "Exame não encontrado" });
      }

      // SECURITY: Multi-tenant validation
      const sessionUnitId = req.session?.user?.unitId;
      if (sessionUnitId && existing.unitId !== sessionUnitId) {
        return res.status(403).json({ error: "Acesso negado: exame de outra unidade" });
      }

      const exam = await storage.updateExam(req.params.id, req.body);
      res.json(exam);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/exams/:id", async (req, res) => {
    try {
      // Verify ownership before delete
      const existing = await storage.getExamById(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: "Exame não encontrado" });
      }

      // SECURITY: Multi-tenant validation
      const sessionUnitId = req.session?.user?.unitId;
      if (sessionUnitId && existing.unitId !== sessionUnitId) {
        return res.status(403).json({ error: "Acesso negado: exame de outra unidade" });
      }

      const success = await storage.deleteExam(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // TFD API
  app.get("/api/tfd", async (req, res) => {
    try {
      const { citizenId, status } = req.query;
      const requests = await storage.getTfdRequests({
        citizenId: citizenId as string,
        status: status as string,
      });
      res.json(requests);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/tfd/:id", async (req, res) => {
    try {
      const request = await storage.getTfdRequestById(req.params.id);
      if (!request) {
        return res.status(404).json({ error: "Solicitação TFD não encontrada" });
      }
      res.json(request);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/tfd", async (req, res) => {
    try {
      const data = insertTfdRequestSchema.parse(req.body);
      const request = await storage.createTfdRequest(data);
      res.status(201).json(request);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Dados inválidos", details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/tfd/:id", async (req, res) => {
    try {
      const request = await storage.updateTfdRequest(req.params.id, req.body);
      if (!request) {
        return res.status(404).json({ error: "Solicitação TFD não encontrada" });
      }
      res.json(request);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/tfd/:id", async (req, res) => {
    try {
      const success = await storage.deleteTfdRequest(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Solicitação TFD não encontrada" });
      }
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
  app.get("/api/stats/dashboard", async (req, res) => {
    try {
      const { unitId } = req.query;
      const stats = await storage.getDashboardStats(unitId as string);
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Reports API
  app.get("/api/reports", async (req, res) => {
    try {
      const { period, unitId } = req.query;
      const days = period ? parseInt(period as string) : 30;
      const reports = await storage.getReports(days, unitId as string);
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
  // ============================================================================

  // Endemic Cycles
  app.get("/api/endemic/cycles", async (req, res) => {
    try {
      const { unitId, status, limit, offset } = req.query;
      const cycles = await storage.getEndemicCycles({
        unitId: unitId as string,
        status: status as string,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
      });
      res.json(cycles);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/endemic/cycles/:id", async (req, res) => {
    try {
      const cycle = await storage.getEndemicCycleById(req.params.id);
      if (!cycle) {
        return res.status(404).json({ error: "Ciclo não encontrado" });
      }
      res.json(cycle);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/endemic/cycles", async (req, res) => {
    try {
      const data = insertEndemicCycleSchema.parse(req.body);
      const cycle = await storage.createEndemicCycle(data);
      res.status(201).json(cycle);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Dados inválidos", details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/endemic/cycles/:id", async (req, res) => {
    try {
      const data = insertEndemicCycleSchema.partial().parse(req.body);
      const cycle = await storage.updateEndemicCycle(req.params.id, data);
      if (!cycle) {
        return res.status(404).json({ error: "Ciclo não encontrado" });
      }
      res.json(cycle);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Dados inválidos", details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/endemic/cycles/:id", async (req, res) => {
    try {
      const success = await storage.deleteEndemicCycle(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Ciclo não encontrado" });
      }
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // FAD Evaluations
  app.get("/api/endemic/fad-evaluations", async (req, res) => {
    try {
      const { cycleId, dwellingId, professionalId, limit, offset } = req.query;
      const evaluations = await storage.getFadEvaluations({
        cycleId: cycleId as string,
        dwellingId: dwellingId as string,
        professionalId: professionalId as string,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
      });
      res.json(evaluations);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/endemic/fad-evaluations/:id", async (req, res) => {
    try {
      const evaluation = await storage.getFadEvaluationById(req.params.id);
      if (!evaluation) {
        return res.status(404).json({ error: "Avaliação FAD não encontrada" });
      }
      res.json(evaluation);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/endemic/fad-evaluations", async (req, res) => {
    try {
      const data = insertFadEvaluationSchema.parse(req.body);
      const evaluation = await storage.createFadEvaluation(data);
      res.status(201).json(evaluation);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Dados inválidos", details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/endemic/fad-evaluations/:id", async (req, res) => {
    try {
      const data = insertFadEvaluationSchema.partial().parse(req.body);
      const evaluation = await storage.updateFadEvaluation(req.params.id, data);
      if (!evaluation) {
        return res.status(404).json({ error: "Avaliação FAD não encontrada" });
      }
      res.json(evaluation);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Dados inválidos", details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/endemic/fad-evaluations/:id", async (req, res) => {
    try {
      const success = await storage.deleteFadEvaluation(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Avaliação FAD não encontrada" });
      }
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Foci
  app.get("/api/endemic/foci", async (req, res) => {
    try {
      const { fadId, dwellingId, depositType, limit, offset } = req.query;
      const foci = await storage.getFoci({
        fadId: fadId as string,
        dwellingId: dwellingId as string,
        depositType: depositType as string,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
      });
      res.json(foci);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/endemic/foci/:id", async (req, res) => {
    try {
      const focus = await storage.getFocusById(req.params.id);
      if (!focus) {
        return res.status(404).json({ error: "Foco não encontrado" });
      }
      res.json(focus);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/endemic/foci", async (req, res) => {
    try {
      const data = insertFocusSchema.parse(req.body);
      const focus = await storage.createFocus(data);
      res.status(201).json(focus);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Dados inválidos", details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/endemic/foci/:id", async (req, res) => {
    try {
      const data = insertFocusSchema.partial().parse(req.body);
      const focus = await storage.updateFocus(req.params.id, data);
      if (!focus) {
        return res.status(404).json({ error: "Foco não encontrado" });
      }
      res.json(focus);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Dados inválidos", details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/endemic/foci/:id", async (req, res) => {
    try {
      const success = await storage.deleteFocus(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Foco não encontrado" });
      }
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Focal Treatments
  app.get("/api/endemic/treatments", async (req, res) => {
    try {
      const { cycleId, dwellingId, professionalId, limit, offset } = req.query;
      const treatments = await storage.getFocalTreatments({
        cycleId: cycleId as string,
        dwellingId: dwellingId as string,
        professionalId: professionalId as string,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
      });
      res.json(treatments);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/endemic/treatments/:id", async (req, res) => {
    try {
      const treatment = await storage.getFocalTreatmentById(req.params.id);
      if (!treatment) {
        return res.status(404).json({ error: "Tratamento não encontrado" });
      }
      res.json(treatment);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/endemic/treatments", async (req, res) => {
    try {
      const data = insertFocalTreatmentSchema.parse(req.body);
      const treatment = await storage.createFocalTreatment(data);
      res.status(201).json(treatment);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Dados inválidos", details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/endemic/treatments/:id", async (req, res) => {
    try {
      const data = insertFocalTreatmentSchema.partial().parse(req.body);
      const treatment = await storage.updateFocalTreatment(req.params.id, data);
      if (!treatment) {
        return res.status(404).json({ error: "Tratamento não encontrado" });
      }
      res.json(treatment);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Dados inválidos", details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/endemic/treatments/:id", async (req, res) => {
    try {
      const success = await storage.deleteFocalTreatment(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Tratamento não encontrado" });
      }
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Endemic Statistics
  app.get("/api/endemic/stats", async (req, res) => {
    try {
      const { unitId, cycleId, startDate, endDate } = req.query;
      const stats = await storage.getEndemicStats({
        unitId: unitId as string,
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

  // 404 handler for undefined API routes
  app.use("/api/*", (req, res) => {
    res.status(404).json({ error: "Endpoint não encontrado" });
  });

  const httpServer = createServer(app);
  return httpServer;
}
