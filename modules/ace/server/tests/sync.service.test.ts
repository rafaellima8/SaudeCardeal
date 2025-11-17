import { describe, it, expect, beforeEach } from 'vitest';
import { generateExternalId } from '../../client/offline/sync';

describe('ACE Sync Module', () => {
  describe('generateExternalId', () => {
    it('should generate a valid UUID v4', () => {
      const id = generateExternalId();
      
      // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(id).toMatch(uuidRegex);
    });

    it('should generate unique IDs', () => {
      const id1 = generateExternalId();
      const id2 = generateExternalId();
      
      expect(id1).not.toBe(id2);
    });

    it('should generate IDs with correct length', () => {
      const id = generateExternalId();
      
      // UUID format with dashes: 36 characters
      expect(id.length).toBe(36);
    });
  });
});
