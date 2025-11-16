import { describe, it, expect, beforeAll } from 'vitest';
import { extractCitizens, extractConsultations } from '../extractor';

describe('e-SUS Extractor - Data Extraction', () => {
  
  // Nota: Estes testes assumem que existem dados seed no banco
  // Para rodar os testes com dados reais, execute: npm run db:seed
  
  describe('extractCitizens', () => {
    it('should extract and validate citizens from database', async () => {
      // Extrair cidadãos criados/atualizados no último ano
      const since = '2024-01-01';
      const until = '2025-12-31';
      
      const citizens = await extractCitizens(since, until, { limit: 10 });
      
      // Verificar que retorna array
      expect(Array.isArray(citizens)).toBe(true);
      
      // Se houver dados, validar estrutura
      if (citizens.length > 0) {
        const citizen = citizens[0];
        
        // Campos obrigatórios
        expect(citizen.cpf).toBeDefined();
        expect(citizen.cpf).toMatch(/^\d{11}$/); // 11 dígitos
        expect(citizen.name).toBeDefined();
        expect(citizen.name.length).toBeGreaterThan(0);
        expect(citizen.birthDate).toMatch(/^\d{4}-\d{2}-\d{2}$/); // YYYY-MM-DD
        expect(['M', 'F', 'O']).toContain(citizen.sex);
        
        // CNS opcional mas se existir deve ter 15 dígitos
        if (citizen.cns) {
          expect(citizen.cns).toMatch(/^\d{15}$/);
        }
        
        console.log('Sample citizen:', JSON.stringify(citizen, null, 2));
      } else {
        console.log('No citizens found in the specified period');
      }
    });

    it('should handle pagination correctly', async () => {
      const since = '2024-01-01';
      const until = '2025-12-31';
      
      const firstPage = await extractCitizens(since, until, { limit: 5, offset: 0 });
      const secondPage = await extractCitizens(since, until, { limit: 5, offset: 5 });
      
      expect(Array.isArray(firstPage)).toBe(true);
      expect(Array.isArray(secondPage)).toBe(true);
      
      // Se há dados suficientes, páginas não devem ser idênticas
      if (firstPage.length >= 5 && secondPage.length > 0) {
        expect(firstPage[0].cpf).not.toBe(secondPage[0].cpf);
      }
    });

    it('should clean CPF formatting (remove punctuation)', async () => {
      const since = '2020-01-01';
      const until = '2025-12-31';
      
      const citizens = await extractCitizens(since, until, { limit: 1 });
      
      if (citizens.length > 0) {
        const citizen = citizens[0];
        // CPF não deve ter pontos ou hífens
        expect(citizen.cpf).not.toMatch(/[.-]/);
        expect(citizen.cpf).toMatch(/^\d{11}$/);
      }
    });

    it('should handle empty date range gracefully', async () => {
      const since = '2030-01-01';
      const until = '2030-01-31';
      
      const citizens = await extractCitizens(since, until);
      
      expect(Array.isArray(citizens)).toBe(true);
      expect(citizens.length).toBe(0);
    });
  });

  describe('extractConsultations', () => {
    it('should extract and validate consultations from database', async () => {
      const since = '2024-01-01';
      const until = '2025-12-31';
      
      const consultations = await extractConsultations(since, until, { limit: 10 });
      
      expect(Array.isArray(consultations)).toBe(true);
      
      if (consultations.length > 0) {
        const consultation = consultations[0];
        
        // Campos obrigatórios
        expect(consultation.citizenCPF).toBeDefined();
        expect(consultation.citizenCPF).toMatch(/^\d{11}$/);
        expect(consultation.professionalCNS).toBeDefined();
        expect(consultation.professionalCNS).toMatch(/^\d{15}$/);
        expect(consultation.consultationDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(consultation.unitCNES).toBeDefined();
        expect(consultation.unitCNES.length).toBe(7);
        expect(consultation.type).toBeDefined();
        
        // Campos opcionais
        if (consultation.consultationTime) {
          expect(consultation.consultationTime).toMatch(/^\d{2}:\d{2}:\d{2}$/);
        }
        
        if (consultation.shift) {
          expect(['morning', 'afternoon', 'night']).toContain(consultation.shift);
        }
        
        if (consultation.cid10) {
          expect(Array.isArray(consultation.cid10)).toBe(true);
          consultation.cid10.forEach(code => {
            expect(code).toMatch(/^[A-Z]\d{2}(\.\d{1,2})?$/);
          });
        }
        
        console.log('Sample consultation:', JSON.stringify(consultation, null, 2));
      } else {
        console.log('No consultations found in the specified period');
      }
    });

    it('should calculate shift correctly from consultation time', async () => {
      const since = '2024-01-01';
      const until = '2025-12-31';
      
      const consultations = await extractConsultations(since, until, { limit: 20 });
      
      if (consultations.length > 0) {
        consultations.forEach(consultation => {
          if (consultation.shift && consultation.consultationTime) {
            const hour = parseInt(consultation.consultationTime.split(':')[0]);
            
            if (hour < 12) {
              expect(consultation.shift).toBe('morning');
            } else if (hour < 18) {
              expect(consultation.shift).toBe('afternoon');
            } else {
              expect(consultation.shift).toBe('night');
            }
          }
        });
      }
    });

    it('should handle pagination correctly', async () => {
      const since = '2024-01-01';
      const until = '2025-12-31';
      
      const firstPage = await extractConsultations(since, until, { limit: 3, offset: 0 });
      const secondPage = await extractConsultations(since, until, { limit: 3, offset: 3 });
      
      expect(Array.isArray(firstPage)).toBe(true);
      expect(Array.isArray(secondPage)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should throw error for invalid date format', async () => {
      await expect(
        extractCitizens('invalid-date', '2024-12-31')
      ).rejects.toThrow();
    });

    it('should handle database connection errors gracefully', async () => {
      // Este teste valida que erros de conexão são tratados
      // Em produção, pode falhar se o DB estiver indisponível
      try {
        await extractCitizens('2024-01-01', '2024-12-31');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('Failed to extract');
      }
    });
  });

  describe('Data Validation', () => {
    it('should reject invalid CPF and continue processing', async () => {
      // Se houver um cidadão com CPF inválido no banco,
      // o extractor deve logar o erro e continuar com os outros
      const since = '2020-01-01';
      const until = '2025-12-31';
      
      const citizens = await extractCitizens(since, until);
      
      // Todos os cidadãos retornados devem ter CPF válido
      citizens.forEach(citizen => {
        expect(citizen.cpf).toMatch(/^\d{11}$/);
      });
    });

    it('should validate all consultation CID-10 codes', async () => {
      const since = '2024-01-01';
      const until = '2025-12-31';
      
      const consultations = await extractConsultations(since, until);
      
      consultations.forEach(consultation => {
        if (consultation.cid10 && consultation.cid10.length > 0) {
          consultation.cid10.forEach(code => {
            // Deve ser formato válido: A00, A00.1, A00.12
            expect(code).toMatch(/^[A-Z]\d{2}(\.\d{1,2})?$/);
          });
        }
      });
    });
  });
});
