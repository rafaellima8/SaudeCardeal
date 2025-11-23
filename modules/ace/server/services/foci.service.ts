import { db } from "../../../../server/db";
import { sql } from "drizzle-orm";

export interface FociCreate {
  visit_id: string;
  dwelling_id: string;
  foci_type: string;
  location_description?: string;
  latitude?: string;
  longitude?: string;
  quantity?: number;
  action_taken?: string;
  status?: string;
  notes?: string;
}

export class FociService {
  /**
   * Cria um novo foco vetorial
   */
  async createFocus(data: FociCreate, userId?: string): Promise<any> {
    const insertResult = await db.execute(sql`
      INSERT INTO ace_foci (
        visit_id, dwelling_id, foci_type, location_description,
        latitude, longitude, quantity, action_taken, status, notes
      ) VALUES (
        ${data.visit_id},
        ${data.dwelling_id},
        ${data.foci_type},
        ${data.location_description || null},
        ${data.latitude || null},
        ${data.longitude || null},
        ${data.quantity || 1},
        ${data.action_taken || null},
        ${data.status || 'active'},
        ${data.notes || null}
      )
      RETURNING *
    `);

    // Log de auditoria
    if (userId) {
      await this.logAudit('ace_foci', insertResult.rows[0].id as string, 'create', userId, {
        foci_type: data.foci_type,
        status: data.status || 'active'
      });
    }

    return insertResult.rows[0];
  }

  /**
   * Lista focos com filtros opcionais
   */
  async listFoci(filters: {
    visit_id?: string;
    dwelling_id?: string;
    status?: string;
    foci_type?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<any[]> {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (filters.visit_id) {
      conditions.push(`f.visit_id = $${paramIndex++}`);
      params.push(filters.visit_id);
    }

    if (filters.dwelling_id) {
      conditions.push(`f.dwelling_id = $${paramIndex++}`);
      params.push(filters.dwelling_id);
    }

    if (filters.status) {
      conditions.push(`f.status = $${paramIndex++}`);
      params.push(filters.status);
    }

    if (filters.foci_type) {
      conditions.push(`f.foci_type = $${paramIndex++}`);
      params.push(filters.foci_type);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = filters.limit || 100;
    const offset = filters.offset || 0;

    const query = `
      SELECT f.*, 
        d.street as dwelling_street, 
        d.number as dwelling_number,
        d.neighborhood as dwelling_neighborhood,
        v.visit_date as visit_date,
        p.name as professional_name
      FROM ace_foci f
      LEFT JOIN ace_dwellings d ON f.dwelling_id = d.id
      LEFT JOIN ace_visits v ON f.visit_id = v.id
      LEFT JOIN professionals p ON v.professional_id = p.id
      ${whereClause}
      ORDER BY f.created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `;

    params.push(limit, offset);

    const result = await db.execute(sql.raw(query, params));
    return result.rows;
  }

  /**
   * Busca foco por ID
   */
  async getFocusById(id: string): Promise<any> {
    const result = await db.execute(sql`
      SELECT f.*, 
        d.street as dwelling_street, 
        d.number as dwelling_number,
        d.neighborhood as dwelling_neighborhood,
        d.microarea as dwelling_microarea,
        v.visit_date as visit_date,
        p.name as professional_name
      FROM ace_foci f
      LEFT JOIN ace_dwellings d ON f.dwelling_id = d.id
      LEFT JOIN ace_visits v ON f.visit_id = v.id
      LEFT JOIN professionals p ON v.professional_id = p.id
      WHERE f.id = ${id}
    `);

    if (result.rows.length === 0) {
      throw new Error(`Foco ${id} não encontrado`);
    }

    return result.rows[0];
  }

  /**
   * Atualiza status de um foco
   */
  async updateFocusStatus(id: string, status: string, userId?: string): Promise<any> {
    const resolvedAt = status === 'resolved' ? new Date().toISOString() : null;

    const result = await db.execute(sql`
      UPDATE ace_foci
      SET status = ${status},
          resolved_at = ${resolvedAt}
      WHERE id = ${id}
      RETURNING *
    `);

    if (result.rows.length === 0) {
      throw new Error(`Foco ${id} não encontrado`);
    }

    // Log de auditoria
    if (userId) {
      await this.logAudit('ace_foci', id, 'update', userId, {
        status,
        resolved_at: resolvedAt
      });
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

export const fociService = new FociService();
