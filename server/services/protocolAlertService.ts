/**
 * Serviço de Alertas de Protocolos Clínicos
 * Implementa regras automáticas de monitoramento conforme protocolos do MS
 */

import { db } from "../db";
import * as schema from "@shared/schema";
import { eq, and, gte, lte, sql, desc } from "drizzle-orm";

export type AlertSeverity = 'info' | 'warning' | 'critical';
export type AlertCategory = 'hipertensao' | 'diabetes' | 'gestacao' | 'pediatria' | 'idoso' | 'geral';

export interface ClinicalAlert {
  id: string;
  citizenId: string;
  category: AlertCategory;
  severity: AlertSeverity;
  title: string;
  message: string;
  recommendation: string;
  protocolReference?: string;
  triggeredAt: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
}

export interface AlertRule {
  id: string;
  name: string;
  category: AlertCategory;
  condition: (data: AlertEvaluationContext) => boolean;
  severity: AlertSeverity;
  title: string;
  message: (data: AlertEvaluationContext) => string;
  recommendation: string;
  protocolReference?: string;
}

export interface AlertEvaluationContext {
  citizen: any;
  consultation?: any;
  triage?: any;
  vitalSigns?: {
    bloodPressure?: string;
    bloodPressureSystolic?: number;
    bloodPressureDiastolic?: number;
    heartRate?: number;
    temperature?: number;
    respiratoryRate?: number;
    oxygenSaturation?: number;
    weight?: number;
    height?: number;
    bloodGlucose?: number;
  };
  diagnosis?: {
    ciap2Codes?: string[];
    cid10Codes?: string[];
  };
  age?: number;
  prescriptions?: any[];
}

/**
 * Calcula idade a partir da data de nascimento
 */
function calculateAge(birthDate: Date): number {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

/**
 * Extrai PA sistólica e diastólica da string
 */
function parseBloodPressure(bp: string | undefined): { systolic: number; diastolic: number } | null {
  if (!bp) return null;
  const match = bp.match(/(\d+)\s*[\/x]\s*(\d+)/);
  if (match) {
    return { systolic: parseInt(match[1]), diastolic: parseInt(match[2]) };
  }
  return null;
}

/**
 * Regras de alertas clínicos configuradas
 */
const ALERT_RULES: AlertRule[] = [
  // ============ HIPERTENSÃO ============
  {
    id: 'has_pa_140_90',
    name: 'Hipertensão Arterial - PA >= 140/90',
    category: 'hipertensao',
    condition: (ctx) => {
      const vs = ctx.vitalSigns;
      if (!vs) return false;
      let sys = vs.bloodPressureSystolic;
      let dia = vs.bloodPressureDiastolic;
      if (!sys && vs.bloodPressure) {
        const parsed = parseBloodPressure(vs.bloodPressure);
        if (parsed) {
          sys = parsed.systolic;
          dia = parsed.diastolic;
        }
      }
      return Boolean((sys && sys >= 140) || (dia && dia >= 90));
    },
    severity: 'warning',
    title: 'Hipertensão Arterial Detectada',
    message: (ctx) => {
      const vs = ctx.vitalSigns;
      const bp = vs?.bloodPressure || `${vs?.bloodPressureSystolic}/${vs?.bloodPressureDiastolic}`;
      return `Pressão arterial ${bp} mmHg - Acima do limite recomendado (140/90).`;
    },
    recommendation: 'Avaliar necessidade de ajuste terapêutico. Orientar sobre MEV (Mudança de Estilo de Vida): redução de sal, atividade física, controle de peso.',
    protocolReference: 'Cadernos de Atenção Básica nº 37 - Hipertensão Arterial',
  },
  {
    id: 'has_crise_hipertensiva',
    name: 'Crise Hipertensiva - PA >= 180/120',
    category: 'hipertensao',
    condition: (ctx) => {
      const vs = ctx.vitalSigns;
      if (!vs) return false;
      let sys = vs.bloodPressureSystolic;
      let dia = vs.bloodPressureDiastolic;
      if (!sys && vs.bloodPressure) {
        const parsed = parseBloodPressure(vs.bloodPressure);
        if (parsed) {
          sys = parsed.systolic;
          dia = parsed.diastolic;
        }
      }
      return Boolean((sys && sys >= 180) || (dia && dia >= 120));
    },
    severity: 'critical',
    title: 'CRISE HIPERTENSIVA',
    message: (ctx) => {
      const vs = ctx.vitalSigns;
      const bp = vs?.bloodPressure || `${vs?.bloodPressureSystolic}/${vs?.bloodPressureDiastolic}`;
      return `Pressão arterial ${bp} mmHg - CRISE HIPERTENSIVA. Avaliar sinais de lesão de órgão-alvo.`;
    },
    recommendation: 'URGÊNCIA: Avaliar sintomas de emergência hipertensiva (cefaleia intensa, alteração visual, dor torácica). Se lesão de órgão-alvo: encaminhar emergência.',
    protocolReference: 'Protocolo de Crise Hipertensiva MS',
  },
  
  // ============ DIABETES ============
  {
    id: 'dm_glicemia_alta',
    name: 'Hiperglicemia',
    category: 'diabetes',
    condition: (ctx) => {
      const glicose = ctx.vitalSigns?.bloodGlucose;
      return glicose !== undefined && glicose > 200;
    },
    severity: 'warning',
    title: 'Hiperglicemia Detectada',
    message: (ctx) => `Glicemia capilar ${ctx.vitalSigns?.bloodGlucose} mg/dL - Valor elevado.`,
    recommendation: 'Avaliar adesão ao tratamento, orientar sobre dieta, verificar medicação. Considerar ajuste terapêutico.',
    protocolReference: 'Cadernos de Atenção Básica nº 36 - Diabetes Mellitus',
  },
  {
    id: 'dm_glicemia_critica',
    name: 'Hiperglicemia Crítica',
    category: 'diabetes',
    condition: (ctx) => {
      const glicose = ctx.vitalSigns?.bloodGlucose;
      return glicose !== undefined && glicose > 400;
    },
    severity: 'critical',
    title: 'HIPERGLICEMIA CRÍTICA',
    message: (ctx) => `Glicemia capilar ${ctx.vitalSigns?.bloodGlucose} mg/dL - VALOR CRÍTICO. Risco de cetoacidose.`,
    recommendation: 'URGÊNCIA: Avaliar sinais de cetoacidose (náuseas, vômitos, dor abdominal, hálito cetônico). Considerar encaminhamento emergência.',
    protocolReference: 'Protocolo de Cetoacidose Diabética',
  },
  {
    id: 'dm_hipoglicemia',
    name: 'Hipoglicemia',
    category: 'diabetes',
    condition: (ctx) => {
      const glicose = ctx.vitalSigns?.bloodGlucose;
      return glicose !== undefined && glicose < 70;
    },
    severity: 'critical',
    title: 'HIPOGLICEMIA',
    message: (ctx) => `Glicemia capilar ${ctx.vitalSigns?.bloodGlucose} mg/dL - HIPOGLICEMIA.`,
    recommendation: 'EMERGÊNCIA: Administrar carboidrato simples (15g glicose). Reavaliar em 15 minutos. Se inconsciente: glicose IV ou glucagon.',
    protocolReference: 'Protocolo de Hipoglicemia MS',
  },
  {
    id: 'dm_idoso_risco',
    name: 'Diabetes em Idoso - Risco Aumentado',
    category: 'idoso',
    condition: (ctx) => {
      if (!ctx.age || ctx.age < 60) return false;
      const codes = [...(ctx.diagnosis?.ciap2Codes || []), ...(ctx.diagnosis?.cid10Codes || [])];
      const hasDiabetes = codes.some(c => 
        c.startsWith('T89') || c.startsWith('T90') || // CIAP-2 Diabetes
        c.startsWith('E10') || c.startsWith('E11') || c.startsWith('E12') || // CID-10 Diabetes
        c.startsWith('E13') || c.startsWith('E14')
      );
      return hasDiabetes;
    },
    severity: 'warning',
    title: 'Diabetes em Idoso - Atenção Especial',
    message: (ctx) => `Paciente idoso (${ctx.age} anos) com diabetes. Risco aumentado de hipoglicemia e complicações.`,
    recommendation: 'Evitar hipoglicemia. Metas glicêmicas mais flexíveis (HbA1c < 8%). Avaliar função renal para ajuste de medicação.',
    protocolReference: 'Cadernos de Atenção Básica - Envelhecimento e Saúde da Pessoa Idosa',
  },
  
  // ============ GESTAÇÃO ============
  {
    id: 'gestante_sem_prenatal',
    name: 'Gestante sem Pré-Natal',
    category: 'gestacao',
    condition: (ctx) => {
      const codes = [...(ctx.diagnosis?.ciap2Codes || []), ...(ctx.diagnosis?.cid10Codes || [])];
      const isPregnant = codes.some(c =>
        c.startsWith('W') || // CIAP-2 Gravidez
        c.startsWith('O') || c.startsWith('Z32') || c.startsWith('Z33') || c.startsWith('Z34') // CID-10 Gravidez
      );
      // TODO: Verificar se tem consultas de pré-natal recentes
      return isPregnant && ctx.citizen?.gender === 'F';
    },
    severity: 'critical',
    title: 'Gestante - Verificar Pré-Natal',
    message: () => 'Gestante identificada. Verificar se está em acompanhamento de pré-natal.',
    recommendation: 'OBRIGATÓRIO: Verificar cartão de pré-natal. Se não iniciado, agendar primeira consulta imediatamente. Solicitar exames do 1º trimestre.',
    protocolReference: 'Rede Cegonha - Caderno de Atenção ao Pré-Natal de Baixo Risco',
  },
  {
    id: 'gestante_pa_alta',
    name: 'Gestante com PA Elevada',
    category: 'gestacao',
    condition: (ctx) => {
      const codes = [...(ctx.diagnosis?.ciap2Codes || []), ...(ctx.diagnosis?.cid10Codes || [])];
      const isPregnant = codes.some(c => c.startsWith('W') || c.startsWith('O') || c.startsWith('Z34'));
      if (!isPregnant) return false;
      
      const vs = ctx.vitalSigns;
      if (!vs) return false;
      let sys = vs.bloodPressureSystolic;
      let dia = vs.bloodPressureDiastolic;
      if (!sys && vs.bloodPressure) {
        const parsed = parseBloodPressure(vs.bloodPressure);
        if (parsed) {
          sys = parsed.systolic;
          dia = parsed.diastolic;
        }
      }
      return Boolean((sys && sys >= 140) || (dia && dia >= 90));
    },
    severity: 'critical',
    title: 'GESTANTE COM HIPERTENSÃO',
    message: (ctx) => {
      const vs = ctx.vitalSigns;
      const bp = vs?.bloodPressure || `${vs?.bloodPressureSystolic}/${vs?.bloodPressureDiastolic}`;
      return `Gestante com PA ${bp} mmHg - Risco de pré-eclâmpsia.`;
    },
    recommendation: 'URGÊNCIA: Avaliar sinais de pré-eclâmpsia (cefaleia, edema, alteração visual). Solicitar proteinúria. Considerar encaminhamento alto risco.',
    protocolReference: 'Protocolo de Síndromes Hipertensivas na Gestação',
  },
  
  // ============ PEDIATRIA ============
  {
    id: 'pediatria_febre_alta',
    name: 'Criança com Febre Alta',
    category: 'pediatria',
    condition: (ctx) => {
      if (!ctx.age || ctx.age >= 12) return false;
      const temp = ctx.vitalSigns?.temperature;
      return temp !== undefined && temp >= 39;
    },
    severity: 'warning',
    title: 'Criança com Febre Alta',
    message: (ctx) => `Criança (${ctx.age} anos) com temperatura ${ctx.vitalSigns?.temperature}°C.`,
    recommendation: 'Investigar foco infeccioso. Avaliar sinais de alerta (prostração, manchas na pele, rigidez nucal). Orientar medidas antitérmicas.',
    protocolReference: 'AIDPI - Atenção Integrada às Doenças Prevalentes na Infância',
  },
  
  // ============ IDOSO ============
  {
    id: 'idoso_polifarmacia',
    name: 'Idoso com Polifarmácia',
    category: 'idoso',
    condition: (ctx) => {
      if (!ctx.age || ctx.age < 60) return false;
      return Boolean(ctx.prescriptions && ctx.prescriptions.length >= 5);
    },
    severity: 'warning',
    title: 'Polifarmácia em Idoso',
    message: (ctx) => `Idoso (${ctx.age} anos) utilizando ${ctx.prescriptions?.length} medicamentos.`,
    recommendation: 'Revisar todas as medicações. Avaliar interações medicamentosas. Desprescrever quando possível.',
    protocolReference: 'Cadernos de Atenção Básica - Envelhecimento e Saúde da Pessoa Idosa',
  },
  {
    id: 'idoso_queda_risco',
    name: 'Idoso com Risco de Queda',
    category: 'idoso',
    condition: (ctx) => {
      if (!ctx.age || ctx.age < 65) return false;
      const codes = [...(ctx.diagnosis?.ciap2Codes || []), ...(ctx.diagnosis?.cid10Codes || [])];
      // Procurar por códigos relacionados a quedas, tontura, fraqueza
      const fallRelated = codes.some(c => 
        c === 'A06' || c === 'N17' || // CIAP-2 Desmaio, Vertigem
        c.startsWith('R55') || c.startsWith('R42') || // CID-10 Síncope, Tontura
        c.startsWith('W') // CID-10 Quedas
      );
      return fallRelated;
    },
    severity: 'warning',
    title: 'Idoso com Risco de Queda',
    message: (ctx) => `Idoso (${ctx.age} anos) com queixa relacionada a quedas/tontura.`,
    recommendation: 'Avaliar risco de queda (Teste Timed Up and Go). Revisar medicações (psicotrópicos, anti-hipertensivos). Orientar adaptações domiciliares.',
    protocolReference: 'Protocolo de Prevenção de Quedas em Idosos',
  },
];

/**
 * Avalia alertas clínicos para um contexto
 */
export function evaluateAlerts(context: AlertEvaluationContext): ClinicalAlert[] {
  const alerts: ClinicalAlert[] = [];
  
  // Calcular idade se não fornecida
  if (!context.age && context.citizen?.birthDate) {
    context.age = calculateAge(new Date(context.citizen.birthDate));
  }
  
  for (const rule of ALERT_RULES) {
    try {
      if (rule.condition(context)) {
        alerts.push({
          id: `${rule.id}_${Date.now()}`,
          citizenId: context.citizen?.id || 'unknown',
          category: rule.category,
          severity: rule.severity,
          title: rule.title,
          message: rule.message(context),
          recommendation: rule.recommendation,
          protocolReference: rule.protocolReference,
          triggeredAt: new Date(),
          acknowledged: false,
        });
      }
    } catch (e) {
      // Ignora erros de avaliação de regras individuais
      console.error(`Error evaluating rule ${rule.id}:`, e);
    }
  }
  
  // Ordenar por severidade (critical primeiro)
  const severityOrder = { critical: 0, warning: 1, info: 2 };
  alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  
  return alerts;
}

/**
 * Avalia alertas para dados de triagem
 */
export function evaluateTriageAlerts(triage: any, citizen: any): ClinicalAlert[] {
  return evaluateAlerts({
    citizen,
    triage,
    vitalSigns: {
      bloodPressureSystolic: triage.bloodPressureSystolic,
      bloodPressureDiastolic: triage.bloodPressureDiastolic,
      heartRate: triage.heartRate,
      temperature: triage.temperature,
      respiratoryRate: triage.respiratoryRate,
      oxygenSaturation: triage.oxygenSaturation,
      bloodGlucose: triage.bloodGlucose,
      weight: triage.weight,
      height: triage.height,
    },
  });
}

/**
 * Avalia alertas para dados de consulta
 */
export function evaluateConsultationAlerts(consultation: any, citizen: any, prescriptions?: any[]): ClinicalAlert[] {
  return evaluateAlerts({
    citizen,
    consultation,
    vitalSigns: consultation.vitalSigns,
    diagnosis: {
      ciap2Codes: consultation.ciap2Codes || [],
      cid10Codes: consultation.cid10Codes || [],
    },
    prescriptions,
  });
}

/**
 * Retorna todas as regras configuradas
 */
export function getAlertRules(): Omit<AlertRule, 'condition'>[] {
  return ALERT_RULES.map(r => ({
    id: r.id,
    name: r.name,
    category: r.category,
    severity: r.severity,
    title: r.title,
    message: () => '',
    recommendation: r.recommendation,
    protocolReference: r.protocolReference,
  }));
}

export const protocolAlertService = {
  evaluateAlerts,
  evaluateTriageAlerts,
  evaluateConsultationAlerts,
  getAlertRules,
  ALERT_RULES,
};
