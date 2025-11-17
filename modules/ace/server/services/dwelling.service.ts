import { sql } from "drizzle-orm";
import { db } from "../../../../server/db";
import type { DwellingCreate } from "../schemas/dwelling.schema";

export class DwellingService {
  /**
   * Cria ou atualiza um imóvel ACE
   * Se external_id for fornecido, faz upsert idempotente
   */
  async createOrUpdateDwelling(data: DwellingCreate, userId?: string): Promise<any> {
    // Se external_id fornecido, verificar se já existe
    if (data.external_id) {
      const existingResult = await db.execute(sql`
        SELECT 
          id, external_id, unit_id, microarea, street, number, complement,
          neighborhood, zip_code, latitude, longitude, dwelling_type,
          sanitation, water_supply, has_electricity, has_animals,
          animal_types, household_members, notes, created_at, updated_at
        FROM ace_dwellings 
        WHERE external_id = ${data.external_id}
      `);

      // Se já existe, retornar o registro existente (idempotente)
      if (existingResult.rows.length > 0) {
        return existingResult.rows[0];
      }
    }

    // Se external_id não fornecido ou não existe, criar novo
    const animalTypesArray = data.animal_types.length > 0
      ? sql.raw(`ARRAY[${data.animal_types.map(t => `'${t}'`).join(',')}]::text[]`)
      : sql`ARRAY[]::text[]`;

    const insertResult = await db.execute(sql`
      INSERT INTO ace_dwellings (
        external_id, unit_id, microarea, street, number, complement,
        neighborhood, zip_code, latitude, longitude, dwelling_type,
        sanitation, water_supply, has_electricity, has_animals,
        animal_types, household_members, notes
      ) VALUES (
        ${data.external_id || null},
        ${data.unit_id},
        ${data.microarea || null},
        ${data.street},
        ${data.number || null},
        ${data.complement || null},
        ${data.neighborhood || null},
        ${data.zip_code || null},
        ${data.latitude || null},
        ${data.longitude || null},
        ${data.dwelling_type || null},
        ${data.sanitation || null},
        ${data.water_supply || null},
        ${data.has_electricity},
        ${data.has_animals},
        ${animalTypesArray},
        ${data.household_members},
        ${data.notes || null}
      )
      RETURNING 
        id, external_id, unit_id, microarea, street, number, complement,
        neighborhood, zip_code, latitude, longitude, dwelling_type,
        sanitation, water_supply, has_electricity, has_animals,
        animal_types, household_members, notes, created_at, updated_at
    `);

    // Log de auditoria
    if (userId) {
      await this.logAudit('ace_dwellings', insertResult.rows[0].id as string, 'create', userId, {
        external_id: data.external_id,
        action: 'dwelling_create'
      });
    }

    return insertResult.rows[0];
  }

  /**
   * Registra auditoria
   */
  private async logAudit(
    entityType: string,
    entityId: string,
    action: string,
    userId?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await db.execute(sql`
      INSERT INTO ace_audit_logs (entity_type, entity_id, action, user_id, metadata)
      VALUES (${entityType}, ${entityId}, ${action}, ${userId || null}, ${JSON.stringify(metadata || {})})
    `);
  }
}

export const dwellingService = new DwellingService();
