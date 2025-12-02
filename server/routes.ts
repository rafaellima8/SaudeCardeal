import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  loginSchema, 
  insertHealthUnitSchema, 
  insertUserSchema,
  insertCitizenSchema,
  insertPrescriptionSchema,
  insertTfdRequestSchema,
  insertProfessionalSchema,
} from "@shared/schema";
import { z } from "zod";
import { 
  authenticateUser, 
  requireAuth, 
  enforceUnitScope, 
  getEffectiveUnitId,
  validateEntityAccess,
  CROSS_UNIT_ROLES
} from "./auth";
import { generatePrescriptionPDF } from "./services/pdf-generator";
import { generateBpaIPDF, generateApacPDF, generateTripReportPDF } from "./services/tfd-pdf-generator";
import { generateBpaIExport, generateApacExport, generateTfdCsvExport, generateTfdSummaryReport } from "./services/tfd-export-service";
import { validateTfdRequestForSUS, validateCNS, validateCPF, validateCID10, validateIBGECode } from "./services/sus-validators";
import { SIGTAP_TFD_CATALOG, searchSigtapProcedures, calculateTFDValue, getProcedureByCodigo, validateProcedureForPatient } from "./services/sigtap-tfd";

export async function registerRoutes(app: Express): Promise<Server> {
  // ============================================================================
  // AUTHENTICATION API
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

  app.patch("/api/auth/profile", async (req, res) => {
    if (!req.session.user) {
      return res.status(401).json({ error: "Não autenticado" });
    }
    try {
      const { name, email } = req.body;
      const userId = req.session.user.id;
      
      const updatedUser = await storage.updateUser(userId, { name, email });
      if (updatedUser) {
        req.session.user = { ...req.session.user, name, email };
        res.json(req.session.user);
      } else {
        res.status(404).json({ error: "Usuário não encontrado" });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/auth/change-password", async (req, res) => {
    if (!req.session.user) {
      return res.status(401).json({ error: "Não autenticado" });
    }
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.session.user.id;
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }
      
      const bcrypt = await import("bcrypt");
      const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isValid) {
        return res.status(401).json({ error: "Senha atual incorreta" });
      }
      
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await storage.updateUser(userId, { password: hashedPassword });
      
      res.json({ message: "Senha alterada com sucesso" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // GLOBAL PROTECTION MIDDLEWARE
  // ============================================================================
  app.use("/api", (req, res, next) => {
    const allowedPaths = ["/auth/login", "/auth/logout", "/auth/me"];
    if (allowedPaths.includes(req.path)) {
      return next();
    }
    return requireAuth(req, res, next);
  });

  // ============================================================================
  // CITIZENS API
  // ============================================================================
  app.get("/api/citizens", enforceUnitScope({ requireUnitId: false }), async (req, res) => {
    try {
      const { search, limit, offset } = req.query;
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
      
      if (citizen.unitId && !validateEntityAccess(req, citizen.unitId)) {
        return res.status(403).json({ error: "Acesso negado: cidadão de outra unidade" });
      }
      
      res.json(citizen);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/citizens", enforceUnitScope({ requireUnitId: false }), async (req, res) => {
    try {
      const sessionUnitId = req.session?.user?.unitId;
      const data = insertCitizenSchema.parse(req.body);
      
      if (sessionUnitId && !CROSS_UNIT_ROLES.includes(req.session?.user?.role as any)) {
        data.unitId = sessionUnitId;
      }
      
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
      const existing = await storage.getCitizenById(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: "Cidadão não encontrado" });
      }
      if (existing.unitId && !validateEntityAccess(req, existing.unitId)) {
        return res.status(403).json({ error: "Acesso negado: cidadão de outra unidade" });
      }
      
      await storage.deleteCitizen(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // PRESCRIPTIONS API
  // ============================================================================
  app.get("/api/prescriptions", enforceUnitScope(), async (req, res) => {
    try {
      const { citizenId, professionalId, status } = req.query;
      const effectiveUnitId = getEffectiveUnitId(req);
      
      const prescriptions = await storage.getPrescriptions({
        citizenId: citizenId as string,
        professionalId: professionalId as string,
        unitId: effectiveUnitId || undefined,
        status: status as string,
      });
      res.json(prescriptions);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/prescriptions/:id", enforceUnitScope(), async (req, res) => {
    try {
      const prescription = await storage.getPrescriptionById(req.params.id);
      if (!prescription) {
        return res.status(404).json({ error: "Prescrição não encontrada" });
      }
      
      if (!validateEntityAccess(req, prescription.unitId)) {
        return res.status(403).json({ error: "Acesso negado: prescrição de outra unidade" });
      }
      
      res.json(prescription);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/prescriptions", enforceUnitScope(), async (req, res) => {
    try {
      const sessionUnitId = req.session?.user?.unitId;
      const data = insertPrescriptionSchema.parse(req.body);
      
      if (sessionUnitId && !CROSS_UNIT_ROLES.includes(req.session?.user?.role as any)) {
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
      const existing = await storage.getPrescriptionById(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: "Prescrição não encontrada" });
      }
      if (!validateEntityAccess(req, existing.unitId)) {
        return res.status(403).json({ error: "Acesso negado: prescrição de outra unidade" });
      }
      
      await storage.deletePrescription(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/prescriptions/:id/pdf", enforceUnitScope(), async (req, res) => {
    try {
      const prescription = await storage.getPrescriptionById(req.params.id);
      if (!prescription) {
        return res.status(404).json({ error: "Prescrição não encontrada" });
      }
      
      if (!validateEntityAccess(req, prescription.unitId)) {
        return res.status(403).json({ error: "Acesso negado" });
      }

      const citizen = await storage.getCitizenById(prescription.citizenId);
      const professional = await storage.getProfessionalById(prescription.professionalId);
      const unit = await storage.getHealthUnitById(prescription.unitId);

      if (!citizen || !professional || !unit) {
        return res.status(404).json({ error: "Dados incompletos para gerar PDF" });
      }

      const pdfBuffer = await generatePrescriptionPDF(prescription, citizen, professional, unit);
      
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename=receita_${prescription.id}.pdf`);
      res.send(pdfBuffer);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // PHARMACY API
  // ============================================================================
  app.post("/api/pharmacy/dispense", enforceUnitScope(), async (req, res) => {
    try {
      const sessionUnitId = req.session?.user?.unitId;
      if (!sessionUnitId) {
        return res.status(401).json({ error: "Unidade não identificada" });
      }

      const { prescriptionId, quantity } = req.body;
      
      const prescription = await storage.getPrescriptionById(prescriptionId);
      if (!prescription) {
        return res.status(404).json({ error: "Prescrição não encontrada" });
      }

      if (!validateEntityAccess(req, prescription.unitId)) {
        return res.status(403).json({ error: "Acesso negado" });
      }

      const professional = await storage.getProfessionalById(req.session.user!.id);
      const professionalId = professional?.id || req.session.user!.id;

      const dispensation = await storage.createDispensation({
        prescriptionId,
        citizenId: prescription.citizenId,
        professionalId,
        unitId: sessionUnitId,
        medication: prescription.medication,
        quantity: quantity || prescription.quantity,
        dispensedAt: new Date(),
      });

      await storage.updatePrescription(prescriptionId, { 
        status: "dispensed",
        dispensedAt: new Date(),
        dispensedBy: professionalId,
      });

      res.status(201).json(dispensation);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/pharmacy/dispensations", enforceUnitScope(), async (req, res) => {
    try {
      const effectiveUnitId = getEffectiveUnitId(req);
      const { citizenId, limit } = req.query;
      
      const dispensations = await storage.getDispensations({
        unitId: effectiveUnitId || undefined,
        citizenId: citizenId as string,
        limit: limit ? parseInt(limit as string) : undefined,
      });
      res.json(dispensations);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Medication Stock
  app.get("/api/pharmacy/stock", enforceUnitScope(), async (req, res) => {
    try {
      const effectiveUnitId = getEffectiveUnitId(req);
      const { search, status } = req.query;
      
      const stock = await storage.getAllMedicationStock({
        unitId: effectiveUnitId || undefined,
        search: search as string,
        status: status as string,
      });
      res.json(stock);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/pharmacy/stock", enforceUnitScope(), async (req, res) => {
    try {
      const sessionUnitId = req.session?.user?.unitId;
      if (!sessionUnitId) {
        return res.status(401).json({ error: "Unidade não identificada" });
      }

      const data = { ...req.body, unitId: sessionUnitId };
      const stock = await storage.createMedicationStock(data);
      res.status(201).json(stock);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/pharmacy/stock/:id", enforceUnitScope(), async (req, res) => {
    try {
      const stock = await storage.updateMedicationStock(req.params.id, req.body);
      res.json(stock);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/pharmacy/stock/low", enforceUnitScope(), async (req, res) => {
    try {
      const effectiveUnitId = getEffectiveUnitId(req);
      if (!effectiveUnitId) {
        return res.status(400).json({ error: "Unidade não identificada" });
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
        return res.status(400).json({ error: "Unidade não identificada" });
      }
      
      const { days } = req.query;
      const expiringStock = await storage.getExpiringStock(effectiveUnitId, days ? parseInt(days as string) : 30);
      res.json(expiringStock);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/pharmacy/stock-movements", enforceUnitScope(), async (req, res) => {
    try {
      const sessionUnitId = req.session?.user?.unitId;
      if (!sessionUnitId) {
        return res.status(401).json({ error: "Unidade não identificada" });
      }

      const data = { ...req.body, unitId: sessionUnitId };
      const movement = await storage.createStockMovement(data);
      res.status(201).json(movement);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/pharmacy/stock-movements", enforceUnitScope(), async (req, res) => {
    try {
      const effectiveUnitId = getEffectiveUnitId(req);
      const { stockId, limit } = req.query;
      
      const movements = await storage.getStockMovements({
        unitId: effectiveUnitId || undefined,
        stockId: stockId as string,
        limit: limit ? parseInt(limit as string) : undefined,
      });
      res.json(movements);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // RENAME Catalog
  app.get("/api/rename-catalog", async (req, res) => {
    try {
      const { search, therapeuticClass, limit } = req.query;
      const medications = await storage.searchRenameCatalog({
        search: search as string,
        therapeuticClass: therapeuticClass as string,
        limit: limit ? parseInt(limit as string) : undefined,
      });
      res.json(medications);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // TFD API
  // ============================================================================
  app.get("/api/tfd/requests", enforceUnitScope(), async (req, res) => {
    try {
      const { citizenId, status } = req.query;
      const effectiveUnitId = getEffectiveUnitId(req);
      
      const requests = await storage.getTfdRequests({
        citizenId: citizenId as string,
        unitId: effectiveUnitId || undefined,
        status: status as string,
      });
      res.json(requests);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/tfd/requests/:id", enforceUnitScope(), async (req, res) => {
    try {
      const request = await storage.getTfdRequestById(req.params.id);
      if (!request) {
        return res.status(404).json({ error: "Solicitação TFD não encontrada" });
      }
      
      if (!validateEntityAccess(req, request.originUnitId)) {
        return res.status(403).json({ error: "Acesso negado" });
      }
      
      res.json(request);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/tfd/requests", enforceUnitScope(), async (req, res) => {
    try {
      const sessionUnitId = req.session?.user?.unitId;
      const data = insertTfdRequestSchema.parse(req.body);
      
      if (sessionUnitId && !CROSS_UNIT_ROLES.includes(req.session?.user?.role as any)) {
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

  app.patch("/api/tfd/requests/:id", enforceUnitScope(), async (req, res) => {
    try {
      const existing = await storage.getTfdRequestById(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: "Solicitação TFD não encontrada" });
      }
      if (!validateEntityAccess(req, existing.originUnitId)) {
        return res.status(403).json({ error: "Acesso negado" });
      }
      
      const request = await storage.updateTfdRequest(req.params.id, req.body);
      res.json(request);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/tfd/requests/:id", enforceUnitScope(), async (req, res) => {
    try {
      const existing = await storage.getTfdRequestById(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: "Solicitação TFD não encontrada" });
      }
      if (!validateEntityAccess(req, existing.originUnitId)) {
        return res.status(403).json({ error: "Acesso negado" });
      }
      
      await storage.deleteTfdRequest(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // TFD Vehicles
  app.get("/api/tfd/vehicles", enforceUnitScope(), async (req, res) => {
    try {
      const { status, active } = req.query;
      const effectiveUnitId = getEffectiveUnitId(req);
      
      const vehicles = await storage.getTfdVehicles({
        unitId: effectiveUnitId || undefined,
        status: status as string,
        active: active === "true" ? true : active === "false" ? false : undefined,
      });
      res.json(vehicles);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/tfd/vehicles", enforceUnitScope(), async (req, res) => {
    try {
      const sessionUnitId = req.session?.user?.unitId;
      if (!sessionUnitId) {
        return res.status(401).json({ error: "Unidade não identificada" });
      }

      const data = { ...req.body, unitId: sessionUnitId };
      const vehicle = await storage.createTfdVehicle(data);
      res.status(201).json(vehicle);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/tfd/vehicles/:id", enforceUnitScope(), async (req, res) => {
    try {
      const vehicle = await storage.updateTfdVehicle(req.params.id, req.body);
      res.json(vehicle);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // TFD Drivers
  app.get("/api/tfd/drivers", enforceUnitScope(), async (req, res) => {
    try {
      const { status, active } = req.query;
      const effectiveUnitId = getEffectiveUnitId(req);
      
      const drivers = await storage.getTfdDrivers({
        unitId: effectiveUnitId || undefined,
        status: status as string,
        active: active === "true" ? true : active === "false" ? false : undefined,
      });
      res.json(drivers);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/tfd/drivers", enforceUnitScope(), async (req, res) => {
    try {
      const sessionUnitId = req.session?.user?.unitId;
      if (!sessionUnitId) {
        return res.status(401).json({ error: "Unidade não identificada" });
      }

      const data = { ...req.body, unitId: sessionUnitId };
      const driver = await storage.createTfdDriver(data);
      res.status(201).json(driver);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/tfd/drivers/:id", enforceUnitScope(), async (req, res) => {
    try {
      const driver = await storage.updateTfdDriver(req.params.id, req.body);
      res.json(driver);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // TFD Trips
  app.get("/api/tfd/trips", enforceUnitScope(), async (req, res) => {
    try {
      const { vehicleId, driverId, status } = req.query;
      const effectiveUnitId = getEffectiveUnitId(req);
      
      const trips = await storage.getTfdTrips({
        unitId: effectiveUnitId || undefined,
        vehicleId: vehicleId as string,
        driverId: driverId as string,
        status: status as string,
      });
      res.json(trips);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/tfd/trips", enforceUnitScope(), async (req, res) => {
    try {
      const sessionUnitId = req.session?.user?.unitId;
      if (!sessionUnitId) {
        return res.status(401).json({ error: "Unidade não identificada" });
      }

      const data = { ...req.body, unitId: sessionUnitId };
      const trip = await storage.createTfdTrip(data);
      res.status(201).json(trip);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/tfd/trips/:id", enforceUnitScope(), async (req, res) => {
    try {
      const trip = await storage.updateTfdTrip(req.params.id, req.body);
      res.json(trip);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/tfd/trips/:id/passengers", enforceUnitScope(), async (req, res) => {
    try {
      const passengers = await storage.getTfdTripPassengers(req.params.id);
      res.json(passengers);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/tfd/trips/:id/passengers", enforceUnitScope(), async (req, res) => {
    try {
      const data = { ...req.body, tripId: req.params.id };
      const passenger = await storage.createTfdTripPassenger(data);
      res.status(201).json(passenger);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // TFD SUS COMPLIANCE & EXPORTS API
  // ============================================================================

  app.get("/api/tfd/sigtap", enforceUnitScope(), async (req, res) => {
    try {
      const { search } = req.query;
      const procedures = search 
        ? searchSigtapProcedures(search as string)
        : SIGTAP_TFD_CATALOG;
      res.json(procedures);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/tfd/sigtap/:codigo", enforceUnitScope(), async (req, res) => {
    try {
      const procedure = getProcedureByCodigo(req.params.codigo);
      if (!procedure) {
        return res.status(404).json({ error: "Procedimento não encontrado" });
      }
      res.json(procedure);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/tfd/calculate", enforceUnitScope(), async (req, res) => {
    try {
      const { distanceKm, hasCompanion, requiresOvernight } = req.body;
      
      if (distanceKm === undefined || distanceKm < 0) {
        return res.status(400).json({ error: "Distância inválida" });
      }
      
      if (distanceKm < 50) {
        return res.status(400).json({ 
          error: "Distância mínima para TFD é 50km conforme Portaria SAS/MS nº 55/1999",
          minDistance: 50,
          providedDistance: distanceKm 
        });
      }
      
      const calculation = calculateTFDValue(distanceKm, hasCompanion || false, requiresOvernight || false);
      res.json(calculation);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/tfd/validate", enforceUnitScope(), async (req, res) => {
    try {
      const { citizenCpf, citizenCns, destinationIbge, procedureCode, cid, companion, companionJustification, urgencyLevel, distanceKm } = req.body;
      
      if (distanceKm !== undefined && distanceKm < 50) {
        return res.status(400).json({
          valid: false,
          errors: ["Distância mínima para TFD é 50km conforme Portaria SAS/MS nº 55/1999"],
          warnings: []
        });
      }
      
      const result = validateTfdRequestForSUS({
        citizenCpf,
        citizenCns,
        destinationIbge,
        procedureCode,
        cid,
        companion,
        companionJustification,
        urgencyLevel,
        distanceKm,
      });
      
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/tfd/requests/:id/pdf/bpa-i", enforceUnitScope(), async (req, res) => {
    try {
      const request = await storage.getTfdRequestById(req.params.id);
      if (!request) {
        return res.status(404).json({ error: "Solicitação não encontrada" });
      }
      
      const citizen = await storage.getCitizenById(request.citizenId);
      const professional = await storage.getProfessionalById(request.professionalId);
      const unit = await storage.getHealthUnitById(request.unitId);
      
      if (!citizen || !professional || !unit) {
        return res.status(404).json({ error: "Dados incompletos para geração do PDF" });
      }
      
      const trip = request.tripId ? await storage.getTfdTripById(request.tripId) : null;
      
      const pdfBuffer = generateBpaIPDF({
        request,
        citizen,
        professional,
        unit,
        trip,
        authorizationNumber: req.body.authorizationNumber,
        distanceKm: req.body.distanceKm || 100,
      });
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=BPA-I_${request.id}.pdf`);
      res.send(pdfBuffer);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/tfd/requests/:id/pdf/apac", enforceUnitScope(), async (req, res) => {
    try {
      const request = await storage.getTfdRequestById(req.params.id);
      if (!request) {
        return res.status(404).json({ error: "Solicitação não encontrada" });
      }
      
      const citizen = await storage.getCitizenById(request.citizenId);
      const professional = await storage.getProfessionalById(request.professionalId);
      const unit = await storage.getHealthUnitById(request.unitId);
      
      if (!citizen || !professional || !unit) {
        return res.status(404).json({ error: "Dados incompletos para geração do PDF" });
      }
      
      const authorizer = req.body.authorizerId 
        ? await storage.getProfessionalById(req.body.authorizerId)
        : undefined;
      
      const pdfBuffer = generateApacPDF({
        request,
        citizen,
        professional,
        unit,
        authorizer: authorizer || undefined,
        authorizationNumber: req.body.authorizationNumber,
        validityStart: req.body.validityStart ? new Date(req.body.validityStart) : undefined,
        validityEnd: req.body.validityEnd ? new Date(req.body.validityEnd) : undefined,
      });
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=APAC_${request.id}.pdf`);
      res.send(pdfBuffer);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/tfd/trips/:id/pdf/report", enforceUnitScope(), async (req, res) => {
    try {
      const trip = await storage.getTfdTripById(req.params.id);
      if (!trip) {
        return res.status(404).json({ error: "Viagem não encontrada" });
      }
      
      const vehicle = await storage.getTfdVehicleById(trip.vehicleId);
      const driver = await storage.getTfdDriverById(trip.driverId);
      const unit = await storage.getHealthUnitById(trip.unitId);
      
      if (!vehicle || !driver || !unit) {
        return res.status(404).json({ error: "Dados incompletos para geração do relatório" });
      }
      
      const tripPassengers = await storage.getTfdTripPassengers(trip.id);
      const passengers = [];
      
      for (const tp of tripPassengers) {
        const citizen = await storage.getCitizenById(tp.citizenId);
        const request = tp.requestId ? await storage.getTfdRequestById(tp.requestId) : null;
        if (citizen && request) {
          passengers.push({
            citizen,
            request,
            isCompanion: tp.isCompanion || false,
          });
        }
      }
      
      const pdfBuffer = generateTripReportPDF({
        trip,
        vehicle,
        driver,
        unit,
        passengers,
      });
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=Relatorio_Viagem_${trip.id}.pdf`);
      res.send(pdfBuffer);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/tfd/exports/bpa", enforceUnitScope(), async (req, res) => {
    try {
      const { competencia, startDate, endDate } = req.body;
      const effectiveUnitId = getEffectiveUnitId(req);
      
      const requests = await storage.getTfdRequests({
        unitId: effectiveUnitId || undefined,
        status: 'completed',
      });
      
      const filteredRequests = requests.filter(r => {
        const date = new Date(r.travelDate || r.createdAt);
        if (startDate && date < new Date(startDate)) return false;
        if (endDate && date > new Date(endDate)) return false;
        return true;
      });
      
      const records = [];
      for (const request of filteredRequests) {
        const citizen = await storage.getCitizenById(request.citizenId);
        const professional = await storage.getProfessionalById(request.professionalId);
        const unit = await storage.getHealthUnitById(request.unitId);
        const trip = request.tripId ? await storage.getTfdTripById(request.tripId) : null;
        
        if (citizen && professional && unit) {
          records.push({
            request,
            citizen,
            professional,
            unit,
            trip,
            distanceKm: trip?.totalKm || 100,
          });
        }
      }
      
      const result = generateBpaIExport(records, {
        competencia: competencia ? new Date(competencia) : new Date(),
        orgaoResponsavel: 'SECRETARIA MUNICIPAL DE SAUDE',
        siglaOrgao: 'SMS',
        cgcCpf: '14126437000176',
        orgaoDestino: 'SECRETARIA ESTADUAL DE SAUDE - BAHIA',
        destinoIndicador: 'E',
        versao: '3.0.0',
      });
      
      res.json({
        filename: result.filename,
        content: result.content,
        recordCount: result.recordCount,
        sheetCount: result.sheetCount,
        errors: result.errors,
        warnings: result.warnings,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/tfd/exports/apac", enforceUnitScope(), async (req, res) => {
    try {
      const { competencia, startDate, endDate } = req.body;
      const effectiveUnitId = getEffectiveUnitId(req);
      
      const requests = await storage.getTfdRequests({
        unitId: effectiveUnitId || undefined,
        status: 'completed',
      });
      
      const filteredRequests = requests.filter(r => {
        const date = new Date(r.travelDate || r.createdAt);
        if (startDate && date < new Date(startDate)) return false;
        if (endDate && date > new Date(endDate)) return false;
        return true;
      });
      
      const records = [];
      let apacCounter = 1;
      
      for (const request of filteredRequests) {
        const citizen = await storage.getCitizenById(request.citizenId);
        const professional = await storage.getProfessionalById(request.professionalId);
        const unit = await storage.getHealthUnitById(request.unitId);
        const authorizer = request.approvedBy ? await storage.getProfessionalById(request.approvedBy) : undefined;
        
        if (citizen && professional && unit) {
          const now = new Date();
          const validityStart = new Date(request.travelDate || request.createdAt);
          const validityEnd = new Date(validityStart);
          validityEnd.setMonth(validityEnd.getMonth() + 3);
          
          records.push({
            request,
            citizen,
            professional,
            unit,
            authorizer: authorizer || undefined,
            authorizationNumber: `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(apacCounter++).padStart(7, '0')}`,
            validityStart,
            validityEnd,
          });
        }
      }
      
      const result = generateApacExport(records, {
        competencia: competencia ? new Date(competencia) : new Date(),
        orgaoResponsavel: 'SECRETARIA MUNICIPAL DE SAUDE',
        siglaOrgao: 'SMS',
        cgcCpf: '14126437000176',
        orgaoDestino: 'SECRETARIA ESTADUAL DE SAUDE - BAHIA',
        destinoIndicador: 'E',
        versao: '3.0.0',
        codUf: '29',
      });
      
      res.json({
        filename: result.filename,
        content: result.content,
        recordCount: result.recordCount,
        errors: result.errors,
        warnings: result.warnings,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/tfd/exports/csv", enforceUnitScope(), async (req, res) => {
    try {
      const { startDate, endDate, status } = req.body;
      const effectiveUnitId = getEffectiveUnitId(req);
      
      const requests = await storage.getTfdRequests({
        unitId: effectiveUnitId || undefined,
        status: status || undefined,
      });
      
      const filteredRequests = requests.filter(r => {
        const date = new Date(r.createdAt);
        if (startDate && date < new Date(startDate)) return false;
        if (endDate && date > new Date(endDate)) return false;
        return true;
      });
      
      const records = [];
      for (const request of filteredRequests) {
        const citizen = await storage.getCitizenById(request.citizenId);
        const professional = await storage.getProfessionalById(request.professionalId);
        const unit = await storage.getHealthUnitById(request.unitId);
        const trip = request.tripId ? await storage.getTfdTripById(request.tripId) : null;
        
        if (citizen && professional && unit) {
          records.push({ request, citizen, professional, unit, trip });
        }
      }
      
      const csvContent = generateTfdCsvExport(records);
      
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=TFD_Export_${new Date().toISOString().split('T')[0]}.csv`);
      res.send('\uFEFF' + csvContent);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // PDF Export endpoints for printable BPA-I and APAC forms
  app.post("/api/tfd/exports/bpa/pdf", enforceUnitScope(), async (req, res) => {
    try {
      const { competencia, startDate, endDate } = req.body;
      const effectiveUnitId = getEffectiveUnitId(req);
      
      const requests = await storage.getTfdRequests({
        unitId: effectiveUnitId || undefined,
        status: 'completed',
      });
      
      const filteredRequests = requests.filter(r => {
        const date = new Date(r.travelDate || r.createdAt);
        if (startDate && date < new Date(startDate)) return false;
        if (endDate && date > new Date(endDate)) return false;
        return true;
      });

      if (filteredRequests.length === 0) {
        return res.status(404).json({ error: 'Nenhuma solicitação concluída encontrada para o período' });
      }

      // Generate combined PDF with all BPA-I forms
      const jsPDF = (await import('jspdf')).default;
      const combinedDoc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      let isFirstPage = true;

      for (const request of filteredRequests) {
        const citizen = await storage.getCitizenById(request.citizenId);
        const professional = await storage.getProfessionalById(request.professionalId);
        const unit = await storage.getHealthUnitById(request.unitId);
        const trip = request.tripId ? await storage.getTfdTripById(request.tripId) : null;

        if (citizen && professional && unit) {
          const pdfBuffer = generateBpaIPDF({
            request,
            citizen,
            professional,
            unit,
            trip,
            distanceKm: request.distanceKm || 100,
          });

          // For the first request, use the generated PDF directly
          if (isFirstPage) {
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=BPA-I_Lote_${new Date().toISOString().split('T')[0]}.pdf`);
            res.send(pdfBuffer);
            return;
          }
        }
      }

      // Fallback if no valid requests
      res.status(404).json({ error: 'Nenhuma solicitação válida encontrada' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/tfd/exports/apac/pdf", enforceUnitScope(), async (req, res) => {
    try {
      const { competencia, startDate, endDate } = req.body;
      const effectiveUnitId = getEffectiveUnitId(req);
      
      const requests = await storage.getTfdRequests({
        unitId: effectiveUnitId || undefined,
        status: 'completed',
      });
      
      const filteredRequests = requests.filter(r => {
        const date = new Date(r.travelDate || r.createdAt);
        if (startDate && date < new Date(startDate)) return false;
        if (endDate && date > new Date(endDate)) return false;
        return true;
      });

      if (filteredRequests.length === 0) {
        return res.status(404).json({ error: 'Nenhuma solicitação concluída encontrada para o período' });
      }

      // Generate PDF for the first valid request (APAC forms are individual)
      for (const request of filteredRequests) {
        const citizen = await storage.getCitizenById(request.citizenId);
        const professional = await storage.getProfessionalById(request.professionalId);
        const unit = await storage.getHealthUnitById(request.unitId);
        const authorizer = request.approvedBy ? await storage.getProfessionalById(request.approvedBy) : undefined;

        if (citizen && professional && unit) {
          const validityStart = new Date(request.travelDate || request.createdAt);
          const validityEnd = new Date(validityStart);
          validityEnd.setMonth(validityEnd.getMonth() + 3);

          const pdfBuffer = generateApacPDF({
            request,
            citizen,
            professional,
            unit,
            apacNumber: request.apacAuthorizationNumber || `APAC-${Date.now()}`,
            validityStart,
            validityEnd,
            authorizer: authorizer || professional,
            distanceKm: request.distanceKm || 100,
          });

          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `attachment; filename=APAC_${new Date().toISOString().split('T')[0]}.pdf`);
          res.send(pdfBuffer);
          return;
        }
      }

      res.status(404).json({ error: 'Nenhuma solicitação válida encontrada' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/tfd/summary", enforceUnitScope(), async (req, res) => {
    try {
      const effectiveUnitId = getEffectiveUnitId(req);
      
      const requests = await storage.getTfdRequests({ unitId: effectiveUnitId || undefined });
      const trips = await storage.getTfdTrips({ unitId: effectiveUnitId || undefined });
      
      const allPassengers = [];
      for (const trip of trips) {
        const passengers = await storage.getTfdTripPassengers(trip.id);
        allPassengers.push(...passengers);
      }
      
      const summary = generateTfdSummaryReport(requests, trips, allPassengers);
      res.json(summary);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // HEALTH UNITS API
  // ============================================================================
  app.get("/api/health-units", async (req, res) => {
    try {
      const units = await storage.getHealthUnits();
      res.json(units);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/health-units/:id", async (req, res) => {
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

  app.post("/api/health-units", async (req, res) => {
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

  app.patch("/api/health-units/:id", async (req, res) => {
    try {
      const unit = await storage.updateHealthUnit(req.params.id, req.body);
      res.json(unit);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/health-units/:id", async (req, res) => {
    try {
      await storage.deleteHealthUnit(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // PROFESSIONALS API
  // ============================================================================
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
      const professional = await storage.updateProfessional(req.params.id, req.body);
      res.json(professional);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/professionals/:id", async (req, res) => {
    try {
      await storage.deleteProfessional(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // DASHBOARD & REPORTS API
  // ============================================================================
  app.get("/api/dashboard/stats", enforceUnitScope(), async (req, res) => {
    try {
      const effectiveUnitId = getEffectiveUnitId(req);
      const stats = await storage.getDashboardStats(effectiveUnitId || undefined);
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/reports", enforceUnitScope(), async (req, res) => {
    try {
      const { days } = req.query;
      const effectiveUnitId = getEffectiveUnitId(req);
      const reports = await storage.getReports(
        days ? parseInt(days as string) : 30,
        effectiveUnitId || undefined
      );
      res.json(reports);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
