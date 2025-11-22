import OpenAI from "openai";
import {
  diagnosisResponseSchema,
  drugInteractionResponseSchema,
  prescriptionValidationResponseSchema,
  type DiagnosisSuggestion,
  type DrugInteraction,
  type DosageAlert,
  type VitalSigns,
} from "@shared/ai-schemas";
import { logAIInteraction } from "./ai-audit";

// Using Replit AI Integrations for OpenAI access (no API key required)
// the newest OpenAI model is "gpt-5" which was released August 7, 2025
const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY
});

const MODEL = "gpt-5"; // Latest OpenAI model with best medical knowledge

// ============================================================================
// ERROR HANDLING & LOGGING
// ============================================================================

interface AIError {
  code: string;
  message: string;
  details?: any;
}

function logAIError(operation: string, error: any, context?: any): AIError {
  const errorId = `AI_${operation.toUpperCase()}_${Date.now()}`;
  console.error(`[AI Error ${errorId}]`, {
    operation,
    error: error.message || error,
    context,
    timestamp: new Date().toISOString(),
  });
  
  return {
    code: errorId,
    message: `Falha na IA (${operation}). O profissional deve continuar a avaliação sem auxílio da IA.`,
    details: process.env.NODE_ENV === "development" ? error.message : undefined,
  };
}

function parseAIResponse<T>(content: string | null, schema: any, operation: string): T {
  if (!content) {
    throw new Error("Resposta vazia da IA");
  }

  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch (e) {
    throw new Error(`Resposta da IA não é JSON válido: ${content.substring(0, 200)}`);
  }

  const validation = schema.safeParse(parsed);
  if (!validation.success) {
    throw new Error(`Resposta da IA não segue formato esperado: ${validation.error.message}`);
  }

  return validation.data;
}

// ============================================================================
// DIAGNÓSTICO INTELIGENTE (CID-10 / CIAP-2)
// ============================================================================

export async function suggestDiagnosis(
  subjective: string,
  objective?: string,
  vitalSigns?: VitalSigns
): Promise<{ success: boolean; data?: DiagnosisSuggestion[]; error?: AIError }> {
  const prompt = `Você é um assistente médico especializado em APS (Atenção Primária à Saúde) no Brasil, seguindo os padrões e-SUS.

⚠️ **AVISO IMPORTANTE**: Esta é uma sugestão assistencial. A decisão diagnóstica final é SEMPRE do profissional de saúde habilitado.

**DADOS DO PACIENTE:**
Queixa/Subjetivo: ${subjective}
${objective ? `Exame Físico/Objetivo: ${objective}` : ''}
${vitalSigns ? `Sinais Vitais:
- PA: ${vitalSigns.bloodPressure || 'não informado'}
- FC: ${vitalSigns.heartRate || 'não informado'} bpm
- Temp: ${vitalSigns.temperature || 'não informado'} °C
- FR: ${vitalSigns.respiratoryRate || 'não informado'} irpm
- SpO2: ${vitalSigns.oxygenSaturation || 'não informado'}%
- Peso: ${vitalSigns.weight || 'não informado'} kg
- Altura: ${vitalSigns.height || 'não informado'} cm` : ''}

**TAREFA:**
Baseado nos dados clínicos, sugira até 3 diagnósticos diferenciais mais prováveis, com:
1. Código CIAP-2 e descrição
2. Código CID-10 e descrição
3. Nível de confiança (high/medium/low)
4. Raciocínio clínico (máximo 100 palavras)

**DIRETRIZES:**
- Use apenas códigos CIAP-2 e CID-10 válidos e comuns na APS brasileira
- Priorize diagnósticos mais prevalentes na atenção primária
- Seja conservador: não sugira diagnósticos graves sem evidências claras
- Leve em conta sinais vitais alterados
- Esta é uma SUGESTÃO para auxiliar o profissional, NÃO um diagnóstico definitivo

Responda APENAS em JSON (sem markdown), no formato:
{
  "suggestions": [
    {
      "ciap2Code": "R05",
      "ciap2Description": "Tosse",
      "cid10Code": "J06.9",
      "cid10Description": "Infecção aguda das vias aéreas superiores não especificada",
      "confidence": "high",
      "reasoning": "Paciente apresenta tosse há 3 dias com febre baixa..."
    }
  ]
}`;

  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_completion_tokens: 2048,
    });

    const content = response.choices[0]?.message?.content;
    const data = parseAIResponse<{ suggestions: DiagnosisSuggestion[] }>(
      content, 
      diagnosisResponseSchema,
      "diagnose"
    );

    return { success: true, data: data.suggestions };
  } catch (error: any) {
    const aiError = logAIError("diagnose", error, { subjective, objective, vitalSigns });
    return { success: false, error: aiError };
  }
}

// ============================================================================
// VERIFICAÇÃO DE INTERAÇÕES MEDICAMENTOSAS
// ============================================================================

export async function checkDrugInteractions(
  medications: Array<{ medication: string; dosage: string; frequency: string }>
): Promise<{ success: boolean; data?: DrugInteraction[]; error?: AIError }> {
  if (medications.length < 2) {
    return { success: true, data: [] };
  }

  const medicationList = medications
    .map((med, i) => `${i + 1}. ${med.medication} - ${med.dosage} - ${med.frequency}`)
    .join('\n');

  const prompt = `Você é um farmacêutico clínico especializado em interações medicamentosas.

⚠️ **AVISO IMPORTANTE**: Esta é uma análise assistencial. A decisão sobre prescrição é SEMPRE do profissional habilitado.

**MEDICAMENTOS PRESCRITOS:**
${medicationList}

**TAREFA:**
Analise todas as possíveis interações medicamentosas entre os fármacos listados.

**CLASSIFICAÇÃO DE GRAVIDADE:**
- critical: Risco de morte ou lesão grave irreversível (contraindicação absoluta)
- major: Pode causar deterioração clínica significativa (evitar combinação)
- moderate: Pode causar aumento de efeitos adversos (monitorar)
- minor: Interação clinicamente insignificante

Para cada interação identificada, forneça:
1. Gravidade (critical/major/moderate/minor)
2. Fármacos envolvidos
3. Mecanismo da interação
4. Recomendação prática

**DIRETRIZES:**
- Baseie-se em evidências farmacológicas sólidas
- Esta é uma SUGESTÃO para auxiliar o profissional, NÃO substitui decisão clínica

Responda APENAS em JSON (sem markdown), no formato:
{
  "interactions": [
    {
      "severity": "major",
      "drug1": "Enalapril",
      "drug2": "Espironolactona",
      "interaction": "Risco aumentado de hipercalemia devido ao efeito cumulativo de retenção de potássio",
      "recommendation": "Monitorar níveis séricos de potássio. Considerar substituir espironolactona por hidroclorotiazida."
    }
  ]
}

Se NÃO houver interações relevantes, retorne: {"interactions": []}`;

  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_completion_tokens: 2048,
    });

    const content = response.choices[0]?.message?.content;
    const data = parseAIResponse<{ interactions: DrugInteraction[] }>(
      content,
      drugInteractionResponseSchema,
      "drug_interactions"
    );

    return { success: true, data: data.interactions };
  } catch (error: any) {
    const aiError = logAIError("drug_interactions", error, { medicationCount: medications.length });
    return { success: false, error: aiError };
  }
}

// ============================================================================
// VALIDAÇÃO DE DOSAGEM E CONTRAINDICAÇÕES
// ============================================================================

export async function validatePrescription(
  medication: string,
  dosage: string,
  frequency: string,
  patientAge?: number,
  patientWeight?: number,
  comorbidities?: string[]
): Promise<{ success: boolean; data?: DosageAlert[]; error?: AIError }> {
  const prompt = `Você é um farmacêutico clínico expert em prescrição segura de medicamentos na APS brasileira.

⚠️ **AVISO IMPORTANTE**: Esta é uma validação assistencial. A decisão de prescrição é SEMPRE do profissional habilitado.

**PRESCRIÇÃO:**
- Medicamento: ${medication}
- Dosagem: ${dosage}
- Frequência: ${frequency}

**DADOS DO PACIENTE:**
${patientAge ? `- Idade: ${patientAge} anos` : ''}
${patientWeight ? `- Peso: ${patientWeight} kg` : ''}
${comorbidities && comorbidities.length > 0 ? `- Comorbidades: ${comorbidities.join(', ')}` : ''}

**TAREFA:**
Valide esta prescrição considerando:
1. **Dosagem:** Está dentro da faixa terapêutica recomendada?
2. **Contraindicações:** Há contraindicações absolutas ou relativas?
3. **Ajustes:** Necessita ajuste por idade, peso ou comorbidades?
4. **Alertas de segurança:** Cuidados especiais (ex: insuficiência renal/hepática)

**CLASSIFICAÇÃO:**
- dosage_error: Dosagem incorreta ou perigosa
- contraindication: Contraindicação identificada
- warning: Alerta importante (ajuste necessário)
- info: Informação relevante para o prescritor

**DIRETRIZES:**
- Esta é uma SUGESTÃO para auxiliar o profissional, NÃO substitui decisão clínica
- Baseie-se em protocolos clínicos reconhecidos

Responda APENAS em JSON (sem markdown), no formato:
{
  "alerts": [
    {
      "type": "warning",
      "medication": "Metformina",
      "message": "Dosagem inicial alta para idosos",
      "suggestion": "Iniciar com 500mg 1x/dia e titular gradualmente"
    }
  ]
}

Se a prescrição estiver CORRETA, retorne: {"alerts": []}`;

  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_completion_tokens: 1024,
    });

    const content = response.choices[0]?.message?.content;
    const data = parseAIResponse<{ alerts: DosageAlert[] }>(
      content,
      prescriptionValidationResponseSchema,
      "validate_prescription"
    );

    return { success: true, data: data.alerts };
  } catch (error: any) {
    const aiError = logAIError("validate_prescription", error, { medication, dosage, frequency });
    return { success: false, error: aiError };
  }
}

// ============================================================================
// GERAÇÃO DE PLANO DE CUIDADOS (SOAP - "PLANO")
// ============================================================================

export async function generateCarePlan(
  subjective: string,
  objective: string,
  assessment: string
): Promise<{ success: boolean; data?: string; error?: AIError }> {
  const prompt = `Você é um médico da APS experiente elaborando o PLANO de cuidados (letra P do SOAP).

⚠️ **AVISO IMPORTANTE**: Esta é uma sugestão assistencial. A decisão terapêutica final é SEMPRE do profissional habilitado.

**SUBJETIVO (S):**
${subjective}

**OBJETIVO (O):**
${objective}

**AVALIAÇÃO (A):**
${assessment}

**TAREFA:**
Com base nos dados SOAP, elabore um PLANO DE CUIDADOS (P) completo incluindo:
1. Tratamento farmacológico (se necessário)
2. Orientações não-farmacológicas
3. Solicitação de exames (se indicado)
4. Retorno/acompanhamento
5. Encaminhamentos (se necessário)

**DIRETRIZES:**
- Escreva em texto corrido, objetivo e profissional, como seria registrado em prontuário
- Máximo 200 palavras
- Esta é uma SUGESTÃO para auxiliar o profissional, NÃO substitui decisão clínica
- Siga protocolos clínicos da APS brasileira

Exemplo:
"Prescrito paracetamol 500mg 1 comprimido 6/6h por 3 dias para analgesia. Orientado repouso, hidratação abundante e alimentação leve. Solicitado hemograma completo e PCR. Retorno em 7 dias para reavaliação ou antes se piora clínica. Orientações de sinais de alarme fornecidas."`;

  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      max_completion_tokens: 512,
    });

    const plan = response.choices[0]?.message?.content || "";
    
    if (!plan || plan.trim().length < 20) {
      throw new Error("Plano gerado está vazio ou muito curto");
    }

    return { success: true, data: plan };
  } catch (error: any) {
    const aiError = logAIError("generate_care_plan", error, { subjective, objective, assessment });
    return { success: false, error: aiError };
  }
}
