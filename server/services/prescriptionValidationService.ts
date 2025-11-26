import { db } from "../db";
import { renameCatalog, citizenAllergies, prescriptions, citizens } from "@shared/schema";
import { eq, and, like, or, sql } from "drizzle-orm";
import * as medicalAI from "./medical-ai";

interface PrescriptionValidationRequest {
  medicationName: string;
  dosage: string;
  frequency: string;
  citizenId: string;
  citizenAge?: number;
  citizenWeight?: number;
  existingMedications?: string[];
}

interface ValidationResult {
  isValid: boolean;
  warnings: ValidationWarning[];
  errors: ValidationError[];
  renameMatch?: any;
  calculatedPediatricDose?: string;
  allergyAlerts: AllergyAlert[];
  interactionAlerts: InteractionAlert[];
  controlledInfo?: ControlledMedicationInfo;
}

interface ValidationWarning {
  type: "dosage" | "interaction" | "age" | "weight" | "duration";
  message: string;
  suggestion?: string;
}

interface ValidationError {
  type: "allergy" | "contraindication" | "controlled" | "critical";
  message: string;
  severity: "high" | "critical";
}

interface AllergyAlert {
  allergen: string;
  severity: string;
  reaction?: string;
  matchedMedication: string;
}

interface InteractionAlert {
  drug1: string;
  drug2: string;
  severity: "critical" | "major" | "moderate" | "minor";
  description: string;
  recommendation: string;
}

interface ControlledMedicationInfo {
  controlType: string;
  maxPrescriptionDays: number;
  requiresSpecialForm: boolean;
  warning: string;
}

export async function searchRENAMECatalog(query: string, limit = 20) {
  const searchTerm = `%${query.toLowerCase()}%`;
  
  const results = await db
    .select()
    .from(renameCatalog)
    .where(
      and(
        eq(renameCatalog.active, true),
        or(
          like(sql`lower(${renameCatalog.commercialName})`, searchTerm),
          like(sql`lower(${renameCatalog.activeIngredient})`, searchTerm),
          like(sql`lower(${renameCatalog.therapeuticClass})`, searchTerm)
        )
      )
    )
    .limit(limit);
  
  return results;
}

export async function getCitizenAllergies(citizenId: string) {
  return db
    .select()
    .from(citizenAllergies)
    .where(
      and(
        eq(citizenAllergies.citizenId, citizenId),
        eq(citizenAllergies.active, true)
      )
    );
}

export async function checkAllergyConflict(
  medicationName: string, 
  activeIngredient: string,
  citizenId: string
): Promise<AllergyAlert[]> {
  const allergies = await getCitizenAllergies(citizenId);
  const alerts: AllergyAlert[] = [];
  
  for (const allergy of allergies) {
    if (allergy.allergyType !== "medication") continue;
    
    const allergen = allergy.allergen.toLowerCase();
    const medName = medicationName.toLowerCase();
    const ingredient = activeIngredient?.toLowerCase() || "";
    
    if (medName.includes(allergen) || ingredient.includes(allergen) || 
        allergen.includes(medName) || allergen.includes(ingredient)) {
      alerts.push({
        allergen: allergy.allergen,
        severity: allergy.severity,
        reaction: allergy.reaction || undefined,
        matchedMedication: medicationName,
      });
    }
  }
  
  return alerts;
}

export function calculatePediatricDose(
  weight: number,
  dosePerKg: string,
  maxDose?: number
): { calculatedDose: string; warning?: string } {
  const doseMatch = dosePerKg.match(/(\d+(?:\.\d+)?)-?(\d+(?:\.\d+)?)?mg\/kg/);
  
  if (!doseMatch) {
    return { calculatedDose: "Cálculo automático não disponível" };
  }
  
  const minDose = parseFloat(doseMatch[1]);
  const maxDosePerKg = doseMatch[2] ? parseFloat(doseMatch[2]) : minDose;
  
  const calculatedMin = Math.round(minDose * weight);
  const calculatedMax = Math.round(maxDosePerKg * weight);
  
  let warning: string | undefined;
  let finalMax = calculatedMax;
  
  if (maxDose && calculatedMax > maxDose) {
    finalMax = maxDose;
    warning = `Dose máxima ajustada para ${maxDose}mg (limite adulto)`;
  }
  
  return {
    calculatedDose: calculatedMin === finalMax 
      ? `${calculatedMin}mg`
      : `${calculatedMin}-${finalMax}mg`,
    warning,
  };
}

export async function validatePrescription(
  request: PrescriptionValidationRequest
): Promise<ValidationResult> {
  const result: ValidationResult = {
    isValid: true,
    warnings: [],
    errors: [],
    allergyAlerts: [],
    interactionAlerts: [],
  };
  
  const renameMatches = await searchRENAMECatalog(request.medicationName, 1);
  const renameMatch = renameMatches[0];
  
  if (renameMatch) {
    result.renameMatch = renameMatch;
    
    const allergyAlerts = await checkAllergyConflict(
      renameMatch.commercialName,
      renameMatch.activeIngredient,
      request.citizenId
    );
    
    if (allergyAlerts.length > 0) {
      result.allergyAlerts = allergyAlerts;
      result.errors.push({
        type: "allergy",
        message: `⚠️ ALERGIA DETECTADA: Paciente alérgico a ${allergyAlerts[0].allergen} (${allergyAlerts[0].severity})`,
        severity: allergyAlerts[0].severity === "anaphylactic" || allergyAlerts[0].severity === "severe" 
          ? "critical" 
          : "high",
      });
      result.isValid = false;
    }
    
    if (renameMatch.isControlled) {
      result.controlledInfo = {
        controlType: renameMatch.controlType || "C1",
        maxPrescriptionDays: renameMatch.maxPrescriptionDays || 30,
        requiresSpecialForm: renameMatch.requiresSpecialForm || false,
        warning: `Medicamento controlado - Lista ${renameMatch.controlType} (Portaria 344/98 ANVISA)`,
      };
      
      result.warnings.push({
        type: "duration",
        message: result.controlledInfo.warning,
        suggestion: renameMatch.requiresSpecialForm 
          ? "Requer receituário especial (notificação de receita)" 
          : "Retenção de receita na farmácia",
      });
    }
    
    if (request.citizenWeight && renameMatch.pediatricDosePerKg && request.citizenAge && request.citizenAge < 18) {
      const { calculatedDose, warning } = calculatePediatricDose(
        request.citizenWeight,
        renameMatch.pediatricDosePerKg
      );
      result.calculatedPediatricDose = calculatedDose;
      
      if (warning) {
        result.warnings.push({
          type: "weight",
          message: warning,
        });
      }
    }
    
    if (renameMatch.contraindications) {
      result.warnings.push({
        type: "dosage",
        message: `Contraindicações: ${(renameMatch.contraindications as string[]).join(", ")}`,
      });
    }
    
    if (renameMatch.interactions && request.existingMedications?.length) {
      const knownInteractions = renameMatch.interactions as string[];
      const conflicts = request.existingMedications.filter(med => 
        knownInteractions.some(interaction => 
          med.toLowerCase().includes(interaction.toLowerCase())
        )
      );
      
      if (conflicts.length > 0) {
        result.warnings.push({
          type: "interaction",
          message: `Possíveis interações com: ${conflicts.join(", ")}`,
          suggestion: "Revisar necessidade de ajuste de dose ou monitoramento",
        });
      }
    }
  }
  
  if (request.existingMedications && request.existingMedications.length > 0) {
    const allMedications = [
      { medication: request.medicationName, dosage: request.dosage, frequency: request.frequency },
      ...request.existingMedications.map(m => ({ medication: m, dosage: "", frequency: "" }))
    ];
    
    if (allMedications.length >= 2) {
      const aiResult = await medicalAI.checkDrugInteractions(allMedications);
      
      if (aiResult.success && aiResult.data) {
        for (const interaction of aiResult.data) {
          result.interactionAlerts.push({
            drug1: interaction.drug1,
            drug2: interaction.drug2,
            severity: interaction.severity,
            description: interaction.interaction,
            recommendation: interaction.recommendation,
          });
          
          if (interaction.severity === "critical") {
            result.errors.push({
              type: "critical",
              message: `⚠️ INTERAÇÃO CRÍTICA: ${interaction.drug1} + ${interaction.drug2} - ${interaction.interaction}`,
              severity: "critical",
            });
            result.isValid = false;
          } else if (interaction.severity === "major") {
            result.warnings.push({
              type: "interaction",
              message: `Interação grave: ${interaction.drug1} + ${interaction.drug2}`,
              suggestion: interaction.recommendation,
            });
          }
        }
      }
    }
  }
  
  const dosageValidation = await medicalAI.validatePrescription(
    request.medicationName,
    request.dosage,
    request.frequency,
    request.citizenAge,
    request.citizenWeight
  );
  
  if (dosageValidation.success && dosageValidation.data) {
    for (const alert of dosageValidation.data) {
      if (alert.type === "dosage_error") {
        result.errors.push({
          type: "contraindication",
          message: alert.message,
          severity: "high",
        });
      } else if (alert.type === "contraindication") {
        result.errors.push({
          type: "contraindication",
          message: alert.message,
          severity: "high",
        });
        result.isValid = false;
      } else {
        result.warnings.push({
          type: "dosage",
          message: alert.message,
          suggestion: alert.suggestion,
        });
      }
    }
  }
  
  return result;
}

export async function generateQRCodeData(prescriptionId: string): Promise<string> {
  const [prescription] = await db
    .select()
    .from(prescriptions)
    .where(eq(prescriptions.id, prescriptionId))
    .limit(1);
  
  if (!prescription) {
    throw new Error("Prescrição não encontrada");
  }
  
  const qrData = {
    id: prescription.id,
    unitId: prescription.unitId,
    medication: prescription.medication,
    dosage: prescription.dosage,
    createdAt: prescription.createdAt,
    signature: prescription.signatureHash,
    validUntil: prescription.validUntil,
  };
  
  return Buffer.from(JSON.stringify(qrData)).toString("base64");
}

export async function validateQRCode(qrData: string): Promise<{
  valid: boolean;
  prescription?: any;
  error?: string;
}> {
  try {
    const decoded = JSON.parse(Buffer.from(qrData, "base64").toString("utf-8"));
    
    const [prescription] = await db
      .select()
      .from(prescriptions)
      .where(eq(prescriptions.id, decoded.id))
      .limit(1);
    
    if (!prescription) {
      return { valid: false, error: "Prescrição não encontrada no sistema" };
    }
    
    if (prescription.signatureHash !== decoded.signature) {
      return { valid: false, error: "Assinatura digital inválida" };
    }
    
    if (prescription.validUntil && new Date(prescription.validUntil) < new Date()) {
      return { valid: false, error: "Receita expirada", prescription };
    }
    
    if (prescription.status === "cancelled") {
      return { valid: false, error: "Receita cancelada", prescription };
    }
    
    if (prescription.status === "dispensed") {
      return { valid: false, error: "Receita já dispensada", prescription };
    }
    
    return { valid: true, prescription };
  } catch (error) {
    return { valid: false, error: "QR Code inválido ou corrompido" };
  }
}

export default {
  searchRENAMECatalog,
  getCitizenAllergies,
  checkAllergyConflict,
  calculatePediatricDose,
  validatePrescription,
  generateQRCodeData,
  validateQRCode,
};
