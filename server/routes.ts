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
  insertDiaperRequestSchema,
  insertDiaperAuthorizationSchema,
  insertDiaperDeliverySchema,
  insertSaBeneficiarySchema,
  updateSinanNotificationSchema,
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
import { parseCsvContent, processMonthlyList, generateAuthorizationPDF, generateDeliveryReceiptPDF, generateDonationTermPDF, validateCsvFormat } from "./services/social-assistance-service";
import { sinanTemplateService } from "./services/sinan-template-service";
import { SinanPdfGenerator } from "./services/sinan-pdf-generator";

import formsRoutes from "../modules/forms/routes";
import workflowRoutes from "../modules/workflow/routes";
import alertsRoutes from "../modules/alerts/routes";
import reportsRoutes from "../modules/reports/routes";

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
      
      if (!sessionUnitId) {
        return res.status(400).json({ error: "Unidade de saúde é obrigatória" });
      }
      
      const payload = { ...req.body, unitId: sessionUnitId };
      const data = insertCitizenSchema.parse(payload);
      
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
      
      const updateData = insertCitizenSchema.partial().parse(req.body);
      
      const citizen = await storage.updateCitizen(req.params.id, updateData);
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
  // DIAPER STOCK API (Pharmacy Module)
  // ============================================================================
  
  app.get("/api/pharmacy/diaper-stock", enforceUnitScope(), async (req, res) => {
    try {
      const effectiveUnitId = getEffectiveUnitId(req);
      const { size, status, search } = req.query;
      
      const stock = await storage.getDiaperStock({
        unitId: effectiveUnitId || undefined,
        size: size as string,
        status: status as string,
        search: search as string,
      });
      res.json(stock);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/pharmacy/diaper-stock/low", enforceUnitScope(), async (req, res) => {
    try {
      const effectiveUnitId = getEffectiveUnitId(req);
      if (!effectiveUnitId) {
        return res.status(400).json({ error: "Unidade não identificada" });
      }
      
      const lowStock = await storage.getLowDiaperStock(effectiveUnitId);
      res.json(lowStock);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/pharmacy/diaper-stock/expiring", enforceUnitScope(), async (req, res) => {
    try {
      const effectiveUnitId = getEffectiveUnitId(req);
      if (!effectiveUnitId) {
        return res.status(400).json({ error: "Unidade não identificada" });
      }
      
      const { days } = req.query;
      const expiringStock = await storage.getExpiringDiaperStock(
        effectiveUnitId, 
        days ? parseInt(days as string) : 60
      );
      res.json(expiringStock);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/pharmacy/diaper-stock/fifo/:size", enforceUnitScope(), async (req, res) => {
    try {
      const effectiveUnitId = getEffectiveUnitId(req);
      if (!effectiveUnitId) {
        return res.status(400).json({ error: "Unidade não identificada" });
      }
      
      const { quantity } = req.query;
      const stock = await storage.getDiaperStockByFIFO(
        effectiveUnitId,
        req.params.size,
        quantity ? parseInt(quantity as string) : 0
      );
      res.json(stock);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/pharmacy/diaper-stock/:id", enforceUnitScope(), async (req, res) => {
    try {
      const stock = await storage.getDiaperStockById(req.params.id);
      if (!stock) {
        return res.status(404).json({ error: "Item de estoque não encontrado" });
      }
      res.json(stock);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/pharmacy/diaper-stock", enforceUnitScope(), async (req, res) => {
    try {
      const sessionUnitId = req.session?.user?.unitId;
      if (!sessionUnitId) {
        return res.status(401).json({ error: "Unidade não identificada" });
      }

      const data = { ...req.body, unitId: sessionUnitId };
      const stock = await storage.createDiaperStock(data);
      
      await storage.createDiaperStockMovement({
        stockId: stock.id,
        unitId: sessionUnitId,
        movementType: 'entrada',
        quantity: stock.currentQuantity,
        previousQuantity: 0,
        newQuantity: stock.currentQuantity,
        reason: 'Entrada inicial de estoque',
        userId: req.session.user!.id,
      });
      
      res.status(201).json(stock);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/pharmacy/diaper-stock/:id", enforceUnitScope(), async (req, res) => {
    try {
      const existing = await storage.getDiaperStockById(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: "Item de estoque não encontrado" });
      }

      const sessionUnitId = req.session?.user?.unitId;
      if (req.body.currentQuantity !== undefined && req.body.currentQuantity !== existing.currentQuantity) {
        const movementType = req.body.currentQuantity > existing.currentQuantity ? 'entrada' : 'saida';
        const quantity = Math.abs(req.body.currentQuantity - existing.currentQuantity);
        
        await storage.createDiaperStockMovement({
          stockId: existing.id,
          unitId: sessionUnitId || existing.unitId,
          movementType,
          quantity,
          previousQuantity: existing.currentQuantity,
          newQuantity: req.body.currentQuantity,
          reason: req.body.movementReason || 'Ajuste manual de estoque',
          userId: req.session?.user?.id || 'system',
        });
      }

      const stock = await storage.updateDiaperStock(req.params.id, req.body);
      res.json(stock);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/pharmacy/diaper-stock/:id", enforceUnitScope(), async (req, res) => {
    try {
      const existing = await storage.getDiaperStockById(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: "Item de estoque não encontrado" });
      }
      
      await storage.deleteDiaperStock(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/pharmacy/diaper-movements", enforceUnitScope(), async (req, res) => {
    try {
      const effectiveUnitId = getEffectiveUnitId(req);
      const { stockId, limit } = req.query;
      
      const movements = await storage.getDiaperStockMovements({
        unitId: effectiveUnitId || undefined,
        stockId: stockId as string,
        limit: limit ? parseInt(limit as string) : undefined,
      });
      res.json(movements);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // SOCIAL ASSISTANCE API
  // ============================================================================
  
  // Beneficiaries
  app.get("/api/social-assistance/beneficiaries", enforceUnitScope(), async (req, res) => {
    try {
      const effectiveUnitId = getEffectiveUnitId(req);
      const { search, status, limit } = req.query;
      
      const beneficiaries = await storage.getSaBeneficiaries({
        unitId: effectiveUnitId || undefined,
        search: search as string,
        status: status as string,
        limit: limit ? parseInt(limit as string) : undefined,
      });
      res.json(beneficiaries);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/social-assistance/beneficiaries/:id", enforceUnitScope(), async (req, res) => {
    try {
      const beneficiary = await storage.getSaBeneficiaryById(req.params.id);
      if (!beneficiary) {
        return res.status(404).json({ error: "Beneficiário não encontrado" });
      }
      res.json(beneficiary);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/social-assistance/beneficiaries/cpf/:cpf", enforceUnitScope(), async (req, res) => {
    try {
      const beneficiary = await storage.getSaBeneficiaryByCpf(req.params.cpf);
      if (!beneficiary) {
        return res.status(404).json({ error: "Beneficiário não encontrado" });
      }
      res.json(beneficiary);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/social-assistance/beneficiaries", enforceUnitScope(), async (req, res) => {
    try {
      const sessionUnitId = req.session?.user?.unitId;
      if (!sessionUnitId) {
        return res.status(401).json({ error: "Unidade não identificada" });
      }

      const existingCpf = await storage.getSaBeneficiaryByCpf(req.body.cpf);
      if (existingCpf) {
        return res.status(400).json({ error: "Já existe um beneficiário cadastrado com este CPF" });
      }

      const data = { ...req.body, unitId: sessionUnitId };
      const beneficiary = await storage.createSaBeneficiary(data);
      res.status(201).json(beneficiary);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/social-assistance/beneficiaries/:id", enforceUnitScope(), async (req, res) => {
    try {
      const existing = await storage.getSaBeneficiaryById(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: "Beneficiário não encontrado" });
      }
      
      const beneficiary = await storage.updateSaBeneficiary(req.params.id, req.body);
      res.json(beneficiary);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/social-assistance/beneficiaries/:id", enforceUnitScope(), async (req, res) => {
    try {
      const existing = await storage.getSaBeneficiaryById(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: "Beneficiário não encontrado" });
      }
      
      await storage.deleteSaBeneficiary(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Diaper Requests
  app.get("/api/social-assistance/requests", enforceUnitScope(), async (req, res) => {
    try {
      const effectiveUnitId = getEffectiveUnitId(req);
      const { beneficiaryId, status, limit } = req.query;
      
      const requests = await storage.getDiaperRequests({
        unitId: effectiveUnitId || undefined,
        beneficiaryId: beneficiaryId as string,
        status: status as string,
        limit: limit ? parseInt(limit as string) : undefined,
      });
      res.json(requests);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/social-assistance/requests/:id", enforceUnitScope(), async (req, res) => {
    try {
      const request = await storage.getDiaperRequestById(req.params.id);
      if (!request) {
        return res.status(404).json({ error: "Solicitação não encontrada" });
      }
      res.json(request);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/social-assistance/requests", enforceUnitScope(), async (req, res) => {
    try {
      const sessionUnitId = req.session?.user?.unitId;
      if (!sessionUnitId) {
        return res.status(401).json({ error: "Unidade não identificada" });
      }

      // Validate required fields
      if (!req.body.beneficiaryId || !req.body.diaperSize || !req.body.quantityRequested) {
        return res.status(400).json({ error: "Campos obrigatórios: beneficiaryId, diaperSize, quantityRequested" });
      }

      // Generate request dates (current period = current month)
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const requestNumber = await storage.generateDiaperRequestNumber();
      const data = { 
        beneficiaryId: req.body.beneficiaryId,
        diaperSize: req.body.diaperSize,
        quantityRequested: req.body.quantityRequested,
        justification: req.body.justification || null,
        periodStart,
        periodEnd,
        unitId: sessionUnitId,
        requestNumber,
        requestedById: req.session.user!.id,
        requestType: req.body.requestType || 'individual',
      };
      const request = await storage.createDiaperRequest(data);
      res.status(201).json(request);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/social-assistance/requests/:id", enforceUnitScope(), async (req, res) => {
    try {
      const existing = await storage.getDiaperRequestById(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: "Solicitação não encontrada" });
      }
      
      const request = await storage.updateDiaperRequest(req.params.id, req.body);
      res.json(request);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/social-assistance/requests/:id", enforceUnitScope(), async (req, res) => {
    try {
      const existing = await storage.getDiaperRequestById(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: "Solicitação não encontrada" });
      }
      
      await storage.deleteDiaperRequest(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Diaper Authorizations
  app.get("/api/social-assistance/authorizations", enforceUnitScope(), async (req, res) => {
    try {
      const effectiveUnitId = getEffectiveUnitId(req);
      const { beneficiaryId, requestId, status } = req.query;
      
      const authorizations = await storage.getDiaperAuthorizations({
        unitId: effectiveUnitId || undefined,
        beneficiaryId: beneficiaryId as string,
        requestId: requestId as string,
        status: status as string,
      });
      res.json(authorizations);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/social-assistance/authorizations/:id", enforceUnitScope(), async (req, res) => {
    try {
      const auth = await storage.getDiaperAuthorizationById(req.params.id);
      if (!auth) {
        return res.status(404).json({ error: "Autorização não encontrada" });
      }
      res.json(auth);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/social-assistance/authorizations", enforceUnitScope(), async (req, res) => {
    try {
      const sessionUnitId = req.session?.user?.unitId;
      if (!sessionUnitId) {
        return res.status(401).json({ error: "Unidade não identificada" });
      }

      // Validate required fields
      if (!req.body.requestId && !req.body.beneficiaryId) {
        return res.status(400).json({ error: "Informe requestId ou beneficiaryId" });
      }

      // Get request details if requestId is provided
      let request;
      if (req.body.requestId) {
        request = await storage.getDiaperRequestById(req.body.requestId);
        if (!request) {
          return res.status(404).json({ error: "Solicitação não encontrada" });
        }
      }

      // Calculate period dates
      const now = new Date();
      const periodStart = req.body.periodStart ? new Date(req.body.periodStart) : new Date(now.getFullYear(), now.getMonth(), 1);
      const periodEnd = req.body.periodEnd ? new Date(req.body.periodEnd) : new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const validUntil = new Date(periodEnd);
      validUntil.setMonth(validUntil.getMonth() + 1);

      const authorizationNumber = await storage.generateDiaperAuthorizationNumber();
      const data = { 
        requestId: req.body.requestId,
        beneficiaryId: req.body.beneficiaryId || request?.beneficiaryId,
        diaperSize: req.body.diaperSize || request?.diaperSize,
        quantityAuthorized: req.body.quantityAuthorized || req.body.quantityRequested || request?.quantityRequested,
        periodStart,
        periodEnd,
        validUntil,
        unitId: sessionUnitId,
        authorizationNumber,
        issuedById: req.session.user!.id,
        issuedAt: new Date(),
        authorizationType: req.body.authorizationType || 'individual',
      };
      
      const authorization = await storage.createDiaperAuthorization(data);

      if (req.body.requestId) {
        await storage.updateDiaperRequest(req.body.requestId, { 
          status: 'autorizado',
          quantityApproved: data.quantityAuthorized,
        });
      }

      res.status(201).json(authorization);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/social-assistance/authorizations/:id", enforceUnitScope(), async (req, res) => {
    try {
      const existing = await storage.getDiaperAuthorizationById(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: "Autorização não encontrada" });
      }
      
      const authorization = await storage.updateDiaperAuthorization(req.params.id, req.body);
      res.json(authorization);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Diaper Deliveries
  app.get("/api/social-assistance/deliveries", enforceUnitScope(), async (req, res) => {
    try {
      const effectiveUnitId = getEffectiveUnitId(req);
      const { beneficiaryId, authorizationId } = req.query;
      
      const deliveries = await storage.getDiaperDeliveries({
        unitId: effectiveUnitId || undefined,
        beneficiaryId: beneficiaryId as string,
        authorizationId: authorizationId as string,
      });
      res.json(deliveries);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/social-assistance/deliveries/:id", enforceUnitScope(), async (req, res) => {
    try {
      const delivery = await storage.getDiaperDeliveryById(req.params.id);
      if (!delivery) {
        return res.status(404).json({ error: "Entrega não encontrada" });
      }
      res.json(delivery);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/social-assistance/deliveries", enforceUnitScope(), async (req, res) => {
    try {
      const sessionUnitId = req.session?.user?.unitId;
      if (!sessionUnitId) {
        return res.status(401).json({ error: "Unidade não identificada" });
      }

      // Accept quantityDelivered from frontend (normalized field name)
      const quantity = req.body.quantityDelivered || req.body.quantity;
      if (!quantity || quantity <= 0) {
        return res.status(400).json({ error: "Quantidade inválida" });
      }

      const authorization = await storage.getDiaperAuthorizationById(req.body.authorizationId);
      if (!authorization) {
        return res.status(404).json({ error: "Autorização não encontrada" });
      }

      if ((authorization.quantityRemaining || 0) < quantity) {
        return res.status(400).json({ error: "Quantidade solicitada excede o saldo disponível da autorização" });
      }

      const availableStock = await storage.getDiaperStockByFIFO(
        sessionUnitId,
        authorization.diaperSize,
        quantity
      );

      let remainingQty = quantity;
      const stockAllocations: { stockId: string; quantity: number }[] = [];

      for (const stock of availableStock) {
        if (remainingQty <= 0) break;
        
        const allocateQty = Math.min(remainingQty, stock.availableQuantity);
        stockAllocations.push({ stockId: stock.id, quantity: allocateQty });
        remainingQty -= allocateQty;
      }

      if (remainingQty > 0) {
        return res.status(400).json({ 
          error: `Estoque insuficiente. Faltam ${remainingQty} unidades do tamanho ${authorization.diaperSize}` 
        });
      }

      for (const allocation of stockAllocations) {
        const stock = await storage.getDiaperStockById(allocation.stockId);
        if (stock) {
          await storage.createDiaperStockMovement({
            stockId: allocation.stockId,
            unitId: sessionUnitId,
            movementType: 'doacao_assistencia',
            quantity: allocation.quantity,
            previousQuantity: stock.currentQuantity,
            newQuantity: stock.currentQuantity - allocation.quantity,
            reason: `Entrega para autorização ${authorization.authorizationNumber}`,
            userId: req.session.user!.id,
            diaperDeliveryId: authorization.id,
          });
        }
      }

      const deliveryNumber = await storage.generateDiaperDeliveryNumber();
      
      // Map frontend field names to schema field names
      const data = { 
        authorizationId: req.body.authorizationId,
        unitId: sessionUnitId,
        deliveryNumber,
        beneficiaryId: authorization.beneficiaryId,
        diaperSize: authorization.diaperSize,
        quantityDelivered: quantity,
        receivedByName: req.body.receivedByName,
        receivedByCpf: req.body.receivedByDocument || req.body.receivedByCpf,
        observations: req.body.observations,
        deliveredAt: new Date(),
        deliveredById: req.session.user!.id,
        stockAllocations: JSON.stringify(stockAllocations),
      };
      
      const delivery = await storage.createDiaperDelivery(data);

      await storage.updateDiaperAuthorization(authorization.id, {
        quantityDelivered: (authorization.quantityDelivered || 0) + quantity,
      });

      res.status(201).json(delivery);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Monthly Lists
  app.get("/api/social-assistance/monthly-lists", enforceUnitScope(), async (req, res) => {
    try {
      const effectiveUnitId = getEffectiveUnitId(req);
      const { status } = req.query;
      
      const lists = await storage.getDiaperMonthlyLists({
        unitId: effectiveUnitId || undefined,
        status: status as string,
      });
      res.json(lists);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/social-assistance/monthly-lists/:id", enforceUnitScope(), async (req, res) => {
    try {
      const list = await storage.getDiaperMonthlyListById(req.params.id);
      if (!list) {
        return res.status(404).json({ error: "Lista mensal não encontrada" });
      }
      res.json(list);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/social-assistance/monthly-lists", enforceUnitScope(), async (req, res) => {
    try {
      const sessionUnitId = req.session?.user?.unitId;
      if (!sessionUnitId) {
        return res.status(401).json({ error: "Unidade não identificada" });
      }

      const listNumber = await storage.generateDiaperMonthlyListNumber();
      const data = { 
        ...req.body, 
        unitId: sessionUnitId,
        listNumber,
        uploadedBy: req.session.user!.id,
      };
      const list = await storage.createDiaperMonthlyList(data);
      res.status(201).json(list);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/social-assistance/monthly-lists/:id", enforceUnitScope(), async (req, res) => {
    try {
      const existing = await storage.getDiaperMonthlyListById(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: "Lista mensal não encontrada" });
      }
      
      const list = await storage.updateDiaperMonthlyList(req.params.id, req.body);
      res.json(list);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Stats
  app.get("/api/social-assistance/stats", enforceUnitScope(), async (req, res) => {
    try {
      const effectiveUnitId = getEffectiveUnitId(req);
      if (!effectiveUnitId) {
        return res.status(400).json({ error: "Unidade não identificada" });
      }
      
      const stats = await storage.getSaStats(effectiveUnitId);
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Demand Forecasting (3-month moving average)
  app.get("/api/social-assistance/forecast", enforceUnitScope(), async (req, res) => {
    try {
      const effectiveUnitId = getEffectiveUnitId(req);
      if (!effectiveUnitId) {
        return res.status(400).json({ error: "Unidade não identificada" });
      }
      
      const forecast = await storage.getDiaperDemandForecast(effectiveUnitId);
      res.json(forecast);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // CSV Validation (preview before upload - doesn't require unitId since it's just validating format)
  app.post("/api/social-assistance/csv/validate", requireAuth, async (req, res) => {
    try {
      const { csvContent } = req.body;
      
      if (!csvContent) {
        return res.status(400).json({ 
          valid: false, 
          errors: ['Conteúdo CSV é obrigatório'] 
        });
      }

      const formatValidation = validateCsvFormat(csvContent);
      if (!formatValidation.valid) {
        return res.json({
          valid: false,
          formatErrors: formatValidation.errors,
          parseResult: null,
        });
      }

      const parseResult = parseCsvContent(csvContent);
      
      res.json({
        valid: parseResult.invalidRows.length === 0,
        formatErrors: [],
        parseResult: {
          totalRows: parseResult.totalRows,
          validRows: parseResult.validRows.length,
          invalidRows: parseResult.invalidRows.length,
          errors: parseResult.invalidRows,
          preview: parseResult.validRows.slice(0, 5),
        },
      });
    } catch (error: any) {
      res.status(500).json({ valid: false, error: error.message });
    }
  });

  // CSV Upload and Processing
  app.post("/api/social-assistance/monthly-lists/upload", enforceUnitScope(), async (req, res) => {
    try {
      const sessionUnitId = req.session?.user?.unitId;
      if (!sessionUnitId) {
        return res.status(401).json({ error: "Unidade não identificada" });
      }

      const { csvContent, fileName, referenceMonth, referenceYear } = req.body;
      
      if (!csvContent) {
        return res.status(400).json({ error: "Conteúdo CSV é obrigatório" });
      }

      const parseResult = parseCsvContent(csvContent);
      
      const now = new Date();
      const month = referenceMonth || now.getMonth() + 1;
      const year = referenceYear || now.getFullYear();
      const periodStart = new Date(year, month - 1, 1);
      const periodEnd = new Date(year, month, 0);

      const listNumber = await storage.generateDiaperMonthlyListNumber();
      const list = await storage.createDiaperMonthlyList({
        unitId: sessionUnitId,
        listNumber,
        referenceMonth: month,
        referenceYear: year,
        periodStart,
        periodEnd,
        fileName: fileName || `lista_mensal_${month}_${year}.csv`,
        fileType: 'csv',
        csvContent,
        totalRecords: parseResult.totalRows,
        validRecords: parseResult.validRows.length,
        invalidRecords: parseResult.invalidRows.length,
        processingStatus: parseResult.invalidRows.length === 0 ? 'validado' : 'pendente',
        uploadedById: req.session.user!.id,
        uploadedAt: new Date(),
      });

      res.status(201).json({
        list,
        parseResult: {
          totalRows: parseResult.totalRows,
          validRows: parseResult.validRows.length,
          invalidRows: parseResult.invalidRows.length,
          errors: parseResult.invalidRows,
        },
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/social-assistance/monthly-lists/:id/process", enforceUnitScope(), async (req, res) => {
    try {
      const sessionUnitId = req.session?.user?.unitId;
      if (!sessionUnitId) {
        return res.status(401).json({ error: "Unidade não identificada" });
      }

      const list = await storage.getDiaperMonthlyListById(req.params.id);
      if (!list) {
        return res.status(404).json({ error: "Lista mensal não encontrada" });
      }

      if (list.processingStatus !== 'validado' && list.processingStatus !== 'pendente') {
        return res.status(400).json({ error: "Lista já foi processada ou está em processamento" });
      }

      await storage.updateDiaperMonthlyList(req.params.id, {
        processingStatus: 'processando',
        processingStartedAt: new Date(),
      });

      const result = await processMonthlyList(req.params.id, sessionUnitId, req.session.user!.id);

      res.json({
        success: true,
        requestsCreated: result.requestsCreated,
        authorizationsCreated: result.authorizationsCreated,
        errors: result.errors,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // PDF Generation
  app.get("/api/social-assistance/authorizations/:id/pdf", enforceUnitScope(), async (req, res) => {
    try {
      const pdf = await generateAuthorizationPDF(req.params.id);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename=autorizacao_${req.params.id}.pdf`);
      res.send(pdf);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/social-assistance/authorizations/:id/donation-term", enforceUnitScope(), async (req, res) => {
    try {
      const pdf = await generateDonationTermPDF(req.params.id);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename=termo_doacao_${req.params.id}.pdf`);
      res.send(pdf);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/social-assistance/deliveries/:id/receipt", enforceUnitScope(), async (req, res) => {
    try {
      const pdf = await generateDeliveryReceiptPDF(req.params.id);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename=comprovante_entrega_${req.params.id}.pdf`);
      res.send(pdf);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Dashboard Reports
  app.get("/api/social-assistance/reports/monthly", enforceUnitScope(), async (req, res) => {
    try {
      const effectiveUnitId = getEffectiveUnitId(req);
      if (!effectiveUnitId) {
        return res.status(400).json({ error: "Unidade não identificada" });
      }
      
      const { month, year } = req.query;
      const refMonth = month ? parseInt(month as string) : new Date().getMonth() + 1;
      const refYear = year ? parseInt(year as string) : new Date().getFullYear();
      
      const startDate = new Date(refYear, refMonth - 1, 1);
      const endDate = new Date(refYear, refMonth, 0, 23, 59, 59);

      const deliveries = await storage.getDiaperDeliveries({ unitId: effectiveUnitId });
      const authorizations = await storage.getDiaperAuthorizations({ unitId: effectiveUnitId });
      const requests = await storage.getDiaperRequests({ unitId: effectiveUnitId });
      
      const monthlyDeliveries = deliveries.filter(d => {
        const date = new Date(d.deliveredAt);
        return date >= startDate && date <= endDate;
      });
      
      const monthlyAuths = authorizations.filter(a => {
        const date = new Date(a.issuedAt);
        return date >= startDate && date <= endDate;
      });
      
      const monthlyRequests = requests.filter(r => {
        const date = new Date(r.createdAt);
        return date >= startDate && date <= endDate;
      });

      const bySize: Record<string, { delivered: number; authorized: number; requested: number }> = {};
      
      for (const d of monthlyDeliveries) {
        if (!bySize[d.diaperSize]) bySize[d.diaperSize] = { delivered: 0, authorized: 0, requested: 0 };
        bySize[d.diaperSize].delivered += d.quantityDelivered;
      }
      
      for (const a of monthlyAuths) {
        if (!bySize[a.diaperSize]) bySize[a.diaperSize] = { delivered: 0, authorized: 0, requested: 0 };
        bySize[a.diaperSize].authorized += a.quantityAuthorized;
      }
      
      for (const r of monthlyRequests) {
        if (!bySize[r.diaperSize]) bySize[r.diaperSize] = { delivered: 0, authorized: 0, requested: 0 };
        bySize[r.diaperSize].requested += r.quantityRequested;
      }

      res.json({
        period: { month: refMonth, year: refYear },
        totals: {
          deliveries: monthlyDeliveries.length,
          authorizations: monthlyAuths.length,
          requests: monthlyRequests.length,
          unitsDelivered: monthlyDeliveries.reduce((sum, d) => sum + d.quantityDelivered, 0),
          unitsAuthorized: monthlyAuths.reduce((sum, a) => sum + a.quantityAuthorized, 0),
          unitsRequested: monthlyRequests.reduce((sum, r) => sum + r.quantityRequested, 0),
        },
        bySize,
        beneficiariesServed: new Set(monthlyDeliveries.map(d => d.beneficiaryId)).size,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/social-assistance/reports/kpis", enforceUnitScope(), async (req, res) => {
    try {
      const effectiveUnitId = getEffectiveUnitId(req);
      if (!effectiveUnitId) {
        return res.status(400).json({ error: "Unidade não identificada" });
      }
      
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

      const deliveries = await storage.getDiaperDeliveries({ unitId: effectiveUnitId });
      const authorizations = await storage.getDiaperAuthorizations({ unitId: effectiveUnitId });
      const beneficiaries = await storage.getSaBeneficiaries({ unitId: effectiveUnitId });
      const stock = await storage.getDiaperStock({ unitId: effectiveUnitId });

      const thisMonthDeliveries = deliveries.filter(d => new Date(d.deliveredAt) >= thisMonthStart);
      const lastMonthDeliveries = deliveries.filter(d => {
        const date = new Date(d.deliveredAt);
        return date >= lastMonthStart && date <= lastMonthEnd;
      });

      const activeAuths = authorizations.filter(a => a.status === 'ativa' || a.status === 'parcialmente_utilizada');
      
      const totalStock = stock.reduce((sum, s) => sum + s.currentQuantity, 0);
      const avgMonthlyUsage = deliveries.length > 0 
        ? deliveries.reduce((sum, d) => sum + d.quantityDelivered, 0) / 6 
        : 0;

      res.json({
        beneficiaries: {
          total: beneficiaries.length,
          active: beneficiaries.filter(b => b.status === 'ativo').length,
        },
        authorizations: {
          active: activeAuths.length,
          pending: authorizations.filter(a => a.status === 'ativa').length,
        },
        deliveries: {
          thisMonth: thisMonthDeliveries.length,
          lastMonth: lastMonthDeliveries.length,
          trend: lastMonthDeliveries.length > 0 
            ? ((thisMonthDeliveries.length - lastMonthDeliveries.length) / lastMonthDeliveries.length * 100).toFixed(1)
            : 0,
          unitsThisMonth: thisMonthDeliveries.reduce((sum, d) => sum + d.quantityDelivered, 0),
        },
        stock: {
          totalUnits: totalStock,
          monthsRemaining: avgMonthlyUsage > 0 ? (totalStock / avgMonthlyUsage).toFixed(1) : 'N/A',
          lowStockSizes: stock.filter(s => s.currentQuantity < (s.reorderPoint || s.minStock)).length,
        },
      });
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
      const professional = await storage.getProfessionalById(request.requestedById);
      const unit = await storage.getHealthUnitById(request.originUnitId);
      
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
      const professional = await storage.getProfessionalById(request.requestedById);
      const unit = await storage.getHealthUnitById(request.originUnitId);
      
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
        const request = tp.tfdRequestId ? await storage.getTfdRequestById(tp.tfdRequestId) : null;
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
        const professional = await storage.getProfessionalById(request.requestedById);
        const unit = await storage.getHealthUnitById(request.originUnitId);
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
        const professional = await storage.getProfessionalById(request.requestedById);
        const unit = await storage.getHealthUnitById(request.originUnitId);
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
        const professional = await storage.getProfessionalById(request.requestedById);
        const unit = await storage.getHealthUnitById(request.originUnitId);
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
        const professional = await storage.getProfessionalById(request.requestedById);
        const unit = await storage.getHealthUnitById(request.originUnitId);
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

  // BPA-C (Consolidated) PDF export
  app.post("/api/tfd/exports/bpa-c/pdf", enforceUnitScope(), async (req, res) => {
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

      // Get unit info for the header
      const unit = await storage.getHealthUnitById(effectiveUnitId || filteredRequests[0].originUnitId);
      if (!unit) {
        return res.status(404).json({ error: 'Unidade de saúde não encontrada' });
      }

      // Consolidate procedures by code
      const procedureMap: Record<string, { codigo: string; nome: string; quantidade: number }> = {};
      
      for (const request of filteredRequests) {
        const procCode = request.sigtapCode || request.procedureCode || '0803010125';
        if (!procedureMap[procCode]) {
          const { getProcedureByCodigo } = await import('./services/sigtap-tfd');
          const proc = getProcedureByCodigo(procCode);
          procedureMap[procCode] = {
            codigo: procCode,
            nome: proc?.nome || 'DESLOCAMENTO DE PACIENTE',
            quantidade: 0,
          };
        }
        procedureMap[procCode].quantidade += 1;
        
        // Add companion procedure if applicable
        if (request.companion && request.sigtapCompanionCode) {
          const compCode = request.sigtapCompanionCode;
          if (!procedureMap[compCode]) {
            const { getProcedureByCodigo } = await import('./services/sigtap-tfd');
            const proc = getProcedureByCodigo(compCode);
            procedureMap[compCode] = {
              codigo: compCode,
              nome: proc?.nome || 'DESLOCAMENTO DE ACOMPANHANTE',
              quantidade: 0,
            };
          }
          procedureMap[compCode].quantidade += 1;
        }
      }

      const procedures = Object.values(procedureMap);
      const competenciaDate = competencia ? new Date(competencia) : new Date();

      // Generate BPA-C PDF
      const { generateBpaCPDF } = await import('./services/tfd-pdf-generator');
      const pdfBuffer = generateBpaCPDF({
        unit,
        competencia: competenciaDate,
        procedures,
        totalRequests: filteredRequests.length,
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=BPA-C_${new Date().toISOString().split('T')[0]}.pdf`);
      res.send(pdfBuffer);
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
        const professional = await storage.getProfessionalById(request.requestedById);
        const unit = await storage.getHealthUnitById(request.originUnitId);
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
            authorizationNumber: request.apacAuthorizationNumber || `APAC-${Date.now()}`,
            validityStart,
            validityEnd,
            authorizer: authorizer || professional,
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
  // SINAN API
  // ============================================================================
  app.get("/api/sinan/notifications", enforceUnitScope(), async (req, res) => {
    try {
      const effectiveUnitId = getEffectiveUnitId(req);
      const { agravo, status, classification } = req.query;
      
      const notifications = await storage.getSinanNotifications({
        unitId: effectiveUnitId || undefined,
        agravo: agravo as string,
        status: status as string,
        classification: classification as string,
      });
      res.json(notifications);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/sinan/notifications/:id", enforceUnitScope(), async (req, res) => {
    try {
      const notification = await storage.getSinanNotificationById(req.params.id);
      if (!notification) {
        return res.status(404).json({ error: "Notificação não encontrada" });
      }
      
      if (!validateEntityAccess(req, notification.unitId)) {
        return res.status(403).json({ error: "Acesso negado" });
      }
      
      res.json(notification);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  const sinanCreateSchema = z.object({
    agravoCode: z.string().min(1, "Agravo obrigatório"),
    agravoName: z.string().optional(),
    cidCode: z.string().min(1, "CID-10 obrigatório"),
    citizenId: z.string().nullable().optional(),
    patientName: z.string().min(2, "Nome do paciente obrigatório"),
    patientGender: z.enum(["M", "F", "I"]),
    patientBirthDate: z.any().optional(),
    patientAge: z.number().nullable().optional(),
    patientAgeType: z.string().nullable().optional(),
    patientCpf: z.string().nullable().optional(),
    patientCns: z.string().nullable().optional(),
    patientMotherName: z.string().nullable().optional(),
    patientPhone: z.string().nullable().optional(),
    patientAddress: z.string().nullable().optional(),
    patientNeighborhood: z.string().nullable().optional(),
    patientMunicipalityName: z.string().nullable().optional(),
    patientState: z.string().nullable().optional(),
    patientCep: z.string().nullable().optional(),
    patientZone: z.string().nullable().optional(),
    patientRace: z.string().nullable().optional(),
    patientPregnant: z.string().nullable().optional(),
    symptomStartDate: z.any().optional(),
    hospitalization: z.boolean().optional(),
    classificacaoFinal: z.string().nullable().optional(),
    observations: z.string().nullable().optional(),
  });

  app.post("/api/sinan/notifications", enforceUnitScope(), async (req, res) => {
    try {
      const sessionUnitId = req.session?.user?.unitId;
      if (!sessionUnitId) {
        return res.status(400).json({ error: "Unidade não identificada" });
      }

      const validatedData = sinanCreateSchema.parse(req.body);

      const year = new Date().getFullYear();
      const existingCount = (await storage.getSinanNotifications({ unitId: sessionUnitId })).length;
      const notificationNumber = `${year}${sessionUnitId.slice(0, 4).toUpperCase()}${String(existingCount + 1).padStart(6, '0')}`;

      const now = new Date();
      const startOfYear = new Date(year, 0, 1);
      const weekNumber = Math.ceil((now.getTime() - startOfYear.getTime()) / (7 * 24 * 60 * 60 * 1000));

      const parseToDate = (val: any): Date | null => {
        if (!val) return null;
        if (val instanceof Date) return val;
        if (typeof val === 'number') return new Date(val * 1000);
        if (typeof val === 'string') {
          let date: Date | null = null;
          if (val.includes('/')) {
            const parts = val.split('/');
            if (parts.length === 3) {
              const [day, month, yearPart] = parts;
              date = new Date(Date.UTC(parseInt(yearPart), parseInt(month) - 1, parseInt(day), 12, 0, 0));
            }
          } else if (val.includes('-')) {
            const [yearPart, month, day] = val.split('T')[0].split('-');
            date = new Date(Date.UTC(parseInt(yearPart), parseInt(month) - 1, parseInt(day), 12, 0, 0));
          }
          if (date && !isNaN(date.getTime())) {
            return date;
          }
        }
        return null;
      };

      const data = {
        unitId: sessionUnitId,
        citizenId: validatedData.citizenId || null,
        notificationNumber,
        agravoCode: validatedData.agravoCode,
        agravoName: validatedData.agravoName || validatedData.agravoCode,
        notificationDate: now,
        symptomsStartDate: parseToDate(validatedData.symptomStartDate),
        cidCode: validatedData.cidCode,
        notificationWeek: weekNumber,
        notificationYear: year,
        status: 'rascunho' as const,
        classificacaoFinal: validatedData.classificacaoFinal || 'em_investigacao',
        patientName: validatedData.patientName,
        patientBirthDate: parseToDate(validatedData.patientBirthDate),
        patientAge: validatedData.patientAge,
        patientAgeType: validatedData.patientAgeType,
        patientGender: validatedData.patientGender,
        patientPregnant: validatedData.patientPregnant,
        patientRace: validatedData.patientRace,
        patientCns: validatedData.patientCns,
        patientCpf: validatedData.patientCpf,
        patientMotherName: validatedData.patientMotherName,
        residencePhone: validatedData.patientPhone,
        residenceLogradouro: validatedData.patientAddress,
        residenceDistrict: validatedData.patientNeighborhood,
        residenceMunicipio: validatedData.patientMunicipalityName,
        residenceUf: validatedData.patientState,
        residenceCep: validatedData.patientCep,
        residenceZone: validatedData.patientZone,
        hospitalized: validatedData.hospitalization || false,
        observations: validatedData.observations,
        notifierId: req.session?.user?.id || null,
        notifierName: req.session?.user?.name || null,
      };

      const notification = await storage.createSinanNotification(data as any);
      res.status(201).json(notification);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Dados inválidos", details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/sinan/notifications/:id", enforceUnitScope(), async (req, res) => {
    try {
      const existing = await storage.getSinanNotificationById(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: "Notificação não encontrada" });
      }
      if (!validateEntityAccess(req, existing.unitId)) {
        return res.status(403).json({ error: "Acesso negado" });
      }

      const validatedData = updateSinanNotificationSchema.parse(req.body);
      
      const updateData: any = {
        ...validatedData,
        updatedAt: new Date(),
      };

      const notification = await storage.updateSinanNotification(req.params.id, updateData);
      res.json(notification);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Dados inválidos", details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/sinan/notifications/:id", enforceUnitScope(), async (req, res) => {
    try {
      const existing = await storage.getSinanNotificationById(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: "Notificação não encontrada" });
      }
      if (!validateEntityAccess(req, existing.unitId)) {
        return res.status(403).json({ error: "Acesso negado" });
      }

      await storage.deleteSinanNotification(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/sinan/stats", enforceUnitScope(), async (req, res) => {
    try {
      const effectiveUnitId = getEffectiveUnitId(req);
      const notifications = await storage.getSinanNotifications({
        unitId: effectiveUnitId || undefined,
      });

      const byStatus: Record<string, number> = {};
      const byAgravo: Record<string, number> = {};
      const byClassification: Record<string, number> = {};

      for (const n of notifications) {
        const status = n.status || 'rascunho';
        const agravo = n.agravoCode || n.agravoName || 'outros';
        const classification = n.classificacaoFinal || 'em_investigacao';
        
        byStatus[status] = (byStatus[status] || 0) + 1;
        byAgravo[agravo] = (byAgravo[agravo] || 0) + 1;
        byClassification[classification] = (byClassification[classification] || 0) + 1;
      }

      res.json({
        total: notifications.length,
        byStatus,
        byAgravo,
        byClassification,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // SINAN TEMPLATES API
  // ============================================================================
  app.get("/api/sinan/templates", async (req, res) => {
    try {
      const { search, categoria } = req.query;
      
      let templates;
      if (search) {
        templates = sinanTemplateService.searchTemplates(search as string);
      } else if (categoria) {
        templates = sinanTemplateService.getTemplatesByCategoria(categoria as string);
      } else {
        templates = sinanTemplateService.getAllTemplates();
      }
      
      res.json(templates);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/sinan/templates/stats", async (req, res) => {
    try {
      const stats = sinanTemplateService.getStats();
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/sinan/templates/categorias", async (req, res) => {
    try {
      const categorias = sinanTemplateService.getCategorias();
      res.json(categorias);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/sinan/templates/agravos", async (req, res) => {
    try {
      const agravos = sinanTemplateService.getUniqueAgravoCodes();
      res.json(agravos);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/sinan/templates/by-agravo/:agravoCode", async (req, res) => {
    try {
      const result = sinanTemplateService.getTemplatesByAgravoCode(req.params.agravoCode);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/sinan/templates/by-cid/:cid10", async (req, res) => {
    try {
      const result = sinanTemplateService.getTemplatesByCid10(req.params.cid10);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/sinan/templates/:templateId", async (req, res) => {
    try {
      const template = sinanTemplateService.getTemplateById(req.params.templateId);
      if (!template) {
        return res.status(404).json({ error: "Template não encontrado" });
      }
      
      const fieldsByGroup = sinanTemplateService.getFieldsByGroup(template);
      res.json({ ...template, fieldsByGroup });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/sinan/templates/:templateId/validate", async (req, res) => {
    try {
      const result = sinanTemplateService.validateFormData(req.params.templateId, req.body);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // SINAN PDF EXPORT API
  // ============================================================================
  app.get("/api/sinan/notifications/:id/pdf", enforceUnitScope(), async (req, res) => {
    try {
      const notification = await storage.getSinanNotificationById(req.params.id);
      if (!notification) {
        return res.status(404).json({ error: "Notificação não encontrada" });
      }
      if (!validateEntityAccess(req, notification.unitId)) {
        return res.status(403).json({ error: "Acesso negado" });
      }

      const template = sinanTemplateService.getTemplatesByAgravoCode(notification.agravoCode);
      if (!template.templates.length) {
        return res.status(400).json({ error: "Template não encontrado para este agravo" });
      }

      const selectedTemplate = template.templates[0];
      const unit = await storage.getHealthUnitById(notification.unitId);

      const pdfGenerator = new SinanPdfGenerator();
      const pdfBuffer = pdfGenerator.generateNotificationPdf(
        {
          id: notification.id,
          notificationNumber: notification.notificationNumber || "",
          agravoCode: notification.agravoCode,
          formData: (notification.formData as Record<string, any>) || {},
          createdAt: notification.createdAt,
          status: notification.status || "rascunho",
          unitName: unit?.name,
          notifierName: notification.notifierName || undefined,
        },
        selectedTemplate
      );

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="sinan_${notification.notificationNumber || notification.id}.pdf"`
      );
      res.send(pdfBuffer);
    } catch (error: any) {
      console.error("PDF generation error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/sinan/templates/:templateId/blank-form", async (req, res) => {
    try {
      const template = sinanTemplateService.getTemplateById(req.params.templateId);
      if (!template) {
        return res.status(404).json({ error: "Template não encontrado" });
      }

      const pdfGenerator = new SinanPdfGenerator();
      const pdfBuffer = pdfGenerator.generateBlankForm(template);

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="ficha_${template.agravoCode}_em_branco.pdf"`
      );
      res.send(pdfBuffer);
    } catch (error: any) {
      console.error("Blank form generation error:", error);
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

  // ============================================================================
  // AUTOMATION MODULES API (Non-invasive)
  // ============================================================================
  app.use("/api/forms", enforceUnitScope(), formsRoutes);
  app.use("/api/workflow", enforceUnitScope(), workflowRoutes);
  app.use("/api/alerts", enforceUnitScope(), alertsRoutes);
  app.use("/api/strategic-reports", enforceUnitScope(), reportsRoutes);

  const httpServer = createServer(app);
  return httpServer;
}
