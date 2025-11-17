import type { Request, Response } from "express";
import { aceStatsService } from "../services/stats.service";

export class AceStatsController {
  /**
   * GET /api/ace/stats
   * Retorna estatísticas agregadas do módulo ACE
   */
  async getStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await aceStatsService.getStats();
      res.status(200).json(stats);
    } catch (error: any) {
      console.error("Erro ao buscar estatísticas ACE:", error);
      res.status(500).json({
        error: "Erro ao buscar estatísticas",
        message: error.message
      });
    }
  }
}

export const aceStatsController = new AceStatsController();
