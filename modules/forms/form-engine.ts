import { z } from "zod";
import * as schema from "@shared/schema";

export interface FieldDefinition {
  id: string;
  label: string;
  type: "text" | "number" | "date" | "select" | "checkbox" | "radio" | "textarea";
  required: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  mask?: string;
  options?: string[];
  validation?: Record<string, any>;
  mapping?: string;
}

export interface TemplateDefinition {
  pageSize: { width: number; height: number };
  fields: FieldDefinition[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: Array<{ field: string; message: string }>;
  warnings: Array<{ field: string; message: string }>;
}

export class FormEngine {
  validatePayload(template: TemplateDefinition, payload: Record<string, any>): ValidationResult {
    const errors: Array<{ field: string; message: string }> = [];
    const warnings: Array<{ field: string; message: string }> = [];

    for (const field of template.fields) {
      const value = payload[field.id];

      if (field.required && (value === undefined || value === null || value === "")) {
        errors.push({ field: field.id, message: `Campo obrigatório: ${field.label}` });
        continue;
      }

      if (value !== undefined && value !== null && value !== "") {
        if (field.validation) {
          const validationErrors = this.validateField(field, value);
          errors.push(...validationErrors);
        }

        if (field.type === "date" && value) {
          const date = new Date(value);
          if (isNaN(date.getTime())) {
            errors.push({ field: field.id, message: `Data inválida: ${field.label}` });
          }
        }

        if (field.type === "number" && value) {
          if (isNaN(Number(value))) {
            errors.push({ field: field.id, message: `Número inválido: ${field.label}` });
          }
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private validateField(field: FieldDefinition, value: any): Array<{ field: string; message: string }> {
    const errors: Array<{ field: string; message: string }> = [];
    const validation = field.validation;

    if (!validation) return errors;

    if (validation.minLength && String(value).length < validation.minLength) {
      errors.push({ field: field.id, message: `${field.label} deve ter no mínimo ${validation.minLength} caracteres` });
    }

    if (validation.maxLength && String(value).length > validation.maxLength) {
      errors.push({ field: field.id, message: `${field.label} deve ter no máximo ${validation.maxLength} caracteres` });
    }

    if (validation.pattern) {
      const regex = new RegExp(validation.pattern);
      if (!regex.test(String(value))) {
        errors.push({ field: field.id, message: `${field.label} não corresponde ao formato esperado` });
      }
    }

    if (validation.min !== undefined && Number(value) < validation.min) {
      errors.push({ field: field.id, message: `${field.label} deve ser no mínimo ${validation.min}` });
    }

    if (validation.max !== undefined && Number(value) > validation.max) {
      errors.push({ field: field.id, message: `${field.label} deve ser no máximo ${validation.max}` });
    }

    return errors;
  }

  mapPayloadToEntity(template: TemplateDefinition, payload: Record<string, any>, mappingConfig: Record<string, string>): Record<string, any> {
    const mapped: Record<string, any> = {};

    for (const [sourceField, targetField] of Object.entries(mappingConfig)) {
      if (payload[sourceField] !== undefined) {
        mapped[targetField] = payload[sourceField];
      }
    }

    return mapped;
  }

  generateSubmissionNumber(unitId: string, templateSlug: string): string {
    const year = new Date().getFullYear();
    const timestamp = Date.now().toString(36).toUpperCase();
    const prefix = unitId.slice(0, 4).toUpperCase();
    return `${year}${prefix}${templateSlug.toUpperCase().slice(0, 3)}${timestamp}`;
  }
}

export const SINAN_TEMPLATES: Record<string, Partial<TemplateDefinition>> = {
  dengue: {
    pageSize: { width: 2100, height: 2970 },
    fields: [
      { id: "notificacao_tipo", label: "Tipo de Notificação", type: "select", required: true, x: 100, y: 100, width: 200, height: 30, fontSize: 12, options: ["1-Individual", "2-Surto"] },
      { id: "agravo", label: "Agravo/Doença", type: "text", required: true, x: 100, y: 140, width: 400, height: 30, fontSize: 12 },
      { id: "cid", label: "CID-10", type: "text", required: true, x: 520, y: 140, width: 100, height: 30, fontSize: 12, validation: { pattern: "^[A-Z]\\d{2}(\\.\\d)?$" } },
      { id: "data_notificacao", label: "Data da Notificação", type: "date", required: true, x: 100, y: 180, width: 150, height: 30, fontSize: 12 },
      { id: "uf_notificacao", label: "UF", type: "text", required: true, x: 260, y: 180, width: 50, height: 30, fontSize: 12 },
      { id: "municipio_notificacao", label: "Município de Notificação", type: "text", required: true, x: 320, y: 180, width: 300, height: 30, fontSize: 12 },
      { id: "unidade_saude", label: "Unidade de Saúde", type: "text", required: true, x: 100, y: 220, width: 400, height: 30, fontSize: 12 },
      { id: "cnes", label: "CNES", type: "text", required: false, x: 520, y: 220, width: 100, height: 30, fontSize: 12, validation: { pattern: "^\\d{7}$" } },
      { id: "paciente_nome", label: "Nome do Paciente", type: "text", required: true, x: 100, y: 280, width: 500, height: 30, fontSize: 12, validation: { minLength: 3 } },
      { id: "paciente_data_nascimento", label: "Data de Nascimento", type: "date", required: false, x: 100, y: 320, width: 150, height: 30, fontSize: 12 },
      { id: "paciente_idade", label: "Idade", type: "number", required: true, x: 260, y: 320, width: 80, height: 30, fontSize: 12 },
      { id: "paciente_sexo", label: "Sexo", type: "select", required: true, x: 350, y: 320, width: 100, height: 30, fontSize: 12, options: ["M-Masculino", "F-Feminino", "I-Ignorado"] },
      { id: "paciente_gestante", label: "Gestante", type: "select", required: false, x: 460, y: 320, width: 150, height: 30, fontSize: 12, options: ["1-1º Trimestre", "2-2º Trimestre", "3-3º Trimestre", "4-Idade gestacional ignorada", "5-Não", "6-Não se aplica", "9-Ignorado"] },
      { id: "paciente_raca", label: "Raça/Cor", type: "select", required: false, x: 100, y: 360, width: 150, height: 30, fontSize: 12, options: ["1-Branca", "2-Preta", "3-Amarela", "4-Parda", "5-Indígena", "9-Ignorado"] },
      { id: "paciente_escolaridade", label: "Escolaridade", type: "select", required: false, x: 260, y: 360, width: 200, height: 30, fontSize: 12, options: ["0-Analfabeto", "1-1ª a 4ª série incompleta", "2-4ª série completa", "3-5ª a 8ª série incompleta", "4-Ensino fundamental completo", "5-Ensino médio incompleto", "6-Ensino médio completo", "7-Educação superior incompleta", "8-Educação superior completa", "9-Ignorado", "10-Não se aplica"] },
      { id: "paciente_cns", label: "CNS", type: "text", required: false, x: 100, y: 400, width: 200, height: 30, fontSize: 12, mask: "999999999999999", validation: { pattern: "^\\d{15}$" } },
      { id: "paciente_nome_mae", label: "Nome da Mãe", type: "text", required: false, x: 310, y: 400, width: 400, height: 30, fontSize: 12 },
    ],
  },
  tuberculose: {
    pageSize: { width: 2100, height: 2970 },
    fields: [
      { id: "notificacao_tipo", label: "Tipo de Notificação", type: "select", required: true, x: 100, y: 100, width: 200, height: 30, fontSize: 12, options: ["1-Individual"] },
      { id: "agravo", label: "Agravo/Doença", type: "text", required: true, x: 100, y: 140, width: 400, height: 30, fontSize: 12 },
      { id: "cid", label: "CID-10", type: "text", required: true, x: 520, y: 140, width: 100, height: 30, fontSize: 12 },
      { id: "data_notificacao", label: "Data da Notificação", type: "date", required: true, x: 100, y: 180, width: 150, height: 30, fontSize: 12 },
      { id: "paciente_nome", label: "Nome do Paciente", type: "text", required: true, x: 100, y: 280, width: 500, height: 30, fontSize: 12, validation: { minLength: 3 } },
      { id: "paciente_sexo", label: "Sexo", type: "select", required: true, x: 350, y: 320, width: 100, height: 30, fontSize: 12, options: ["M-Masculino", "F-Feminino", "I-Ignorado"] },
      { id: "forma_clinica", label: "Forma Clínica", type: "select", required: true, x: 100, y: 440, width: 200, height: 30, fontSize: 12, options: ["1-Pulmonar", "2-Extrapulmonar", "3-Pulmonar+Extrapulmonar"] },
      { id: "baciloscopia", label: "Baciloscopia de Escarro", type: "select", required: false, x: 310, y: 440, width: 150, height: 30, fontSize: 12, options: ["1-Positivo", "2-Negativo", "3-Não realizado", "4-Não se aplica"] },
      { id: "cultura", label: "Cultura de Escarro", type: "select", required: false, x: 470, y: 440, width: 150, height: 30, fontSize: 12, options: ["1-Positivo", "2-Negativo", "3-Em andamento", "4-Não realizado"] },
      { id: "hiv", label: "Teste HIV", type: "select", required: false, x: 100, y: 480, width: 150, height: 30, fontSize: 12, options: ["1-Positivo", "2-Negativo", "3-Em andamento", "4-Não realizado"] },
    ],
  },
};

export const BPA_TEMPLATE: Partial<TemplateDefinition> = {
  pageSize: { width: 2100, height: 2970 },
  fields: [
    { id: "competencia", label: "Competência", type: "text", required: true, x: 100, y: 100, width: 100, height: 30, fontSize: 12, mask: "99/9999" },
    { id: "cnes", label: "CNES", type: "text", required: true, x: 210, y: 100, width: 100, height: 30, fontSize: 12, validation: { pattern: "^\\d{7}$" } },
    { id: "cbo", label: "CBO", type: "text", required: true, x: 320, y: 100, width: 100, height: 30, fontSize: 12, validation: { pattern: "^\\d{6}$" } },
    { id: "data_atendimento", label: "Data do Atendimento", type: "date", required: true, x: 430, y: 100, width: 120, height: 30, fontSize: 12 },
    { id: "folha", label: "Folha", type: "number", required: true, x: 560, y: 100, width: 60, height: 30, fontSize: 12 },
    { id: "sequencia", label: "Sequência", type: "number", required: true, x: 630, y: 100, width: 60, height: 30, fontSize: 12 },
    { id: "procedimento", label: "Procedimento", type: "text", required: true, x: 100, y: 150, width: 150, height: 30, fontSize: 12, validation: { pattern: "^\\d{10}$" } },
    { id: "cns_paciente", label: "CNS do Paciente", type: "text", required: false, x: 260, y: 150, width: 200, height: 30, fontSize: 12, validation: { pattern: "^\\d{15}$" } },
    { id: "sexo", label: "Sexo", type: "select", required: true, x: 470, y: 150, width: 80, height: 30, fontSize: 12, options: ["M", "F"] },
    { id: "municipio_ibge", label: "Município (IBGE)", type: "text", required: true, x: 560, y: 150, width: 100, height: 30, fontSize: 12, validation: { pattern: "^\\d{7}$" } },
    { id: "cid", label: "CID Principal", type: "text", required: false, x: 100, y: 200, width: 80, height: 30, fontSize: 12 },
    { id: "idade", label: "Idade", type: "number", required: true, x: 190, y: 200, width: 60, height: 30, fontSize: 12 },
    { id: "quantidade", label: "Quantidade", type: "number", required: true, x: 260, y: 200, width: 60, height: 30, fontSize: 12 },
    { id: "carater_atendimento", label: "Caráter do Atendimento", type: "select", required: true, x: 330, y: 200, width: 120, height: 30, fontSize: 12, options: ["01-Eletivo", "02-Urgência"] },
    { id: "cns_profissional", label: "CNS do Profissional", type: "text", required: true, x: 460, y: 200, width: 200, height: 30, fontSize: 12, validation: { pattern: "^\\d{15}$" } },
  ],
};

export const APAC_TEMPLATE: Partial<TemplateDefinition> = {
  pageSize: { width: 2100, height: 2970 },
  fields: [
    { id: "numero_apac", label: "Número da APAC", type: "text", required: true, x: 100, y: 100, width: 200, height: 30, fontSize: 12 },
    { id: "competencia", label: "Competência", type: "text", required: true, x: 310, y: 100, width: 100, height: 30, fontSize: 12, mask: "99/9999" },
    { id: "cnes", label: "CNES Solicitante", type: "text", required: true, x: 420, y: 100, width: 100, height: 30, fontSize: 12, validation: { pattern: "^\\d{7}$" } },
    { id: "cnes_executante", label: "CNES Executante", type: "text", required: true, x: 530, y: 100, width: 100, height: 30, fontSize: 12, validation: { pattern: "^\\d{7}$" } },
    { id: "nome_paciente", label: "Nome do Paciente", type: "text", required: true, x: 100, y: 150, width: 400, height: 30, fontSize: 12, validation: { minLength: 3 } },
    { id: "cns_paciente", label: "CNS do Paciente", type: "text", required: true, x: 510, y: 150, width: 200, height: 30, fontSize: 12, validation: { pattern: "^\\d{15}$" } },
    { id: "data_nascimento", label: "Data de Nascimento", type: "date", required: true, x: 100, y: 200, width: 120, height: 30, fontSize: 12 },
    { id: "sexo", label: "Sexo", type: "select", required: true, x: 230, y: 200, width: 80, height: 30, fontSize: 12, options: ["M", "F"] },
    { id: "raca", label: "Raça/Cor", type: "select", required: false, x: 320, y: 200, width: 120, height: 30, fontSize: 12, options: ["01-Branca", "02-Preta", "03-Parda", "04-Amarela", "05-Indígena", "99-Sem informação"] },
    { id: "nome_mae", label: "Nome da Mãe", type: "text", required: false, x: 450, y: 200, width: 300, height: 30, fontSize: 12 },
    { id: "procedimento_principal", label: "Procedimento Principal", type: "text", required: true, x: 100, y: 250, width: 150, height: 30, fontSize: 12, validation: { pattern: "^\\d{10}$" } },
    { id: "cid_principal", label: "CID Principal", type: "text", required: true, x: 260, y: 250, width: 100, height: 30, fontSize: 12 },
    { id: "cid_secundario", label: "CID Secundário", type: "text", required: false, x: 370, y: 250, width: 100, height: 30, fontSize: 12 },
    { id: "cid_causas_associadas", label: "CID Causas Associadas", type: "text", required: false, x: 480, y: 250, width: 100, height: 30, fontSize: 12 },
    { id: "data_solicitacao", label: "Data da Solicitação", type: "date", required: true, x: 100, y: 300, width: 120, height: 30, fontSize: 12 },
    { id: "data_autorizacao", label: "Data da Autorização", type: "date", required: false, x: 230, y: 300, width: 120, height: 30, fontSize: 12 },
    { id: "data_inicio_validade", label: "Início da Validade", type: "date", required: true, x: 360, y: 300, width: 120, height: 30, fontSize: 12 },
    { id: "data_fim_validade", label: "Fim da Validade", type: "date", required: true, x: 490, y: 300, width: 120, height: 30, fontSize: 12 },
  ],
};

class ExtendedFormEngine extends FormEngine {
  validatePayloadFlat(template: any, payload: Record<string, any>): ValidationResult {
    const errors: Array<{ field: string; message: string }> = [];
    const warnings: Array<{ field: string; message: string }> = [];

    const fields = template.fields || [];
    
    const flatFields: any[] = [];
    for (const item of fields) {
      if (item.group && item.fields) {
        flatFields.push(...item.fields);
      } else if (item.name || item.id) {
        flatFields.push(item);
      }
    }

    for (const field of flatFields) {
      const fieldId = field.name || field.id;
      const value = payload[fieldId];

      if (field.required && (value === undefined || value === null || value === "")) {
        errors.push({ field: fieldId, message: `Campo obrigatório: ${field.label || fieldId}` });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  getTemplateBySlug(slug: string): any | null {
    if (SINAN_TEMPLATES[slug]) {
      return { slug, ...SINAN_TEMPLATES[slug] };
    }
    if (slug === "bpa-i") {
      return { slug: "bpa-i", ...BPA_TEMPLATE };
    }
    if (slug === "apac") {
      return { slug: "apac", ...APAC_TEMPLATE };
    }
    return null;
  }
}

export const formEngine = new ExtendedFormEngine();
