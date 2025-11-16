import { describe, it, expect } from 'vitest';
import {
  ESUSCitizenSchema,
  ESUSConsultationSchema,
  ESUSProcedureSchema,
  ESUSExamSchema,
  ESUSTFDSchema,
  ESUSExportBatchSchema,
  type ESUSCitizenDTO,
  type ESUSConsultationDTO,
  type ESUSProcedureDTO,
} from '../schemas';

describe('e-SUS Export Schemas - Validation', () => {
  
  // ============================================================================
  // CIDADÃO (Citizen)
  // ============================================================================
  
  describe('ESUSCitizenSchema', () => {
    it('should validate a valid citizen with all required fields', () => {
      const validCitizen: ESUSCitizenDTO = {
        cpf: '12345678901',
        cns: '123456789012345',
        name: 'João da Silva',
        birthDate: '1985-03-15',
        sex: 'M',
      };

      const result = ESUSCitizenSchema.safeParse(validCitizen);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.cpf).toBe('12345678901');
        expect(result.data.cns).toBe('123456789012345');
      }
    });

    it('should validate citizen with optional fields', () => {
      const citizenWithOptionals: ESUSCitizenDTO = {
        cpf: '98765432100',
        name: 'Maria Santos',
        birthDate: '1990-07-22',
        sex: 'F',
        phone: '71987654321',
        email: 'maria@example.com',
        address: {
          street: 'Rua das Flores',
          number: '123',
          neighborhood: 'Centro',
          city: 'Cardeal da Silva',
          cityCode: '2906501',
          state: 'BA',
          zipCode: '48190000',
        },
        bloodType: 'O+',
        allergies: ['Penicilina', 'Dipirona'],
        familyGroup: 'Família Santos',
        healthUnitCNES: '1234567',
      };

      const result = ESUSCitizenSchema.safeParse(citizenWithOptionals);
      expect(result.success).toBe(true);
    });

    it('should reject invalid CPF (wrong length)', () => {
      const invalidCitizen = {
        cpf: '123456789', // Apenas 9 dígitos
        name: 'João Silva',
        birthDate: '1985-03-15',
        sex: 'M',
      };

      const result = ESUSCitizenSchema.safeParse(invalidCitizen);
      expect(result.success).toBe(false);
    });

    it('should reject CPF with formatting', () => {
      const invalidCitizen = {
        cpf: '123.456.789-01', // Com pontos e hífen
        name: 'João Silva',
        birthDate: '1985-03-15',
        sex: 'M',
      };

      const result = ESUSCitizenSchema.safeParse(invalidCitizen);
      expect(result.success).toBe(false);
    });

    it('should reject invalid CNS (wrong length)', () => {
      const invalidCitizen = {
        cpf: '12345678901',
        cns: '12345', // Apenas 5 dígitos (deve ter 15)
        name: 'João Silva',
        birthDate: '1985-03-15',
        sex: 'M',
      };

      const result = ESUSCitizenSchema.safeParse(invalidCitizen);
      expect(result.success).toBe(false);
    });

    it('should reject invalid birth date format', () => {
      const invalidCitizen = {
        cpf: '12345678901',
        name: 'João Silva',
        birthDate: '15/03/1985', // Formato brasileiro (deve ser YYYY-MM-DD)
        sex: 'M',
      };

      const result = ESUSCitizenSchema.safeParse(invalidCitizen);
      expect(result.success).toBe(false);
    });

    it('should reject invalid sex value', () => {
      const invalidCitizen = {
        cpf: '12345678901',
        name: 'João Silva',
        birthDate: '1985-03-15',
        sex: 'X', // Apenas M, F ou O são válidos
      };

      const result = ESUSCitizenSchema.safeParse(invalidCitizen);
      expect(result.success).toBe(false);
    });

    it('should accept "O" (Outro) as valid sex', () => {
      const validCitizen = {
        cpf: '12345678901',
        name: 'João Silva',
        birthDate: '1985-03-15',
        sex: 'O',
      };

      const result = ESUSCitizenSchema.safeParse(validCitizen);
      expect(result.success).toBe(true);
    });
  });

  // ============================================================================
  // CONSULTA (Consultation)
  // ============================================================================

  describe('ESUSConsultationSchema', () => {
    it('should validate a valid consultation', () => {
      const validConsultation: ESUSConsultationDTO = {
        citizenCPF: '12345678901',
        professionalCNS: '123456789012345',
        consultationDate: '2024-01-15',
        unitCNES: '1234567',
        type: 'consulta_medica',
      };

      const result = ESUSConsultationSchema.safeParse(validConsultation);
      expect(result.success).toBe(true);
    });

    it('should validate consultation with optional clinical data', () => {
      const consultationWithData: ESUSConsultationDTO = {
        citizenCPF: '12345678901',
        citizenCNS: '123456789012345',
        professionalCNS: '987654321098765',
        consultationDate: '2024-01-15',
        consultationTime: '14:30:00',
        shift: 'afternoon',
        unitCNES: '1234567',
        type: 'consulta_medica',
        appointmentType: 'scheduled',
        chiefComplaint: 'Dor de cabeça há 3 dias',
        cid10: ['R51', 'I10.0'],
        diagnosis: 'Cefaleia tensional, Hipertensão arterial',
        procedures: [
          { code: '0301010072', quantity: 1 },
        ],
        conduct: 'return_scheduled',
      };

      const result = ESUSConsultationSchema.safeParse(consultationWithData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid CID-10 format', () => {
      const invalidConsultation = {
        citizenCPF: '12345678901',
        professionalCNS: '123456789012345',
        consultationDate: '2024-01-15',
        unitCNES: '1234567',
        type: 'consulta_medica',
        cid10: ['ABC123'], // Formato inválido (deve ser A00 ou A00.1)
      };

      const result = ESUSConsultationSchema.safeParse(invalidConsultation);
      expect(result.success).toBe(false);
    });

    it('should validate valid CID-10 codes (with 0, 1 or 2 decimal digits)', () => {
      const validConsultation = {
        citizenCPF: '12345678901',
        professionalCNS: '123456789012345',
        consultationDate: '2024-01-15',
        unitCNES: '1234567',
        type: 'consulta_medica',
        cid10: ['A00', 'B15.0', 'I10', 'R51.9', 'A15.03', 'J18.92'], // Inclui códigos com 2 decimais
      };

      const result = ESUSConsultationSchema.safeParse(validConsultation);
      expect(result.success).toBe(true);
    });

    it('should validate consultation with referral', () => {
      const consultationWithReferral = {
        citizenCPF: '12345678901',
        professionalCNS: '123456789012345',
        consultationDate: '2024-01-15',
        unitCNES: '1234567',
        type: 'consulta_medica',
        conduct: 'referral' as const,
        referral: {
          specialty: 'Cardiologia',
          urgency: 'routine' as const,
        },
      };

      const result = ESUSConsultationSchema.safeParse(consultationWithReferral);
      expect(result.success).toBe(true);
    });
  });

  // ============================================================================
  // PROCEDIMENTO (Procedure)
  // ============================================================================

  describe('ESUSProcedureSchema', () => {
    it('should validate a valid procedure', () => {
      const validProcedure: ESUSProcedureDTO = {
        professionalCNS: '123456789012345',
        procedureCode: '0301010072',
        procedureName: 'Consulta médica em atenção básica',
        quantity: 1,
        unitCNES: '1234567',
        executionDate: '2024-01-15',
      };

      const result = ESUSProcedureSchema.safeParse(validProcedure);
      expect(result.success).toBe(true);
    });

    it('should validate procedure with team information', () => {
      const procedureWithTeam = {
        citizenCPF: '12345678901',
        professionalCNS: '123456789012345',
        procedureCode: '0301010080',
        quantity: 1,
        unitCNES: '1234567',
        executionDate: '2024-01-15',
        shift: 'morning' as const,
        teamINE: '0000123456',
        teamType: 'eSF' as const,
      };

      const result = ESUSProcedureSchema.safeParse(procedureWithTeam);
      expect(result.success).toBe(true);
    });

    it('should reject invalid quantity (must be positive)', () => {
      const invalidProcedure = {
        professionalCNS: '123456789012345',
        procedureCode: '0301010072',
        quantity: 0, // Deve ser positivo
        unitCNES: '1234567',
        executionDate: '2024-01-15',
      };

      const result = ESUSProcedureSchema.safeParse(invalidProcedure);
      expect(result.success).toBe(false);
    });

    it('should default quantity to 1 if not provided', () => {
      const procedureNoQuantity = {
        professionalCNS: '123456789012345',
        procedureCode: '0301010072',
        unitCNES: '1234567',
        executionDate: '2024-01-15',
      };

      const result = ESUSProcedureSchema.safeParse(procedureNoQuantity);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.quantity).toBe(1);
      }
    });
  });

  // ============================================================================
  // EXAME (Exam)
  // ============================================================================

  describe('ESUSExamSchema', () => {
    it('should validate a valid exam request', () => {
      const validExam = {
        citizenCPF: '12345678901',
        professionalCNS: '123456789012345',
        examCode: '0202010112',
        examType: 'Hemograma completo',
        requestDate: '2024-01-15',
        status: 'requested' as const,
        unitCNES: '1234567',
      };

      const result = ESUSExamSchema.safeParse(validExam);
      expect(result.success).toBe(true);
    });

    it('should validate exam with result', () => {
      const examWithResult = {
        citizenCPF: '12345678901',
        citizenCNS: '123456789012345',
        professionalCNS: '987654321098765',
        examCode: '0202010112',
        examType: 'Hemograma completo',
        requestDate: '2024-01-10',
        completionDate: '2024-01-15',
        status: 'completed' as const,
        result: 'Hemoglobina: 14.5 g/dL, Leucócitos: 7500/mm³',
        unitCNES: '1234567',
      };

      const result = ESUSExamSchema.safeParse(examWithResult);
      expect(result.success).toBe(true);
    });
  });

  // ============================================================================
  // TFD (Tratamento Fora do Domicílio)
  // ============================================================================

  describe('ESUSTFDSchema', () => {
    it('should validate a valid TFD request', () => {
      const validTFD = {
        citizenCPF: '12345678901',
        professionalCNS: '123456789012345',
        destination: 'Hospital Especializado - Salvador/BA',
        procedure: 'Cirurgia cardíaca',
        justification: 'Procedimento não disponível no município',
        requestDate: '2024-01-15',
        status: 'pending' as const,
        hasCompanion: false,
        originUnitCNES: '1234567',
      };

      const result = ESUSTFDSchema.safeParse(validTFD);
      expect(result.success).toBe(true);
    });

    it('should validate TFD with full travel information', () => {
      const tfdComplete = {
        citizenCPF: '12345678901',
        citizenCNS: '123456789012345',
        professionalCNS: '987654321098765',
        destination: 'Hospital Especializado',
        destinationCity: 'Salvador',
        destinationCityCode: '2927408',
        procedure: 'Hemodiálise',
        procedureCode: '0305010018',
        justification: 'Tratamento crônico não disponível no município',
        requestDate: '2024-01-10',
        travelDate: '2024-01-20',
        returnDate: '2024-01-20',
        status: 'approved' as const,
        transportType: 'ambulance' as const,
        hasCompanion: true,
        originUnitCNES: '1234567',
      };

      const result = ESUSTFDSchema.safeParse(tfdComplete);
      expect(result.success).toBe(true);
    });

    it('should default hasCompanion to false', () => {
      const tfdNoCompanion = {
        citizenCPF: '12345678901',
        professionalCNS: '123456789012345',
        destination: 'Hospital',
        procedure: 'Exame',
        justification: 'Motivo',
        requestDate: '2024-01-15',
        status: 'pending' as const,
        originUnitCNES: '1234567',
      };

      const result = ESUSTFDSchema.safeParse(tfdNoCompanion);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.hasCompanion).toBe(false);
      }
    });
  });

  // ============================================================================
  // LOTE DE EXPORTAÇÃO (Export Batch)
  // ============================================================================

  describe('ESUSExportBatchSchema', () => {
    it('should validate a complete export batch with simple ISO date', () => {
      const validBatch = {
        batchId: '550e8400-e29b-41d4-a716-446655440000',
        exportDate: '2024-01-31T18:30:00',
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        municipalityCode: '2906501',
        healthUnitCNES: '1234567',
        systemName: 'PEC Integrado Municipal',
        systemVersion: '1.0.0',
        cidadaos: [
          {
            cpf: '12345678901',
            name: 'João Silva',
            birthDate: '1985-03-15',
            sex: 'M' as const,
          },
        ],
        atendimentos: [
          {
            citizenCPF: '12345678901',
            professionalCNS: '123456789012345',
            consultationDate: '2024-01-15',
            unitCNES: '1234567',
            type: 'consulta_medica',
          },
        ],
        totalRegistros: {
          cidadaos: 1,
          atendimentos: 1,
          procedimentos: 0,
          exames: 0,
          solicitacoesTFD: 0,
        },
      };

      const result = ESUSExportBatchSchema.safeParse(validBatch);
      expect(result.success).toBe(true);
    });

    it('should validate export batch with full ISO 8601 date (milliseconds + timezone)', () => {
      const batchWithTimezone = {
        batchId: '550e8400-e29b-41d4-a716-446655440000',
        exportDate: '2024-01-31T18:30:00.123Z', // Com milissegundos e timezone Z
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        municipalityCode: '2906501',
        healthUnitCNES: '1234567',
        totalRegistros: {
          cidadaos: 0,
          atendimentos: 0,
          procedimentos: 0,
          exames: 0,
          solicitacoesTFD: 0,
        },
      };

      const result = ESUSExportBatchSchema.safeParse(batchWithTimezone);
      expect(result.success).toBe(true);
    });

    it('should validate export batch with timezone offset', () => {
      const batchWithOffset = {
        batchId: '550e8400-e29b-41d4-a716-446655440000',
        exportDate: '2024-01-31T18:30:00-03:00', // Horário de Brasília
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        municipalityCode: '2906501',
        healthUnitCNES: '1234567',
        totalRegistros: {
          cidadaos: 0,
          atendimentos: 0,
          procedimentos: 0,
          exames: 0,
          solicitacoesTFD: 0,
        },
      };

      const result = ESUSExportBatchSchema.safeParse(batchWithOffset);
      expect(result.success).toBe(true);
    });

    it('should validate batch with all data types', () => {
      const batchAllTypes = {
        batchId: '550e8400-e29b-41d4-a716-446655440000',
        exportDate: '2024-01-31T18:30:00',
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        municipalityCode: '2906501',
        healthUnitCNES: '1234567',
        cidadaos: [],
        atendimentos: [],
        procedimentos: [],
        exames: [],
        solicitacoesTFD: [],
        totalRegistros: {
          cidadaos: 0,
          atendimentos: 0,
          procedimentos: 0,
          exames: 0,
          solicitacoesTFD: 0,
        },
      };

      const result = ESUSExportBatchSchema.safeParse(batchAllTypes);
      expect(result.success).toBe(true);
    });

    it('should reject invalid municipality code (wrong length)', () => {
      const invalidBatch = {
        batchId: '550e8400-e29b-41d4-a716-446655440000',
        exportDate: '2024-01-31T18:30:00',
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        municipalityCode: '12345', // Deve ter 7 dígitos
        healthUnitCNES: '1234567',
        totalRegistros: {
          cidadaos: 0,
          atendimentos: 0,
          procedimentos: 0,
          exames: 0,
          solicitacoesTFD: 0,
        },
      };

      const result = ESUSExportBatchSchema.safeParse(invalidBatch);
      expect(result.success).toBe(false);
    });
  });
});
