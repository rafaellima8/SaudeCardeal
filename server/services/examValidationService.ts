/**
 * Serviço de Validação Clínica para Exames
 * Implementa regras de negócio e validações para solicitação de exames
 * Conforme SIGTAP e protocolos do Ministério da Saúde
 * 
 * @module examValidationService
 */

import { db } from "../db";
import * as schema from "@shared/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";

export interface ExamValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  suggestions?: string[];
}

export interface ExamRequest {
  examType: string;
  sigtapCode?: string;
  citizenId: string;
  citizenAge: number;
  citizenSex: 'M' | 'F';
  consultationId: string;
  ciap2Codes?: string[];
  cid10Codes?: string[];
  isPregnant?: boolean;
  chronicConditions?: string[];
}

// Regras de periodicidade por tipo de exame (em dias)
const EXAM_PERIODICITY: Record<string, number> = {
  'hemograma': 90,
  'glicemia': 90,
  'colesterol': 180,
  'creatinina': 90,
  'tsh': 180,
  't4_livre': 180,
  'urina': 30,
  'urocultura': 30,
  'hba1c': 90,
  'ecg': 365,
  'rx_torax': 365,
  'mamografia': 730, // 2 anos
  'papanicolau': 365,
  'psa': 365,
  'ultrassom_obstetrico': 0, // sem restrição na gestação
  'ultrassom_abdominal': 180,
};

// Exames restritos por sexo
const SEX_RESTRICTED_EXAMS: Record<string, 'M' | 'F'> = {
  'psa': 'M',
  'mamografia': 'F',
  'papanicolau': 'F',
  'ultrassom_obstetrico': 'F',
  'ultrassom_transvaginal': 'F',
  'espermograma': 'M',
};

// Exames com restrição de idade
const AGE_RESTRICTIONS: Record<string, { min?: number; max?: number }> = {
  'mamografia': { min: 40 },
  'colonoscopia': { min: 50 },
  'densitometria': { min: 50 },
  'psa': { min: 50 },
};

// Exames que exigem diagnóstico/CID específico
const REQUIRES_DIAGNOSIS: Record<string, string[]> = {
  'ressonancia_magnetica': ['M54', 'G43', 'S06', 'G40'],
  'tomografia_computadorizada': ['S06', 'I64', 'G40', 'C00-C97'],
  'ecocardiograma': ['I50', 'I25', 'I10', 'I11'],
  'holter': ['R00', 'I49', 'I47', 'I48'],
  'mapa': ['I10', 'I11', 'I15'],
};

// Exames contraindicados na gestação
const CONTRAINDICATED_PREGNANCY = [
  'rx_torax',
  'rx_abdomen',
  'rx_coluna',
  'tomografia_computadorizada',
  'cintilografia',
  'pet_scan',
];

/**
 * Valida solicitação de exame
 */
export async function validateExamRequest(request: ExamRequest): Promise<ExamValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];
  
  const examType = request.examType.toLowerCase().replace(/\s+/g, '_');
  
  // Validação de sexo
  if (SEX_RESTRICTED_EXAMS[examType]) {
    if (SEX_RESTRICTED_EXAMS[examType] !== request.citizenSex) {
      errors.push(`Exame "${request.examType}" não é aplicável ao sexo ${request.citizenSex === 'M' ? 'masculino' : 'feminino'}`);
    }
  }
  
  // Validação de idade
  const ageRestriction = AGE_RESTRICTIONS[examType];
  if (ageRestriction) {
    if (ageRestriction.min && request.citizenAge < ageRestriction.min) {
      warnings.push(`Exame "${request.examType}" geralmente indicado para idade >= ${ageRestriction.min} anos`);
    }
    if (ageRestriction.max && request.citizenAge > ageRestriction.max) {
      warnings.push(`Exame "${request.examType}" geralmente indicado para idade <= ${ageRestriction.max} anos`);
    }
  }
  
  // Validação de gestação
  if (request.isPregnant && CONTRAINDICATED_PREGNANCY.includes(examType)) {
    errors.push(`Exame "${request.examType}" contraindicado durante a gestação`);
    suggestions.push('Considere alternativas sem radiação ionizante');
  }
  
  // Validação de diagnóstico obrigatório
  const requiredDiagnosis = REQUIRES_DIAGNOSIS[examType];
  if (requiredDiagnosis) {
    const hasDiagnosis = request.cid10Codes?.some(code => 
      requiredDiagnosis.some(req => {
        if (req.includes('-')) {
          const [start, end] = req.split('-');
          return code >= start && code <= end;
        }
        return code.startsWith(req);
      })
    );
    
    if (!hasDiagnosis) {
      warnings.push(`Exame "${request.examType}" geralmente requer diagnóstico específico (CID-10)`);
      suggestions.push(`CIDs sugeridos: ${requiredDiagnosis.join(', ')}`);
    }
  }
  
  // Validação de periodicidade
  const periodicity = EXAM_PERIODICITY[examType];
  if (periodicity && periodicity > 0) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - periodicity);
    
    const recentExam = await db
      .select()
      .from(schema.exams)
      .where(
        and(
          eq(schema.exams.citizenId, request.citizenId),
          eq(schema.exams.examType, request.examType),
          gte(schema.exams.requestDate, cutoffDate)
        )
      )
      .limit(1);
    
    if (recentExam.length > 0) {
      const lastExamDate = new Date(recentExam[0].requestDate);
      const daysSince = Math.floor((Date.now() - lastExamDate.getTime()) / (1000 * 60 * 60 * 24));
      const daysRemaining = periodicity - daysSince;
      
      if (daysRemaining > 0) {
        warnings.push(`Exame similar realizado há ${daysSince} dias. Periodicidade recomendada: ${periodicity} dias.`);
        suggestions.push(`Próxima solicitação recomendada em ${daysRemaining} dias`);
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    suggestions: suggestions.length > 0 ? suggestions : undefined,
  };
}

/**
 * Verifica se exame tem código SIGTAP válido
 */
export async function validateSigtapCode(sigtapCode: string): Promise<{
  valid: boolean;
  description?: string;
  procedureType?: string;
}> {
  const mapping = await db
    .select()
    .from(schema.sigtapMappings)
    .where(eq(schema.sigtapMappings.sigtapCode, sigtapCode))
    .limit(1);
  
  if (mapping.length === 0) {
    return { valid: false };
  }
  
  return {
    valid: true,
    description: mapping[0].description,
    procedureType: mapping[0].procedureType,
  };
}

/**
 * Sugere exames complementares baseado no diagnóstico
 */
export function suggestComplementaryExams(params: {
  ciap2Codes?: string[];
  cid10Codes?: string[];
  citizenAge: number;
  citizenSex: 'M' | 'F';
  chronicConditions?: string[];
}): Array<{ exam: string; reason: string; priority: 'low' | 'medium' | 'high' }> {
  const suggestions: Array<{ exam: string; reason: string; priority: 'low' | 'medium' | 'high' }> = [];
  
  // Diabetes
  if (params.cid10Codes?.some(c => c.startsWith('E10') || c.startsWith('E11') || c.startsWith('E14')) ||
      params.chronicConditions?.includes('diabetes')) {
    suggestions.push(
      { exam: 'HbA1c', reason: 'Controle glicêmico em diabético', priority: 'high' },
      { exam: 'Creatinina', reason: 'Função renal em diabético', priority: 'high' },
      { exam: 'Microalbuminúria', reason: 'Nefropatia diabética', priority: 'medium' },
      { exam: 'Fundoscopia', reason: 'Retinopatia diabética', priority: 'medium' },
    );
  }
  
  // Hipertensão
  if (params.cid10Codes?.some(c => c.startsWith('I10') || c.startsWith('I11')) ||
      params.chronicConditions?.includes('hipertensao')) {
    suggestions.push(
      { exam: 'Creatinina', reason: 'Função renal em hipertenso', priority: 'high' },
      { exam: 'Potássio', reason: 'Eletrólitos em hipertenso', priority: 'medium' },
      { exam: 'ECG', reason: 'Avaliação cardíaca', priority: 'medium' },
      { exam: 'Fundoscopia', reason: 'Retinopatia hipertensiva', priority: 'low' },
    );
  }
  
  // Dislipidemia
  if (params.cid10Codes?.some(c => c.startsWith('E78'))) {
    suggestions.push(
      { exam: 'Perfil lipídico', reason: 'Controle de dislipidemia', priority: 'high' },
      { exam: 'TGO/TGP', reason: 'Função hepática (uso de estatinas)', priority: 'medium' },
    );
  }
  
  // Tireoidopatia
  if (params.cid10Codes?.some(c => c.startsWith('E03') || c.startsWith('E05'))) {
    suggestions.push(
      { exam: 'TSH', reason: 'Controle tireoidiano', priority: 'high' },
      { exam: 'T4 Livre', reason: 'Avaliação função tireoidiana', priority: 'medium' },
    );
  }
  
  // Rastreamento por idade/sexo
  if (params.citizenSex === 'F' && params.citizenAge >= 25 && params.citizenAge <= 64) {
    suggestions.push({
      exam: 'Papanicolau',
      reason: 'Rastreamento câncer de colo uterino',
      priority: 'medium',
    });
  }
  
  if (params.citizenSex === 'F' && params.citizenAge >= 50 && params.citizenAge <= 69) {
    suggestions.push({
      exam: 'Mamografia',
      reason: 'Rastreamento câncer de mama',
      priority: 'medium',
    });
  }
  
  if (params.citizenSex === 'M' && params.citizenAge >= 50) {
    suggestions.push({
      exam: 'PSA',
      reason: 'Rastreamento câncer de próstata (após discussão)',
      priority: 'low',
    });
  }
  
  if (params.citizenAge >= 50) {
    suggestions.push({
      exam: 'Sangue oculto nas fezes',
      reason: 'Rastreamento câncer colorretal',
      priority: 'medium',
    });
  }
  
  return suggestions;
}

/**
 * Obtém histórico de exames do paciente
 */
export async function getExamHistory(params: {
  citizenId: string;
  examType?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}): Promise<Array<{
  id: string;
  examType: string;
  requestDate: Date;
  resultDate: Date | null;
  status: string;
  result: string | null;
}>> {
  const conditions = [eq(schema.exams.citizenId, params.citizenId)];
  
  if (params.examType) {
    conditions.push(eq(schema.exams.examType, params.examType));
  }
  
  if (params.startDate) {
    conditions.push(gte(schema.exams.requestDate, params.startDate));
  }
  
  if (params.endDate) {
    conditions.push(lte(schema.exams.requestDate, params.endDate));
  }
  
  const exams = await db
    .select()
    .from(schema.exams)
    .where(and(...conditions))
    .orderBy(sql`${schema.exams.requestDate} DESC`)
    .limit(params.limit || 50);
  
  return exams.map(e => ({
    id: e.id,
    examType: e.examType,
    requestDate: e.requestDate,
    resultDate: e.resultDate,
    status: e.status,
    result: e.result,
  }));
}

export const examValidationService = {
  validateExamRequest,
  validateSigtapCode,
  suggestComplementaryExams,
  getExamHistory,
};
