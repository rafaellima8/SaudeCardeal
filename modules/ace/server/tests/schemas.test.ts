import { describe, it, expect } from 'vitest';
import { dwellingCreateSchema } from '../schemas/dwelling.schema';
import { aceSyncRequestSchema } from '../schemas/sync.schema';

describe('ACE Schemas', () => {
  describe('dwellingCreateSchema', () => {
    it('should validate valid dwelling data', () => {
      const validData = {
        unit_id: '123e4567-e89b-12d3-a456-426614174000',
        street: 'Rua Teste',
        number: '100',
        neighborhood: 'Centro',
        has_electricity: true,
        has_animals: false,
        animal_types: [],
        household_members: 3,
      };

      const result = dwellingCreateSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID for unit_id', () => {
      const invalidData = {
        unit_id: 'invalid-uuid',
        street: 'Rua Teste',
      };

      const result = dwellingCreateSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject missing required street field', () => {
      const invalidData = {
        unit_id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = dwellingCreateSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should apply default values', () => {
      const data = {
        unit_id: '123e4567-e89b-12d3-a456-426614174000',
        street: 'Rua Teste',
      };

      const result = dwellingCreateSchema.parse(data);
      expect(result.has_electricity).toBe(true);
      expect(result.has_animals).toBe(false);
      expect(result.animal_types).toEqual([]);
      expect(result.household_members).toBe(0);
    });

    it('should accept optional external_id', () => {
      const dataWithExternalId = {
        external_id: 'offline-123',
        unit_id: '123e4567-e89b-12d3-a456-426614174000',
        street: 'Rua Teste',
      };

      const result = dwellingCreateSchema.safeParse(dataWithExternalId);
      expect(result.success).toBe(true);
    });
  });

  describe('aceSyncRequestSchema', () => {
    it('should validate empty sync request', () => {
      const emptyRequest = {
        dwellings: [],
        visits: [],
        photos: [],
      };

      const result = aceSyncRequestSchema.safeParse(emptyRequest);
      expect(result.success).toBe(true);
    });

    it('should validate sync request with dwellings', () => {
      const request = {
        dwellings: [
          {
            external_id: 'dwelling-001',
            unit_id: '123e4567-e89b-12d3-a456-426614174000',
            street: 'Rua Teste',
            has_electricity: true,
            has_animals: false,
            animal_types: [],
            household_members: 2,
          },
        ],
        visits: [],
        photos: [],
      };

      const result = aceSyncRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    });

    it('should apply default empty arrays', () => {
      const request = {};

      const result = aceSyncRequestSchema.parse(request);
      expect(result.dwellings).toEqual([]);
      expect(result.visits).toEqual([]);
      expect(result.photos).toEqual([]);
    });
  });
});
