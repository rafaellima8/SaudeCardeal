import { eq, desc } from "drizzle-orm";
import { db } from "../../../../server/db";
import { aceDwellings, aceAuditLogs } from "../../../../shared/schema";
import type { DwellingCreate } from "../schemas/dwelling.schema";

export class DwellingService {
  async listDwellings(): Promise<{ data: any[] }> {
    const dwellings = await db
      .select()
      .from(aceDwellings)
      .orderBy(desc(aceDwellings.createdAt));
    
    return { data: dwellings };
  }

  async getDwellingById(id: string): Promise<any> {
    const [dwelling] = await db
      .select()
      .from(aceDwellings)
      .where(eq(aceDwellings.id, id));
    
    return dwelling;
  }

  async updateDwelling(id: string, data: Partial<DwellingCreate>, userId?: string): Promise<any> {
    const currentTimestamp = Math.floor(Date.now() / 1000);
    
    const updateData: any = {
      street: data.street,
      number: data.number,
      complement: data.complement,
      neighborhood: data.neighborhood,
      zipCode: data.zip_code,
      microarea: data.microarea,
      latitude: data.latitude,
      longitude: data.longitude,
      dwellingType: data.dwelling_type,
      sanitation: data.sanitation,
      waterSupply: data.water_supply,
      hasElectricity: data.has_electricity,
      hasAnimals: data.has_animals,
      animalTypes: data.animal_types ? JSON.stringify(data.animal_types) : null,
      householdMembers: data.household_members,
      notes: data.notes,
      updatedAt: currentTimestamp,
    };

    // Remove undefined fields
    Object.keys(updateData).forEach(key => 
      updateData[key] === undefined && delete updateData[key]
    );

    const [updated] = await db
      .update(aceDwellings)
      .set(updateData)
      .where(eq(aceDwellings.id, id))
      .returning();

    // Log audit
    if (userId) {
      await db.insert(aceAuditLogs).values({
        id: crypto.randomUUID(),
        entityType: "dwelling",
        entityId: id,
        action: "update",
        userId,
        timestamp: currentTimestamp,
        changes: JSON.stringify({ updated: Object.keys(updateData) }),
      });
    }

    return updated;
  }

  async deleteDwelling(id: string, userId?: string): Promise<void> {
    const currentTimestamp = Math.floor(Date.now() / 1000);

    // Log audit before delete
    if (userId) {
      await db.insert(aceAuditLogs).values({
        id: crypto.randomUUID(),
        entityType: "dwelling",
        entityId: id,
        action: "delete",
        userId,
        timestamp: currentTimestamp,
        changes: null,
      });
    }

    await db
      .delete(aceDwellings)
      .where(eq(aceDwellings.id, id));
  }

  async createOrUpdateDwelling(data: DwellingCreate, userId?: string): Promise<any> {
    if (data.external_id) {
      const [existing] = await db
        .select()
        .from(aceDwellings)
        .where(eq(aceDwellings.externalId, data.external_id));

      if (existing) {
        return existing;
      }
    }

    const [dwelling] = await db
      .insert(aceDwellings)
      .values({
        externalId: data.external_id || null,
        unitId: data.unit_id,
        microarea: data.microarea || null,
        street: data.street,
        number: data.number || null,
        complement: data.complement || null,
        neighborhood: data.neighborhood || null,
        zipCode: data.zip_code || null,
        latitude: data.latitude || null,
        longitude: data.longitude || null,
        dwellingType: data.dwelling_type || null,
        sanitation: data.sanitation || null,
        waterSupply: data.water_supply || null,
        hasElectricity: data.has_electricity,
        hasAnimals: data.has_animals,
        animalTypes: data.animal_types,
        householdMembers: data.household_members,
        notes: data.notes || null,
      })
      .returning();

    if (userId && dwelling) {
      await this.logAudit('ace_dwellings', dwelling.id, 'create', userId, {
        external_id: data.external_id,
        action: 'dwelling_create'
      });
    }

    return dwelling;
  }

  private async logAudit(
    entityType: string,
    entityId: string,
    action: string,
    userId?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await db.insert(aceAuditLogs).values({
      entityType,
      entityId,
      action,
      userId: userId || null,
      changes: JSON.stringify({}),
      metadata: JSON.stringify(metadata || {}),
    });
  }
}

export const dwellingService = new DwellingService();
