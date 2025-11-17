import type { Request, Response } from "express";
import { aceSyncService } from "../services/sync.service";
import { aceSyncRequestSchema } from "../schemas/sync.schema";
import { ZodError } from "zod";

export class AceSyncController {
  /**
   * POST /api/ace/sync
   * Sincroniza dados offline com o servidor
   */
  async sync(req: Request, res: Response): Promise<void> {
    try {
      // Validar request body com Zod
      const validatedData = aceSyncRequestSchema.parse(req.body);

      // Extrair userId da sessão (se disponível)
      const userId = (req as any).user?.id;

      // Executar sincronização
      const result = await aceSyncService.performSync(validatedData, userId);

      // Retornar resposta
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(207).json(result); // 207 Multi-Status (sucesso parcial)
      }
    } catch (error: any) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: "Dados inválidos",
          details: error.errors
        });
      } else {
        console.error("Erro na sincronização ACE:", error);
        res.status(500).json({
          error: "Erro ao sincronizar dados",
          message: error.message
        });
      }
    }
  }
}

export const aceSyncController = new AceSyncController();
