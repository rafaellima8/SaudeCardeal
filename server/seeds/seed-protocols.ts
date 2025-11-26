import { db } from "../db";
import { clinicalProtocols } from "@shared/schema";
import { eq } from "drizzle-orm";

interface ProtocolCondition {
  field: string;
  operator: ">" | "<" | ">=" | "<=" | "==" | "includes" | "age_between";
  value: string | number;
  valueMax?: number;
}

interface ProtocolSeed {
  name: string;
  description: string;
  category: "vital_signs" | "diagnosis" | "medication" | "pregnancy" | "chronic" | "age_gender" | "exam";
  conditions: ProtocolCondition[];
  alertLevel: "info" | "warning" | "critical";
  alertMessage: string;
  recommendation: string;
  protocolReference: string;
  active: boolean;
}

const defaultProtocols: ProtocolSeed[] = [
  // HIPERTENSÃO
  {
    name: "Crise Hipertensiva - Emergência",
    description: "Detecção de PA >= 180/120 mmHg com potencial lesão de órgão-alvo",
    category: "vital_signs",
    conditions: [
      { field: "vitalSigns.bloodPressureSystolic", operator: ">=", value: 180 },
    ],
    alertLevel: "critical",
    alertMessage: "ALERTA CRÍTICO: PA Sistólica >= 180 mmHg detectada. Avaliar emergência hipertensiva.",
    recommendation: "Encaminhar para avaliação de emergência. Verificar sintomas de lesão de órgão-alvo (cefaleia intensa, dor torácica, dispneia, confusão mental). Iniciar tratamento anti-hipertensivo EV se confirmada emergência.",
    protocolReference: "Diretriz Brasileira de Hipertensão Arterial 2020 - Cap. 11",
    active: true,
  },
  {
    name: "Crise Hipertensiva - Urgência",
    description: "Detecção de PA >= 180/120 mmHg sem lesão de órgão-alvo",
    category: "vital_signs",
    conditions: [
      { field: "vitalSigns.bloodPressureDiastolic", operator: ">=", value: 120 },
    ],
    alertLevel: "warning",
    alertMessage: "PA Diastólica >= 120 mmHg. Avaliar urgência hipertensiva.",
    recommendation: "Reavaliar em ambiente calmo após 30 minutos. Se persistir, iniciar anti-hipertensivo oral. Agendar retorno em 7 dias.",
    protocolReference: "Diretriz Brasileira de Hipertensão Arterial 2020 - Cap. 11",
    active: true,
  },
  {
    name: "Hipertensão Estágio 3",
    description: "PA >= 180/110 mmHg",
    category: "vital_signs",
    conditions: [
      { field: "vitalSigns.bloodPressureSystolic", operator: ">=", value: 180 },
      { field: "vitalSigns.bloodPressureDiastolic", operator: ">=", value: 110 },
    ],
    alertLevel: "warning",
    alertMessage: "Hipertensão Estágio 3 detectada (PA >= 180/110 mmHg).",
    recommendation: "Iniciar terapia combinada (2 ou mais anti-hipertensivos). Avaliar danos de órgão-alvo. Solicitar exames: creatinina, potássio, ECG, fundo de olho.",
    protocolReference: "Diretriz Brasileira de Hipertensão Arterial 2020",
    active: true,
  },
  
  // DIABETES
  {
    name: "Hipoglicemia Severa",
    description: "Glicemia capilar < 54 mg/dL",
    category: "vital_signs",
    conditions: [
      { field: "vitalSigns.glucose", operator: "<", value: 54 },
    ],
    alertLevel: "critical",
    alertMessage: "HIPOGLICEMIA SEVERA (< 54 mg/dL). Risco de neuroglicopenia.",
    recommendation: "Administrar 15-20g de glicose oral se consciente. Se inconsciente: glucagon 1mg IM/SC ou glicose 50% EV. Monitorar glicemia a cada 15 minutos. Identificar causa.",
    protocolReference: "SBD - Diretrizes 2022 - Hipoglicemia",
    active: true,
  },
  {
    name: "Hiperglicemia Grave",
    description: "Glicemia > 400 mg/dL",
    category: "vital_signs",
    conditions: [
      { field: "vitalSigns.glucose", operator: ">", value: 400 },
    ],
    alertLevel: "critical",
    alertMessage: "HIPERGLICEMIA GRAVE (> 400 mg/dL). Avaliar cetoacidose diabética ou estado hiperosmolar.",
    recommendation: "Verificar cetonas, gasometria e eletrólitos. Iniciar hidratação EV. Considerar insulina regular. Encaminhar para internação se CAD ou EHH confirmados.",
    protocolReference: "SBD - Diretrizes 2022 - Emergências Hiperglicêmicas",
    active: true,
  },
  {
    name: "Diabetes - Meta Glicêmica Não Atingida",
    description: "Glicemia de jejum > 130 mg/dL em diabético",
    category: "chronic",
    conditions: [
      { field: "vitalSigns.glucose", operator: ">", value: 130 },
      { field: "diagnoses", operator: "includes", value: "E11" },
    ],
    alertLevel: "info",
    alertMessage: "Glicemia de jejum acima da meta (> 130 mg/dL) em paciente diabético.",
    recommendation: "Revisar adesão ao tratamento e dieta. Considerar ajuste de medicação. Solicitar HbA1c se não realizada nos últimos 3 meses.",
    protocolReference: "SBD - Diretrizes 2022",
    active: true,
  },

  // GESTAÇÃO DE ALTO RISCO
  {
    name: "Pré-Eclâmpsia",
    description: "Gestante com PA >= 140/90 mmHg",
    category: "pregnancy",
    conditions: [
      { field: "patient.pregnant", operator: "==", value: "true" },
      { field: "vitalSigns.bloodPressureSystolic", operator: ">=", value: 140 },
    ],
    alertLevel: "critical",
    alertMessage: "ALERTA: Gestante com PA >= 140/90 mmHg. Avaliar pré-eclâmpsia.",
    recommendation: "Solicitar proteinúria de 24h ou relação proteína/creatinina. Avaliar sintomas (cefaleia, escotomas, epigastralgia). Hemograma completo, plaquetas, creatinina, TGO, TGP, LDH. Encaminhar para pré-natal de alto risco.",
    protocolReference: "FEBRASGO - Manual de Gestação de Alto Risco 2022",
    active: true,
  },
  {
    name: "Diabetes Gestacional - Rastreio",
    description: "Gestante com glicemia de jejum >= 92 mg/dL",
    category: "pregnancy",
    conditions: [
      { field: "patient.pregnant", operator: "==", value: "true" },
      { field: "vitalSigns.glucose", operator: ">=", value: 92 },
    ],
    alertLevel: "warning",
    alertMessage: "Glicemia de jejum >= 92 mg/dL em gestante. Suspeita de DMG.",
    recommendation: "Confirmar diagnóstico com TOTG 75g. Encaminhar para nutricionista e pré-natal de alto risco se confirmado. Orientar automonitoramento glicêmico.",
    protocolReference: "SBD/FEBRASGO - DMG 2022",
    active: true,
  },

  // TUBERCULOSE
  {
    name: "Tuberculose - Sintomático Respiratório",
    description: "Tosse por 3+ semanas",
    category: "diagnosis",
    conditions: [
      { field: "symptoms", operator: "includes", value: "tosse" },
    ],
    alertLevel: "warning",
    alertMessage: "Paciente com tosse persistente. Avaliar TB pulmonar.",
    recommendation: "Solicitar baciloscopia de escarro (2 amostras) e teste rápido molecular para TB (TRM-TB). Radiografia de tórax. Investigar contatos. Notificar caso suspeito.",
    protocolReference: "MS - Manual de Recomendações para Controle da TB 2019",
    active: true,
  },
  {
    name: "Tuberculose - Contato Domiciliar",
    description: "Contato de caso de TB",
    category: "diagnosis",
    conditions: [
      { field: "history", operator: "includes", value: "contato_tb" },
    ],
    alertLevel: "info",
    alertMessage: "Contato domiciliar de caso de TB. Iniciar investigação.",
    recommendation: "Realizar prova tuberculínica (PT) ou IGRA. Radiografia de tórax. Se PT >= 5mm e assintomático, considerar tratamento de ILTB. Agendar reavaliação.",
    protocolReference: "MS - Manual de Recomendações para Controle da TB 2019",
    active: true,
  },

  // PEDIATRIA
  {
    name: "Febre Alta em Lactente",
    description: "Temperatura >= 39°C em < 3 meses",
    category: "age_gender",
    conditions: [
      { field: "patient.age", operator: "<", value: 0.25 },
      { field: "vitalSigns.temperature", operator: ">=", value: 39 },
    ],
    alertLevel: "critical",
    alertMessage: "ALERTA: Febre alta (>= 39°C) em lactente < 3 meses. Alto risco de infecção bacteriana grave.",
    recommendation: "Colher hemograma, PCR, hemocultura, EAS e urocultura. Punção lombar se sinais de meningite. Iniciar antibioticoterapia empírica após coleta. Internação para observação.",
    protocolReference: "SBP - Febre em Pediatria 2021",
    active: true,
  },
  {
    name: "Desidratação Moderada/Grave",
    description: "Sinais de desidratação em criança",
    category: "age_gender",
    conditions: [
      { field: "patient.age", operator: "<", value: 12 },
      { field: "symptoms", operator: "includes", value: "desidratacao" },
    ],
    alertLevel: "warning",
    alertMessage: "Sinais de desidratação em criança. Avaliar gravidade.",
    recommendation: "Classificar desidratação (leve/moderada/grave). TRO se leve/moderada. Hidratação EV se grave ou impossibilidade de VO. Monitorar peso, diurese e sinais vitais.",
    protocolReference: "MS - AIDPI 2017",
    active: true,
  },

  // SINAIS VITAIS CRÍTICOS
  {
    name: "Bradicardia Severa",
    description: "Frequência cardíaca < 50 bpm",
    category: "vital_signs",
    conditions: [
      { field: "vitalSigns.heartRate", operator: "<", value: 50 },
    ],
    alertLevel: "critical",
    alertMessage: "BRADICARDIA SEVERA (< 50 bpm). Avaliar causa e estabilidade hemodinâmica.",
    recommendation: "Verificar medicamentos (betabloqueadores, digoxina). ECG 12 derivações. Se instável: atropina 0,5mg EV, considerar marca-passo transcutâneo.",
    protocolReference: "ACLS 2020",
    active: true,
  },
  {
    name: "Taquicardia Sintomática",
    description: "Frequência cardíaca > 150 bpm com sintomas",
    category: "vital_signs",
    conditions: [
      { field: "vitalSigns.heartRate", operator: ">", value: 150 },
    ],
    alertLevel: "warning",
    alertMessage: "Taquicardia > 150 bpm detectada. Avaliar etiologia.",
    recommendation: "ECG 12 derivações. Identificar ritmo (sinusal, FA, flutter, TPSV). Tratar causa de base. Se instável: cardioversão elétrica sincronizada.",
    protocolReference: "ACLS 2020",
    active: true,
  },
  {
    name: "Hipóxia",
    description: "Saturação O2 < 92%",
    category: "vital_signs",
    conditions: [
      { field: "vitalSigns.oxygenSaturation", operator: "<", value: 92 },
    ],
    alertLevel: "critical",
    alertMessage: "HIPÓXIA DETECTADA (SpO2 < 92%). Iniciar oxigenoterapia.",
    recommendation: "Oxigênio suplementar para manter SpO2 >= 94%. Ausculta pulmonar. Radiografia de tórax. Gasometria arterial se disponível. Investigar causa (pneumonia, DPOC, TEP, ICC).",
    protocolReference: "GOLD 2023 / BTS Oxygen Guidelines",
    active: true,
  },
  {
    name: "Hipotermia",
    description: "Temperatura < 35°C",
    category: "vital_signs",
    conditions: [
      { field: "vitalSigns.temperature", operator: "<", value: 35 },
    ],
    alertLevel: "warning",
    alertMessage: "Hipotermia detectada (T < 35°C). Avaliar causa.",
    recommendation: "Aquecer paciente (cobertores, fluidos aquecidos). Monitorar ritmo cardíaco. Investigar causas (sepse, hipotireoidismo, exposição ambiental). Glicemia capilar.",
    protocolReference: "Manual de Emergências Médicas",
    active: true,
  },
  {
    name: "Febre Alta Adulto",
    description: "Temperatura >= 39.5°C em adulto",
    category: "vital_signs",
    conditions: [
      { field: "vitalSigns.temperature", operator: ">=", value: 39.5 },
    ],
    alertLevel: "warning",
    alertMessage: "Febre alta (>= 39.5°C). Investigar foco infeccioso.",
    recommendation: "Hemograma, PCR, hemocultura se suspeita de sepse. Antipirético. Hidratação. Identificar foco (ITU, pneumonia, meningite, pele). Avaliar critérios de SIRS/sepse.",
    protocolReference: "Surviving Sepsis 2021",
    active: true,
  },

  // OBESIDADE
  {
    name: "Obesidade Grau III (Mórbida)",
    description: "IMC >= 40 kg/m²",
    category: "chronic",
    conditions: [
      { field: "vitalSigns.bmi", operator: ">=", value: 40 },
    ],
    alertLevel: "warning",
    alertMessage: "Obesidade Grau III (IMC >= 40). Alto risco cardiovascular.",
    recommendation: "Encaminhar para equipe multidisciplinar (nutricionista, psicólogo, endocrinologista). Rastrear comorbidades (DM, HAS, dislipidemia, apneia do sono). Discutir cirurgia bariátrica se indicado.",
    protocolReference: "ABESO - Diretrizes Brasileiras de Obesidade 2022",
    active: true,
  },
];

export async function seedProtocols(): Promise<void> {
  console.log("[SEED] Iniciando seed de protocolos clínicos...");

  let inserted = 0;
  let updated = 0;

  for (const protocol of defaultProtocols) {
    const existing = await db
      .select()
      .from(clinicalProtocols)
      .where(eq(clinicalProtocols.name, protocol.name))
      .limit(1);

    const triggerConditionsObj = {
      vitalSigns: protocol.conditions
        .filter(c => c.field.startsWith("vitalSigns."))
        .map(c => ({
          field: c.field.replace("vitalSigns.", ""),
          operator: c.operator,
          value: typeof c.value === "number" ? c.value : 0,
        })),
      diagnoses: protocol.conditions
        .filter(c => c.field === "diagnoses" && c.operator === "includes")
        .map(c => String(c.value)),
      medications: protocol.conditions
        .filter(c => c.field === "medications" && c.operator === "includes")
        .map(c => String(c.value)),
    };

    const protocolData = {
      name: protocol.name,
      description: protocol.description,
      category: protocol.category,
      triggerConditions: triggerConditionsObj,
      alertLevel: protocol.alertLevel,
      alertMessage: protocol.alertMessage,
      recommendation: protocol.recommendation,
      protocolReference: protocol.protocolReference,
      active: protocol.active,
    };

    if (existing.length > 0) {
      await db
        .update(clinicalProtocols)
        .set(protocolData)
        .where(eq(clinicalProtocols.id, existing[0].id));
      console.log(`  [~] Protocolo atualizado: ${protocol.name}`);
      updated++;
    } else {
      await db.insert(clinicalProtocols).values(protocolData);
      console.log(`  [+] Protocolo inserido: ${protocol.name}`);
      inserted++;
    }
  }

  console.log(`[SEED] ✅ Seed de protocolos concluído!`);
  console.log(`       ${inserted} novos protocolos inseridos`);
  console.log(`       ${updated} protocolos atualizados`);
}
