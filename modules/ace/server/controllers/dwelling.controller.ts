import type { Request, Response } from "express";
import { dwellingService } from "../services/dwelling.service";
import { dwellingCreateSchema } from "../schemas/dwelling.schema";
import { ZodError } from "zod";

export class DwellingController {
  /**
   * POST /api/ace/dwellings
   * Cria ou atualiza um imóvel ACE
   * Se external_id for fornecido, faz upsert idempotente
   */
  async createDwelling(req: Request, res: Response): Promise<void> {
    try {
      // Validar request body com Zod
      const validatedData = dwellingCreateSchema.parse(req.body);

      // Extrair userId da sessão (se disponível)
      const userId = (req as any).user?.id;

      // Criar ou atualizar dwelling
      const dwelling = await dwellingService.createOrUpdateDwelling(validatedData, userId);

      // Retornar 201 Created (mesmo se foi retornado registro existente)
      res.status(201).json(dwelling);
    } catch (error: any) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: "Dados inválidos",
          details: error.errors
        });
      } else {
        console.error("Erro ao criar imóvel ACE:", error);
        res.status(500).json({
          error: "Erro ao criar imóvel",
          message: error.message
        });
      }
    }
  }
}

export const dwellingController = new DwellingController();
