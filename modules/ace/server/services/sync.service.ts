import { db } from "../../../../server/db";
import { sql } from "drizzle-orm";
import type { AceDwellingSync, AceVisitSync, AcePhotoSync, AceSyncResponse } from "../schemas/sync.schema";

interface SyncError {
  type: string;
  external_id: string;
  error: string;
}

export class AceSyncService {
  /**
   * Sincroniza imóveis de forma idempotente usando external_id
   */
  async syncDwellings(dwellings: AceDwellingSync[], userId?: string): Promise<{ mapping: Record<string, string>, errors: SyncError[] }> {
    const mapping: Record<string, string> = {};
    const errors: SyncError[] = [];

    for (const dwelling of dwellings) {
      try {
        // Buscar imóvel existente por external_id
        const existingResult = await db.execute(sql`
          SELECT id FROM ace_dwellings WHERE external_id = ${dwelling.external_id}
        `);

        let serverId: string;

        if (existingResult.rows.length > 0) {
          // UPDATE - Imóvel já existe
          serverId = existingResult.rows[0].id as string;
          
          await db.execute(sql`
            UPDATE ace_dwellings
            SET 
              unit_id = ${dwelling.unit_id},
              microarea = ${dwelling.microarea || null},
              street = ${dwelling.street},
              number = ${dwelling.number || null},
              complement = ${dwelling.complement || null},
              neighborhood = ${dwelling.neighborhood || null},
              zip_code = ${dwelling.zip_code || null},
              latitude = ${dwelling.latitude || null},
              longitude = ${dwelling.longitude || null},
              dwelling_type = ${dwelling.dwelling_type || null},
              sanitation = ${dwelling.sanitation || null},
              water_supply = ${dwelling.water_supply || null},
              has_electricity = ${dwelling.has_electricity},
              has_animals = ${dwelling.has_animals},
              animal_types = ${sql.raw(`ARRAY[${dwelling.animal_types.map(t => `'${t}'`).join(',')}]::text[]`)},
              household_members = ${dwelling.household_members},
              notes = ${dwelling.notes || null},
              updated_at = NOW()
            WHERE external_id = ${dwelling.external_id}
          `);

          // Registrar auditoria
          await this.logAudit('ace_dwellings', serverId, 'update', userId, {
            external_id: dwelling.external_id,
            action: 'sync_update'
          });
        } else {
          // INSERT - Novo imóvel
          const insertResult = await db.execute(sql`
            INSERT INTO ace_dwellings (
              external_id, unit_id, microarea, street, number, complement,
              neighborhood, zip_code, latitude, longitude, dwelling_type,
              sanitation, water_supply, has_electricity, has_animals,
              animal_types, household_members, notes
            ) VALUES (
              ${dwelling.external_id}, ${dwelling.unit_id}, ${dwelling.microarea || null},
              ${dwelling.street}, ${dwelling.number || null}, ${dwelling.complement || null},
              ${dwelling.neighborhood || null}, ${dwelling.zip_code || null},
              ${dwelling.latitude || null}, ${dwelling.longitude || null},
              ${dwelling.dwelling_type || null}, ${dwelling.sanitation || null},
              ${dwelling.water_supply || null}, ${dwelling.has_electricity},
              ${dwelling.has_animals}, ${sql.raw(`ARRAY[${dwelling.animal_types.map(t => `'${t}'`).join(',')}]::text[]`)},
              ${dwelling.household_members}, ${dwelling.notes || null}
            )
            RETURNING id
          `);

          serverId = insertResult.rows[0].id as string;

          // Registrar auditoria
          await this.logAudit('ace_dwellings', serverId, 'create', userId, {
            external_id: dwelling.external_id,
            action: 'sync_create'
          });
        }

        mapping[dwelling.external_id] = serverId;
      } catch (error: any) {
        errors.push({
          type: 'dwelling',
          external_id: dwelling.external_id,
          error: error.message
        });
      }
    }

    return { mapping, errors };
  }

  /**
   * Sincroniza visitas de forma idempotente usando external_id
   */
  async syncVisits(visits: AceVisitSync[], dwellingMapping: Record<string, string>, userId?: string): Promise<{ mapping: Record<string, string>, errors: SyncError[] }> {
    const mapping: Record<string, string> = {};
    const errors: SyncError[] = [];

    for (const visit of visits) {
      try {
        // Resolver dwelling_id a partir do external_id
        const dwellingId = dwellingMapping[visit.dwelling_external_id];
        
        if (!dwellingId) {
          // Se não encontrou no mapping atual, buscar no banco
          const dwellingResult = await db.execute(sql`
            SELECT id FROM ace_dwellings WHERE external_id = ${visit.dwelling_external_id}
          `);
          
          if (dwellingResult.rows.length === 0) {
            throw new Error(`Dwelling not found: ${visit.dwelling_external_id}`);
          }
        }

        const resolvedDwellingId = dwellingId || (await db.execute(sql`
          SELECT id FROM ace_dwellings WHERE external_id = ${visit.dwelling_external_id}
        `)).rows[0].id as string;

        // Buscar visita existente por external_id
        const existingResult = await db.execute(sql`
          SELECT id FROM ace_visits WHERE external_id = ${visit.external_id}
        `);

        let serverId: string;

        if (existingResult.rows.length > 0) {
          // UPDATE - Visita já existe
          serverId = existingResult.rows[0].id as string;
          
          await db.execute(sql`
            UPDATE ace_visits
            SET 
              dwelling_id = ${resolvedDwellingId},
              professional_id = ${visit.professional_id},
              unit_id = ${visit.unit_id},
              visit_date = ${visit.visit_date},
              visit_type = ${visit.visit_type || null},
              visit_motive = ${visit.visit_motive || null},
              latitude = ${visit.latitude || null},
              longitude = ${visit.longitude || null},
              temperature = ${visit.temperature || null},
              blood_pressure_systolic = ${visit.blood_pressure_systolic || null},
              blood_pressure_diastolic = ${visit.blood_pressure_diastolic || null},
              heart_rate = ${visit.heart_rate || null},
              respiratory_rate = ${visit.respiratory_rate || null},
              blood_glucose = ${visit.blood_glucose || null},
              weight = ${visit.weight || null},
              height = ${visit.height || null},
              observations = ${visit.observations || null},
              findings = ${JSON.stringify(visit.findings)}
            WHERE external_id = ${visit.external_id}
          `);

          // Registrar auditoria
          await this.logAudit('ace_visits', serverId, 'update', userId, {
            external_id: visit.external_id,
            action: 'sync_update'
          });
        } else {
          // INSERT - Nova visita
          const insertResult = await db.execute(sql`
            INSERT INTO ace_visits (
              external_id, dwelling_id, professional_id, unit_id, visit_date,
              visit_type, visit_motive, latitude, longitude, temperature,
              blood_pressure_systolic, blood_pressure_diastolic, heart_rate,
              respiratory_rate, blood_glucose, weight, height, observations, findings
            ) VALUES (
              ${visit.external_id}, ${resolvedDwellingId}, ${visit.professional_id},
              ${visit.unit_id}, ${visit.visit_date}, ${visit.visit_type || null},
              ${visit.visit_motive || null}, ${visit.latitude || null},
              ${visit.longitude || null}, ${visit.temperature || null},
              ${visit.blood_pressure_systolic || null}, ${visit.blood_pressure_diastolic || null},
              ${visit.heart_rate || null}, ${visit.respiratory_rate || null},
              ${visit.blood_glucose || null}, ${visit.weight || null},
              ${visit.height || null}, ${visit.observations || null},
              ${JSON.stringify(visit.findings)}
            )
            RETURNING id
          `);

          serverId = insertResult.rows[0].id as string;

          // Registrar auditoria
          await this.logAudit('ace_visits', serverId, 'create', userId, {
            external_id: visit.external_id,
            action: 'sync_create'
          });
        }

        mapping[visit.external_id] = serverId;
      } catch (error: any) {
        errors.push({
          type: 'visit',
          external_id: visit.external_id,
          error: error.message
        });
      }
    }

    return { mapping, errors };
  }

  /**
   * Sincroniza fotos (placeholder - pode ser expandido)
   */
  async syncPhotos(photos: AcePhotoSync[], userId?: string): Promise<{ mapping: Record<string, string>, errors: SyncError[] }> {
    const mapping: Record<string, string> = {};
    const errors: SyncError[] = [];

    // TODO: Implementar armazenamento de fotos (base64 -> filesystem ou object storage)
    for (const photo of photos) {
      try {
        // Por enquanto, apenas log de auditoria
        await this.logAudit('ace_photos', photo.external_id, 'sync', userId, {
          entity_type: photo.entity_type,
          entity_external_id: photo.entity_external_id,
          mime_type: photo.mime_type,
          description: photo.description
        });
        
        mapping[photo.external_id] = photo.external_id; // Placeholder
      } catch (error: any) {
        errors.push({
          type: 'photo',
          external_id: photo.external_id,
          error: error.message
        });
      }
    }

    return { mapping, errors };
  }

  /**
   * Registra log de auditoria
   */
  private async logAudit(entityType: string, entityId: string, action: string, userId?: string, metadata?: any): Promise<void> {
    await db.execute(sql`
      INSERT INTO ace_audit_logs (
        entity_type, entity_id, action, user_id, metadata
      ) VALUES (
        ${entityType}, ${entityId}, ${action}, ${userId || null}, ${JSON.stringify(metadata || {})}
      )
    `);
  }

  /**
   * Executa sincronização completa
   */
  async performSync(data: {
    dwellings: AceDwellingSync[],
    visits: AceVisitSync[],
    photos: AcePhotoSync[]
  }, userId?: string): Promise<AceSyncResponse> {
    const response: AceSyncResponse = {
      success: true,
      dwellings: {},
      visits: {},
      photos: {},
      errors: []
    };

    // 1. Sincronizar imóveis
    const dwellingsResult = await this.syncDwellings(data.dwellings, userId);
    response.dwellings = dwellingsResult.mapping;
    response.errors.push(...dwellingsResult.errors);

    // 2. Sincronizar visitas (usando o mapping de imóveis)
    const visitsResult = await this.syncVisits(data.visits, dwellingsResult.mapping, userId);
    response.visits = visitsResult.mapping;
    response.errors.push(...visitsResult.errors);

    // 3. Sincronizar fotos
    const photosResult = await this.syncPhotos(data.photos, userId);
    response.photos = photosResult.mapping;
    response.errors.push(...photosResult.errors);

    // Se houver erros, marcar como não totalmente bem-sucedida
    if (response.errors.length > 0) {
      response.success = false;
    }

    return response;
  }
}

export const aceSyncService = new AceSyncService();
