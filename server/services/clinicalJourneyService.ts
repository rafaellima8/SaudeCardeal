/**
 * Serviço de Jornada Clínica Integrada
 * Orquestra alertas, validações e integrações ao longo do atendimento
 * 
 * @module clinicalJourneyService
 */

import { db } from "../db";
import * as schema from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { evaluateAlerts, type ClinicalAlert } from "./protocolAlertService";
import { createClinicalAlert, notifyPharmacyNewPrescription } from "./notificationService";
import { signDocument } from "./digitalSignatureService";
import { examValidationService } from "./examValidationService";
import { logMedicalRecordAccess, type AuditContext } from "./auditService";

export type ProtocolAlert = ClinicalAlert;

export interface JourneyContext {
  consultationId: string;
  citizenId: string;
  citizenName: string;
  professionalId: string;
  professionalName: string;
  unitId: string;
  userId: string;
  userRole: string;
}

export interface JourneyStep {
  step: 'reception' | 'triage' | 'waiting' | 'consultation' | 'prescription' | 'referral' | 'checkout';
  timestamp: Date;
  alerts: ProtocolAlert[];
  warnings: string[];
  actions: Array<{ type: string; description: string; required: boolean }>;
}

/**
 * Inicia jornada de atendimento
 */
export async function startJourney(context: JourneyContext): Promise<JourneyStep> {
  const alerts: ProtocolAlert[] = [];
  const warnings: string[] = [];
  const actions: Array<{ type: string; description: string; required: boolean }> = [];
  
  // Registrar acesso ao prontuário
  const auditContext: AuditContext = {
    userId: context.userId,
    unitId: context.unitId,
    professionalId: context.professionalId,
  };
  
  await logMedicalRecordAccess({
    citizenId: context.citizenId,
    action: 'view',
    entityType: 'full_record',
    accessReason: 'Início de atendimento',
    context: auditContext,
  });
  
  // Buscar dados do cidadão
  const citizen = await db
    .select()
    .from(schema.citizens)
    .where(eq(schema.citizens.id, context.citizenId))
    .limit(1);
  
  if (citizen.length === 0) {
    warnings.push('Cidadão não encontrado no cadastro');
    return { step: 'reception', timestamp: new Date(), alerts, warnings, actions };
  }
  
  const citizenData = citizen[0];
  
  // Verificar cadastro completo
  if (!citizenData.cpf && !citizenData.cns) {
    warnings.push('Cidadão sem CPF ou CNS cadastrado');
    actions.push({
      type: 'update_registration',
      description: 'Atualizar cadastro com CPF ou CNS',
      required: false,
    });
  }
  
  // Verificar alergias registradas
  if (!citizenData.allergies || (citizenData.allergies as string[]).length === 0) {
    actions.push({
      type: 'confirm_allergies',
      description: 'Confirmar/registrar alergias',
      required: true,
    });
  }
  
  // Verificar condições crônicas
  const hasChronicConditions = citizenData.chronicConditions && (citizenData.chronicConditions as string[]).length > 0;
  
  // Buscar última consulta
  const lastConsultation = await db
    .select()
    .from(schema.consultations)
    .where(eq(schema.consultations.citizenId, context.citizenId))
    .orderBy(schema.consultations.consultationDate)
    .limit(1);
  
  if (lastConsultation.length > 0) {
    const daysSinceLastVisit = Math.floor(
      (Date.now() - new Date(lastConsultation[0].consultationDate).getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (daysSinceLastVisit > 365 && hasChronicConditions) {
      warnings.push(`Última consulta há ${daysSinceLastVisit} dias - paciente com condição crônica`);
    }
  }
  
  return {
    step: 'reception',
    timestamp: new Date(),
    alerts,
    warnings,
    actions,
  };
}

/**
 * Processa etapa de triagem
 */
export async function processTriageStep(
  context: JourneyContext,
  triageData: {
    bloodPressureSystolic?: number;
    bloodPressureDiastolic?: number;
    heartRate?: number;
    temperature?: number;
    respiratoryRate?: number;
    oxygenSaturation?: number;
    bloodGlucose?: number;
    weight?: number;
    height?: number;
  }
): Promise<JourneyStep> {
  // Buscar dados do cidadão
  const citizen = await db
    .select()
    .from(schema.citizens)
    .where(eq(schema.citizens.id, context.citizenId))
    .limit(1);
  
  const citizenData = citizen[0];
  
  // Avaliar protocolos clínicos
  const alerts = evaluateAlerts({
    citizen: citizenData,
    vitalSigns: triageData,
    age: citizenData?.birthDate 
      ? Math.floor((Date.now() - new Date(citizenData.birthDate).getTime()) / (1000 * 60 * 60 * 24 * 365))
      : undefined,
  });
  
  const warnings: string[] = [];
  const actions: Array<{ type: string; description: string; required: boolean }> = [];
  
  // Criar notificações para alertas críticos
  for (const alert of alerts.filter(a => a.severity === 'critical')) {
    const mappedSeverity: 'low' | 'medium' | 'high' | 'critical' = 
      alert.severity === 'info' ? 'low' : 
      alert.severity === 'warning' ? 'medium' : alert.severity;
    
    await createClinicalAlert({
      userId: context.userId,
      unitId: context.unitId,
      citizenId: context.citizenId,
      citizenName: context.citizenName,
      consultationId: context.consultationId,
      alertType: alert.category,
      severity: mappedSeverity,
      message: alert.message,
      recommendation: alert.recommendation || '',
    });
  }
  
  // Validar sinais vitais
  if (triageData.oxygenSaturation && triageData.oxygenSaturation < 95) {
    warnings.push('Saturação de oxigênio abaixo do normal');
  }
  
  if (triageData.respiratoryRate && triageData.respiratoryRate > 24) {
    warnings.push('Frequência respiratória elevada');
  }
  
  return {
    step: 'triage',
    timestamp: new Date(),
    alerts,
    warnings,
    actions,
  };
}

/**
 * Processa etapa de consulta
 */
export async function processConsultationStep(
  context: JourneyContext,
  consultationData: {
    subjective?: string;
    objective?: string;
    assessment?: string;
    plan?: string;
    ciap2Codes?: string[];
    cid10Codes?: string[];
    vitalSigns?: Record<string, any>;
  }
): Promise<JourneyStep> {
  const citizen = await db
    .select()
    .from(schema.citizens)
    .where(eq(schema.citizens.id, context.citizenId))
    .limit(1);
  
  const citizenData = citizen[0];
  const citizenAge = citizenData?.birthDate 
    ? Math.floor((Date.now() - new Date(citizenData.birthDate).getTime()) / (1000 * 60 * 60 * 24 * 365))
    : 0;
  
  // Avaliar protocolos com dados da consulta
  const alerts = evaluateAlerts({
    citizen: citizenData,
    vitalSigns: consultationData.vitalSigns,
    diagnosis: {
      ciap2Codes: consultationData.ciap2Codes,
      cid10Codes: consultationData.cid10Codes,
    },
    age: citizenAge,
  });
  
  const warnings: string[] = [];
  const actions: Array<{ type: string; description: string; required: boolean }> = [];
  
  // Sugerir exames complementares
  const examSuggestions = examValidationService.suggestComplementaryExams({
    ciap2Codes: consultationData.ciap2Codes,
    cid10Codes: consultationData.cid10Codes,
    citizenAge,
    citizenSex: citizenData?.sex as 'M' | 'F' || 'M',
    chronicConditions: citizenData?.chronicConditions as string[] || [],
  });
  
  for (const suggestion of examSuggestions.filter(s => s.priority === 'high')) {
    actions.push({
      type: 'exam_suggestion',
      description: `${suggestion.exam}: ${suggestion.reason}`,
      required: false,
    });
  }
  
  // Verificar SOAP completo
  if (!consultationData.subjective || !consultationData.assessment || !consultationData.plan) {
    warnings.push('SOAP incompleto - preencha todos os campos obrigatórios');
  }
  
  // Verificar códigos diagnósticos
  if ((!consultationData.ciap2Codes || consultationData.ciap2Codes.length === 0) &&
      (!consultationData.cid10Codes || consultationData.cid10Codes.length === 0)) {
    warnings.push('Consulta sem código diagnóstico (CIAP-2 ou CID-10)');
  }
  
  return {
    step: 'consultation',
    timestamp: new Date(),
    alerts,
    warnings,
    actions,
  };
}

/**
 * Processa etapa de prescrição
 */
export async function processPrescriptionStep(
  context: JourneyContext,
  prescriptionData: {
    medication: string;
    dosage: string;
    frequency: string;
    duration: string;
    quantity: number;
  }
): Promise<JourneyStep> {
  const citizen = await db
    .select()
    .from(schema.citizens)
    .where(eq(schema.citizens.id, context.citizenId))
    .limit(1);
  
  const citizenData = citizen[0];
  const allergies = citizenData?.allergies as string[] || [];
  
  const alerts: ProtocolAlert[] = [];
  const warnings: string[] = [];
  const actions: Array<{ type: string; description: string; required: boolean }> = [];
  
  // Verificar alergias
  const medicationLower = prescriptionData.medication.toLowerCase();
  for (const allergy of allergies) {
    if (medicationLower.includes(allergy.toLowerCase())) {
      alerts.push({
        id: `allergy_${Date.now()}`,
        citizenId: context.citizenId,
        category: 'geral' as const,
        severity: 'critical' as const,
        title: 'ALERTA DE ALERGIA',
        message: `ALERTA: Paciente alérgico a "${allergy}"`,
        recommendation: 'Verificar alternativa terapêutica',
        triggeredAt: new Date(),
        acknowledged: false,
      });
    }
  }
  
  // Verificar gestante
  if (citizenData?.isPregnant) {
    warnings.push('Verificar categoria de risco na gestação');
    actions.push({
      type: 'pregnancy_check',
      description: 'Confirmar segurança do medicamento na gestação',
      required: true,
    });
  }
  
  // Verificar estoque
  const stock = await db
    .select()
    .from(schema.medicationStock)
    .where(eq(schema.medicationStock.unitId, context.unitId))
    .limit(100);
  
  // Buscar medicamento correspondente
  const medication = await db
    .select()
    .from(schema.medications)
    .where(eq(schema.medications.name, prescriptionData.medication))
    .limit(1);
  
  if (medication.length > 0) {
    const medStock = stock.find(s => s.medicationId === medication[0].id);
    if (medStock && medStock.quantity < prescriptionData.quantity) {
      warnings.push(`Estoque insuficiente: ${medStock.quantity} unidades disponíveis`);
    }
  }
  
  return {
    step: 'prescription',
    timestamp: new Date(),
    alerts,
    warnings,
    actions,
  };
}

/**
 * Finaliza jornada e assina documentos
 */
export async function finalizeJourney(
  context: JourneyContext,
  options: {
    signPrescriptions?: boolean;
    signCertificates?: boolean;
    signReferrals?: boolean;
  } = {}
): Promise<{
  success: boolean;
  signedDocuments: string[];
  errors: string[];
}> {
  const signedDocuments: string[] = [];
  const errors: string[] = [];
  
  // Buscar profissional
  const professional = await db
    .select()
    .from(schema.professionals)
    .where(eq(schema.professionals.id, context.professionalId))
    .limit(1);
  
  if (professional.length === 0) {
    return { success: false, signedDocuments, errors: ['Profissional não encontrado'] };
  }
  
  const prof = professional[0];
  
  // Assinar prescrições
  if (options.signPrescriptions) {
    const prescriptions = await db
      .select()
      .from(schema.prescriptions)
      .where(eq(schema.prescriptions.consultationId, context.consultationId));
    
    for (const prescription of prescriptions) {
      try {
        const content = JSON.stringify({
          id: prescription.id,
          medication: prescription.medication,
          dosage: prescription.dosage,
          quantity: prescription.quantity,
          citizenId: prescription.citizenId,
        });
        
        await signDocument({
          type: 'prescription',
          id: prescription.id,
          content,
          signerId: context.professionalId,
          signerName: prof.name,
          signerCRM: prof.councilNumber,
          unitId: context.unitId,
        });
        
        signedDocuments.push(`Prescrição: ${prescription.medication}`);
      } catch (error: any) {
        errors.push(`Erro ao assinar prescrição ${prescription.id}: ${error.message}`);
      }
    }
  }
  
  // Assinar encaminhamentos
  if (options.signReferrals) {
    const referrals = await db
      .select()
      .from(schema.medicalReferrals)
      .where(eq(schema.medicalReferrals.consultationId, context.consultationId));
    
    for (const referral of referrals) {
      try {
        const content = JSON.stringify({
          id: referral.id,
          specialty: referral.specialty,
          priority: referral.priority,
          citizenId: referral.citizenId,
        });
        
        await signDocument({
          type: 'referral',
          id: referral.id,
          content,
          signerId: context.professionalId,
          signerName: prof.name,
          signerCRM: prof.councilNumber,
          unitId: context.unitId,
        });
        
        signedDocuments.push(`Encaminhamento: ${referral.specialty}`);
      } catch (error: any) {
        errors.push(`Erro ao assinar encaminhamento ${referral.id}: ${error.message}`);
      }
    }
  }
  
  // Registrar finalização
  const auditCtx: AuditContext = {
    userId: context.userId,
    unitId: context.unitId,
    professionalId: context.professionalId,
  };
  
  await logMedicalRecordAccess({
    citizenId: context.citizenId,
    action: 'update',
    entityType: 'consultation',
    entityId: context.consultationId,
    accessReason: 'Finalização de atendimento',
    metadata: { signedDocuments },
    context: auditCtx,
  });
  
  return {
    success: errors.length === 0,
    signedDocuments,
    errors,
  };
}

export const clinicalJourneyService = {
  startJourney,
  processTriageStep,
  processConsultationStep,
  processPrescriptionStep,
  finalizeJourney,
};
