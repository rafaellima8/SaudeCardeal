/**
 * Serviço de Triagem de Enfermagem
 * Implementa Protocolo de Manchester e vinculação com fila de atendimento
 * Conforme e-SUS PEC v5.3
 */

import { db } from "../db";
import * as schema from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import type { InsertNursingTriage, NursingTriage } from "@shared/schema";

// Mapeamento de classificação de risco para cor (Protocolo de Manchester)
const RISK_TO_COLOR = {
  emergencia: 'vermelho',
  muito_urgente: 'laranja',
  urgente: 'amarelo',
  pouco_urgente: 'verde',
  nao_urgente: 'azul',
} as const;

// Mapeamento de cor para prioridade na fila
const COLOR_TO_PRIORITY = {
  vermelho: 'emergency',
  laranja: 'emergency',
  amarelo: 'urgent',
  verde: 'normal',
  azul: 'normal',
} as const;

// Tempo máximo de espera por cor (em minutos) - Protocolo de Manchester
export const MAX_WAIT_TIMES = {
  vermelho: 0,
  laranja: 10,
  amarelo: 60,
  verde: 120,
  azul: 240,
} as const;

/**
 * Calcula classificação de risco automática baseada nos sinais vitais
 */
export function calculateRiskClassification(data: {
  bloodPressureSystolic?: number | null;
  bloodPressureDiastolic?: number | null;
  heartRate?: number | null;
  respiratoryRate?: number | null;
  temperature?: number | null;
  oxygenSaturation?: number | null;
  bloodGlucose?: number | null;
  glasgowScore?: number | null;
  painScale?: number | null;
}): { classification: string; color: string; alerts: string[] } {
  const alerts: string[] = [];
  let maxSeverity = 0; // 0=não_urgente, 1=pouco_urgente, 2=urgente, 3=muito_urgente, 4=emergencia
  
  // Glasgow Score
  if (data.glasgowScore !== null && data.glasgowScore !== undefined) {
    if (data.glasgowScore <= 8) {
      maxSeverity = Math.max(maxSeverity, 4);
      alerts.push('Glasgow ≤ 8 - Coma/Alteração grave da consciência');
    } else if (data.glasgowScore <= 12) {
      maxSeverity = Math.max(maxSeverity, 3);
      alerts.push('Glasgow 9-12 - Alteração moderada da consciência');
    }
  }
  
  // Saturação de O2
  if (data.oxygenSaturation !== null && data.oxygenSaturation !== undefined) {
    if (data.oxygenSaturation < 90) {
      maxSeverity = Math.max(maxSeverity, 4);
      alerts.push('SpO2 < 90% - Hipóxia grave');
    } else if (data.oxygenSaturation < 94) {
      maxSeverity = Math.max(maxSeverity, 3);
      alerts.push('SpO2 90-93% - Hipóxia moderada');
    }
  }
  
  // Pressão Arterial
  if (data.bloodPressureSystolic !== null && data.bloodPressureSystolic !== undefined) {
    if (data.bloodPressureSystolic >= 180 || (data.bloodPressureDiastolic && data.bloodPressureDiastolic >= 120)) {
      maxSeverity = Math.max(maxSeverity, 3);
      alerts.push('Crise hipertensiva: PA ≥ 180/120 mmHg');
    } else if (data.bloodPressureSystolic >= 140 || (data.bloodPressureDiastolic && data.bloodPressureDiastolic >= 90)) {
      maxSeverity = Math.max(maxSeverity, 1);
      alerts.push('Hipertensão arterial: PA ≥ 140/90 mmHg');
    } else if (data.bloodPressureSystolic < 90) {
      maxSeverity = Math.max(maxSeverity, 4);
      alerts.push('Hipotensão: PAS < 90 mmHg');
    }
  }
  
  // Frequência Cardíaca
  if (data.heartRate !== null && data.heartRate !== undefined) {
    if (data.heartRate > 130 || data.heartRate < 40) {
      maxSeverity = Math.max(maxSeverity, 3);
      alerts.push(`Frequência cardíaca crítica: ${data.heartRate} bpm`);
    } else if (data.heartRate > 100 || data.heartRate < 50) {
      maxSeverity = Math.max(maxSeverity, 2);
      alerts.push(`Frequência cardíaca alterada: ${data.heartRate} bpm`);
    }
  }
  
  // Frequência Respiratória
  if (data.respiratoryRate !== null && data.respiratoryRate !== undefined) {
    if (data.respiratoryRate > 30 || data.respiratoryRate < 10) {
      maxSeverity = Math.max(maxSeverity, 3);
      alerts.push(`Frequência respiratória crítica: ${data.respiratoryRate} irpm`);
    } else if (data.respiratoryRate > 24 || data.respiratoryRate < 12) {
      maxSeverity = Math.max(maxSeverity, 2);
      alerts.push(`Frequência respiratória alterada: ${data.respiratoryRate} irpm`);
    }
  }
  
  // Temperatura
  if (data.temperature !== null && data.temperature !== undefined) {
    if (data.temperature >= 40 || data.temperature < 35) {
      maxSeverity = Math.max(maxSeverity, 3);
      alerts.push(`Temperatura crítica: ${data.temperature}°C`);
    } else if (data.temperature >= 38.5) {
      maxSeverity = Math.max(maxSeverity, 2);
      alerts.push(`Febre alta: ${data.temperature}°C`);
    } else if (data.temperature >= 37.8) {
      maxSeverity = Math.max(maxSeverity, 1);
      alerts.push(`Febre: ${data.temperature}°C`);
    }
  }
  
  // Glicemia
  if (data.bloodGlucose !== null && data.bloodGlucose !== undefined) {
    if (data.bloodGlucose < 50 || data.bloodGlucose > 400) {
      maxSeverity = Math.max(maxSeverity, 4);
      alerts.push(`Glicemia crítica: ${data.bloodGlucose} mg/dL`);
    } else if (data.bloodGlucose < 70 || data.bloodGlucose > 250) {
      maxSeverity = Math.max(maxSeverity, 2);
      alerts.push(`Glicemia alterada: ${data.bloodGlucose} mg/dL`);
    }
  }
  
  // Escala de Dor
  if (data.painScale !== null && data.painScale !== undefined) {
    if (data.painScale >= 8) {
      maxSeverity = Math.max(maxSeverity, 2);
      alerts.push(`Dor intensa: ${data.painScale}/10`);
    } else if (data.painScale >= 5) {
      maxSeverity = Math.max(maxSeverity, 1);
      alerts.push(`Dor moderada: ${data.painScale}/10`);
    }
  }
  
  const classifications = ['nao_urgente', 'pouco_urgente', 'urgente', 'muito_urgente', 'emergencia'];
  const colors = ['azul', 'verde', 'amarelo', 'laranja', 'vermelho'];
  
  return {
    classification: classifications[maxSeverity],
    color: colors[maxSeverity],
    alerts,
  };
}

/**
 * Calcula IMC
 */
export function calculateBMI(weight: number | null | undefined, height: number | null | undefined): number | null {
  if (!weight || !height || height <= 0) return null;
  const heightInMeters = height > 3 ? height / 100 : height; // Converte cm para m se necessário
  return Math.round((weight / (heightInMeters * heightInMeters)) * 10) / 10;
}

/**
 * Cria registro de triagem de enfermagem
 */
export async function createTriage(data: InsertNursingTriage): Promise<NursingTriage> {
  // Calcular IMC se não fornecido
  let bmi = data.bmi;
  if (!bmi && data.weight && data.height) {
    bmi = calculateBMI(data.weight, data.height);
  }
  
  // Calcular classificação de risco se não fornecida
  let riskClassification = data.riskClassification;
  let riskColor = data.riskColor;
  
  if (!riskClassification || !riskColor) {
    const calculated = calculateRiskClassification({
      bloodPressureSystolic: data.bloodPressureSystolic,
      bloodPressureDiastolic: data.bloodPressureDiastolic,
      heartRate: data.heartRate,
      respiratoryRate: data.respiratoryRate,
      temperature: data.temperature,
      oxygenSaturation: data.oxygenSaturation,
      bloodGlucose: data.bloodGlucose,
      glasgowScore: data.glasgowScore,
      painScale: data.painScale,
    });
    riskClassification = calculated.classification as any;
    riskColor = calculated.color as any;
  }
  
  const [triage] = await db
    .insert(schema.nursingTriage)
    .values({
      ...data,
      bmi,
      riskClassification,
      riskColor,
      status: 'completed',
    })
    .returning();
  
  // Atualizar prioridade na fila de atendimento
  const queuePriority = COLOR_TO_PRIORITY[riskColor as keyof typeof COLOR_TO_PRIORITY];
  await db
    .update(schema.attendanceQueue)
    .set({
      priority: queuePriority as any,
      clinicalRisk: riskClassification === 'emergencia' || riskClassification === 'muito_urgente' 
        ? 'alto' 
        : riskClassification === 'urgente' 
          ? 'medio' 
          : 'baixo',
    })
    .where(eq(schema.attendanceQueue.id, data.queueEntryId));
  
  return triage;
}

/**
 * Busca triagem por ID
 */
export async function getTriageById(id: string): Promise<NursingTriage | null> {
  const [triage] = await db
    .select()
    .from(schema.nursingTriage)
    .where(eq(schema.nursingTriage.id, id))
    .limit(1);
  
  return triage || null;
}

/**
 * Busca triagem por entrada na fila
 */
export async function getTriageByQueueEntry(queueEntryId: string): Promise<NursingTriage | null> {
  const [triage] = await db
    .select()
    .from(schema.nursingTriage)
    .where(eq(schema.nursingTriage.queueEntryId, queueEntryId))
    .orderBy(desc(schema.nursingTriage.createdAt))
    .limit(1);
  
  return triage || null;
}

/**
 * Busca última triagem do cidadão
 */
export async function getLastTriageByCitizen(citizenId: string): Promise<NursingTriage | null> {
  const [triage] = await db
    .select()
    .from(schema.nursingTriage)
    .where(eq(schema.nursingTriage.citizenId, citizenId))
    .orderBy(desc(schema.nursingTriage.createdAt))
    .limit(1);
  
  return triage || null;
}

/**
 * Verifica se triagem é obrigatória para consulta médica
 */
export async function isTriageRequired(queueEntryId: string): Promise<{ required: boolean; triage: NursingTriage | null }> {
  const triage = await getTriageByQueueEntry(queueEntryId);
  
  if (triage && triage.status === 'completed') {
    return { required: false, triage };
  }
  
  return { required: true, triage: null };
}

export const triageService = {
  calculateRiskClassification,
  calculateBMI,
  createTriage,
  getTriageById,
  getTriageByQueueEntry,
  getLastTriageByCitizen,
  isTriageRequired,
  MAX_WAIT_TIMES,
};
