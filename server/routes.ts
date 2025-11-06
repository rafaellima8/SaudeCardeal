import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertCitizenSchema, insertAppointmentSchema, insertConsultationSchema, insertPrescriptionSchema, insertExamSchema, insertTfdRequestSchema, insertAttendanceQueueSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
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

  // Consultations API
  app.get("/api/consultations", async (req, res) => {
    try {
      const { citizenId } = req.query;
      if (!citizenId) {
        return res.status(400).json({ error: "citizenId é obrigatório" });
      }
      const consultations = await storage.getConsultations(citizenId as string);
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

  // Prescriptions API
  app.get("/api/prescriptions", async (req, res) => {
    try {
      const { citizenId, consultationId } = req.query;
      const prescriptions = await storage.getPrescriptions({
        citizenId: citizenId as string,
        consultationId: consultationId as string,
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

  const httpServer = createServer(app);
  return httpServer;
}
