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
} from "@shared/schema";
import { z } from "zod";
import { generateExport } from "./integrations/esus/exporter";
import { authenticateUser, requireAuth, requireRole } from "./auth";
import aiRoutes from "./routes-ai";

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
      
      const existingCns = await storage.getCitizenByCns(data.cns);
      if (existingCns) {
        return res.status(400).json({ error: "CNS já cadastrado" });
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
      const { status } = req.query;
      const queue = await storage.getAttendanceQueue(req.params.unitId, status as string);
      res.json(queue);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/queue", async (req, res) => {
    try {
      const data = insertAttendanceQueueSchema.parse(req.body);
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
      const entry = await storage.updateQueueEntry(req.params.id, req.body);
      if (!entry) {
        return res.status(404).json({ error: "Entrada na fila não encontrada" });
      }
      res.json(entry);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/queue/:id", async (req, res) => {
    try {
      const success = await storage.deleteQueueEntry(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Entrada na fila não encontrada" });
      }
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

  app.post("/api/consultations", async (req, res) => {
    try {
      const data = insertConsultationSchema.parse(req.body);
      const consultation = await storage.createConsultation(data);
      res.status(201).json(consultation);
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
      
      res.status(201).json(result);
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

  // Exams API
  app.get("/api/exams", async (req, res) => {
    try {
      const { citizenId } = req.query;
      if (!citizenId) {
        return res.status(400).json({ error: "citizenId é obrigatório" });
      }
      const exams = await storage.getExams(citizenId as string);
      res.json(exams);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/exams", async (req, res) => {
    try {
      const data = insertExamSchema.parse(req.body);
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
      const exam = await storage.updateExam(req.params.id, req.body);
      if (!exam) {
        return res.status(404).json({ error: "Exame não encontrado" });
      }
      res.json(exam);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/exams/:id", async (req, res) => {
    try {
      const success = await storage.deleteExam(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Exame não encontrado" });
      }
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
  // e-SUS APS Export API (Internal)
  // ============================================================================
  
  app.get("/api/internal/esus/generate", async (req, res) => {
    try {
      // Proteção por token dev (ambiente de desenvolvimento/teste)
      const devToken = req.headers["x-dev-token"] || req.query.token;
      const expectedToken = process.env.DEV_TOKEN || "dev-token-2906501";
      
      if (devToken !== expectedToken) {
        return res.status(401).json({ 
          error: "Token de autorização inválido",
          hint: "Use header 'X-Dev-Token' ou query param '?token='"
        });
      }
      
      const { from, to, cnes, limit } = req.query;
      
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
      
      // CNES padrão (pode ser obtido da primeira unidade)
      const defaultCNES = "1234567"; // TODO: Obter da primeira unidade ativa
      
      console.log(`[API] e-SUS export requested: ${from} to ${to}`);
      
      // Gerar exportação
      const result = await generateExport({
        from: from as string,
        to: to as string,
        healthUnitCNES: (cnes as string) || defaultCNES,
        limit: limit ? parseInt(limit as string) : undefined,
      });
      
      res.json({
        success: true,
        message: "Exportação e-SUS gerada com sucesso",
        batchId: result.batchId,
        files: {
          json: result.jsonPath,
          xml: result.xmlPath,
        },
        totalRegistros: result.totalRegistros,
        totalRecords: Object.values(result.totalRegistros).reduce((a, b) => a + b, 0),
      });
      
    } catch (error: any) {
      console.error("[API] e-SUS export error:", error);
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

  // 404 handler for undefined API routes
  app.use("/api/*", (req, res) => {
    res.status(404).json({ error: "Endpoint não encontrado" });
  });

  const httpServer = createServer(app);
  return httpServer;
}
