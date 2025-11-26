import { db } from "../db";
import { 
  clinicalProtocols, 
  protocolAlerts, 
  consultations, 
  citizens,
  prescriptions,
  type ClinicalProtocol,
  type InsertProtocolAlert,
  type ProtocolAlert,
} from "@shared/schema";
import { eq, and, inArray } from "drizzle-orm";

interface VitalSigns {
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  heartRate?: number;
  temperature?: number;
  respiratoryRate?: number;
  oxygenSaturation?: number;
  weight?: number;
  height?: number;
  glycemia?: number;
}

interface ConsultationData {
  id: string;
  citizenId: string;
  unitId: string;
  vitalSigns?: VitalSigns | null;
  ciap2Codes?: string[];
  cid10Codes?: string[];
}

interface CitizenData {
  birthDate: Date;
  gender: string;
}

interface TriggeredAlert {
  protocolId: string;
  protocolName: string;
  alertLevel: "info" | "warning" | "critical";
  message: string;
  recommendation?: string;
  triggeredData: {
    vitalSigns?: Array<{ field: string; value: number; expected: number }>;
    age?: number;
    diagnoses?: string[];
    medications?: string[];
  };
}

export class ProtocolAlertDrizzleService {
  async evaluateConsultation(consultationId: string): Promise<TriggeredAlert[]> {
    const consultation = await db
      .select()
      .from(consultations)
      .where(eq(consultations.id, consultationId))
      .limit(1);

    if (consultation.length === 0) {
      throw new Error(`Consultation ${consultationId} not found`);
    }

    const consult = consultation[0];
    
    const citizen = await db
      .select()
      .from(citizens)
      .where(eq(citizens.id, consult.citizenId))
      .limit(1);

    if (citizen.length === 0) {
      throw new Error(`Citizen not found for consultation`);
    }

    const protocols = await db
      .select()
      .from(clinicalProtocols)
      .where(
        and(
          eq(clinicalProtocols.active, true),
          // Global protocols (unitId null) or unit-specific
          consult.unitId 
            ? inArray(clinicalProtocols.unitId, [consult.unitId, null] as any)
            : eq(clinicalProtocols.unitId, null as any)
        )
      );

    const triggeredAlerts: TriggeredAlert[] = [];
    const vitalSigns = consult.vitalSigns as VitalSigns | null;
    const ciap2Codes = consult.ciap2Codes as string[] | null;
    const cid10Codes = consult.cid10Codes as string[] | null;
    const patientAge = this.calculateAge(citizen[0].birthDate);
    const patientGender = citizen[0].gender;

    for (const protocol of protocols) {
      const conditions = protocol.triggerConditions as ClinicalProtocol["triggerConditions"];
      if (!conditions) continue;

      let triggered = false;
      const triggeredData: TriggeredAlert["triggeredData"] = {};

      // Check vital signs conditions
      if (conditions.vitalSigns && vitalSigns) {
        for (const condition of conditions.vitalSigns) {
          const value = this.getVitalSignValue(vitalSigns, condition.field);
          if (value !== null && this.evaluateCondition(value, condition.operator, condition.value)) {
            triggered = true;
            triggeredData.vitalSigns = triggeredData.vitalSigns || [];
            triggeredData.vitalSigns.push({ 
              field: condition.field, 
              value, 
              expected: condition.value 
            });
          }
        }
      }

      // Check age conditions
      if (conditions.age) {
        const { min, max } = conditions.age;
        if ((min !== undefined && patientAge >= min) || (max !== undefined && patientAge <= max)) {
          if (min !== undefined && max !== undefined) {
            if (patientAge >= min && patientAge <= max) {
              triggered = true;
              triggeredData.age = patientAge;
            }
          } else if (min !== undefined && patientAge >= min) {
            triggered = true;
            triggeredData.age = patientAge;
          } else if (max !== undefined && patientAge <= max) {
            triggered = true;
            triggeredData.age = patientAge;
          }
        }
      }

      // Check gender conditions
      if (conditions.gender && patientGender !== conditions.gender) {
        continue; // Skip protocol if gender doesn't match
      }

      // Check diagnoses (CIAP-2/CID-10)
      if (conditions.diagnoses && conditions.diagnoses.length > 0) {
        const allDiagnoses = [...(ciap2Codes || []), ...(cid10Codes || [])];
        const matchedDiagnoses = allDiagnoses.filter(code => 
          conditions.diagnoses!.some(d => code.toUpperCase().startsWith(d.toUpperCase()))
        );
        if (matchedDiagnoses.length > 0) {
          triggered = true;
          triggeredData.diagnoses = matchedDiagnoses;
        }
      }

      if (triggered) {
        // Insert alert into database
        const alertInsert = {
          consultationId,
          protocolId: protocol.id,
          citizenId: consult.citizenId,
          unitId: consult.unitId,
          alertLevel: protocol.alertLevel,
          message: protocol.alertMessage,
          recommendation: protocol.recommendation,
          triggeredData: triggeredData as {
            vitalSigns?: Array<{ field: string; value: number; expected: number }>;
            age?: number;
            diagnoses?: string[];
            medications?: string[];
          },
          status: "active" as const,
        };

        await db.insert(protocolAlerts).values([alertInsert]);

        triggeredAlerts.push({
          protocolId: protocol.id,
          protocolName: protocol.name,
          alertLevel: protocol.alertLevel,
          message: protocol.alertMessage,
          recommendation: protocol.recommendation || undefined,
          triggeredData,
        });
      }
    }

    return triggeredAlerts;
  }

  async getAlertsForConsultation(consultationId: string): Promise<ProtocolAlert[]> {
    return db
      .select()
      .from(protocolAlerts)
      .where(eq(protocolAlerts.consultationId, consultationId));
  }

  async getActiveAlertsForCitizen(citizenId: string, unitId?: string): Promise<ProtocolAlert[]> {
    const conditions = [
      eq(protocolAlerts.citizenId, citizenId),
      eq(protocolAlerts.status, "active"),
    ];
    
    if (unitId) {
      conditions.push(eq(protocolAlerts.unitId, unitId));
    }

    return db
      .select()
      .from(protocolAlerts)
      .where(and(...conditions));
  }

  async acknowledgeAlert(
    alertId: string, 
    professionalId: string
  ): Promise<ProtocolAlert | null> {
    const result = await db
      .update(protocolAlerts)
      .set({
        status: "acknowledged",
        acknowledgedBy: professionalId,
        acknowledgedAt: new Date(),
      })
      .where(eq(protocolAlerts.id, alertId))
      .returning();

    return result[0] || null;
  }

  async dismissAlert(
    alertId: string, 
    professionalId: string,
    reason: string
  ): Promise<ProtocolAlert | null> {
    if (!reason || reason.trim().length < 10) {
      throw new Error("Justificativa obrigatória para ignorar alerta (mínimo 10 caracteres)");
    }

    const result = await db
      .update(protocolAlerts)
      .set({
        status: "dismissed",
        acknowledgedBy: professionalId,
        acknowledgedAt: new Date(),
        dismissReason: reason,
      })
      .where(eq(protocolAlerts.id, alertId))
      .returning();

    return result[0] || null;
  }

  async resolveAlert(alertId: string): Promise<ProtocolAlert | null> {
    const result = await db
      .update(protocolAlerts)
      .set({ status: "resolved" })
      .where(eq(protocolAlerts.id, alertId))
      .returning();

    return result[0] || null;
  }

  private getVitalSignValue(vitalSigns: VitalSigns, field: string): number | null {
    const fieldMap: Record<string, keyof VitalSigns> = {
      "bloodPressureSystolic": "bloodPressureSystolic",
      "bloodPressureDiastolic": "bloodPressureDiastolic",
      "systolic": "bloodPressureSystolic",
      "diastolic": "bloodPressureDiastolic",
      "heartRate": "heartRate",
      "fc": "heartRate",
      "temperature": "temperature",
      "temp": "temperature",
      "respiratoryRate": "respiratoryRate",
      "fr": "respiratoryRate",
      "oxygenSaturation": "oxygenSaturation",
      "spo2": "oxygenSaturation",
      "weight": "weight",
      "peso": "weight",
      "height": "height",
      "altura": "height",
      "glycemia": "glycemia",
      "glicemia": "glycemia",
    };

    const mappedField = fieldMap[field.toLowerCase()] || field as keyof VitalSigns;
    const value = vitalSigns[mappedField];
    return typeof value === "number" ? value : null;
  }

  private evaluateCondition(value: number, operator: string, expected: number): boolean {
    switch (operator) {
      case ">":
      case "gt":
        return value > expected;
      case ">=":
      case "gte":
        return value >= expected;
      case "<":
      case "lt":
        return value < expected;
      case "<=":
      case "lte":
        return value <= expected;
      case "==":
      case "=":
      case "eq":
        return value === expected;
      case "!=":
      case "neq":
        return value !== expected;
      default:
        return false;
    }
  }

  private calculateAge(birthDate: Date): number {
    const now = new Date();
    let age = now.getFullYear() - birthDate.getFullYear();
    const monthDiff = now.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }
}

export const protocolAlertService = new ProtocolAlertDrizzleService();
