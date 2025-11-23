import { Request, Response } from "express";
import { ZodError } from "zod";
import { visitService } from "../services/visit.service";
import { aceVisitSyncSchema } from "../schemas/sync.schema";

export class VisitController {
  /**
   * POST /api/ace/visits
   * Cria uma nova visita ACE
   */
  async createVisit(req: Request, res: Response): Promise<void> {
    try {
      const validatedData = aceVisitSyncSchema.parse(req.body);
      const userId = (req as any).session?.user?.id;

      const visit = await visitService.createVisit(validatedData, userId);

      res.status(201).json(visit);
    } catch (error: any) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: "Dados inválidos",
          details: error.errors
        });
      } else {
        console.error("Erro ao criar visita ACE:", error);
        res.status(500).json({
          error: "Erro ao criar visita",
          message: error.message
        });
      }
    }
  }

  /**
   * GET /api/ace/visits
   * Lista visitas com filtros opcionais
   */
  async listVisits(req: Request, res: Response): Promise<void> {
    try {
      const {
        dwelling_id,
        professional_id,
        unit_id,
        start_date,
        end_date,
        limit,
        offset
      } = req.query;

      const visits = await visitService.listVisits({
        dwelling_id: dwelling_id as string,
        professional_id: professional_id as string,
        unit_id: unit_id as string,
        start_date: start_date as string,
        end_date: end_date as string,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined
      });

      res.status(200).json(visits);
    } catch (error: any) {
      console.error("Erro ao listar visitas ACE:", error);
      res.status(500).json({
        error: "Erro ao listar visitas",
        message: error.message
      });
    }
  }

  /**
   * GET /api/ace/visits/:id
   * Busca visita por ID
   */
  async getVisit(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const visit = await visitService.getVisitById(id);

      res.status(200).json(visit);
    } catch (error: any) {
      console.error("Erro ao buscar visita ACE:", error);
      const statusCode = error.message.includes("não encontrada") ? 404 : 500;
      res.status(statusCode).json({
        error: "Erro ao buscar visita",
        message: error.message
      });
    }
  }
}

export const visitController = new VisitController();
