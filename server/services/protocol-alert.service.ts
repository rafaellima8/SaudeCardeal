import type { Database } from "better-sqlite3";
import type { consultations } from "@/shared/schema";

/**
 * Protocol Alert Service
 * Automatically detects and triggers clinical protocol alerts based on consultation data
 */
export class ProtocolAlertService {
  constructor(private db: Database) {}

  /**
   * Evaluate consultation against all active protocols and trigger alerts
   */
  async evaluateConsultation(consultationId: string): Promise<Array<{
    protocolId: string;
    alertLevel: string;
    message: string;
    triggeredData: any;
  }>> {
    const consultation = this.db
      .prepare(`
        SELECT c.*, cit.birth_date, cit.gender 
        FROM consultations c
        INNER JOIN citizens cit ON c.citizen_id = cit.id
        WHERE c.id = ?
      `)
      .get(consultationId) as any;

    if (!consultation) {
      throw new Error(`Consultation ${consultationId} not found`);
    }

    const protocols = this.db
      .prepare(`
        SELECT * FROM clinical_protocols 
        WHERE unit_id = ? AND active = 1
        ORDER BY alert_level DESC
      `)
      .all(consultation.unit_id) as any[];

    const triggeredAlerts: any[] = [];

    for (const protocol of protocols) {
      const conditions = protocol.trigger_conditions ? JSON.parse(protocol.trigger_conditions) : {};
      const vitalSigns = consultation.vital_signs ? JSON.parse(consultation.vital_signs) : {};
      let triggered = false;
      const triggeredData: any = {};

      // Check Vital Signs conditions
      if (conditions.vitalSigns) {
        for (const condition of conditions.vitalSigns) {
          const value = vitalSigns[condition.field];
          if (value && this.evaluateCondition(value, condition.operator, condition.value)) {
            triggered = true;
            triggeredData.vitalSigns = triggeredData.vitalSigns || [];
            triggeredData.vitalSigns.push({ field: condition.field, value, expected: condition.value });
          }
        }
      }

      // Check Age conditions
      if (conditions.age) {
        const age = this.calculateAge(consultation.birth_date);
        if ((conditions.age.min && age < conditions.age.min) || (conditions.age.max && age > conditions.age.max)) {
          triggered = true;
          triggeredData.age = age;
        }
      }

      // Check Gender
      if (conditions.gender && consultation.gender !== conditions.gender) {
        continue; // Skip protocol if gender doesn't match
      }

      // Check Diagnoses (CIAP-2/CID-10)
      if (conditions.diagnoses) {
        const diagnosisCodes = [
          ...(consultation.ciap2_codes ? JSON.parse(consultation.ciap2_codes) : []),
          ...(consultation.cid10_codes ? JSON.parse(consultation.cid10_codes) : []),
        ];
        const matchedDiagnoses = diagnosisCodes.filter((code: string) => conditions.diagnoses.includes(code));
        if (matchedDiagnoses.length > 0) {
          triggered = true;
          triggeredData.diagnoses = matchedDiagnoses;
        }
      }

      if (triggered) {
        // Insert alert into database
        const alertId = this.generateId();
        this.db
          .prepare(`
            INSERT INTO protocol_alerts (id, consultation_id, protocol_id, alert_level, message, triggered_data, unit_id)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `)
          .run(
            alertId,
            consultationId,
            protocol.id,
            protocol.alert_level,
            protocol.alert_message,
            JSON.stringify(triggeredData),
            consultation.unit_id
          );

        triggeredAlerts.push({
          protocolId: protocol.id,
          alertLevel: protocol.alert_level,
          message: protocol.alert_message,
          triggeredData,
        });
      }
    }

    return triggeredAlerts;
  }

  private evaluateCondition(value: number, operator: string, expected: number): boolean {
    switch (operator) {
      case ">":
        return value > expected;
      case ">=":
        return value >= expected;
      case "<":
        return value < expected;
      case "<=":
        return value <= expected;
      case "==":
        return value === expected;
      default:
        return false;
    }
  }

  private calculateAge(birthDate: number): number {
    const now = Date.now();
    const diff = now - birthDate * 1000; // birthDate is unix timestamp
    return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}
