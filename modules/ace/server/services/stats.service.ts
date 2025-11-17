import { db } from "../../../../server/db";
import { sql } from "drizzle-orm";
import type { AceStatsResponse } from "../schemas/stats.schema";

export class AceStatsService {
  /**
   * Retorna estatísticas agregadas do módulo ACE
   */
  async getStats(): Promise<AceStatsResponse> {
    try {
      const totalVisitsResult = await db.execute(sql`
        SELECT COUNT(*) as count FROM home_visits
      `);
      const totalVisits = Number(totalVisitsResult.rows[0]?.count || 0);

      const totalFociResult = await db.execute(sql`
        SELECT COUNT(*) as count 
        FROM home_visits 
        WHERE visit_motive = 'controle_ambiental'
      `);
      const totalFoci = Number(totalFociResult.rows[0]?.count || 0);

      const dwellingsByStatusResult = await db.execute(sql`
        SELECT 
          COALESCE(
            CASE 
              WHEN has_electricity = true AND has_animals = false THEN 'Boas Condições'
              WHEN has_electricity = false THEN 'Sem Energia'
              WHEN has_animals = true THEN 'Com Animais'
              ELSE 'Padrão'
            END,
            'Não Classificado'
          ) as status,
          COUNT(*) as count
        FROM dwellings
        GROUP BY status
        ORDER BY count DESC
      `);

      const dwellingsByStatus = dwellingsByStatusResult.rows.map(row => ({
        status: String(row.status),
        count: Number(row.count)
      }));

      const visitsByTypeResult = await db.execute(sql`
        SELECT 
          COALESCE(visit_type::text, 'Não Especificado') as type,
          COUNT(*) as count
        FROM home_visits
        GROUP BY visit_type
        ORDER BY count DESC
      `);

      const visitsByType = visitsByTypeResult.rows.map(row => ({
        type: String(row.type),
        count: Number(row.count)
      }));

      const recentActivityResult = await db.execute(sql`
        SELECT 
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as last_7_days,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as last_30_days
        FROM home_visits
      `);

      const recentActivity = {
        last_7_days: Number(recentActivityResult.rows[0]?.last_7_days || 0),
        last_30_days: Number(recentActivityResult.rows[0]?.last_30_days || 0)
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
