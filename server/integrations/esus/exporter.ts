import { XMLBuilder } from "fast-xml-parser";
import { promises as fs } from "fs";
import path from "path";
import { 
  ESUSExportBatchSchema, 
  type ESUSExportBatchDTO,
  type ESUSCitizenDTO,
  type ESUSConsultationDTO,
  type ESUSProcedureDTO,
  type ESUSExamDTO,
  type ESUSTFDDTO,
} from "./schemas";
import {
  extractCitizens,
  extractConsultations,
  extractProcedures,
  extractExams,
  extractTFD,
} from "./extractor";

/**
 * Exportador de dados e-SUS APS
 * 
 * Gera arquivos JSON e XML conforme especificações do e-SUS/DATASUS
 */

// ============================================================================
// Constantes
// ============================================================================

const MUNICIPALITY_CODE = "2906501"; // Cardeal da Silva/BA
const SYSTEM_NAME = "PEC Integrado Municipal";
const SYSTEM_VERSION = "1.0.0";

// ============================================================================
// Geração de Payload
// ============================================================================

export interface ExportOptions {
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
  healthUnitCNES: string;
  limit?: number;
}

export async function generateExportPayload(options: ExportOptions): Promise<ESUSExportBatchDTO> {
  console.log(`[e-SUS Exporter] Generating export payload from ${options.from} to ${options.to}`);
  
  const batchId = crypto.randomUUID();
  const exportDate = new Date().toISOString();
  
  // Extrair dados de todas as entidades
  const [citizens, consultations, procedures, examsData, tfdRequests] = await Promise.all([
    extractCitizens(options.from, options.to, { limit: options.limit }),
    extractConsultations(options.from, options.to, { limit: options.limit }),
    extractProcedures(options.from, options.to, { limit: options.limit }),
    extractExams(options.from, options.to, { limit: options.limit }),
    extractTFD(options.from, options.to, { limit: options.limit }),
  ]);
  
  console.log(`[e-SUS Exporter] Extracted data:`, {
    cidadaos: citizens.length,
    atendimentos: consultations.length,
    procedimentos: procedures.length,
    exames: examsData.length,
    solicitacoesTFD: tfdRequests.length,
  });
  
  // Montar payload (nomes em português conforme DATASUS)
  const payload: ESUSExportBatchDTO = {
    batchId,
    exportDate,
    startDate: options.from,
    endDate: options.to,
    municipalityCode: MUNICIPALITY_CODE,
    healthUnitCNES: options.healthUnitCNES,
    systemName: SYSTEM_NAME,
    systemVersion: SYSTEM_VERSION,
    cidadaos: citizens,
    atendimentos: consultations,
    procedimentos: procedures,
    exames: examsData,
    solicitacoesTFD: tfdRequests,
    totalRegistros: {
      cidadaos: citizens.length,
      atendimentos: consultations.length,
      procedimentos: procedures.length,
      exames: examsData.length,
      solicitacoesTFD: tfdRequests.length,
    },
  };
  
  // Validar com Zod
  const validated = ESUSExportBatchSchema.parse(payload);
  
  console.log(`[e-SUS Exporter] Payload validated successfully`);
  return validated;
}

// ============================================================================
// Exportação para Arquivos
// ============================================================================

export interface ExportResult {
  jsonPath: string;
  xmlPath: string;
  batchId: string;
  totalRegistros: {
    cidadaos: number;
    atendimentos: number;
    procedimentos: number;
    exames: number;
    solicitacoesTFD: number;
  };
}

export async function exportToFiles(
  municipioCode: string,
  period: { from: string; to: string },
  payload: ESUSExportBatchDTO
): Promise<ExportResult> {
  console.log(`[e-SUS Exporter] Exporting to files for municipality ${municipioCode}`);
  
  // Criar diretório de saída
  const dirName = `esus_${municipioCode}_${period.from}_${period.to}`;
  const dir = path.join(process.cwd(), "tmp", dirName);
  
  await fs.mkdir(dir, { recursive: true });
  console.log(`[e-SUS Exporter] Created directory: ${dir}`);
  
  // === Gerar arquivo JSON ===
  const jsonPath = path.join(dir, "export.json");
  const jsonContent = JSON.stringify(payload, null, 2);
  await fs.writeFile(jsonPath, jsonContent, "utf8");
  console.log(`[e-SUS Exporter] JSON file created: ${jsonPath}`);
  
  // === Gerar arquivo XML ===
  const xmlBuilder = new XMLBuilder({
    ignoreAttributes: false,
    format: true,
    indentBy: "  ",
    suppressEmptyNode: true,
    arrayNodeName: "item",
  });
  
  // Estrutura XML compatível com DATASUS/e-SUS
  // NOTA: Estrutura seguindo padrão documentado, nomes em português conforme DATASUS
  const xmlData = {
    "?xml": {
      "@_version": "1.0",
      "@_encoding": "UTF-8",
    },
    loteExportacao: {
      "@_versao": "1.0",
      "@_sistema": payload.systemName,
      metadados: {
        identificadorLote: payload.batchId,
        dataHoraExportacao: payload.exportDate,
        periodo: {
          dataInicio: payload.startDate,
          dataFim: payload.endDate,
        },
        origem: {
          codigoMunicipio: payload.municipalityCode,
          cnes: payload.healthUnitCNES,
        },
        sistemaOrigem: {
          nome: payload.systemName,
          versao: payload.systemVersion,
        },
      },
      totalRegistros: payload.totalRegistros,
      // Dados - cada array é uma lista direta de elementos, não aninhados
      cidadaos: payload.cidadaos && payload.cidadaos.length > 0 ? payload.cidadaos : undefined,
      atendimentos: payload.atendimentos && payload.atendimentos.length > 0 ? payload.atendimentos : undefined,
      procedimentos: payload.procedimentos && payload.procedimentos.length > 0 ? payload.procedimentos : undefined,
      exames: payload.exames && payload.exames.length > 0 ? payload.exames : undefined,
      solicitacoesTFD: payload.solicitacoesTFD && payload.solicitacoesTFD.length > 0 ? payload.solicitacoesTFD : undefined,
    },
  };
  
  const xmlContent = xmlBuilder.build(xmlData);
  const xmlPath = path.join(dir, "export.xml");
  await fs.writeFile(xmlPath, xmlContent, "utf8");
  console.log(`[e-SUS Exporter] XML file created: ${xmlPath}`);
  
  // Gerar arquivo de metadados
  const metadataPath = path.join(dir, "metadata.json");
  const metadata = {
    batchId: payload.batchId,
    exportDate: payload.exportDate,
    period: {
      from: period.from,
      to: period.to,
    },
    municipalityCode: municipioCode,
    totalRegistros: payload.totalRegistros,
    files: {
      json: "export.json",
      xml: "export.xml",
    },
  };
  await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), "utf8");
  console.log(`[e-SUS Exporter] Metadata file created: ${metadataPath}`);
  
  return {
    jsonPath,
    xmlPath,
    batchId: payload.batchId,
    totalRegistros: payload.totalRegistros,
  };
}

// ============================================================================
// Função Principal de Exportação
// ============================================================================

export async function generateExport(options: ExportOptions): Promise<ExportResult> {
  console.log(`[e-SUS Exporter] Starting export process`);
  console.log(`[e-SUS Exporter] Options:`, options);
  
  try {
    // 1. Gerar payload validado
    const payload = await generateExportPayload(options);
    
    // 2. Exportar para arquivos
    const result = await exportToFiles(
      MUNICIPALITY_CODE,
      { from: options.from, to: options.to },
      payload
    );
    
    console.log(`[e-SUS Exporter] Export completed successfully`);
    console.log(`[e-SUS Exporter] Batch ID: ${result.batchId}`);
    console.log(`[e-SUS Exporter] JSON: ${result.jsonPath}`);
    console.log(`[e-SUS Exporter] XML: ${result.xmlPath}`);
    
    return result;
    
  } catch (error) {
    console.error(`[e-SUS Exporter] Export failed:`, error);
    throw new Error(`Export failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}
