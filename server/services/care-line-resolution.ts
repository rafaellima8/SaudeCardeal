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
   * Resolve care line for a consultation
   */
  static async resolveForConsultation(consultationId: string): Promise<CareLineResolution> {
    // Get consultation
    const consultation = await db.query.consultations.findFirst({
      where: eq(schema.consultations.id, consultationId),
    });

    if (!consultation) {
      throw new Error("Consultation not found");
    }

    // 1. Check explicit assignment
    if (consultation.careLineId) {
      return await this.loadCareLineWithTemplate(
        consultation.careLineId,
        "explicit",
        "Directly assigned to consultation"
      );
    }

    // 2. Check active problems/diagnoses
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
        const diagnosisMatch = await db.query.careLineDiagnoses.findFirst({
          where: and(
            inArray(schema.careLineDiagnoses.diagnosisCode, codes),
            inArray(
              schema.careLineDiagnoses.diagnosisType,
              problems.some(p => p.ciap2Code) ? ["ciap2"] : ["cid10"]
            )
          ),
          orderBy: [desc(schema.careLineDiagnoses.priority)],
        });

        if (diagnosisMatch) {
          return await this.loadCareLineWithTemplate(
            diagnosisMatch.careLineId,
            "diagnosis",
            `Matched diagnosis code: ${diagnosisMatch.diagnosisCode}`
          );
        }
      }
    }

    // 3. Check appointment specialty
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
            const careLine = await db.query.careLines.findFirst({
              where: and(
                eq(schema.careLines.specialtyId, specialtyMatch.id),
                eq(schema.careLines.active, true)
              ),
            });

            if (careLine) {
              return await this.loadCareLineWithTemplate(
                careLine.id,
                "specialty",
                `Professional specialty: ${professional.specialty}`
              );
            }
          }
        }
      }
    }

    // 4. Check age/gender triggers
    const citizen = await db.query.citizens.findFirst({
      where: eq(schema.citizens.id, consultation.citizenId),
    });

    if (citizen) {
      const age = this.calculateAge(citizen.birthDate);
      const gender = citizen.gender;

      const triggers = await db.query.careLineTriggers.findMany({
        where: and(
          eq(schema.careLineTriggers.active, true),
          inArray(schema.careLineTriggers.triggerType, ["age_range", "gender"])
        ),
        orderBy: [desc(schema.careLineTriggers.priority)],
      });

      for (const trigger of triggers) {
        const criteria = JSON.parse(trigger.triggerValue);

        if (trigger.triggerType === "age_range") {
          if (age >= criteria.minAge && age <= criteria.maxAge) {
            return await this.loadCareLineWithTemplate(
              trigger.careLineId,
              "trigger",
              `Age range match: ${criteria.minAge}-${criteria.maxAge}`
            );
          }
        }

        if (trigger.triggerType === "gender" && criteria.gender === gender) {
          return await this.loadCareLineWithTemplate(
            trigger.careLineId,
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
   * Load care line with its active template
   */
  private static async loadCareLineWithTemplate(
    careLineId: string,
    matchReason: CareLineResolution["matchReason"],
    matchDetails: string
  ): Promise<CareLineResolution> {
    const careLine = await db.query.careLines.findFirst({
      where: eq(schema.careLines.id, careLineId),
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
   * Assign care line to consultation
   */
  static async assignCareLineToConsultation(
    consultationId: string,
    careLineId: string,
    unitId: string
  ): Promise<void> {
    // Verify consultation belongs to unit
    const consultation = await db.query.consultations.findFirst({
      where: eq(schema.consultations.id, consultationId),
    });

    if (!consultation) {
      throw new Error("Consultation not found");
    }

    if (consultation.unitId !== unitId) {
      throw new Error("Access denied: consultation does not belong to your unit");
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
