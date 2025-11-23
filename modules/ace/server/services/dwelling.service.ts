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
