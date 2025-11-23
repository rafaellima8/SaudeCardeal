import type { Request, Response } from "express";
import { dwellingService } from "../services/dwelling.service";
import { z, ZodError } from "zod";

// Dual-case schema: accepts both camelCase (frontend) and snake_case (legacy)
const dwellingSchema = z.union([
  // CamelCase variant (frontend)
  z.object({
    externalId: z.string().min(1).optional(),
    unitId: z.string().uuid("Unit ID deve ser UUID válido"),
    microarea: z.string().optional(),
    street: z.string().min(1, "Rua é obrigatória"),
    number: z.string().optional(),
    complement: z.string().optional(),
    neighborhood: z.string().optional(),
    zipCode: z.string().optional(),
    latitude: z.string().optional(),
    longitude: z.string().optional(),
    dwellingType: z.string().optional(),
    sanitation: z.string().optional(),
    waterSupply: z.string().optional(),
    hasElectricity: z.boolean().default(true),
    hasAnimals: z.boolean().default(false),
    animalTypes: z.array(z.string()).default([]),
    householdMembers: z.number().int().min(0).default(0),
    notes: z.string().optional(),
  }),
  // snake_case variant (legacy)
  z.object({
    external_id: z.string().min(1).optional(),
    unit_id: z.string().uuid("Unit ID deve ser UUID válido"),
    microarea: z.string().optional(),
    street: z.string().min(1, "Rua é obrigatória"),
    number: z.string().optional(),
    complement: z.string().optional(),
    neighborhood: z.string().optional(),
    zip_code: z.string().optional(),
    latitude: z.string().optional(),
    longitude: z.string().optional(),
    dwelling_type: z.string().optional(),
    sanitation: z.string().optional(),
    water_supply: z.string().optional(),
    has_electricity: z.boolean().default(true),
    has_animals: z.boolean().default(false),
    animal_types: z.array(z.string()).default([]),
    household_members: z.number().int().min(0).default(0),
    notes: z.string().optional(),
  }),
]);

// Partial schema for PATCH (all fields optional)
const dwellingUpdateSchema = z.union([
  // CamelCase variant
  z.object({
    externalId: z.string().min(1).optional(),
    unitId: z.string().uuid().optional(),
    microarea: z.string().optional(),
    street: z.string().min(1).optional(),
    number: z.string().optional(),
    complement: z.string().optional(),
    neighborhood: z.string().optional(),
    zipCode: z.string().optional(),
    latitude: z.string().optional(),
    longitude: z.string().optional(),
    dwellingType: z.string().optional(),
    sanitation: z.string().optional(),
    waterSupply: z.string().optional(),
    hasElectricity: z.boolean().optional(),
    hasAnimals: z.boolean().optional(),
    animalTypes: z.array(z.string()).optional(),
    householdMembers: z.number().int().min(0).optional(),
    notes: z.string().optional(),
  }),
  // snake_case variant
  z.object({
    external_id: z.string().min(1).optional(),
    unit_id: z.string().uuid().optional(),
    microarea: z.string().optional(),
    street: z.string().min(1).optional(),
    number: z.string().optional(),
    complement: z.string().optional(),
    neighborhood: z.string().optional(),
    zip_code: z.string().optional(),
    latitude: z.string().optional(),
    longitude: z.string().optional(),
    dwelling_type: z.string().optional(),
    sanitation: z.string().optional(),
    water_supply: z.string().optional(),
    has_electricity: z.boolean().optional(),
    has_animals: z.boolean().optional(),
    animal_types: z.array(z.string()).optional(),
    household_members: z.number().int().min(0).optional(),
    notes: z.string().optional(),
  }),
]);

export class DwellingController {
  async listDwellings(req: Request, res: Response): Promise<void> {
    try {
      const dwellings = await dwellingService.listDwellings();
      res.json(dwellings);
    } catch (error: any) {
      console.error("Erro ao listar imóveis ACE:", error);
      res.status(500).json({
        error: "Erro ao listar imóveis",
        message: error.message
      });
    }
  }

  async getDwellingById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const dwelling = await dwellingService.getDwellingById(id);
      
      if (!dwelling) {
        res.status(404).json({ error: "Imóvel não encontrado" });
        return;
      }
      
      res.json(dwelling);
    } catch (error: any) {
      console.error("Erro ao buscar imóvel ACE:", error);
      res.status(500).json({
        error: "Erro ao buscar imóvel",
        message: error.message
      });
    }
  }

  async updateDwelling(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const validatedData = dwellingUpdateSchema.parse(req.body);
      const userId = (req as any).user?.id;
      
      const dwelling = await dwellingService.updateDwelling(id, validatedData, userId);
      
      if (!dwelling) {
        res.status(404).json({ error: "Imóvel não encontrado" });
        return;
      }
      
      res.json(dwelling);
    } catch (error: any) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: "Dados inválidos",
          details: error.errors
        });
        return;
      }
      
      console.error("Erro ao atualizar imóvel ACE:", error);
      res.status(500).json({
        error: "Erro ao atualizar imóvel",
        message: error.message
      });
    }
  }

  async deleteDwelling(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;
      
      await dwellingService.deleteDwelling(id, userId);
      
      res.status(204).send();
    } catch (error: any) {
      console.error("Erro ao deletar imóvel ACE:", error);
      res.status(500).json({
        error: "Erro ao deletar imóvel",
        message: error.message
      });
    }
  }

  /**
   * POST /api/ace/dwellings
   * Cria ou atualiza um imóvel ACE
   * Se external_id for fornecido, faz upsert idempotente
   */
  async createDwelling(req: Request, res: Response): Promise<void> {
    try {
      const validatedData = dwellingSchema.parse(req.body);
      const userId = (req as any).user?.id;
      const dwelling = await dwellingService.createOrUpdateDwelling(validatedData, userId);
      res.status(201).json(dwelling);
    } catch (error: any) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: "Dados inválidos",
          details: error.errors
        });
        return;
      }
      
      console.error("Erro ao criar imóvel ACE:", error);
      res.status(500).json({
        error: "Erro ao criar imóvel",
        message: error.message
      });
    }
  }
}

export const dwellingController = new DwellingController();
