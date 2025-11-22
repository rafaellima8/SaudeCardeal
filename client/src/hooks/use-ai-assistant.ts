import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

// ============================================================================
// TIPOS
// ============================================================================

interface DiagnosisSuggestion {
  ciap2Code: string;
  ciap2Description: string;
  cid10Code: string;
  cid10Description: string;
  confidence: "high" | "medium" | "low";
  reasoning: string;
}

interface DrugInteraction {
  severity: "critical" | "major" | "moderate" | "minor";
  drug1: string;
  drug2: string;
  interaction: string;
  recommendation: string;
}

interface DosageAlert {
  type: "dosage_error" | "contraindication" | "warning" | "info";
  medication: string;
  message: string;
  suggestion?: string;
}

// ============================================================================
// HOOK: SUGESTÃO DE DIAGNÓSTICOS
// ============================================================================

export function useAIDiagnosis() {
  return useMutation({
    mutationFn: async (data: {
      subjective: string;
      objective?: string;
      vitalSigns?: {
        bloodPressure?: string;
        heartRate?: number;
        temperature?: number;
        respiratoryRate?: number;
        oxygenSaturation?: number;
        weight?: number;
        height?: number;
      };
    }) => {
      const response = await apiRequest("/api/ai/diagnose", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      }) as Promise<{
        success: boolean;
        suggestions: DiagnosisSuggestion[];
        disclaimer: string;
      }>;
      return response;
    },
  });
}

// ============================================================================
// HOOK: VERIFICAÇÃO DE INTERAÇÕES MEDICAMENTOSAS
// ============================================================================

export function useAIDrugInteractions() {
  return useMutation({
    mutationFn: async (data: {
      medications: Array<{ medication: string; dosage: string; frequency: string }>;
    }) => {
      const response = await apiRequest("/api/ai/check-interactions", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      }) as Promise<{
        success: boolean;
        interactions: DrugInteraction[];
        disclaimer: string;
      }>;
      return response;
    },
  });
}

// ============================================================================
// HOOK: VALIDAÇÃO DE PRESCRIÇÃO
// ============================================================================

export function useAIValidatePrescription() {
  return useMutation({
    mutationFn: async (data: {
      medication: string;
      dosage: string;
      frequency: string;
      patientAge?: number;
      patientWeight?: number;
      comorbidities?: string[];
    }) => {
      const response = await apiRequest("/api/ai/validate-prescription", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      }) as Promise<{
        success: boolean;
        alerts: DosageAlert[];
        disclaimer: string;
      }>;
      return response;
    },
  });
}

// ============================================================================
// HOOK: GERAÇÃO DE PLANO DE CUIDADOS
// ============================================================================

export function useAIGeneratePlan() {
  return useMutation({
    mutationFn: async (data: {
      subjective: string;
      objective: string;
      assessment: string;
    }) => {
      const response = await apiRequest("/api/ai/generate-plan", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      }) as Promise<{
        success: boolean;
        plan: string;
        disclaimer: string;
      }>;
      return response;
    },
  });
}

// ============================================================================
// TIPOS EXPORTADOS
// ============================================================================

export type { DiagnosisSuggestion, DrugInteraction, DosageAlert };
