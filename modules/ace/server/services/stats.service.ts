import type { AceStatsResponse } from "../schemas/stats.schema";
import { db } from "../../../../server/db";
import { homeVisits, dwellings } from "../../../../shared/schema";
import { sql, gte } from "drizzle-orm";

export class AceStatsService {
  /**
   * Retorna estatísticas agregadas do módulo ACE
   */
  async getStats(): Promise<AceStatsResponse> {
    try {
      // Total de visitas domiciliares
      const [{ count: totalVisitsCount }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(homeVisits);
      
      const totalVisits = Number(totalVisitsCount) || 0;

      // Total de focos identificados (dwellings com saneamento a céu aberto)
      const [{ count: totalFociCount }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(dwellings)
        .where(sql`${dwellings.sanitation} = 'ceu_aberto'`);
      
      const totalFoci = Number(totalFociCount) || 0;

      // Domicílios por tipo de saneamento
      const dwellingsByStatusRaw = await db
        .select({
          status: dwellings.sanitation,
          count: sql<number>`count(*)`
        })
        .from(dwellings)
        .groupBy(dwellings.sanitation);
      
      const dwellingsByStatus = dwellingsByStatusRaw.map(d => ({
        status: d.status || 'unknown',
        count: Number(d.count) || 0
      }));

      // Visitas por tipo
      const visitsByTypeRaw = await db
        .select({
          type: homeVisits.visitType,
          count: sql<number>`count(*)`
        })
        .from(homeVisits)
        .groupBy(homeVisits.visitType);
      
      const visitsByType = visitsByTypeRaw.map(v => ({
        type: v.type,
        count: Number(v.count) || 0
      }));

      // Atividade recente
      const now = new Date();
      const last7Days = new Date(now);
      last7Days.setDate(last7Days.getDate() - 7);
      
      const last30Days = new Date(now);
      last30Days.setDate(last30Days.getDate() - 30);

      const [{ count: visits7Days }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(homeVisits)
        .where(gte(homeVisits.visitDate, last7Days));
      
      const [{ count: visits30Days }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(homeVisits)
        .where(gte(homeVisits.visitDate, last30Days));

      const recentActivity = {
        last_7_days: Number(visits7Days) || 0,
        last_30_days: Number(visits30Days) || 0
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
        dwellings_by_status: [],
        visits_by_type: [],
        recent_activity: {
          last_7_days: 0,
          last_30_days: 0
        }
      };
    }
  }
}

export const aceStatsService = new AceStatsService();
