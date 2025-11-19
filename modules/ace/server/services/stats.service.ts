import type { AceStatsResponse } from "../schemas/stats.schema";

export class AceStatsService {
  /**
   * Retorna estatísticas agregadas do módulo ACE
   * TEMPORARY STUB: Returns empty stats while full schema is disabled
   */
  async getStats(): Promise<AceStatsResponse> {
    try {
      const totalVisits = 0;
      const totalFoci = 0;
      const dwellingsByStatus: { status: string; count: number }[] = [];
      const visitsByType: { type: string; count: number }[] = [];
      const recentActivity = {
        last_7_days: 0,
        last_30_days: 0
      };

      return {
        total_visits: totalVisits,
        total_foci: totalFoci,
        dwellings_by_status: dwellingsByStatus,
        visits_by_type: visitsByType,
        recent_activity: recentActivity
      };
    } catch (error) {
      console.error("Erro ao obter estatísticas ACE:", error);
      return {
        total_visits: 0,
        total_foci: 0,
        dwellings_by_status: []
      };
    }
  }
}

export const aceStatsService = new AceStatsService();
