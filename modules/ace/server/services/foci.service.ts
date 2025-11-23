import { db } from "../../../../server/db";
import { eq, and, desc } from "drizzle-orm";
import { aceFoci, aceDwellings, aceVisits, aceAuditLogs, professionals } from "../../../../shared/schema";

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
  async createFocus(data: FociCreate, userId?: string): Promise<any> {
    const [focus] = await db
      .insert(aceFoci)
      .values({
        visitId: data.visit_id,
        dwellingId: data.dwelling_id,
        fociType: data.foci_type,
        locationDescription: data.location_description ?? null,
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        quantity: data.quantity ?? 1,
        actionTaken: data.action_taken ?? null,
        status: (data.status as "active" | "resolved" | "monitoring") ?? "active",
        notes: data.notes ?? null,
      })
      .returning();

    if (userId && focus) {
      await this.logAudit('ace_foci', focus.id, 'create', userId, {
        foci_type: data.foci_type,
        status: data.status || 'active'
      });
    }

    return focus;
  }

  async listFoci(filters: {
    visit_id?: string;
    dwelling_id?: string;
    status?: string;
    foci_type?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<any[]> {
    const conditions = [];

    if (filters.visit_id) {
      conditions.push(eq(aceFoci.visitId, filters.visit_id));
    }

    if (filters.dwelling_id) {
      conditions.push(eq(aceFoci.dwellingId, filters.dwelling_id));
    }

    if (filters.status) {
      conditions.push(eq(aceFoci.status, filters.status as "active" | "resolved" | "monitoring"));
    }

    if (filters.foci_type) {
      conditions.push(eq(aceFoci.fociType, filters.foci_type));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const limit = filters.limit || 100;
    const offset = filters.offset || 0;

    const fociList = await db
      .select({
        id: aceFoci.id,
        visitId: aceFoci.visitId,
        dwellingId: aceFoci.dwellingId,
        fociType: aceFoci.fociType,
        locationDescription: aceFoci.locationDescription,
        latitude: aceFoci.latitude,
        longitude: aceFoci.longitude,
        quantity: aceFoci.quantity,
        actionTaken: aceFoci.actionTaken,
        status: aceFoci.status,
        notes: aceFoci.notes,
        createdAt: aceFoci.createdAt,
        resolvedAt: aceFoci.resolvedAt,
        dwelling_street: aceDwellings.street,
        dwelling_number: aceDwellings.number,
        dwelling_neighborhood: aceDwellings.neighborhood,
        visit_date: aceVisits.visitDate,
        professional_name: professionals.name,
      })
      .from(aceFoci)
      .leftJoin(aceDwellings, eq(aceFoci.dwellingId, aceDwellings.id))
      .leftJoin(aceVisits, eq(aceFoci.visitId, aceVisits.id))
      .leftJoin(professionals, eq(aceVisits.professionalId, professionals.id))
      .where(whereClause)
      .orderBy(desc(aceFoci.createdAt))
      .limit(limit)
      .offset(offset);

    return fociList;
  }

  async getFocusById(id: string): Promise<any> {
    const [focus] = await db
      .select({
        id: aceFoci.id,
        visitId: aceFoci.visitId,
        dwellingId: aceFoci.dwellingId,
        fociType: aceFoci.fociType,
        locationDescription: aceFoci.locationDescription,
        latitude: aceFoci.latitude,
        longitude: aceFoci.longitude,
        quantity: aceFoci.quantity,
        actionTaken: aceFoci.actionTaken,
        status: aceFoci.status,
        notes: aceFoci.notes,
        createdAt: aceFoci.createdAt,
        resolvedAt: aceFoci.resolvedAt,
        dwelling_street: aceDwellings.street,
        dwelling_number: aceDwellings.number,
        dwelling_neighborhood: aceDwellings.neighborhood,
        dwelling_microarea: aceDwellings.microarea,
        visit_date: aceVisits.visitDate,
        professional_name: professionals.name,
      })
      .from(aceFoci)
      .leftJoin(aceDwellings, eq(aceFoci.dwellingId, aceDwellings.id))
      .leftJoin(aceVisits, eq(aceFoci.visitId, aceVisits.id))
      .leftJoin(professionals, eq(aceVisits.professionalId, professionals.id))
      .where(eq(aceFoci.id, id));

    if (!focus) {
      throw new Error(`Foco ${id} não encontrado`);
    }

    return focus;
  }

  async updateFocusStatus(id: string, status: string, userId?: string): Promise<any> {
    const resolvedAt = status === 'resolved' ? Math.floor(Date.now() / 1000) : null;

    const [updatedFocus] = await db
      .update(aceFoci)
      .set({
        status: status as "active" | "resolved" | "monitoring",
        resolvedAt: resolvedAt as any,
      })
      .where(eq(aceFoci.id, id))
      .returning();

    if (!updatedFocus) {
      throw new Error(`Foco ${id} não encontrado`);
    }

    if (userId) {
      await this.logAudit('ace_foci', id, 'update', userId, {
        status,
        resolved_at: resolvedAt
      });
    }

    return updatedFocus;
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
    } as any);
  }
}

export const fociService = new FociService();
