import type { Request, Response } from "express";
import { dwellingService } from "../services/dwelling.service";
import { dwellingCreateSchema } from "../schemas/dwelling.schema";
import { ZodError } from "zod";

export class DwellingController {
  async listDwellings(req: Request, res: Response): Promise<void> {
    try {
      const { data: dwellings } = await dwellingService.listDwellings();
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
      const userId = (req as any).user?.id;
      
      const dwelling = await dwellingService.updateDwelling(id, req.body, userId);
      
      if (!dwelling) {
        res.status(404).json({ error: "Imóvel não encontrado" });
        return;
      }
      
      res.json(dwelling);
    } catch (error: any) {
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
