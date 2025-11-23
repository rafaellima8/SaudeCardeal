import { db } from "../../../../server/db";
import { sql } from "drizzle-orm";
import type { AceVisitSync } from "../schemas/sync.schema";

export class VisitService {
  /**
   * Cria uma nova visita ACE
   */
  async createVisit(data: AceVisitSync & { dwelling_id?: string }, userId?: string): Promise<any> {
    // Resolver dwelling_id a partir do external_id se necessário
    let dwellingId = data.dwelling_id;
    
    if (!dwellingId && data.dwelling_external_id) {
      const dwellingResult = await db.execute(sql`
        SELECT id FROM ace_dwellings WHERE external_id = ${data.dwelling_external_id}
      `);
      
      if (dwellingResult.rows.length > 0) {
        dwellingId = dwellingResult.rows[0].id as string;
      } else {
        throw new Error(`Dwelling com external_id ${data.dwelling_external_id} não encontrado`);
      }
    }

    if (!dwellingId) {
      throw new Error("dwelling_id ou dwelling_external_id é obrigatório");
    }

    const insertResult = await db.execute(sql`
      INSERT INTO ace_visits (
        external_id, dwelling_id, professional_id, unit_id, visit_date,
        visit_type, visit_motive, latitude, longitude,
        temperature, blood_pressure_systolic, blood_pressure_diastolic,
        heart_rate, respiratory_rate, blood_glucose, weight, height,
        observations, findings
      ) VALUES (
        ${data.external_id || null},
        ${dwellingId},
        ${data.professional_id},
        ${data.unit_id},
        ${data.visit_date},
        ${data.visit_type || null},
        ${data.visit_motive || null},
        ${data.latitude || null},
        ${data.longitude || null},
        ${data.temperature || null},
        ${data.blood_pressure_systolic || null},
        ${data.blood_pressure_diastolic || null},
        ${data.heart_rate || null},
        ${data.respiratory_rate || null},
        ${data.blood_glucose || null},
        ${data.weight || null},
        ${data.height || null},
        ${data.observations || null},
        ${sql.raw(`'${JSON.stringify(data.findings || {})}'::jsonb`)}
      )
      RETURNING *
    `);

    // Log de auditoria
    if (userId) {
      await this.logAudit('ace_visits', insertResult.rows[0].id as string, 'create', userId, {
        external_id: data.external_id
      });
    }

    return insertResult.rows[0];
  }

  /**
   * Lista visitas com filtros opcionais
   */
  async listVisits(filters: {
    dwelling_id?: string;
    professional_id?: string;
    unit_id?: string;
    start_date?: string;
    end_date?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<any[]> {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (filters.dwelling_id) {
      conditions.push(`dwelling_id = $${paramIndex++}`);
      params.push(filters.dwelling_id);
    }

    if (filters.professional_id) {
      conditions.push(`professional_id = $${paramIndex++}`);
      params.push(filters.professional_id);
    }

    if (filters.unit_id) {
      conditions.push(`unit_id = $${paramIndex++}`);
      params.push(filters.unit_id);
    }

    if (filters.start_date) {
      conditions.push(`visit_date >= $${paramIndex++}`);
      params.push(filters.start_date);
    }

    if (filters.end_date) {
      conditions.push(`visit_date <= $${paramIndex++}`);
      params.push(filters.end_date);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = filters.limit || 100;
    const offset = filters.offset || 0;

    const query = `
      SELECT v.*, 
        d.street as dwelling_street, 
        d.number as dwelling_number,
        d.neighborhood as dwelling_neighborhood
      FROM ace_visits v
      LEFT JOIN ace_dwellings d ON v.dwelling_id = d.id
      ${whereClause}
      ORDER BY v.visit_date DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `;

    params.push(limit, offset);

    const result = await db.execute(sql.raw(query, params));
    return result.rows;
  }

  /**
   * Busca visita por ID
   */
  async getVisitById(id: string): Promise<any> {
    const result = await db.execute(sql`
      SELECT v.*, 
        d.street as dwelling_street, 
        d.number as dwelling_number,
        d.neighborhood as dwelling_neighborhood,
        d.microarea as dwelling_microarea,
        p.name as professional_name
      FROM ace_visits v
      LEFT JOIN ace_dwellings d ON v.dwelling_id = d.id
      LEFT JOIN professionals p ON v.professional_id = p.id
      WHERE v.id = ${id}
    `);

    if (result.rows.length === 0) {
      throw new Error(`Visita ${id} não encontrada`);
    }

    return result.rows[0];
  }

  /**
   * Registra auditoria
   */
  private async logAudit(
    entityType: string,
    entityId: string,
    action: string,
    userId: string,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    await db.execute(sql`
      INSERT INTO ace_audit_logs (entity_type, entity_id, action, user_id, metadata)
      VALUES (${entityType}, ${entityId}, ${action}, ${userId}, ${sql.raw(`'${JSON.stringify(metadata)}'::jsonb`)})
    `);
  }
}

export const visitService = new VisitService();
