import { z } from "zod";

// ============================================================================
// REQUEST VALIDATION SCHEMAS
// ============================================================================

// Vital signs schema for diagnosis requests
export const vitalSignsSchema = z.object({
  bloodPressure: z.string().optional(),
  heartRate: z.number().positive().optional(),
  temperature: z.number().positive().optional(),
  respiratoryRate: z.number().positive().optional(),
  oxygenSaturation: z.number().min(0).max(100).optional(),
  weight: z.number().positive().optional(),
  height: z.number().positive().optional(),
});

export const diagnosisRequestSchema = z.object({
  subjective: z.string()
    .min(10, "Descrição subjetiva deve ter no mínimo 10 caracteres")
    .max(2000, "Descrição subjetiva deve ter no máximo 2000 caracteres"),
  objective: z.string()
    .max(2000, "Descrição objetiva deve ter no máximo 2000 caracteres")
    .optional(),
  vitalSigns: vitalSignsSchema.optional(),
});

export const medicationSchema = z.object({
  medication: z.string().min(1, "Nome do medicamento é obrigatório").max(200, "Nome do medicamento muito longo"),
  dosage: z.string().min(1, "Dosagem é obrigatória").max(100, "Dosagem muito longa"),
  frequency: z.string().min(1, "Frequência é obrigatória").max(100, "Frequência muito longa"),
});

export const drugInteractionRequestSchema = z.object({
  medications: z.array(medicationSchema)
    .min(2, "Mínimo de 2 medicamentos para verificar interações")
    .max(15, "Máximo de 15 medicamentos por consulta"),
});

export const prescriptionValidationRequestSchema = z.object({
  medication: z.string().min(1, "Nome do medicamento é obrigatório").max(200, "Nome do medicamento muito longo"),
  dosage: z.string().min(1, "Dosagem é obrigatória").max(100, "Dosagem muito longa"),
  frequency: z.string().min(1, "Frequência é obrigatória").max(100, "Frequência muito longa"),
  patientAge: z.number().min(0).max(150).optional(),
  patientWeight: z.number().positive().max(500).optional(),
  comorbidities: z.array(z.string().max(200, "Nome de comorbidade muito longo"))
    .max(20, "Máximo de 20 comorbidades")
    .optional(),
});

export const carePlanRequestSchema = z.object({
  subjective: z.string()
    .min(10, "Subjetivo deve ter no mínimo 10 caracteres")
    .max(2000, "Subjetivo deve ter no máximo 2000 caracteres"),
  objective: z.string()
    .min(10, "Objetivo deve ter no mínimo 10 caracteres")
    .max(2000, "Objetivo deve ter no máximo 2000 caracteres"),
  assessment: z.string()
    .min(10, "Avaliação deve ter no mínimo 10 caracteres")
    .max(2000, "Avaliação deve ter no máximo 2000 caracteres"),
});

// ============================================================================
// RESPONSE VALIDATION SCHEMAS
// ============================================================================

export const diagnosisSuggestionSchema = z.object({
  ciap2Code: z.string(),
  ciap2Description: z.string(),
  cid10Code: z.string(),
  cid10Description: z.string(),
  confidence: z.enum(["high", "medium", "low"]),
  reasoning: z.string(),
});

export const diagnosisResponseSchema = z.object({
  suggestions: z.array(diagnosisSuggestionSchema),
});

export const drugInteractionSchema = z.object({
  severity: z.enum(["critical", "major", "moderate", "minor"]),
  drug1: z.string(),
  drug2: z.string(),
  interaction: z.string(),
  recommendation: z.string(),
});

export const drugInteractionResponseSchema = z.object({
  interactions: z.array(drugInteractionSchema),
});

export const dosageAlertSchema = z.object({
  type: z.enum(["dosage_error", "contraindication", "warning", "info"]),
  medication: z.string(),
  message: z.string(),
  suggestion: z.string().optional(),
});

export const prescriptionValidationResponseSchema = z.object({
  alerts: z.array(dosageAlertSchema),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type VitalSigns = z.infer<typeof vitalSignsSchema>;
export type DiagnosisRequest = z.infer<typeof diagnosisRequestSchema>;
export type MedicationInput = z.infer<typeof medicationSchema>;
export type DrugInteractionRequest = z.infer<typeof drugInteractionRequestSchema>;
export type PrescriptionValidationRequest = z.infer<typeof prescriptionValidationRequestSchema>;
export type CarePlanRequest = z.infer<typeof carePlanRequestSchema>;

export type DiagnosisSuggestion = z.infer<typeof diagnosisSuggestionSchema>;
export type DiagnosisResponse = z.infer<typeof diagnosisResponseSchema>;
export type DrugInteraction = z.infer<typeof drugInteractionSchema>;
export type DrugInteractionResponse = z.infer<typeof drugInteractionResponseSchema>;
export type DosageAlert = z.infer<typeof dosageAlertSchema>;
export type PrescriptionValidationResponse = z.infer<typeof prescriptionValidationResponseSchema>;
