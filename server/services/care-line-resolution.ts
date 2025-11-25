/**
 * Care Line Resolution Service
 * 
 * Derives careLineId from consultation context using priority-based algorithm:
 * 1. Explicit assignment (consultation.careLineId)
 * 2. Active problems/diagnoses (CIAP-2/CID-10 mapping)
 * 3. Appointment specialty
 * 4. Age/gender-based triggers
 */

import { db } from "../db";
import * as schema from "../../shared/schema";
import { eq, and, inArray, desc } from "drizzle-orm";

export interface CareLineResolutionContext {
  consultationId: string;
  citizenId: string;
  professionalId: string;
  unitId: string; // REQUIRED for multi-tenant security
  appointmentId?: string;
  activeProblems?: Array<{ ciap2Code?: string; cid10Code?: string }>;
}

export interface CareLineResolution {
  careLineId: string | null;
  careLine: schema.CareLine | null;
  template: schema.ConsultationTemplate | null;
  matchReason: "explicit" | "diagnosis" | "specialty" | "trigger" | "none";
  matchDetails?: string;
}

export class CareLineResolutionService {
  /**
   * Resolve care line for a consultation (MULTI-TENANT SECURE)
   */
  static async resolveForConsultation(consultationId: string, unitId: string): Promise<CareLineResolution> {
    // Get consultation
    const consultation = await db.query.consultations.findFirst({
      where: and(
        eq(schema.consultations.id, consultationId),
        eq(schema.consultations.unitId, unitId) // SECURITY: unit validation
      ),
    });

    if (!consultation) {
      throw new Error("Consultation not found or access denied");
    }

    // 1. Check explicit assignment (validate unit ownership)
    if (consultation.careLineId) {
      const careLine = await db.query.careLines.findFirst({
        where: and(
          eq(schema.careLines.id, consultation.careLineId),
          eq(schema.careLines.unitId, unitId) // SECURITY: verify care line belongs to unit
        ),
      });
      
      if (careLine) {
        return await this.loadCareLineWithTemplate(
          consultation.careLineId,
          unitId,
          "explicit",
          "Directly assigned to consultation"
        );
      }
    }

    // 2. Check active problems/diagnoses (MULTI-TENANT SECURE)
    const problems = await db.query.citizenProblems.findMany({
      where: and(
        eq(schema.citizenProblems.citizenId, consultation.citizenId),
        eq(schema.citizenProblems.status, "active")
      ),
    });

    if (problems.length > 0) {
      const codes = problems
        .flatMap(p => [p.ciap2Code, p.cid10Code])
        .filter(Boolean) as string[];

      if (codes.length > 0) {
        // SECURITY: Get matching diagnoses, filtering by unit via JOIN
        const diagnosisMappings = await db
          .select({
            careLineId: schema.careLineDiagnoses.careLineId,
            diagnosisCode: schema.careLineDiagnoses.diagnosisCode,
            priority: schema.careLineDiagnoses.priority,
          })
          .from(schema.careLineDiagnoses)
          .innerJoin(
            schema.careLines,
            and(
              eq(schema.careLines.id, schema.careLineDiagnoses.careLineId),
              eq(schema.careLines.unitId, unitId), // SECURITY: unit filter via JOIN
              eq(schema.careLines.active, true)
            )
          )
          .where(inArray(schema.careLineDiagnoses.diagnosisCode, codes))
          .orderBy(desc(schema.careLineDiagnoses.priority));

        if (diagnosisMappings.length > 0) {
          const mapping = diagnosisMappings[0];
          return await this.loadCareLineWithTemplate(
            mapping.careLineId,
            unitId,
            "diagnosis",
            `Matched diagnosis code: ${mapping.diagnosisCode}`
          );
        }
      }
    }

    // 3. Check appointment specialty (MULTI-TENANT SECURE)
    if (consultation.appointmentId) {
      const appointment = await db.query.appointments.findFirst({
        where: eq(schema.appointments.id, consultation.appointmentId),
      });

      if (appointment) {
        const professional = await db.query.professionals.findFirst({
          where: eq(schema.professionals.id, consultation.professionalId),
        });

        if (professional?.specialty) {
          const specialtyMatch = await db.query.specialties.findFirst({
            where: eq(schema.specialties.name, professional.specialty),
          });

          if (specialtyMatch) {
            // SECURITY: Only select care lines from same unit, prioritized
            const careLines = await db.query.careLines.findMany({
              where: and(
                eq(schema.careLines.specialtyId, specialtyMatch.id),
                eq(schema.careLines.unitId, unitId), // SECURITY: unit filter
                eq(schema.careLines.active, true)
              ),
              orderBy: [desc(schema.careLines.priority)], // Use priority if defined
            });

            if (careLines.length > 0) {
              // Select highest priority care line
              const careLine = careLines[0];
              return await this.loadCareLineWithTemplate(
                careLine.id,
                unitId,
                "specialty",
                `Professional specialty: ${professional.specialty}`
              );
            }
          }
        }
      }
    }

    // 4. Check age/gender triggers (MULTI-TENANT SECURE with JOIN)
    const citizen = await db.query.citizens.findFirst({
      where: eq(schema.citizens.id, consultation.citizenId),
    });

    if (citizen) {
      const age = this.calculateAge(citizen.birthDate);
      const gender = citizen.gender;

      // SECURITY: Filter triggers by unit via JOIN to careLines
      const triggers = await db
        .select({
          careLineId: schema.careLineTriggers.careLineId,
          triggerType: schema.careLineTriggers.triggerType,
          triggerValue: schema.careLineTriggers.triggerValue,
          priority: schema.careLineTriggers.priority,
        })
        .from(schema.careLineTriggers)
        .innerJoin(
          schema.careLines,
          and(
            eq(schema.careLines.id, schema.careLineTriggers.careLineId),
            eq(schema.careLines.unitId, unitId), // SECURITY: unit filter via JOIN
            eq(schema.careLines.active, true)
          )
        )
        .where(eq(schema.careLineTriggers.active, true))
        .orderBy(desc(schema.careLineTriggers.priority));

      for (const trigger of triggers) {
        const criteria = JSON.parse(trigger.triggerValue);

        if (trigger.triggerType === "age_range") {
          if (age >= criteria.minAge && age <= criteria.maxAge) {
            return await this.loadCareLineWithTemplate(
              trigger.careLineId,
              unitId,
              "trigger",
              `Age range match: ${criteria.minAge}-${criteria.maxAge}`
            );
          }
        }

        if (trigger.triggerType === "gender" && criteria.gender === gender) {
          return await this.loadCareLineWithTemplate(
            trigger.careLineId,
            unitId,
            "trigger",
            `Gender match: ${gender}`
          );
        }
      }
    }

    // No match found
    return {
      careLineId: null,
      careLine: null,
      template: null,
      matchReason: "none",
    };
  }

  /**
   * Load care line with its active template (MULTI-TENANT SECURE)
   */
  private static async loadCareLineWithTemplate(
    careLineId: string,
    unitId: string, // SECURITY: required for unit validation
    matchReason: CareLineResolution["matchReason"],
    matchDetails: string
  ): Promise<CareLineResolution> {
    const careLine = await db.query.careLines.findFirst({
      where: and(
        eq(schema.careLines.id, careLineId),
        eq(schema.careLines.unitId, unitId) // SECURITY: verify ownership
      ),
    });

    if (!careLine) {
      return {
        careLineId: null,
        careLine: null,
        template: null,
        matchReason: "none",
      };
    }

    const template = await db.query.consultationTemplates.findFirst({
      where: and(
        eq(schema.consultationTemplates.careLineId, careLineId),
        eq(schema.consultationTemplates.active, true)
      ),
    });

    return {
      careLineId,
      careLine,
      template: template || null,
      matchReason,
      matchDetails,
    };
  }

  /**
   * Assign care line to consultation (MULTI-TENANT SECURE)
   */
  static async assignCareLineToConsultation(
    consultationId: string,
    careLineId: string,
    unitId: string
  ): Promise<void> {
    // SECURITY: Verify consultation belongs to unit
    const consultation = await db.query.consultations.findFirst({
      where: and(
        eq(schema.consultations.id, consultationId),
        eq(schema.consultations.unitId, unitId)
      ),
    });

    if (!consultation) {
      throw new Error("Consultation not found or access denied");
    }

    // SECURITY: Verify target care line belongs to same unit
    const careLine = await db.query.careLines.findFirst({
      where: and(
        eq(schema.careLines.id, careLineId),
        eq(schema.careLines.unitId, unitId)
      ),
    });

    if (!careLine) {
      throw new Error("Care line not found or access denied");
    }

    // Update consultation
    await db
      .update(schema.consultations)
      .set({ careLineId })
      .where(eq(schema.consultations.id, consultationId));
  }

  /**
   * Calculate age from birthdate
   */
  private static calculateAge(birthDate: Date): number {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  }
}
