import { db } from "../../db";
import { eq, gte, lte, and, sql } from "drizzle-orm";
import {
  citizens,
  consultations,
  exams,
  tfdRequests,
  professionals,
  healthUnits,
  sigtapMappings,
} from "../../../shared/schema";
import type {
  ESUSCitizenDTO,
  ESUSConsultationDTO,
  ESUSProcedureDTO,
  ESUSExamDTO,
  ESUSTFDDTO,
} from "./schemas";

/**
 * Código IBGE do município de Cardeal da Silva/BA
 */
const MUNICIPALITY_CODE = "2906501";

/**
 * Converte Date para timestamp Unix (segundos) para uso com SQLite
 */
function toUnixTimestamp(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}

/**
 * Helper para limpar CPF (remover pontuação)
 */
function cleanCPF(cpf: string | null): string | undefined {
  if (!cpf) return undefined;
  return cpf.replace(/\D/g, "");
}

/**
 * Helper para limpar CNS (remover pontuação)
 */
function cleanCNS(cns: string | null): string | undefined {
  if (!cns) return undefined;
  const cleaned = cns.replace(/\D/g, "");
  return cleaned.length === 15 ? cleaned : undefined;
}

/**
 * Helper para formatar data para YYYY-MM-DD
 */
function formatDate(date: Date | string | number | null): string | undefined {
  if (!date) return undefined;
  
  let d: Date;
  if (typeof date === "number") {
    // Unix timestamp
    d = new Date(date * 1000);
  } else if (typeof date === "string") {
    d = new Date(date);
  } else {
    d = date;
  }
  
  if (isNaN(d.getTime())) return undefined;
  
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  
  return `${year}-${month}-${day}`;
}

/**
 * Helper para calcular turno a partir do horário
 */
function calculateShift(date: Date | string | number | null): "morning" | "afternoon" | "night" | undefined {
  if (!date) return undefined;
  
  let d: Date;
  if (typeof date === "number") {
    d = new Date(date * 1000);
  } else if (typeof date === "string") {
    d = new Date(date);
  } else {
    d = date;
  }
  
  if (isNaN(d.getTime())) return undefined;
  
  const hour = d.getHours();
  
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "night";
}

/**
 * Helper para parsear endereço (básico)
 */
function parseAddress(address: string | null): { street?: string; number?: string; neighborhood?: string } {
  if (!address) return {};
  
  // Implementação básica - pode ser melhorada
  const parts = address.split(",").map(p => p.trim());
  
  return {
    street: parts[0],
    number: parts[1],
    neighborhood: parts[2],
  };
}

/**
 * Mapeamento de tipos de consulta para procedimentos SIGTAP (FALLBACK)
 * Usado apenas se não houver mapeamento na tabela sigtapMappings
 */
const CONSULTATION_TYPE_TO_SIGTAP_FALLBACK: Record<string, string> = {
  consulta_medica: "0301010072", // Consulta médica em atenção básica
  consulta_enfermagem: "0301010080", // Consulta de enfermagem
  consulta_odontologica: "0301010064", // Consulta odontológica
  procedimento: "0301010072", // Default
  visita_domiciliar: "0301010013", // Visita domiciliar
};

/**
 * Cache de códigos SIGTAP para melhorar performance
 */
let sigtapCache: Record<string, string> | null = null;

/**
 * Invalida cache de códigos SIGTAP (chamar após seed)
 */
export function invalidateSIGTAPCache() {
  sigtapCache = null;
  console.log("[SIGTAP] Cache invalidado - será recarregado na próxima extração");
}

/**
 * Busca código SIGTAP do banco de dados ou fallback para hardcoded
 */
async function getSIGTAPCode(internalCode: string): Promise<string> {
  // Inicializar cache na primeira chamada
  if (sigtapCache === null) {
    sigtapCache = {};
    try {
      const mappings = await db
        .select({
          internalCode: sigtapMappings.internalCode,
          sigtapCode: sigtapMappings.sigtapCode,
        })
        .from(sigtapMappings)
        .where(eq(sigtapMappings.active, true));
      
      mappings.forEach(({ internalCode, sigtapCode }) => {
        sigtapCache![internalCode] = sigtapCode;
      });
      
      console.log(`[SIGTAP] Cache inicializado com ${mappings.length} códigos`);
    } catch (error) {
      console.warn("[SIGTAP] Erro ao carregar mapeamentos, usando fallback:", error);
    }
  }
  
  // Buscar no cache primeiro
  if (sigtapCache[internalCode]) {
    return sigtapCache[internalCode];
  }
  
  // Fallback para mapa hardcoded (logar warning para detectar gaps)
  const fallbackCode = CONSULTATION_TYPE_TO_SIGTAP_FALLBACK[internalCode] || "0301010072";
  
  if (!CONSULTATION_TYPE_TO_SIGTAP_FALLBACK[internalCode]) {
    console.warn(`[SIGTAP] ⚠️  Código interno desconhecido: "${internalCode}" → usando fallback genérico ${fallbackCode}`);
  } else {
    console.warn(`[SIGTAP] ⚠️  Código interno "${internalCode}" não encontrado na tabela sigtapMappings → usando fallback hardcoded ${fallbackCode}`);
  }
  
  return fallbackCode;
}

/**
 * Extrai cidadãos do banco de dados no formato e-SUS
 * 
 * @param startDate Data inicial (opcional)
 * @param endDate Data final (opcional)
 * @returns Lista de cidadãos no formato e-SUS
 */
export async function extractCitizens(
  startDate?: Date,
  endDate?: Date
): Promise<ESUSCitizenDTO[]> {
  try {
    // Construir WHERE clause único com sql template (não misturar com and())
    let whereClause = undefined;
    if (startDate && endDate) {
      whereClause = sql`${citizens.createdAt} >= ${toUnixTimestamp(startDate)} AND ${citizens.createdAt} <= ${toUnixTimestamp(endDate)}`;
    } else if (startDate) {
      whereClause = sql`${citizens.createdAt} >= ${toUnixTimestamp(startDate)}`;
    } else if (endDate) {
      whereClause = sql`${citizens.createdAt} <= ${toUnixTimestamp(endDate)}`;
    }
    
    const results = await db
      .select({
        citizen: citizens,
        unitCNES: healthUnits.cnes,
      })
      .from(citizens)
      .leftJoin(healthUnits, eq(citizens.unitId, healthUnits.id))
      .where(whereClause);
    
    return results
      .map(({ citizen, unitCNES }) => {
        const cpf = cleanCPF(citizen.cpf);
        if (!cpf || cpf.length !== 11) return null; // CPF obrigatório
        
        const addressParts = parseAddress(citizen.address);
        
        return {
          cpf,
          cns: cleanCNS(citizen.cns),
          name: citizen.name,
          birthDate: formatDate(citizen.birthDate) || "",
          sex: (citizen.gender === "M" ? "M" : citizen.gender === "F" ? "F" : "O") as "M" | "F" | "O",
          phone: citizen.phone || undefined,
          email: citizen.email || undefined,
          address: Object.keys(addressParts).length > 0 ? {
            street: addressParts.street,
            number: addressParts.number,
            neighborhood: addressParts.neighborhood,
            city: "Cardeal da Silva",
            cityCode: MUNICIPALITY_CODE,
            state: "BA",
          } : undefined,
          healthUnitCNES: unitCNES || undefined,
        };
      })
      .filter((c): c is ESUSCitizenDTO => c !== null);
  } catch (error) {
    console.error("Error extracting citizens:", error);
    return [];
  }
}

/**
 * Extrai consultas do banco de dados no formato e-SUS
 */
export async function extractConsultations(
  startDate?: Date,
  endDate?: Date
): Promise<ESUSConsultationDTO[]> {
  try {
    // Construir WHERE clause único com sql template (não misturar com and())
    let whereClause = undefined;
    if (startDate && endDate) {
      whereClause = sql`${consultations.consultationDate} >= ${toUnixTimestamp(startDate)} AND ${consultations.consultationDate} <= ${toUnixTimestamp(endDate)}`;
    } else if (startDate) {
      whereClause = sql`${consultations.consultationDate} >= ${toUnixTimestamp(startDate)}`;
    } else if (endDate) {
      whereClause = sql`${consultations.consultationDate} <= ${toUnixTimestamp(endDate)}`;
    }
    
    const results = await db
      .select({
        consultation: consultations,
        citizenCPF: citizens.cpf,
        citizenCNS: citizens.cns,
        professionalCNS: professionals.cns,
        professionalTeamINE: professionals.teamINE,
        unitCNES: healthUnits.cnes,
      })
      .from(consultations)
      .innerJoin(citizens, eq(consultations.citizenId, citizens.id))
      .innerJoin(professionals, eq(consultations.professionalId, professionals.id))
      .innerJoin(healthUnits, eq(consultations.unitId, healthUnits.id))
      .where(whereClause);
    
    return results
      .map(({ consultation, citizenCPF, citizenCNS, professionalCNS, professionalTeamINE, unitCNES }) => {
        const cpf = cleanCPF(citizenCPF);
        const profCNS = cleanCNS(professionalCNS);
        
        if (!cpf || !profCNS || !unitCNES) return null;
        
        const consultDate = formatDate(consultation.consultationDate);
        if (!consultDate) return null;
        
        // BLOCKER: teamINE obrigatório para SISAB compliance
        if (!professionalTeamINE) {
          console.error(`[e-SUS BLOCKER] Consulta ${consultation.id} - Professional CNS ${profCNS} sem teamINE - SISAB REJEITARÁ`);
          return null; // Filtrar registro não-conforme
        }
        
        // Parsear CID-10 e CIAP-2 se existirem
        let cid10Codes: string[] | undefined;
        let ciap2Codes: string[] | undefined;
        
        if (consultation.cid10Codes) {
          try {
            const parsed = typeof consultation.cid10Codes === "string" 
              ? JSON.parse(consultation.cid10Codes) 
              : consultation.cid10Codes;
            cid10Codes = Array.isArray(parsed) ? parsed : undefined;
          } catch {
            cid10Codes = undefined;
          }
        }
        
        if (consultation.ciap2Codes) {
          try {
            const parsed = typeof consultation.ciap2Codes === "string"
              ? JSON.parse(consultation.ciap2Codes)
              : consultation.ciap2Codes;
            ciap2Codes = Array.isArray(parsed) ? parsed : undefined;
          } catch {
            ciap2Codes = undefined;
          }
        }
        
        return {
          id: consultation.id,
          citizenCPF: cpf,
          citizenCNS: cleanCNS(citizenCNS),
          professionalCNS: profCNS,
          teamINE: professionalTeamINE || undefined,
          consultationDate: consultDate,
          shift: calculateShift(consultation.consultationDate),
          unitCNES,
          type: consultation.type || "consulta_medica",
          chiefComplaint: consultation.chiefComplaint || undefined,
          cid10: cid10Codes,
          ciap2: ciap2Codes,
          diagnosis: consultation.diagnosis || undefined,
        };
      })
      .filter((c): c is ESUSConsultationDTO => c !== null);
  } catch (error) {
    console.error("Error extracting consultations:", error);
    return [];
  }
}

/**
 * Extrai procedimentos derivados de consultas
 * (Enquanto não houver tabela específica de procedimentos)
 */
export async function extractProcedures(
  startDate?: Date,
  endDate?: Date
): Promise<ESUSProcedureDTO[]> {
  try {
    // Construir WHERE clause único com sql template (não misturar com and())
    let whereClause = undefined;
    if (startDate && endDate) {
      whereClause = sql`${consultations.consultationDate} >= ${toUnixTimestamp(startDate)} AND ${consultations.consultationDate} <= ${toUnixTimestamp(endDate)}`;
    } else if (startDate) {
      whereClause = sql`${consultations.consultationDate} >= ${toUnixTimestamp(startDate)}`;
    } else if (endDate) {
      whereClause = sql`${consultations.consultationDate} <= ${toUnixTimestamp(endDate)}`;
    }
    
    const results = await db
      .select({
        consultation: consultations,
        citizenCPF: citizens.cpf,
        citizenCNS: citizens.cns,
        professionalCNS: professionals.cns,
        professionalTeamINE: professionals.teamINE,
        unitCNES: healthUnits.cnes,
      })
      .from(consultations)
      .innerJoin(citizens, eq(consultations.citizenId, citizens.id))
      .innerJoin(professionals, eq(consultations.professionalId, professionals.id))
      .innerJoin(healthUnits, eq(consultations.unitId, healthUnits.id))
      .where(whereClause);
    
    const procedures = await Promise.all(
      results.map(async ({ consultation, citizenCPF, citizenCNS, professionalCNS, professionalTeamINE, unitCNES }) => {
        const profCNS = cleanCNS(professionalCNS);
        if (!profCNS || !unitCNES) return null;
        
        const executionDate = formatDate(consultation.consultationDate);
        if (!executionDate) return null;
        
        // BLOCKER: teamINE obrigatório para SISAB compliance
        if (!professionalTeamINE) {
          console.error(`[e-SUS BLOCKER] Professional CNS ${profCNS} sem teamINE - SISAB REJEITARÁ este registro`);
          return null; // Filtrar registro não-conforme
        }
        
        // Buscar código SIGTAP do banco de dados ou fallback
        const procedureCode = await getSIGTAPCode(consultation.type || "consulta_medica");
        
        return {
          citizenCPF: cleanCPF(citizenCPF),
          citizenCNS: cleanCNS(citizenCNS),
          professionalCNS: profCNS,
          teamINE: professionalTeamINE || undefined,
          procedureCode,
          quantity: 1,
          unitCNES,
          executionDate,
          shift: calculateShift(consultation.consultationDate),
        };
      })
    );
    
    return procedures.filter((p): p is ESUSProcedureDTO => p !== null);
  } catch (error) {
    console.error("Error extracting procedures:", error);
    return [];
  }
}

/**
 * Extrai exames do banco de dados no formato e-SUS
 */
export async function extractExams(
  startDate?: Date,
  endDate?: Date
): Promise<ESUSExamDTO[]> {
  try {
    // Construir WHERE clause único com sql template (não misturar com and())
    let whereClause = undefined;
    if (startDate && endDate) {
      whereClause = sql`${exams.requestDate} >= ${toUnixTimestamp(startDate)} AND ${exams.requestDate} <= ${toUnixTimestamp(endDate)}`;
    } else if (startDate) {
      whereClause = sql`${exams.requestDate} >= ${toUnixTimestamp(startDate)}`;
    } else if (endDate) {
      whereClause = sql`${exams.requestDate} <= ${toUnixTimestamp(endDate)}`;
    }
    
    const results = await db
      .select({
        exam: exams,
        citizenCPF: citizens.cpf,
        citizenCNS: citizens.cns,
        professionalCNS: professionals.cns,
        unitCNES: healthUnits.cnes,
      })
      .from(exams)
      .innerJoin(citizens, eq(exams.citizenId, citizens.id))
      .innerJoin(professionals, eq(exams.professionalId, professionals.id))
      .leftJoin(consultations, eq(exams.consultationId, consultations.id))
      .leftJoin(healthUnits, eq(consultations.unitId, healthUnits.id))
      .where(whereClause);
    
    return results
      .map(({ exam, citizenCPF, citizenCNS, professionalCNS, unitCNES }) => {
        const cpf = cleanCPF(citizenCPF);
        const profCNS = cleanCNS(professionalCNS);
        
        if (!cpf || !profCNS || !unitCNES) return null;
        
        const requestDate = formatDate(exam.requestDate);
        if (!requestDate) return null;
        
        // Mapear status
        let status: "requested" | "collected" | "completed" | "cancelled";
        switch (exam.status) {
          case "pending":
            status = "requested";
            break;
          case "in_progress":
            status = "collected";
            break;
          case "completed":
            status = "completed";
            break;
          case "cancelled":
            status = "cancelled";
            break;
          default:
            status = "requested";
        }
        
        return {
          citizenCPF: cpf,
          citizenCNS: cleanCNS(citizenCNS),
          professionalCNS: profCNS,
          examCode: exam.type, // TODO: Mapear para código SIGTAP
          examType: exam.type,
          requestDate,
          completionDate: formatDate(exam.completionDate),
          status,
          result: exam.result || undefined,
          unitCNES,
        };
      })
      .filter((e): e is ESUSExamDTO => e !== null);
  } catch (error) {
    console.error("Error extracting exams:", error);
    return [];
  }
}

/**
 * Extrai solicitações TFD do banco de dados no formato e-SUS
 */
export async function extractTFD(
  startDate?: Date,
  endDate?: Date
): Promise<ESUSTFDDTO[]> {
  try {
    // Construir WHERE clause único com sql template (não misturar com and())
    let whereClause = undefined;
    if (startDate && endDate) {
      whereClause = sql`${tfdRequests.requestDate} >= ${toUnixTimestamp(startDate)} AND ${tfdRequests.requestDate} <= ${toUnixTimestamp(endDate)}`;
    } else if (startDate) {
      whereClause = sql`${tfdRequests.requestDate} >= ${toUnixTimestamp(startDate)}`;
    } else if (endDate) {
      whereClause = sql`${tfdRequests.requestDate} <= ${toUnixTimestamp(endDate)}`;
    }
    
    const results = await db
      .select({
        tfd: tfdRequests,
        citizenCPF: citizens.cpf,
        citizenCNS: citizens.cns,
        professionalCNS: professionals.cns,
        unitCNES: healthUnits.cnes,
      })
      .from(tfdRequests)
      .innerJoin(citizens, eq(tfdRequests.citizenId, citizens.id))
      .innerJoin(professionals, eq(tfdRequests.professionalId, professionals.id))
      .innerJoin(healthUnits, eq(tfdRequests.unitId, healthUnits.id))
      .where(whereClause);
    
    return results
      .map(({ tfd, citizenCPF, citizenCNS, professionalCNS, unitCNES }) => {
        const cpf = cleanCPF(citizenCPF);
        const profCNS = cleanCNS(professionalCNS);
        
        if (!cpf || !profCNS || !unitCNES) return null;
        
        const requestDate = formatDate(tfd.requestDate);
        if (!requestDate) return null;
        
        // Mapear tipo de transporte
        let transportType: "ambulance" | "vehicle" | "air" | undefined;
        if (tfd.transportType) {
          const lowerType = tfd.transportType.toLowerCase();
          if (lowerType.includes("ambulan")) transportType = "ambulance";
          else if (lowerType.includes("aer")) transportType = "air";
          else transportType = "vehicle";
        }
        
        return {
          citizenCPF: cpf,
          citizenCNS: cleanCNS(citizenCNS),
          professionalCNS: profCNS,
          destination: tfd.destination,
          procedure: tfd.procedure,
          justification: tfd.justification || "",
          requestDate,
          travelDate: formatDate(tfd.travelDate),
          returnDate: formatDate(tfd.returnDate),
          status: tfd.status as "pending" | "approved" | "scheduled" | "completed" | "cancelled",
          transportType,
          hasCompanion: tfd.companion === 1 || tfd.companion === true,
          originUnitCNES: unitCNES,
        };
      })
      .filter((t): t is ESUSTFDDTO => t !== null);
  } catch (error) {
    console.error("Error extracting TFD requests:", error);
    return [];
  }
}
