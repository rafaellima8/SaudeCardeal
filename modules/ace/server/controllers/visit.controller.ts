import type { Request, Response } from "express";
import { visitService } from "../services/visit.service";
import { z, ZodError } from "zod";

// Dual-case schema: accepts both camelCase (frontend) and snake_case (legacy)
const visitSchema = z.union([
  // CamelCase variant (frontend)
  z.object({
    externalId: z.string().min(1).optional(),
    dwellingId: z.string().uuid("Dwelling ID deve ser UUID válido"),
    professionalId: z.string().uuid("Professional ID deve ser UUID válido"),
    unitId: z.string().uuid("Unit ID deve ser UUID válido"),
    visitDate: z.string().or(z.number()),
    visitType: z.string().optional(),
    visitMotive: z.string().optional(),
    latitude: z.string().optional(),
    longitude: z.string().optional(),
    temperature: z.number().optional(),
    bloodPressureSystolic: z.number().int().optional(),
    bloodPressureDiastolic: z.number().int().optional(),
    heartRate: z.number().int().optional(),
    respiratoryRate: z.number().int().optional(),
    bloodGlucose: z.number().optional(),
    weight: z.number().optional(),
    height: z.number().optional(),
    observations: z.string().optional(),
    findings: z.record(z.any()).optional(),
  }),
  // snake_case variant (legacy)
  z.object({
    external_id: z.string().min(1).optional(),
    dwelling_id: z.string().uuid("Dwelling ID deve ser UUID válido"),
    professional_id: z.string().uuid("Professional ID deve ser UUID válido"),
    unit_id: z.string().uuid("Unit ID deve ser UUID válido"),
    visit_date: z.string().or(z.number()),
    visit_type: z.string().optional(),
    visit_motive: z.string().optional(),
    latitude: z.string().optional(),
    longitude: z.string().optional(),
    temperature: z.number().optional(),
    blood_pressure_systolic: z.number().int().optional(),
    blood_pressure_diastolic: z.number().int().optional(),
    heart_rate: z.number().int().optional(),
    respiratory_rate: z.number().int().optional(),
    blood_glucose: z.number().optional(),
    weight: z.number().optional(),
    height: z.number().optional(),
    observations: z.string().optional(),
    findings: z.record(z.any()).optional(),
  }),
]);

// Partial schema for PATCH (all fields optional)
const visitUpdateSchema = z.union([
  // CamelCase variant
  z.object({
    externalId: z.string().min(1).optional(),
    dwellingId: z.string().uuid().optional(),
    professionalId: z.string().uuid().optional(),
    unitId: z.string().uuid().optional(),
    visitDate: z.string().or(z.number()).optional(),
    visitType: z.string().optional(),
    visitMotive: z.string().optional(),
    latitude: z.string().optional(),
    longitude: z.string().optional(),
    temperature: z.number().optional(),
    bloodPressureSystolic: z.number().int().optional(),
    bloodPressureDiastolic: z.number().int().optional(),
    heartRate: z.number().int().optional(),
    respiratoryRate: z.number().int().optional(),
    bloodGlucose: z.number().optional(),
    weight: z.number().optional(),
    height: z.number().optional(),
    observations: z.string().optional(),
    findings: z.record(z.any()).optional(),
  }),
  // snake_case variant
  z.object({
    external_id: z.string().min(1).optional(),
    dwelling_id: z.string().uuid().optional(),
    professional_id: z.string().uuid().optional(),
    unit_id: z.string().uuid().optional(),
    visit_date: z.string().or(z.number()).optional(),
    visit_type: z.string().optional(),
    visit_motive: z.string().optional(),
    latitude: z.string().optional(),
    longitude: z.string().optional(),
    temperature: z.number().optional(),
    blood_pressure_systolic: z.number().int().optional(),
    blood_pressure_diastolic: z.number().int().optional(),
    heart_rate: z.number().int().optional(),
    respiratory_rate: z.number().int().optional(),
    blood_glucose: z.number().optional(),
    weight: z.number().optional(),
    height: z.number().optional(),
    observations: z.string().optional(),
    findings: z.record(z.any()).optional(),
  }),
]);

// Helper function to convert to snake_case for service layer
function toSnakeCase(data: any): any {
  return {
    external_id: data.externalId ?? data.external_id,
    dwelling_id: data.dwellingId ?? data.dwelling_id,
    professional_id: data.professionalId ?? data.professional_id,
    unit_id: data.unitId ?? data.unit_id,
    visit_date: data.visitDate ?? data.visit_date,
    visit_type: data.visitType ?? data.visit_type,
    visit_motive: data.visitMotive ?? data.visit_motive,
    latitude: data.latitude,
    longitude: data.longitude,
    temperature: data.temperature,
    blood_pressure_systolic: data.bloodPressureSystolic ?? data.blood_pressure_systolic,
    blood_pressure_diastolic: data.bloodPressureDiastolic ?? data.blood_pressure_diastolic,
    heart_rate: data.heartRate ?? data.heart_rate,
    respiratory_rate: data.respiratoryRate ?? data.respiratory_rate,
    blood_glucose: data.bloodGlucose ?? data.blood_glucose,
    weight: data.weight,
    height: data.height,
    observations: data.observations,
    findings: data.findings,
  };
}

export class VisitController {
  async listVisits(req: Request, res: Response): Promise<void> {
    try {
      const filters = {
        dwelling_id: req.query.dwelling_id as string,
        professional_id: req.query.professional_id as string,
        unit_id: req.query.unit_id as string,
        start_date: req.query.start_date as string,
        end_date: req.query.end_date as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 100,
        offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
      };

      const visits = await visitService.listVisits(filters);
      res.json(visits);
    } catch (error: any) {
      console.error("Erro ao listar visitas ACE:", error);
      res.status(500).json({
        error: "Erro ao listar visitas",
        message: error.message
      });
    }
  }

  async getVisitById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const visit = await visitService.getVisitById(id);
      
      if (!visit) {
        res.status(404).json({ error: "Visita não encontrada" });
        return;
      }
      
      res.json(visit);
    } catch (error: any) {
      if (error.message?.includes("não encontrada")) {
        res.status(404).json({
          error: "Visita não encontrada",
          message: error.message
        });
        return;
      }
      
      console.error("Erro ao buscar visita ACE:", error);
      res.status(500).json({
        error: "Erro ao buscar visita",
        message: error.message
      });
    }
  }

  /**
   * POST /api/ace/visits
   * Cria uma nova visita ACE
   */
  async createVisit(req: Request, res: Response): Promise<void> {
    try {
      const validatedData = visitSchema.parse(req.body);
      const userId = (req as any).user?.id;
      
      const serviceData = toSnakeCase(validatedData);
      const visit = await visitService.createVisit(serviceData, userId);
      res.status(201).json(visit);
    } catch (error: any) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: "Dados inválidos",
          details: error.errors
        });
        return;
      }
      
      console.error("Erro ao criar visita ACE:", error);
      res.status(500).json({
        error: "Erro ao criar visita",
        message: error.message
      });
    }
  }

  async updateVisit(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const validatedData = visitUpdateSchema.parse(req.body);
      const userId = (req as any).user?.id;
      
      const serviceData = toSnakeCase(validatedData);
      const visit = await visitService.updateVisit(id, serviceData, userId);
      
      if (!visit) {
        res.status(404).json({ error: "Visita não encontrada" });
        return;
      }
      
      res.json(visit);
    } catch (error: any) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: "Dados inválidos",
          details: error.errors
        });
        return;
      }
      
      console.error("Erro ao atualizar visita ACE:", error);
      res.status(500).json({
        error: "Erro ao atualizar visita",
        message: error.message
      });
    }
  }

  async deleteVisit(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;
      
      await visitService.deleteVisit(id, userId);
      res.status(204).send();
    } catch (error: any) {
      if (error.message?.includes("não encontrada")) {
        res.status(404).json({
          error: "Visita não encontrada",
          message: error.message
        });
        return;
      }
      
      console.error("Erro ao deletar visita ACE:", error);
      res.status(500).json({
        error: "Erro ao deletar visita",
        message: error.message
      });
    }
  }
}

export const visitController = new VisitController();
