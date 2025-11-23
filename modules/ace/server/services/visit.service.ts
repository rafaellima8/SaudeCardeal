import { db } from "../../../../server/db";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { aceVisits, aceDwellings, aceAuditLogs, professionals } from "../../../../shared/schema";
import type { AceVisitSync } from "../schemas/sync.schema";

export class VisitService {
  async createVisit(data: AceVisitSync & { dwelling_id?: string }, userId?: string): Promise<any> {
    let dwellingId = data.dwelling_id;
    
    if (!dwellingId && data.dwelling_external_id) {
      const [dwelling] = await db
        .select()
        .from(aceDwellings)
        .where(eq(aceDwellings.externalId, data.dwelling_external_id));
      
      if (dwelling) {
        dwellingId = dwelling.id;
      } else {
        throw new Error(`Dwelling com external_id ${data.dwelling_external_id} não encontrado`);
      }
    }

    if (!dwellingId) {
      throw new Error("dwelling_id ou dwelling_external_id é obrigatório");
    }

    const visitTimestamp = Math.floor(new Date(data.visit_date).getTime() / 1000);
    
    const [visit] = await db
      .insert(aceVisits)
      .values({
        externalId: data.external_id || null,
        dwellingId,
        professionalId: data.professional_id,
        unitId: data.unit_id,
        visitDate: visitTimestamp,
        visitType: data.visit_type || null,
        visitMotive: data.visit_motive || null,
        latitude: data.latitude || null,
        longitude: data.longitude || null,
        temperature: data.temperature || null,
        bloodPressureSystolic: data.blood_pressure_systolic || null,
        bloodPressureDiastolic: data.blood_pressure_diastolic || null,
        heartRate: data.heart_rate || null,
        respiratoryRate: data.respiratory_rate || null,
        bloodGlucose: data.blood_glucose || null,
        weight: data.weight || null,
        height: data.height || null,
        observations: data.observations || null,
        findings: JSON.stringify(data.findings || {}),
      })
      .returning();

    if (userId && visit) {
      await this.logAudit('ace_visits', visit.id, 'create', userId, {
        external_id: data.external_id
      });
    }

    return visit;
  }

  async listVisits(filters: {
    dwelling_id?: string;
    professional_id?: string;
    unit_id?: string;
    start_date?: string;
    end_date?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<any[]> {
    const conditions = [];

    if (filters.dwelling_id) {
      conditions.push(eq(aceVisits.dwellingId, filters.dwelling_id));
    }

    if (filters.professional_id) {
      conditions.push(eq(aceVisits.professionalId, filters.professional_id));
    }

    if (filters.unit_id) {
      conditions.push(eq(aceVisits.unitId, filters.unit_id));
    }

    if (filters.start_date) {
      const startTimestamp = Math.floor(new Date(filters.start_date).getTime() / 1000);
      conditions.push(gte(aceVisits.visitDate, startTimestamp));
    }

    if (filters.end_date) {
      const endTimestamp = Math.floor(new Date(filters.end_date).getTime() / 1000);
      conditions.push(lte(aceVisits.visitDate, endTimestamp));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const limit = filters.limit || 100;
    const offset = filters.offset || 0;

    const visits = await db
      .select({
        id: aceVisits.id,
        externalId: aceVisits.externalId,
        dwellingId: aceVisits.dwellingId,
        professionalId: aceVisits.professionalId,
        unitId: aceVisits.unitId,
        visitDate: aceVisits.visitDate,
        visitType: aceVisits.visitType,
        visitMotive: aceVisits.visitMotive,
        latitude: aceVisits.latitude,
        longitude: aceVisits.longitude,
        temperature: aceVisits.temperature,
        bloodPressureSystolic: aceVisits.bloodPressureSystolic,
        bloodPressureDiastolic: aceVisits.bloodPressureDiastolic,
        heartRate: aceVisits.heartRate,
        respiratoryRate: aceVisits.respiratoryRate,
        bloodGlucose: aceVisits.bloodGlucose,
        weight: aceVisits.weight,
        height: aceVisits.height,
        observations: aceVisits.observations,
        findings: aceVisits.findings,
        createdAt: aceVisits.createdAt,
        dwelling_street: aceDwellings.street,
        dwelling_number: aceDwellings.number,
        dwelling_neighborhood: aceDwellings.neighborhood,
      })
      .from(aceVisits)
      .leftJoin(aceDwellings, eq(aceVisits.dwellingId, aceDwellings.id))
      .where(whereClause)
      .orderBy(desc(aceVisits.visitDate))
      .limit(limit)
      .offset(offset);

    return visits;
  }

  async getVisitById(id: string): Promise<any> {
    const [visit] = await db
      .select({
        id: aceVisits.id,
        externalId: aceVisits.externalId,
        dwellingId: aceVisits.dwellingId,
        professionalId: aceVisits.professionalId,
        unitId: aceVisits.unitId,
        visitDate: aceVisits.visitDate,
        visitType: aceVisits.visitType,
        visitMotive: aceVisits.visitMotive,
        latitude: aceVisits.latitude,
        longitude: aceVisits.longitude,
        temperature: aceVisits.temperature,
        bloodPressureSystolic: aceVisits.bloodPressureSystolic,
        bloodPressureDiastolic: aceVisits.bloodPressureDiastolic,
        heartRate: aceVisits.heartRate,
        respiratoryRate: aceVisits.respiratoryRate,
        bloodGlucose: aceVisits.bloodGlucose,
        weight: aceVisits.weight,
        height: aceVisits.height,
        observations: aceVisits.observations,
        findings: aceVisits.findings,
        createdAt: aceVisits.createdAt,
        dwelling_street: aceDwellings.street,
        dwelling_number: aceDwellings.number,
        dwelling_neighborhood: aceDwellings.neighborhood,
        dwelling_microarea: aceDwellings.microarea,
        professional_name: professionals.name,
      })
      .from(aceVisits)
      .leftJoin(aceDwellings, eq(aceVisits.dwellingId, aceDwellings.id))
      .leftJoin(professionals, eq(aceVisits.professionalId, professionals.id))
      .where(eq(aceVisits.id, id));

    if (!visit) {
      throw new Error(`Visita ${id} não encontrada`);
    }

    return visit;
  }

  private async logAudit(
    entityType: string,
    entityId: string,
    action: string,
    userId: string,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    await db.insert(aceAuditLogs).values({
      entityType,
      entityId,
      action,
      userId,
      changes: JSON.stringify({}),
      metadata: JSON.stringify(metadata),
    });
  }
}

export const visitService = new VisitService();
