import { describe, it, expect } from "vitest";
import { formEngine, SINAN_TEMPLATES, BPA_TEMPLATE, APAC_TEMPLATE } from "../../modules/forms/form-engine";

describe("Form Engine", () => {
  describe("SINAN Templates", () => {
    it("should have dengue template defined", () => {
      expect(SINAN_TEMPLATES.dengue).toBeDefined();
      expect(SINAN_TEMPLATES.dengue.fields).toBeDefined();
      expect(Array.isArray(SINAN_TEMPLATES.dengue.fields)).toBe(true);
    });

    it("should have tuberculose template defined", () => {
      expect(SINAN_TEMPLATES.tuberculose).toBeDefined();
      expect(SINAN_TEMPLATES.tuberculose.fields).toBeDefined();
    });

    it("should have tuberculose template with fields", () => {
      expect(SINAN_TEMPLATES.tuberculose).toBeDefined();
      expect(SINAN_TEMPLATES.tuberculose.fields).toBeDefined();
      expect(SINAN_TEMPLATES.tuberculose.fields.length).toBeGreaterThan(0);
    });

    it("should have at least 2 SINAN templates", () => {
      const templateCount = Object.keys(SINAN_TEMPLATES).length;
      expect(templateCount).toBeGreaterThanOrEqual(2);
    });
  });

  describe("BPA Template", () => {
    it("should have BPA template defined", () => {
      expect(BPA_TEMPLATE).toBeDefined();
      expect(BPA_TEMPLATE.fields).toBeDefined();
      expect(BPA_TEMPLATE.pageSize).toBeDefined();
    });

    it("should have competencia field", () => {
      const competenciaField = BPA_TEMPLATE.fields?.find((f: any) => f.id === "competencia");
      expect(competenciaField).toBeDefined();
      expect(competenciaField?.required).toBe(true);
    });
  });

  describe("APAC Template", () => {
    it("should have APAC template defined", () => {
      expect(APAC_TEMPLATE).toBeDefined();
      expect(APAC_TEMPLATE.fields).toBeDefined();
      expect(APAC_TEMPLATE.pageSize).toBeDefined();
    });

    it("should have patient name field", () => {
      const nomeField = APAC_TEMPLATE.fields?.find((f: any) => f.id === "nome_paciente");
      expect(nomeField).toBeDefined();
      expect(nomeField?.required).toBe(true);
    });
  });

  describe("validatePayload", () => {
    it("should validate a valid payload using FieldDefinition structure", () => {
      const template = {
        pageSize: { width: 2100, height: 2970 },
        fields: [
          { id: "nome", label: "Nome", type: "text", required: true, x: 0, y: 0, width: 100, height: 30, fontSize: 12 },
          { id: "cpf", label: "CPF", type: "text", required: true, x: 0, y: 40, width: 100, height: 30, fontSize: 12 },
        ],
      };

      const payload = {
        nome: "João Silva",
        cpf: "123.456.789-00",
      };

      const result = formEngine.validatePayload(template, payload);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("should return errors for missing required fields", () => {
      const template = {
        pageSize: { width: 2100, height: 2970 },
        fields: [
          { id: "nome", label: "Nome", type: "text", required: true, x: 0, y: 0, width: 100, height: 30, fontSize: 12 },
          { id: "cpf", label: "CPF", type: "text", required: true, x: 0, y: 40, width: 100, height: 30, fontSize: 12 },
        ],
      };

      const payload = {
        nome: "João Silva",
      };

      const result = formEngine.validatePayload(template, payload);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].field).toBe("cpf");
    });

    it("should accept optional fields as empty", () => {
      const template = {
        pageSize: { width: 2100, height: 2970 },
        fields: [
          { id: "nome", label: "Nome", type: "text", required: true, x: 0, y: 0, width: 100, height: 30, fontSize: 12 },
          { id: "observacao", label: "Observação", type: "text", required: false, x: 0, y: 40, width: 100, height: 30, fontSize: 12 },
        ],
      };

      const payload = {
        nome: "João Silva",
      };

      const result = formEngine.validatePayload(template, payload);
      expect(result.isValid).toBe(true);
    });
  });

  describe("getTemplateBySlug", () => {
    it("should return dengue template when slug is 'dengue'", () => {
      const template = formEngine.getTemplateBySlug("dengue");
      expect(template).toBeDefined();
      expect(template?.fields).toBeDefined();
    });

    it("should return bpa-i template", () => {
      const template = formEngine.getTemplateBySlug("bpa-i");
      expect(template).toBeDefined();
    });

    it("should return apac template", () => {
      const template = formEngine.getTemplateBySlug("apac");
      expect(template).toBeDefined();
    });

    it("should return null for unknown slug", () => {
      const template = formEngine.getTemplateBySlug("unknown-template");
      expect(template).toBeNull();
    });
  });
});
