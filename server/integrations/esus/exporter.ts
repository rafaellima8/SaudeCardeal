import { v4 as uuidv4 } from "uuid";
import {
  extractCitizens,
  extractConsultations,
  extractProcedures,
  extractExams,
  extractTFD,
} from "./extractor";
import {
  ESUSExportBatchSchema,
  type ESUSExportBatchDTO,
  ESUSCitizenSchema,
  ESUSConsultationSchema,
  ESUSProcedureSchema,
  ESUSExamSchema,
  ESUSTFDSchema,
} from "./schemas";
import { XMLBuilder } from "fast-xml-parser";

/**
 * Código IBGE do município de Cardeal da Silva/BA
 */
const MUNICIPALITY_CODE = "2906501";

/**
 * Interface para opções de exportação
 */
export interface ExportOptions {
  startDate?: Date;
  endDate?: Date;
  format?: "json" | "xml";
  unitCNES?: string;
  includeTypes?: ("citizens" | "consultations" | "procedures" | "exams" | "tfd")[];
}

/**
 * Valida um array de dados contra um schema Zod
 */
function validateData<T>(
  data: unknown[],
  schema: any,
  typeName: string
): { valid: T[]; errors: Array<{ index: number; error: string }> } {
  const valid: T[] = [];
  const errors: Array<{ index: number; error: string }> = [];
  
  data.forEach((item, index) => {
    const result = schema.safeParse(item);
    if (result.success) {
      valid.push(result.data);
    } else {
      errors.push({
        index,
        error: `${typeName}[${index}]: ${result.error.errors.map(e => `${e.path.join(".")}: ${e.message}`).join(", ")}`,
      });
    }
  });
  
  return { valid, errors };
}

/**
 * Gera uma exportação e-SUS APS completa
 * 
 * @param options Opções de exportação (período, formato, etc)
 * @returns Lote de exportação validado no formato e-SUS
 */
export async function generateExport(
  options: ExportOptions = {}
): Promise<{ batch: ESUSExportBatchDTO; errors: string[] }> {
  const {
    startDate,
    endDate,
    format = "json",
    unitCNES,
    includeTypes = ["citizens", "consultations", "procedures", "exams", "tfd"],
  } = options;
  
  // Definir período padrão se não fornecido (último mês)
  const end = endDate || new Date();
  const start = startDate || new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  console.log(`🔄 Iniciando exportação e-SUS APS...`);
  console.log(`📅 Período: ${start.toISOString().split("T")[0]} a ${end.toISOString().split("T")[0]}`);
  
  const allErrors: string[] = [];
  
  // Extrair dados
  let citizensData: any[] = [];
  let consultationsData: any[] = [];
  let proceduresData: any[] = [];
  let examsData: any[] = [];
  let tfdData: any[] = [];
  
  try {
    if (includeTypes.includes("citizens")) {
      console.log("📋 Extraindo cidadãos...");
      citizensData = await extractCitizens(start, end);
      console.log(`✅ ${citizensData.length} cidadãos extraídos`);
    }
    
    if (includeTypes.includes("consultations")) {
      console.log("🩺 Extraindo consultas...");
      consultationsData = await extractConsultations(start, end);
      console.log(`✅ ${consultationsData.length} consultas extraídas`);
    }
    
    if (includeTypes.includes("procedures")) {
      console.log("💉 Extraindo procedimentos...");
      proceduresData = await extractProcedures(start, end);
      console.log(`✅ ${proceduresData.length} procedimentos extraídos`);
    }
    
    if (includeTypes.includes("exams")) {
      console.log("🔬 Extraindo exames...");
      examsData = await extractExams(start, end);
      console.log(`✅ ${examsData.length} exames extraídos`);
    }
    
    if (includeTypes.includes("tfd")) {
      console.log("🚗 Extraindo solicitações TFD...");
      tfdData = await extractTFD(start, end);
      console.log(`✅ ${tfdData.length} solicitações TFD extraídas`);
    }
  } catch (error) {
    console.error("❌ Erro ao extrair dados:", error);
    throw new Error(`Falha na extração de dados: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
  }
  
  // Validar dados
  console.log("🔍 Validando dados contra schemas e-SUS...");
  
  const { valid: validCitizens, errors: citizenErrors } = validateData(
    citizensData,
    ESUSCitizenSchema,
    "Cidadão"
  );
  
  const { valid: validConsultations, errors: consultationErrors } = validateData(
    consultationsData,
    ESUSConsultationSchema,
    "Consulta"
  );
  
  const { valid: validProcedures, errors: procedureErrors } = validateData(
    proceduresData,
    ESUSProcedureSchema,
    "Procedimento"
  );
  
  const { valid: validExams, errors: examErrors } = validateData(
    examsData,
    ESUSExamSchema,
    "Exame"
  );
  
  const { valid: validTFD, errors: tfdErrors } = validateData(
    tfdData,
    ESUSTFDSchema,
    "TFD"
  );
  
  // Coletar todos os erros de validação
  allErrors.push(...citizenErrors.map(e => e.error));
  allErrors.push(...consultationErrors.map(e => e.error));
  allErrors.push(...procedureErrors.map(e => e.error));
  allErrors.push(...examErrors.map(e => e.error));
  allErrors.push(...tfdErrors.map(e => e.error));
  
  if (allErrors.length > 0) {
    console.warn(`⚠️  ${allErrors.length} erros de validação encontrados`);
    allErrors.forEach(error => console.warn(`  - ${error}`));
  }
  
  console.log("✅ Validação concluída:");
  console.log(`  - Cidadãos válidos: ${validCitizens.length}/${citizensData.length}`);
  console.log(`  - Consultas válidas: ${validConsultations.length}/${consultationsData.length}`);
  console.log(`  - Procedimentos válidos: ${validProcedures.length}/${proceduresData.length}`);
  console.log(`  - Exames válidos: ${validExams.length}/${examsData.length}`);
  console.log(`  - TFD válidos: ${validTFD.length}/${tfdData.length}`);
  
  // Obter CNES da primeira unidade (ou usar fornecido)
  const defaultCNES = unitCNES || "0000000"; // TODO: Obter do banco
  
  // Montar lote de exportação
  const batch: ESUSExportBatchDTO = {
    batchId: uuidv4(),
    exportDate: new Date().toISOString(),
    startDate: start.toISOString().split("T")[0],
    endDate: end.toISOString().split("T")[0],
    municipalityCode: MUNICIPALITY_CODE,
    healthUnitCNES: defaultCNES,
    systemName: "MuniSaúde Integrado - PEC Municipal",
    systemVersion: "1.0.0",
    cidadaos: validCitizens.length > 0 ? validCitizens : undefined,
    atendimentos: validConsultations.length > 0 ? validConsultations : undefined,
    procedimentos: validProcedures.length > 0 ? validProcedures : undefined,
    exames: validExams.length > 0 ? validExams : undefined,
    solicitacoesTFD: validTFD.length > 0 ? validTFD : undefined,
    totalRegistros: {
      cidadaos: validCitizens.length,
      atendimentos: validConsultations.length,
      procedimentos: validProcedures.length,
      exames: validExams.length,
      solicitacoesTFD: validTFD.length,
    },
  };
  
  // Validar lote completo
  console.log("🔍 Validando lote completo...");
  const batchValidation = ESUSExportBatchSchema.safeParse(batch);
  
  if (!batchValidation.success) {
    const batchErrors = batchValidation.error.errors.map(
      e => `Lote: ${e.path.join(".")}: ${e.message}`
    );
    allErrors.push(...batchErrors);
    console.error("❌ Erros na validação do lote:");
    batchErrors.forEach(error => console.error(`  - ${error}`));
    throw new Error(`Lote de exportação inválido: ${batchErrors.join(", ")}`);
  }
  
  console.log("✅ Lote de exportação validado com sucesso!");
  console.log(`📦 Total de registros: ${
    batch.totalRegistros.cidadaos +
    batch.totalRegistros.atendimentos +
    batch.totalRegistros.procedimentos +
    batch.totalRegistros.exames +
    batch.totalRegistros.solicitacoesTFD
  }`);
  
  return {
    batch: batchValidation.data,
    errors: allErrors,
  };
}

/**
 * Converte lote e-SUS para formato XML
 * 
 * @param batch Lote de exportação validado
 * @returns String XML no formato e-SUS SISAB
 */
export function convertToXML(batch: ESUSExportBatchDTO): string {
  const xmlBuilder = new XMLBuilder({
    ignoreAttributes: false,
    format: true,
    indentBy: "  ",
  });
  
  // Estrutura XML conforme padrão e-SUS SISAB
  const xmlObject = {
    "?xml": {
      "@_version": "1.0",
      "@_encoding": "UTF-8",
    },
    LoteExportacaoESUS: {
      "@_xmlns": "http://esus.saude.gov.br/v5",
      MetadanosLote: {
        identificadorLote: batch.batchId,
        dataExportacao: batch.exportDate,
        periodoInicio: batch.startDate,
        periodoFim: batch.endDate,
        municipio: batch.municipalityCode,
        unidadeSaude: batch.healthUnitCNES,
        sistema: {
          nome: batch.systemName,
          versao: batch.systemVersion || "1.0.0",
        },
      },
      TotalRegistros: {
        cidadaos: batch.totalRegistros.cidadaos,
        atendimentos: batch.totalRegistros.atendimentos,
        procedimentos: batch.totalRegistros.procedimentos,
        exames: batch.totalRegistros.exames,
        solicitacoesTFD: batch.totalRegistros.solicitacoesTFD,
      },
      Dados: {
        Cidadaos: batch.cidadaos ? { Cidadao: batch.cidadaos } : undefined,
        Atendimentos: batch.atendimentos ? { Atendimento: batch.atendimentos } : undefined,
        Procedimentos: batch.procedimentos ? { Procedimento: batch.procedimentos } : undefined,
        Exames: batch.exames ? { Exame: batch.exames } : undefined,
        SolicitacoesTFD: batch.solicitacoesTFD ? { SolicitacaoTFD: batch.solicitacoesTFD } : undefined,
      },
    },
  };
  
  return xmlBuilder.build(xmlObject);
}

/**
 * Converte lote e-SUS para formato JSON (para testes)
 * 
 * @param batch Lote de exportação validado
 * @returns String JSON formatada
 */
export function convertToJSON(batch: ESUSExportBatchDTO): string {
  return JSON.stringify(batch, null, 2);
}
