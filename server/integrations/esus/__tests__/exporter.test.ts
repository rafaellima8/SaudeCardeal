import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { XMLParser } from 'fast-xml-parser';
import { generateExport, generateExportPayload } from '../exporter';

describe('e-SUS Exporter - File Generation', () => {
  const testDir = path.join(process.cwd(), 'tmp', 'test-exports');
  
  beforeAll(async () => {
    await fs.mkdir(testDir, { recursive: true });
  });
  
  afterAll(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('generateExportPayload', () => {
    it('should generate valid export payload with Portuguese field names', async () => {
      const payload = await generateExportPayload({
        from: '2024-09-01',
        to: '2024-09-30',
        healthUnitCNES: '1234567',
      });

      // Verificar estrutura do payload
      expect(payload).toHaveProperty('batchId');
      expect(payload).toHaveProperty('exportDate');
      expect(payload).toHaveProperty('municipalityCode', '2906501');
      expect(payload).toHaveProperty('healthUnitCNES', '1234567');
      
      // Verificar nomes em português (DATASUS)
      expect(payload).toHaveProperty('cidadaos');
      expect(payload).toHaveProperty('atendimentos');
      expect(payload).toHaveProperty('procedimentos');
      expect(payload).toHaveProperty('exames');
      expect(payload).toHaveProperty('solicitacoesTFD');
      expect(payload).toHaveProperty('totalRegistros');

      // Verificar que são arrays
      expect(Array.isArray(payload.cidadaos)).toBe(true);
      expect(Array.isArray(payload.atendimentos)).toBe(true);
      expect(Array.isArray(payload.procedimentos)).toBe(true);
      expect(Array.isArray(payload.exames)).toBe(true);
      expect(Array.isArray(payload.solicitacoesTFD)).toBe(true);

      // Verificar totalRegistros
      expect(payload.totalRegistros).toHaveProperty('cidadaos');
      expect(payload.totalRegistros).toHaveProperty('atendimentos');
      expect(payload.totalRegistros).toHaveProperty('procedimentos');
      expect(payload.totalRegistros).toHaveProperty('exames');
      expect(payload.totalRegistros).toHaveProperty('solicitacoesTFD');
    });

    it('should include correct metadata in payload', async () => {
      const payload = await generateExportPayload({
        from: '2024-01-01',
        to: '2024-12-31',
        healthUnitCNES: '9876543',
      });

      expect(payload.startDate).toBe('2024-01-01');
      expect(payload.endDate).toBe('2024-12-31');
      expect(payload.systemName).toBe('PEC Integrado Municipal');
      expect(payload.systemVersion).toBeDefined();
      expect(payload.municipalityCode).toBe('2906501'); // Cardeal da Silva
    });
  });

  describe('generateExport - File Generation', () => {
    it('should generate both JSON and XML files', async () => {
      const result = await generateExport({
        from: '2024-09-01',
        to: '2024-09-30',
        healthUnitCNES: '1234567',
      });

      expect(result).toHaveProperty('jsonPath');
      expect(result).toHaveProperty('xmlPath');
      expect(result).toHaveProperty('batchId');
      expect(result).toHaveProperty('totalRegistros');

      // Verificar que os arquivos existem
      const jsonExists = await fs.access(result.jsonPath).then(() => true).catch(() => false);
      const xmlExists = await fs.access(result.xmlPath).then(() => true).catch(() => false);

      expect(jsonExists).toBe(true);
      expect(xmlExists).toBe(true);
    });

    it('should generate valid JSON file with correct structure', async () => {
      const result = await generateExport({
        from: '2024-01-01',
        to: '2024-01-31',
        healthUnitCNES: '1234567',
      });

      const jsonContent = await fs.readFile(result.jsonPath, 'utf-8');
      const jsonData = JSON.parse(jsonContent);

      // Verificar estrutura JSON (nomes em português)
      expect(jsonData).toHaveProperty('batchId');
      expect(jsonData).toHaveProperty('cidadaos');
      expect(jsonData).toHaveProperty('atendimentos');
      expect(jsonData).toHaveProperty('procedimentos');
      expect(jsonData).toHaveProperty('exames');
      expect(jsonData).toHaveProperty('solicitacoesTFD');
      expect(jsonData).toHaveProperty('totalRegistros');
      
      // Verificar que totalRegistros tem as propriedades corretas
      expect(jsonData.totalRegistros).toHaveProperty('cidadaos');
      expect(jsonData.totalRegistros).toHaveProperty('atendimentos');
      expect(jsonData.totalRegistros).toHaveProperty('procedimentos');
      expect(jsonData.totalRegistros).toHaveProperty('exames');
      expect(jsonData.totalRegistros).toHaveProperty('solicitacoesTFD');
    });

    it('should generate valid XML file with correct structure', async () => {
      const result = await generateExport({
        from: '2024-01-01',
        to: '2024-01-31',
        healthUnitCNES: '1234567',
      });

      const xmlContent = await fs.readFile(result.xmlPath, 'utf-8');
      const parser = new XMLParser({ ignoreAttributes: false });
      const xmlData = parser.parse(xmlContent);

      // Verificar estrutura XML (nomes em português DATASUS)
      expect(xmlData).toHaveProperty('loteExportacao');
      expect(xmlData.loteExportacao).toHaveProperty('metadados');
      expect(xmlData.loteExportacao).toHaveProperty('totalRegistros');
      
      // Verificar metadados
      const metadata = xmlData.loteExportacao.metadados;
      expect(metadata).toHaveProperty('identificadorLote');
      expect(metadata).toHaveProperty('periodo');
      expect(metadata.periodo).toHaveProperty('dataInicio', '2024-01-01');
      expect(metadata.periodo).toHaveProperty('dataFim', '2024-01-31');
      
      // Verificar totalRegistros (nomes em português)
      const totals = xmlData.loteExportacao.totalRegistros;
      expect(totals).toHaveProperty('cidadaos');
      expect(totals).toHaveProperty('atendimentos');
      expect(totals).toHaveProperty('procedimentos');
      expect(totals).toHaveProperty('exames');
      expect(totals).toHaveProperty('solicitacoesTFD');
    });

    it('should create files in correct directory structure', async () => {
      const result = await generateExport({
        from: '2024-05-01',
        to: '2024-05-31',
        healthUnitCNES: '1234567',
      });

      // Verificar que o caminho contém a estrutura esperada
      expect(result.jsonPath).toContain('esus_2906501_2024-05-01_2024-05-31');
      expect(result.xmlPath).toContain('esus_2906501_2024-05-01_2024-05-31');
      
      // Verificar que os arquivos têm os nomes corretos
      expect(result.jsonPath).toMatch(/export\.json$/);
      expect(result.xmlPath).toMatch(/export\.xml$/);
    });

    it('should handle limit parameter correctly', async () => {
      const resultWithLimit = await generateExport({
        from: '2024-01-01',
        to: '2024-12-31',
        healthUnitCNES: '1234567',
        limit: 10,
      });

      expect(resultWithLimit).toHaveProperty('totalRegistros');
      
      // Com banco vazio, todos devem ser 0, mas a estrutura deve estar correta
      const totals = resultWithLimit.totalRegistros;
      expect(typeof totals.cidadaos).toBe('number');
      expect(typeof totals.atendimentos).toBe('number');
      expect(typeof totals.procedimentos).toBe('number');
      expect(typeof totals.exames).toBe('number');
      expect(typeof totals.solicitacoesTFD).toBe('number');
    });
  });

  describe('XML Snapshot Testing', () => {
    it('should generate consistent XML structure', async () => {
      const result = await generateExport({
        from: '2024-01-01',
        to: '2024-01-31',
        healthUnitCNES: '1234567',
      });

      const xmlContent = await fs.readFile(result.xmlPath, 'utf-8');
      
      // Verificar header XML
      expect(xmlContent).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      
      // Verificar tags principais (nomes em português DATASUS)
      expect(xmlContent).toContain('<loteExportacao');
      expect(xmlContent).toContain('<metadados>');
      expect(xmlContent).toContain('<identificadorLote>');
      expect(xmlContent).toContain('<periodo>');
      expect(xmlContent).toContain('<dataInicio>2024-01-01</dataInicio>');
      expect(xmlContent).toContain('<dataFim>2024-01-31</dataFim>');
      expect(xmlContent).toContain('<codigoMunicipio>2906501</codigoMunicipio>');
      expect(xmlContent).toContain('<totalRegistros>');
      expect(xmlContent).toContain('<cidadaos>');
      expect(xmlContent).toContain('<atendimentos>');
      expect(xmlContent).toContain('<procedimentos>');
      expect(xmlContent).toContain('<exames>');
      expect(xmlContent).toContain('<solicitacoesTFD>');
      expect(xmlContent).toContain('</loteExportacao>');
    });

    it('should generate well-formed XML that can be parsed', async () => {
      const result = await generateExport({
        from: '2024-01-01',
        to: '2024-01-31',
        healthUnitCNES: '1234567',
      });

      const xmlContent = await fs.readFile(result.xmlPath, 'utf-8');
      const parser = new XMLParser({ ignoreAttributes: false, parseTagValue: true });
      
      // Não deve lançar erro ao fazer parse
      expect(() => parser.parse(xmlContent)).not.toThrow();
      
      const xmlData = parser.parse(xmlContent);
      
      // Verificar que a estrutura é válida
      expect(xmlData.loteExportacao).toBeDefined();
      expect(xmlData.loteExportacao.metadados).toBeDefined();
      expect(xmlData.loteExportacao.totalRegistros).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should throw error for invalid date format', async () => {
      await expect(
        generateExport({
          from: 'invalid-date',
          to: '2024-01-31',
          healthUnitCNES: '1234567',
        })
      ).rejects.toThrow();
    });

    it('should handle empty date range gracefully', async () => {
      const result = await generateExport({
        from: '2024-01-01',
        to: '2024-01-01', // mesmo dia
        healthUnitCNES: '1234567',
      });

      expect(result).toHaveProperty('totalRegistros');
      // Deve retornar estrutura válida mesmo sem dados
      expect(result.totalRegistros.cidadaos).toBeGreaterThanOrEqual(0);
    });
  });
});
