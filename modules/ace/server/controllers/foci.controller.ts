import { Request, Response } from "express";
import { z, ZodError } from "zod";
import { fociService } from "../services/foci.service";

// Schema de validação para criação de foco
const fociCreateSchema = z.object({
  visit_id: z.string().uuid("Visit ID deve ser UUID válido"),
  dwelling_id: z.string().uuid("Dwelling ID deve ser UUID válido"),
  foci_type: z.string().min(1, "Tipo de foco é obrigatório"),
  location_description: z.string().optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  quantity: z.number().int().min(1).default(1),
  action_taken: z.string().optional(),
  status: z.enum(['active', 'resolved', 'monitoring']).default('active'),
  notes: z.string().optional()
});

// Schema para atualização de status
const fociStatusSchema = z.object({
  status: z.enum(['active', 'resolved', 'monitoring'])
});

export class FociController {
  /**
   * POST /api/ace/foci
   * Cria um novo foco vetorial
   */
  async createFocus(req: Request, res: Response): Promise<void> {
    try {
      const validatedData = fociCreateSchema.parse(req.body);
      const userId = (req as any).session?.user?.id;

      const focus = await fociService.createFocus(validatedData, userId);

      res.status(201).json(focus);
    } catch (error: any) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: "Dados inválidos",
          details: error.errors
        });
      } else {
        console.error("Erro ao criar foco ACE:", error);
        res.status(500).json({
          error: "Erro ao criar foco",
          message: error.message
        });
      }
    }
  }

  /**
   * GET /api/ace/foci
   * Lista focos com filtros opcionais
   */
  async listFoci(req: Request, res: Response): Promise<void> {
    try {
      const {
        visit_id,
        dwelling_id,
        status,
        foci_type,
        limit,
        offset
      } = req.query;

      const foci = await fociService.listFoci({
        visit_id: visit_id as string,
        dwelling_id: dwelling_id as string,
        status: status as string,
        foci_type: foci_type as string,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined
      });

      res.status(200).json(foci);
    } catch (error: any) {
      console.error("Erro ao listar focos ACE:", error);
      res.status(500).json({
        error: "Erro ao listar focos",
        message: error.message
      });
    }
  }

  /**
   * GET /api/ace/foci/:id
   * Busca foco por ID
   */
  async getFocus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const focus = await fociService.getFocusById(id);

      res.status(200).json(focus);
    } catch (error: any) {
      console.error("Erro ao buscar foco ACE:", error);
      const statusCode = error.message.includes("não encontrado") ? 404 : 500;
      res.status(statusCode).json({
        error: "Erro ao buscar foco",
        message: error.message
      });
    }
  }

  /**
   * PATCH /api/ace/foci/:id/status
   * Atualiza status de um foco
   */
  async updateFocusStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const validatedData = fociStatusSchema.parse(req.body);
      const userId = (req as any).session?.user?.id;

      const focus = await fociService.updateFocusStatus(id, validatedData.status, userId);

      res.status(200).json(focus);
    } catch (error: any) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: "Dados inválidos",
          details: error.errors
        });
      } else {
        console.error("Erro ao atualizar status do foco ACE:", error);
        const statusCode = error.message.includes("não encontrado") ? 404 : 500;
        res.status(statusCode).json({
          error: "Erro ao atualizar status",
          message: error.message
        });
      }
    }
  }
}

export const fociController = new FociController();
