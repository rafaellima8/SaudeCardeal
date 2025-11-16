import { db } from "../../db";
import { citizens, consultations, professionals, healthUnits, exams, tfdRequests } from "@shared/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { 
  ESUSCitizenSchema, 
  ESUSConsultationSchema,
  ESUSProcedureSchema,
  ESUSExamSchema,
  ESUSTFDSchema,
  type ESUSCitizenDTO,
  type ESUSConsultationDTO,
  type ESUSProcedureDTO,
  type ESUSExamDTO,
  type ESUSTFDDTO,
} from "./schemas";

/**
 * Extrator de dados para e-SUS APS
 * 
 * Extrai dados do banco PostgreSQL e transforma para o formato e-SUS,
 * validando com schemas Zod.
 */

// ============================================================================
// Utilitários de Transformação
// ============================================================================

function cleanCPF(cpf: string | null): string {
  if (!cpf) return "";
  return cpf.replace(/\D/g, ""); // Remove tudo que não é dígito
}

function cleanCNS(cns: string | null): string | undefined {
  if (!cns) return undefined;
  const cleaned = cns.replace(/\D/g, "");
  return cleaned.length === 15 ? cleaned : undefined;
}

function formatDateISO(date: Date | string | null): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

function formatTimeISO(date: Date | string | null): string | undefined {
  if (!date) return undefined;
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toISOString().slice(11, 19); // HH:MM:SS
}

function calculateShift(date: Date | string | null): "morning" | "afternoon" | "night" | undefined {
  if (!date) return undefined;
  const d = typeof date === "string" ? new Date(date) : date;
  const hour = d.getHours();
  
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "night";
}

function mapGender(gender: string | null): "M" | "F" | "O" {
  if (!gender) return "O";
  if (gender === "M") return "M";
  if (gender === "F") return "F";
  return "O";
}

// Helper: Normalizar CID-10 para array
// O banco pode armazenar como string única, array JSON, ou array nativo
function normalizeCID10(cid10: any): string[] | undefined {
  if (!cid10) return undefined;
  
  // Se já é array, retornar
  if (Array.isArray(cid10)) {
    return cid10.filter(c => c && c.trim().length > 0);
  }
  
  // Se é string, tentar parsear como JSON primeiro
  if (typeof cid10 === 'string') {
    try {
      const parsed = JSON.parse(cid10);
      if (Array.isArray(parsed)) {
        return parsed.filter(c => c && c.trim().length > 0);
      }
    } catch {
      // Não é JSON, tratar como string única
    }
    
    // Tratar como string única (separar por vírgula se houver)
    return cid10.split(',').map(c => c.trim()).filter(c => c.length > 0);
  }
  
  return undefined;
}

// ============================================================================
// Extrator de Cidadãos
// ============================================================================

export async function extractCitizens(
  since: string,
  until: string,
  options?: { limit?: number; offset?: number }
): Promise<ESUSCitizenDTO[]> {
  try {
    console.log(`[e-SUS Extractor] Extracting citizens from ${since} to ${until}`);
    
    const sinceDate = new Date(since);
    const untilDate = new Date(until);
    
    // Query com JOIN para obter CNES da unidade
    const rows = await db
      .select({
        id: citizens.id,
        cpf: citizens.cpf,
        cns: citizens.cns,
        name: citizens.name,
        birthDate: citizens.birthDate,
        gender: citizens.gender,
        phone: citizens.phone,
        email: citizens.email,
        address: citizens.address,
        bloodType: citizens.bloodType,
        allergies: citizens.allergies,
        familyGroup: citizens.familyGroup,
        createdAt: citizens.createdAt,
        updatedAt: citizens.updatedAt,
        unitCNES: healthUnits.cnes,
      })
      .from(citizens)
      .leftJoin(healthUnits, eq(citizens.unitId, healthUnits.id))
      .where(
        and(
          gte(citizens.updatedAt, sinceDate),
          lte(citizens.updatedAt, untilDate)
        )
      )
      .limit(options?.limit ?? 1000)
      .offset(options?.offset ?? 0);

    console.log(`[e-SUS Extractor] Found ${rows.length} citizens`);

    // Transformar e validar cada registro
    const dtos: ESUSCitizenDTO[] = [];
    
    for (const row of rows) {
      try {
        // Validar CPF obrigatório
        const cpf = cleanCPF(row.cpf);
        if (!cpf || cpf.length !== 11) {
          console.error(`[e-SUS Extractor] Skipping citizen ${row.id}: Invalid or missing CPF`);
          continue;
        }

        const dto: ESUSCitizenDTO = {
          cpf: cpf,
          cns: cleanCNS(row.cns),
          name: row.name,
          birthDate: formatDateISO(row.birthDate),
          sex: mapGender(row.gender),
          phone: row.phone ?? undefined,
          email: row.email ?? undefined,
          address: row.address ? { street: row.address } : undefined,
          bloodType: row.bloodType ?? undefined,
          allergies: row.allergies ?? undefined,
          familyGroup: row.familyGroup ?? undefined,
          healthUnitCNES: row.unitCNES ?? undefined,
        };

        // Validar com Zod
        const validated = ESUSCitizenSchema.parse(dto);
        dtos.push(validated);
      } catch (error) {
        console.error(`[e-SUS Extractor] Failed to validate citizen ${row.id}:`, error);
        // Continuar processando outros registros
      }
    }

    console.log(`[e-SUS Extractor] Successfully validated ${dtos.length}/${rows.length} citizens`);
    return dtos;
    
  } catch (error) {
    console.error("[e-SUS Extractor] Error extracting citizens:", error);
    throw new Error(`Failed to extract citizens: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// ============================================================================
// Extrator de Consultas
// ============================================================================

export async function extractConsultations(
  since: string,
  until: string,
  options?: { limit?: number; offset?: number }
): Promise<ESUSConsultationDTO[]> {
  try {
    console.log(`[e-SUS Extractor] Extracting consultations from ${since} to ${until}`);
    
    const sinceDate = new Date(since);
    const untilDate = new Date(until);
    
    // Query com JOINs para obter todos os dados necessários
    const rows = await db
      .select({
        id: consultations.id,
        consultationDate: consultations.consultationDate,
        type: consultations.type,
        chiefComplaint: consultations.chiefComplaint,
        diagnosis: consultations.diagnosis,
        cid10: consultations.cid10,
        treatment: consultations.treatment,
        // Dados do cidadão
        citizenCPF: citizens.cpf,
        citizenCNS: citizens.cns,
        // Dados do profissional
        professionalCNS: professionals.cns,
        // Dados da unidade
        unitCNES: healthUnits.cnes,
      })
      .from(consultations)
      .innerJoin(citizens, eq(consultations.citizenId, citizens.id))
      .innerJoin(professionals, eq(consultations.professionalId, professionals.id))
      .innerJoin(healthUnits, eq(consultations.unitId, healthUnits.id))
      .where(
        and(
          gte(consultations.consultationDate, sinceDate),
          lte(consultations.consultationDate, untilDate)
        )
      )
      .limit(options?.limit ?? 1000)
      .offset(options?.offset ?? 0);

    console.log(`[e-SUS Extractor] Found ${rows.length} consultations`);

    // Transformar e validar cada registro
    const dtos: ESUSConsultationDTO[] = [];
    
    for (const row of rows) {
      try {
        // Validar CNS obrigatório do profissional
        const professionalCNS = cleanCNS(row.professionalCNS);
        if (!professionalCNS) {
          console.error(`[e-SUS Extractor] Skipping consultation ${row.id}: Invalid professional CNS`);
          continue;
        }

        const dto: ESUSConsultationDTO = {
          id: row.id,
          citizenCPF: cleanCPF(row.citizenCPF),
          citizenCNS: cleanCNS(row.citizenCNS),
          professionalCNS: professionalCNS,
          consultationDate: formatDateISO(row.consultationDate),
          consultationTime: formatTimeISO(row.consultationDate),
          shift: calculateShift(row.consultationDate),
          unitCNES: row.unitCNES,
          type: row.type,
          chiefComplaint: row.chiefComplaint ?? undefined,
          cid10: normalizeCID10(row.cid10),
          diagnosis: row.diagnosis ?? undefined,
        };

        // Validar com Zod
        const validated = ESUSConsultationSchema.parse(dto);
        dtos.push(validated);
      } catch (error) {
        console.error(`[e-SUS Extractor] Failed to validate consultation ${row.id}:`, error);
        // Continuar processando outros registros
      }
    }

    console.log(`[e-SUS Extractor] Successfully validated ${dtos.length}/${rows.length} consultations`);
    return dtos;
    
  } catch (error) {
    console.error("[e-SUS Extractor] Error extracting consultations:", error);
    throw new Error(`Failed to extract consultations: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// ============================================================================
// Extrator de Procedimentos (derivado de consultas)
// ============================================================================
// DESIGN ATUAL: O schema do sistema não possui tabela `procedures` separada.
// Conforme mapping.md, procedimentos são derivados de consultas usando
// mapeamento de tipo de consulta para código SIGTAP.
//
// LIMITAÇÃO CONHECIDA: Este approach é simplificado e não captura:
// - Múltiplos procedimentos realizados em uma mesma consulta
// - Procedimentos com códigos SIGTAP específicos diferentes do tipo geral
// - Quantidade real de procedimentos (sempre assume 1)
//
// EVOLUÇÃO FUTURA (quando necessário para produção):
// 1. Adicionar tabela `procedures` ao schema (shared/schema.ts)
// 2. Registrar procedimentos separadamente durante cada consulta (com código SIGTAP real)
// 3. Implementar extração direta dessa tabela (substituir este extractor)
//
// Por ora, cada consulta gera 1 procedimento baseado no tipo, conforme
// especificado em mapping.md seção 3 (PROCEDIMENTO).

export async function extractProcedures(
  since: string,
  until: string,
  options?: { limit?: number; offset?: number }
): Promise<ESUSProcedureDTO[]> {
  try {
    console.log(`[e-SUS Extractor] Extracting procedures from ${since} to ${until}`);
    console.log(`[e-SUS Extractor] NOTE: Deriving procedures from consultations (no procedures table)`);
    
    const sinceDate = new Date(since);
    const untilDate = new Date(until);
    
    // TEMPORÁRIO: procedimentos derivados de consultas
    // TODO: Implementar tabela procedures separada com códigos SIGTAP reais
    const rows = await db
      .select({
        id: consultations.id,
        consultationDate: consultations.consultationDate,
        type: consultations.type,
        // Dados do cidadão
        citizenCPF: citizens.cpf,
        citizenCNS: citizens.cns,
        // Dados do profissional
        professionalCNS: professionals.cns,
        // Dados da unidade
        unitCNES: healthUnits.cnes,
      })
      .from(consultations)
      .innerJoin(citizens, eq(consultations.citizenId, citizens.id))
      .innerJoin(professionals, eq(consultations.professionalId, professionals.id))
      .innerJoin(healthUnits, eq(consultations.unitId, healthUnits.id))
      .where(
        and(
          gte(consultations.consultationDate, sinceDate),
          lte(consultations.consultationDate, untilDate)
        )
      )
      .limit(options?.limit ?? 1000)
      .offset(options?.offset ?? 0);

    console.log(`[e-SUS Extractor] Found ${rows.length} procedures (from consultations)`);

    const dtos: ESUSProcedureDTO[] = [];
    
    for (const row of rows) {
      try {
        // Validar CNS obrigatório do profissional
        const professionalCNS = cleanCNS(row.professionalCNS);
        if (!professionalCNS) {
          console.error(`[e-SUS Extractor] Skipping procedure ${row.id}: Invalid professional CNS`);
          continue;
        }

        // Mapear tipo de consulta para código SIGTAP (simplificado)
        // TODO: Substituir por lookup em tabela de procedimentos reais
        const procedureCodeMap: Record<string, string> = {
          "consulta_medica": "0301010072",
          "consulta_enfermagem": "0301010080",
          "consulta_odontologica": "0301010064",
          "procedimento": "0301010099",
          "visita_domiciliar": "0301010013",
        };

        const dto: ESUSProcedureDTO = {
          citizenCPF: cleanCPF(row.citizenCPF),
          citizenCNS: cleanCNS(row.citizenCNS),
          professionalCNS: professionalCNS,
          procedureCode: procedureCodeMap[row.type] ?? "0301010099",
          procedureName: row.type,
          quantity: 1,
          unitCNES: row.unitCNES,
          executionDate: formatDateISO(row.consultationDate),
          shift: calculateShift(row.consultationDate),
        };

        const validated = ESUSProcedureSchema.parse(dto);
        dtos.push(validated);
      } catch (error) {
        console.error(`[e-SUS Extractor] Failed to validate procedure ${row.id}:`, error);
      }
    }

    console.log(`[e-SUS Extractor] Successfully validated ${dtos.length}/${rows.length} procedures`);
    return dtos;
    
  } catch (error) {
    console.error("[e-SUS Extractor] Error extracting procedures:", error);
    throw new Error(`Failed to extract procedures: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// ============================================================================
// Extrator de Exames
// ============================================================================

export async function extractExams(
  since: string,
  until: string,
  options?: { limit?: number; offset?: number }
): Promise<ESUSExamDTO[]> {
  try {
    console.log(`[e-SUS Extractor] Extracting exams from ${since} to ${until}`);
    
    const sinceDate = new Date(since);
    const untilDate = new Date(until);
    
    const rows = await db
      .select({
        id: exams.id,
        type: exams.type,
        requestDate: exams.requestDate,
        completionDate: exams.completionDate,
        status: exams.status,
        result: exams.result,
        citizenCPF: citizens.cpf,
        citizenCNS: citizens.cns,
        professionalCNS: professionals.cns,
      })
      .from(exams)
      .innerJoin(citizens, eq(exams.citizenId, citizens.id))
      .innerJoin(professionals, eq(exams.professionalId, professionals.id))
      .where(
        and(
          gte(exams.requestDate, sinceDate),
          lte(exams.requestDate, untilDate)
        )
      )
      .limit(options?.limit ?? 1000)
      .offset(options?.offset ?? 0);

    console.log(`[e-SUS Extractor] Found ${rows.length} exams`);

    const dtos: ESUSExamDTO[] = [];
    const statusMap: Record<string, "requested" | "collected" | "completed" | "cancelled"> = {
      "pending": "requested",
      "in_progress": "collected",
      "completed": "completed",
      "cancelled": "cancelled",
    };
    
    for (const row of rows) {
      try {
        // Validar CNS obrigatório do profissional
        const professionalCNS = cleanCNS(row.professionalCNS);
        if (!professionalCNS) {
          console.error(`[e-SUS Extractor] Skipping exam ${row.id}: Invalid professional CNS`);
          continue;
        }

        const dto: ESUSExamDTO = {
          citizenCPF: cleanCPF(row.citizenCPF),
          citizenCNS: cleanCNS(row.citizenCNS),
          professionalCNS: professionalCNS,
          examCode: row.type, // TODO: mapear para código SIGTAP
          examType: row.type,
          requestDate: formatDateISO(row.requestDate),
          completionDate: row.completionDate ? formatDateISO(row.completionDate) : undefined,
          status: statusMap[row.status] ?? "requested",
          result: row.result ?? undefined,
          unitCNES: "1234567", // TODO: adicionar unitId em exams
        };

        const validated = ESUSExamSchema.parse(dto);
        dtos.push(validated);
      } catch (error) {
        console.error(`[e-SUS Extractor] Failed to validate exam ${row.id}:`, error);
      }
    }

    console.log(`[e-SUS Extractor] Successfully validated ${dtos.length}/${rows.length} exams`);
    return dtos;
    
  } catch (error) {
    console.error("[e-SUS Extractor] Error extracting exams:", error);
    throw new Error(`Failed to extract exams: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// ============================================================================
// Extrator de TFD
// ============================================================================

export async function extractTFD(
  since: string,
  until: string,
  options?: { limit?: number; offset?: number }
): Promise<ESUSTFDDTO[]> {
  try {
    console.log(`[e-SUS Extractor] Extracting TFD requests from ${since} to ${until}`);
    
    const sinceDate = new Date(since);
    const untilDate = new Date(until);
    
    const rows = await db
      .select({
        id: tfdRequests.id,
        destination: tfdRequests.destination,
        procedure: tfdRequests.procedure,
        justification: tfdRequests.justification,
        requestDate: tfdRequests.requestDate,
        travelDate: tfdRequests.travelDate,
        returnDate: tfdRequests.returnDate,
        status: tfdRequests.status,
        transportType: tfdRequests.transportType,
        companion: tfdRequests.companion,
        citizenCPF: citizens.cpf,
        citizenCNS: citizens.cns,
        professionalCNS: professionals.cns,
        unitCNES: healthUnits.cnes,
      })
      .from(tfdRequests)
      .innerJoin(citizens, eq(tfdRequests.citizenId, citizens.id))
      .innerJoin(professionals, eq(tfdRequests.professionalId, professionals.id))
      .innerJoin(healthUnits, eq(tfdRequests.unitId, healthUnits.id))
      .where(
        and(
          gte(tfdRequests.requestDate, sinceDate),
          lte(tfdRequests.requestDate, untilDate)
        )
      )
      .limit(options?.limit ?? 1000)
      .offset(options?.offset ?? 0);

    console.log(`[e-SUS Extractor] Found ${rows.length} TFD requests`);

    const dtos: ESUSTFDDTO[] = [];
    const transportMap: Record<string, "ambulance" | "vehicle" | "air"> = {
      "ambulancia": "ambulance",
      "veiculo": "vehicle",
      "aereo": "air",
    };
    
    for (const row of rows) {
      try {
        // Validar CNS obrigatório do profissional
        const professionalCNS = cleanCNS(row.professionalCNS);
        if (!professionalCNS) {
          console.error(`[e-SUS Extractor] Skipping TFD ${row.id}: Invalid professional CNS`);
          continue;
        }

        const dto: ESUSTFDDTO = {
          citizenCPF: cleanCPF(row.citizenCPF),
          citizenCNS: cleanCNS(row.citizenCNS),
          professionalCNS: professionalCNS,
          destination: row.destination,
          procedure: row.procedure,
          justification: row.justification,
          requestDate: formatDateISO(row.requestDate),
          travelDate: row.travelDate ? formatDateISO(row.travelDate) : undefined,
          returnDate: row.returnDate ? formatDateISO(row.returnDate) : undefined,
          status: row.status as any,
          transportType: row.transportType ? transportMap[row.transportType] : undefined,
          hasCompanion: row.companion ?? false,
          originUnitCNES: row.unitCNES,
        };

        const validated = ESUSTFDSchema.parse(dto);
        dtos.push(validated);
      } catch (error) {
        console.error(`[e-SUS Extractor] Failed to validate TFD ${row.id}:`, error);
      }
    }

    console.log(`[e-SUS Extractor] Successfully validated ${dtos.length}/${rows.length} TFD requests`);
    return dtos;
    
  } catch (error) {
    console.error("[e-SUS Extractor] Error extracting TFD requests:", error);
    throw new Error(`Failed to extract TFD: ${error instanceof Error ? error.message : String(error)}`);
  }
}
