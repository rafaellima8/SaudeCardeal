import { eq, desc } from "drizzle-orm";
import { db } from "../../../../server/db";
import { aceDwellings, aceAuditLogs } from "../../../../shared/schema";
import type { DwellingCreate } from "../schemas/dwelling.schema";

export class DwellingService {
  // Map camelCase/snake_case payload to Drizzle fields (only include provided fields)
  private mapToDrizzleFields(data: any): any {
    const mapped: any = {};
    
    if (data.externalId !== undefined || data.external_id !== undefined) {
      mapped.externalId = data.externalId || data.external_id;
    }
    if (data.unitId !== undefined || data.unit_id !== undefined) {
      mapped.unitId = data.unitId || data.unit_id;
    }
    if (data.microarea !== undefined) {
      mapped.microarea = data.microarea;
    }
    if (data.street !== undefined) {
      mapped.street = data.street;
    }
    if (data.number !== undefined) {
      mapped.number = data.number;
    }
    if (data.complement !== undefined) {
      mapped.complement = data.complement;
    }
    if (data.neighborhood !== undefined) {
      mapped.neighborhood = data.neighborhood;
    }
    if (data.zipCode !== undefined || data.zip_code !== undefined) {
      mapped.zipCode = data.zipCode || data.zip_code;
    }
    if (data.latitude !== undefined) {
      mapped.latitude = data.latitude;
    }
    if (data.longitude !== undefined) {
      mapped.longitude = data.longitude;
    }
    if (data.dwellingType !== undefined || data.dwelling_type !== undefined) {
      mapped.dwellingType = data.dwellingType || data.dwelling_type;
    }
    if (data.sanitation !== undefined) {
      mapped.sanitation = data.sanitation;
    }
    if (data.waterSupply !== undefined || data.water_supply !== undefined) {
      mapped.waterSupply = data.waterSupply || data.water_supply;
    }
    if (data.hasElectricity !== undefined || data.has_electricity !== undefined) {
      mapped.hasElectricity = data.hasElectricity ?? data.has_electricity;
    }
    if (data.hasAnimals !== undefined || data.has_animals !== undefined) {
      mapped.hasAnimals = data.hasAnimals ?? data.has_animals;
    }
    if (data.animalTypes !== undefined || data.animal_types !== undefined) {
      mapped.animalTypes = data.animalTypes || data.animal_types;
    }
    if (data.householdMembers !== undefined || data.household_members !== undefined) {
      mapped.householdMembers = data.householdMembers ?? data.household_members;
    }
    if (data.notes !== undefined) {
      mapped.notes = data.notes;
    }
    
    return mapped;
  }

  async listDwellings(): Promise<any[]> {
    const dwellings = await db
      .select()
      .from(aceDwellings)
      .orderBy(desc(aceDwellings.createdAt));
    
    return dwellings;
  }

  async getDwellingById(id: string): Promise<any> {
    const [dwelling] = await db
      .select()
      .from(aceDwellings)
      .where(eq(aceDwellings.id, id));
    
    return dwelling;
  }

  async updateDwelling(id: string, data: any, userId?: string): Promise<any> {
    const currentTimestamp = Math.floor(Date.now() / 1000);
    
    const mappedData = this.mapToDrizzleFields(data);
    const updateData: any = {
      ...mappedData,
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

  async createOrUpdateDwelling(data: any, userId?: string): Promise<any> {
    const mappedData = this.mapToDrizzleFields(data);
    
    // Validate required fields after mapping
    if (!mappedData.street || !mappedData.unitId) {
      throw new Error("Street and unitId are required");
    }
    
    if (mappedData.externalId) {
      const [existing] = await db
        .select()
        .from(aceDwellings)
        .where(eq(aceDwellings.externalId, mappedData.externalId));

      if (existing) {
        return existing;
      }
    }

    // Apply defaults for create operation
    const insertData = {
      ...mappedData,
      hasElectricity: mappedData.hasElectricity ?? true,
      hasAnimals: mappedData.hasAnimals ?? false,
      animalTypes: mappedData.animalTypes || [],
      householdMembers: mappedData.householdMembers ?? 0,
    };

    const [dwelling] = await db
      .insert(aceDwellings)
      .values(insertData)
      .returning();

    if (userId && dwelling) {
      await this.logAudit('ace_dwellings', dwelling.id, 'create', userId, {
        external_id: mappedData.externalId,
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
