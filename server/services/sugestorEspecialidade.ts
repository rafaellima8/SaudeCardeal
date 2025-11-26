/**
 * Motor de Sugestão de Especialidade para Encaminhamentos Médicos
 * 
 * Este serviço implementa um motor rule-based para sugerir automaticamente
 * a especialidade mais adequada para um encaminhamento médico, baseado em:
 * - Palavras-chave no motivo do encaminhamento
 * - Códigos CID-10 / CIAP-2
 * - Dados complementares (sinais de alarme, tipo de atendimento, etc.)
 * 
 * COMO ADICIONAR NOVAS REGRAS:
 * 1. Adicione nova entrada na tabela referral_rules via seed ou admin
 * 2. Defina palavras-chave relevantes (array de strings)
 * 3. Defina códigos CID/CIAP relacionados (opcional)
 * 4. Defina pesos base e para CID matching
 * 
 * O sistema automaticamente recarrega as regras do banco de dados.
 */

import { storage } from "../storage";
import type { 
  ReferralRule, 
  Specialty, 
  SpecialtySuggestionInput, 
  SpecialtySuggestion 
} from "@shared/schema";

// Interface interna para regras carregadas
interface LoadedRule extends ReferralRule {
  specialty: Specialty;
}

// Cache de regras para evitar queries repetidas
let rulesCache: LoadedRule[] | null = null;
let rulesCacheTime: number = 0;
const CACHE_TTL_MS = 60000; // 1 minuto

/**
 * Normaliza texto para matching:
 * - Converte para minúsculas
 * - Remove acentos
 * - Divide em tokens/palavras
 */
function normalizeText(text: string): string[] {
  if (!text) return [];
  
  const normalized = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove diacríticos
    .replace(/[^\w\s]/g, " ") // Remove pontuação
    .trim();
  
  return normalized.split(/\s+/).filter(token => token.length > 2);
}

/**
 * Verifica se alguma palavra-chave aparece no texto normalizado
 */
function matchKeywords(textTokens: string[], keywords: string[]): { matched: string[]; score: number } {
  const normalizedKeywords = keywords.map(kw => 
    kw.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  );
  
  const matched: string[] = [];
  let score = 0;
  
  for (const keyword of normalizedKeywords) {
    const keywordTokens = keyword.split(/\s+/);
    
    // Match de token único
    if (keywordTokens.length === 1) {
      const found = textTokens.some(token => 
        token.includes(keyword) || keyword.includes(token)
      );
      if (found) {
        matched.push(keyword);
        score += 1;
      }
    } else {
      // Match de frase (sequência de tokens)
      const text = textTokens.join(" ");
      if (text.includes(keywordTokens.join(" "))) {
        matched.push(keyword);
        score += keywordTokens.length; // Peso maior para frases
      }
    }
  }
  
  return { matched, score };
}

/**
 * Verifica se algum código CID/CIAP bate com os códigos relacionados
 */
function matchCodes(inputCode: string | undefined, relatedCodes: string[] | null): { matched: boolean; code: string | null } {
  if (!inputCode || !relatedCodes || relatedCodes.length === 0) {
    return { matched: false, code: null };
  }
  
  const normalizedInput = inputCode.toUpperCase().replace(/[^A-Z0-9]/g, "");
  
  for (const code of relatedCodes) {
    const normalizedCode = code.toUpperCase().replace(/[^A-Z0-9]/g, "");
    // Match exato ou prefixo (ex: E11 matches E11.1)
    if (normalizedInput.startsWith(normalizedCode) || normalizedCode.startsWith(normalizedInput)) {
      return { matched: true, code };
    }
  }
  
  return { matched: false, code: null };
}

/**
 * Carrega regras do banco de dados com cache
 */
async function loadRules(): Promise<LoadedRule[]> {
  const now = Date.now();
  
  if (rulesCache && (now - rulesCacheTime) < CACHE_TTL_MS) {
    return rulesCache;
  }
  
  const rules = await storage.getReferralRulesWithSpecialties();
  rulesCache = rules;
  rulesCacheTime = now;
  
  return rules;
}

/**
 * Invalida o cache de regras (chamar após alterações nas regras)
 */
export function invalidateRulesCache(): void {
  rulesCache = null;
  rulesCacheTime = 0;
}

/**
 * Motor principal de sugestão de especialidade
 * 
 * Algoritmo:
 * 1. Carrega todas as regras ativas do banco
 * 2. Normaliza textos de entrada
 * 3. Para cada regra:
 *    - Calcula score por keywords encontradas
 *    - Adiciona peso extra se CID bater
 *    - Gera justificativa textual
 * 4. Ordena por score descendente
 * 5. Retorna top N sugestões
 * 
 * @param input Dados do encaminhamento
 * @param maxResults Máximo de sugestões a retornar (default: 5)
 * @returns Lista ordenada de sugestões com scores e justificativas
 */
export async function sugerirEspecialidades(
  input: SpecialtySuggestionInput,
  maxResults: number = 5
): Promise<SpecialtySuggestion[]> {
  const rules = await loadRules();
  
  if (rules.length === 0) {
    console.warn("[SugestorEspecialidade] Nenhuma regra de encaminhamento encontrada");
    return [];
  }
  
  // Normaliza textos de entrada
  const motivoTokens = normalizeText(input.motivoEncaminhamento);
  const hipoteseTokens = normalizeText(input.hipoteseDiagnostica || "");
  const allTokens = [...motivoTokens, ...hipoteseTokens];
  
  // Agrupa scores por especialidade
  const specialtyScores = new Map<string, {
    specialty: Specialty;
    score: number;
    justifications: string[];
  }>();
  
  for (const rule of rules) {
    const { specialty } = rule;
    
    // Inicializa se ainda não existe
    if (!specialtyScores.has(specialty.id)) {
      specialtyScores.set(specialty.id, {
        specialty,
        score: 0,
        justifications: [],
      });
    }
    
    const entry = specialtyScores.get(specialty.id)!;
    
    // Match de palavras-chave
    const keywordMatch = matchKeywords(allTokens, rule.keywords);
    if (keywordMatch.matched.length > 0) {
      const keywordScore = keywordMatch.score * rule.baseWeight;
      entry.score += keywordScore;
      entry.justifications.push(
        `Palavra-chave "${keywordMatch.matched.join(", ")}" encontrada (peso: ${keywordScore})`
      );
    }
    
    // Match de CID
    const cidMatch = matchCodes(input.cid, rule.cidCodes);
    if (cidMatch.matched) {
      entry.score += rule.cidWeight;
      entry.justifications.push(
        `CID ${input.cid} corresponde à regra de ${specialty.name} (código ${cidMatch.code}, peso: ${rule.cidWeight})`
      );
    }
    
    // Match de CIAP (se disponível no futuro)
    // TODO: Implementar quando CIAP for enviado na entrada
  }
  
  // Ajustes por dados complementares
  if (input.dadosComplementares) {
    const { sinaisAlarme, tipoAtendimento, idadePaciente } = input.dadosComplementares;
    
    // Prioriza emergência/urgência
    if (tipoAtendimento === "emergencia" || tipoAtendimento === "agudo") {
      for (const entry of specialtyScores.values()) {
        entry.score *= 1.2; // Boost de 20% para casos agudos
      }
    }
    
    // Ajuste por idade para Pediatria/Geriatria
    if (idadePaciente !== undefined) {
      const allEntries = Array.from(specialtyScores.values());
      const pediatriaEntry = allEntries.find(e => e.specialty.slug === "pediatria");
      const geriatriaEntry = allEntries.find(e => e.specialty.slug === "geriatria");
      
      if (idadePaciente < 18 && pediatriaEntry) {
        pediatriaEntry.score += 15;
        pediatriaEntry.justifications.push(`Paciente menor de 18 anos (+15)`);
      } else if (idadePaciente >= 60 && geriatriaEntry) {
        geriatriaEntry.score += 15;
        geriatriaEntry.justifications.push(`Paciente com 60 anos ou mais (+15)`);
      }
    }
    
    // Ajuste por sinais de alarme
    if (sinaisAlarme) {
      const alarmCount = Object.values(sinaisAlarme).filter(Boolean).length;
      if (alarmCount > 0) {
        const allEntries = Array.from(specialtyScores.values());
        for (const entry of allEntries) {
          entry.score += alarmCount * 5;
        }
      }
    }
  }
  
  // Filtra apenas especialidades com score > 0 e ordena
  const suggestions = Array.from(specialtyScores.values())
    .filter(entry => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
    .map(entry => ({
      especialidadeId: entry.specialty.id,
      nome: entry.specialty.name,
      slug: entry.specialty.slug,
      score: Math.round(entry.score),
      justificativa: entry.justifications.join("; ") || "Sugestão baseada em regras gerais",
    }));
  
  return suggestions;
}

/**
 * Retorna todas as especialidades disponíveis (para dropdown no frontend)
 */
export async function listarEspecialidades(): Promise<Specialty[]> {
  return storage.getSpecialties({ active: true });
}

/**
 * Registra uma sugestão aceita para analytics futuros
 * TODO: Implementar quando houver tabela de analytics
 */
export async function registrarSugestaoAceita(
  referralId: string,
  suggestedSpecialtyId: string,
  chosenSpecialtyId: string
): Promise<void> {
  console.log(`[SugestorEspecialidade] Sugestão registrada: referral=${referralId}, sugerido=${suggestedSpecialtyId}, escolhido=${chosenSpecialtyId}`);
  // TODO: Persistir para análise de acurácia do motor
}
