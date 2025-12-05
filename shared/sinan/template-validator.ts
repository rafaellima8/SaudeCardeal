import { SinanFormTemplate, SinanField, SINAN_COMMON_FIELDS, SinanFormGroupId } from "./template-types";

export interface TemplateValidationResult {
  isValid: boolean;
  templateId: string;
  errors: string[];
  warnings: string[];
}

const MANDATORY_GROUPS: SinanFormGroupId[] = [
  "dados_gerais",
  "notificacao",
  "residencia",
  "conclusao",
  "investigador",
];

const MANDATORY_COMMON_FIELD_KEYS = [
  "tipo_notificacao",
  "agravo_doenca",
  "dt_notificacao",
  "uf_notificacao",
  "municipio_notificacao",
  "unidade_saude",
  "paciente_nome",
  "paciente_idade",
  "paciente_idade_tipo",
  "paciente_sexo",
  "res_uf",
  "res_municipio",
];

export function validateTemplate(template: SinanFormTemplate): TemplateValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!template.id || template.id.trim() === "") {
    errors.push("Template ID is required");
  }

  if (!template.nome || template.nome.trim() === "") {
    errors.push("Template nome is required");
  }

  if (!template.agravoCode || template.agravoCode.trim() === "") {
    errors.push("Template agravoCode is required");
  }

  if (!template.cid10 || template.cid10.trim() === "") {
    errors.push("Template cid10 is required");
  }

  if (!template.versaoFicha || template.versaoFicha.trim() === "") {
    errors.push("Template versaoFicha is required");
  }

  const presentGroupIds = new Set(template.groups.map(g => g.id));
  for (const mandatoryGroup of MANDATORY_GROUPS) {
    if (!presentGroupIds.has(mandatoryGroup)) {
      errors.push(`Missing mandatory group: ${mandatoryGroup}`);
    }
  }

  const presentFieldKeys = new Set(template.fields.map(f => f.key));
  for (const mandatoryFieldKey of MANDATORY_COMMON_FIELD_KEYS) {
    if (!presentFieldKeys.has(mandatoryFieldKey)) {
      errors.push(`Missing mandatory common field: ${mandatoryFieldKey}`);
    }
  }

  for (const requiredFieldKey of template.requiredFields) {
    if (!presentFieldKeys.has(requiredFieldKey)) {
      errors.push(`requiredFields references non-existent field: ${requiredFieldKey}`);
    }
  }

  for (const field of template.fields) {
    if (field.required && !template.requiredFields.includes(field.key)) {
      warnings.push(`Field ${field.key} has required=true but is not in requiredFields array`);
    }
    
    if (!field.required && template.requiredFields.includes(field.key)) {
      warnings.push(`Field ${field.key} is in requiredFields but has required=false`);
    }

    if (field.type === "select" && (!field.options || field.options.length === 0)) {
      errors.push(`Select field ${field.key} has no options defined`);
    }

    if (!field.sinanCode) {
      warnings.push(`Field ${field.key} is missing sinanCode mapping`);
    }
  }

  for (const field of template.fields) {
    if (MANDATORY_COMMON_FIELD_KEYS.includes(field.key) && !field.required) {
      errors.push(`Mandatory common field ${field.key} must have required=true`);
    }
  }

  return {
    isValid: errors.length === 0,
    templateId: template.id,
    errors,
    warnings,
  };
}

export function validateAllTemplates(templates: SinanFormTemplate[]): {
  allValid: boolean;
  results: TemplateValidationResult[];
  summary: {
    total: number;
    valid: number;
    invalid: number;
    totalErrors: number;
    totalWarnings: number;
  };
} {
  const results = templates.map(validateTemplate);
  const valid = results.filter(r => r.isValid).length;
  const invalid = results.filter(r => !r.isValid).length;
  const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
  const totalWarnings = results.reduce((sum, r) => sum + r.warnings.length, 0);

  return {
    allValid: invalid === 0,
    results,
    summary: {
      total: templates.length,
      valid,
      invalid,
      totalErrors,
      totalWarnings,
    },
  };
}

export function assertTemplateValid(template: SinanFormTemplate): void {
  const result = validateTemplate(template);
  if (!result.isValid) {
    throw new Error(
      `Template ${template.id} validation failed:\n${result.errors.join("\n")}`
    );
  }
}
