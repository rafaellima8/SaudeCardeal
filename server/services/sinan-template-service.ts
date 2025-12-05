import { z } from "zod";
import type { SinanFormTemplate, SinanField, SinanFormGroup } from "@shared/sinan/template-types";
import {
  SINAN_TEMPLATES,
  SINAN_TEMPLATE_BY_ID,
  SINAN_TEMPLATES_BY_AGRAVO,
  SINAN_TEMPLATES_BY_CID10,
  getTemplatesByAgravo,
  getTemplatesByCid,
  getTemplateByCompositeKey,
} from "@shared/sinan/templates/index";
import type { AgravoLookupResult, CidLookupResult } from "@shared/sinan/templates/index";
import { createFormValidationSchema } from "@shared/sinan/template-types";

export interface TemplateListItem {
  id: string;
  nome: string;
  agravoCode: string;
  cid10: string;
  categoria: string;
  versaoFicha: string;
  prazoNotificacao: "imediata" | "semanal";
  fichaInvestigacao: boolean;
  groupCount: number;
  fieldCount: number;
  requiredFieldCount: number;
}

export interface TemplateValidationResult {
  valid: boolean;
  errors: Array<{
    field: string;
    message: string;
    code: string;
  }>;
  warnings: Array<{
    field: string;
    message: string;
  }>;
}

export interface TemplateStats {
  totalTemplates: number;
  uniqueAgravos: number;
  categorias: Record<string, number>;
  prazoImediato: number;
  prazoSemanal: number;
  comInvestigacao: number;
}

export class SinanTemplateService {
  getAllTemplates(): TemplateListItem[] {
    return SINAN_TEMPLATES.map((t) => ({
      id: t.id,
      nome: t.nome,
      agravoCode: t.agravoCode,
      cid10: t.cid10,
      categoria: t.categoria,
      versaoFicha: t.versaoFicha,
      prazoNotificacao: t.prazoNotificacao,
      fichaInvestigacao: t.fichaInvestigacao,
      groupCount: t.groups.length,
      fieldCount: t.fields.length,
      requiredFieldCount: t.requiredFields.length,
    }));
  }

  getTemplateById(id: string): SinanFormTemplate | undefined {
    return SINAN_TEMPLATE_BY_ID[id];
  }

  getTemplatesByAgravoCode(agravoCode: string): AgravoLookupResult {
    return getTemplatesByAgravo(agravoCode);
  }

  getTemplatesByCid10(cid10: string): CidLookupResult {
    return getTemplatesByCid(cid10);
  }

  getTemplateByCompositeKey(agravoCode: string, versaoFicha: string): SinanFormTemplate | undefined {
    return getTemplateByCompositeKey(agravoCode, versaoFicha);
  }

  getStats(): TemplateStats {
    const categorias: Record<string, number> = {};
    const uniqueAgravos = new Set<string>();

    let prazoImediato = 0;
    let prazoSemanal = 0;
    let comInvestigacao = 0;

    for (const template of SINAN_TEMPLATES) {
      uniqueAgravos.add(template.agravoCode);
      categorias[template.categoria] = (categorias[template.categoria] || 0) + 1;
      
      if (template.prazoNotificacao === "imediata") prazoImediato++;
      else prazoSemanal++;
      
      if (template.fichaInvestigacao) comInvestigacao++;
    }

    return {
      totalTemplates: SINAN_TEMPLATES.length,
      uniqueAgravos: uniqueAgravos.size,
      categorias,
      prazoImediato,
      prazoSemanal,
      comInvestigacao,
    };
  }

  getFieldsByGroup(template: SinanFormTemplate): Record<string, SinanField[]> {
    const grouped: Record<string, SinanField[]> = {};
    
    for (const group of template.groups) {
      grouped[group.id] = template.fields
        .filter((f: SinanField) => f.group === group.id)
        .sort((a: SinanField, b: SinanField) => a.order - b.order);
    }
    
    return grouped;
  }

  createValidationSchema(template: SinanFormTemplate): z.ZodObject<any> {
    return createFormValidationSchema(template);
  }

  validateFormData(templateId: string, data: Record<string, any>): TemplateValidationResult {
    const template = this.getTemplateById(templateId);
    if (!template) {
      return {
        valid: false,
        errors: [{ field: "_template", message: "Template não encontrado", code: "TEMPLATE_NOT_FOUND" }],
        warnings: [],
      };
    }

    const errors: TemplateValidationResult["errors"] = [];
    const warnings: TemplateValidationResult["warnings"] = [];

    for (const fieldKey of template.requiredFields) {
      const value = data[fieldKey];
      if (value === undefined || value === null || value === "") {
        const field = template.fields.find((f: SinanField) => f.key === fieldKey);
        errors.push({
          field: fieldKey,
          message: `Campo obrigatório: ${field?.label || fieldKey}`,
          code: "REQUIRED_FIELD_MISSING",
        });
      }
    }

    for (const field of template.fields) {
      const value = data[field.key];
      if (value === undefined || value === null || value === "") continue;

      if (field.validation) {
        if (field.validation.pattern) {
          const regex = new RegExp(field.validation.pattern);
          if (!regex.test(String(value))) {
            errors.push({
              field: field.key,
              message: `${field.label}: formato inválido`,
              code: "PATTERN_MISMATCH",
            });
          }
        }

        if (field.type === "number") {
          const numValue = Number(value);
          if (field.validation.min !== undefined && numValue < field.validation.min) {
            errors.push({
              field: field.key,
              message: `${field.label}: valor mínimo é ${field.validation.min}`,
              code: "MIN_VALUE",
            });
          }
          if (field.validation.max !== undefined && numValue > field.validation.max) {
            errors.push({
              field: field.key,
              message: `${field.label}: valor máximo é ${field.validation.max}`,
              code: "MAX_VALUE",
            });
          }
        }

        if (field.type === "text" || field.type === "textarea") {
          const strValue = String(value);
          if (field.validation.minLength !== undefined && strValue.length < field.validation.minLength) {
            errors.push({
              field: field.key,
              message: `${field.label}: mínimo ${field.validation.minLength} caracteres`,
              code: "MIN_LENGTH",
            });
          }
          if (field.validation.maxLength !== undefined && strValue.length > field.validation.maxLength) {
            errors.push({
              field: field.key,
              message: `${field.label}: máximo ${field.validation.maxLength} caracteres`,
              code: "MAX_LENGTH",
            });
          }
        }
      }

      if (field.options && field.options.length > 0) {
        const validValues = field.options.map((o: { value: string; label: string }) => o.value);
        if (!validValues.includes(String(value))) {
          warnings.push({
            field: field.key,
            message: `${field.label}: valor fora das opções disponíveis`,
          });
        }
      }
    }

    for (const field of template.fields) {
      if (field.dependsOn) {
        const dependentValue = data[field.dependsOn.field];
        const targetValues = Array.isArray(field.dependsOn.value) 
          ? field.dependsOn.value 
          : [field.dependsOn.value];
        
        const condition = field.dependsOn.condition || "equals";
        let shouldShow = false;

        switch (condition) {
          case "equals":
            shouldShow = targetValues.includes(String(dependentValue));
            break;
          case "notEquals":
            shouldShow = !targetValues.includes(String(dependentValue));
            break;
          case "in":
            shouldShow = targetValues.includes(String(dependentValue));
            break;
          case "notIn":
            shouldShow = !targetValues.includes(String(dependentValue));
            break;
        }

        if (shouldShow && field.required) {
          const value = data[field.key];
          if (value === undefined || value === null || value === "") {
            errors.push({
              field: field.key,
              message: `Campo obrigatório quando ${field.dependsOn.field} é ${targetValues.join(" ou ")}`,
              code: "CONDITIONAL_REQUIRED",
            });
          }
        }
      }
    }

    if (template.validationRules) {
      for (const rule of template.validationRules) {
        let ruleViolated = false;

        switch (rule.type) {
          case "required_if":
            if (rule.condition.field) {
              const conditionMet = this.evaluateCondition(
                data[rule.condition.field],
                rule.condition.operator || "equals",
                rule.condition.value
              );
              if (conditionMet && rule.condition.fields) {
                for (const fieldKey of rule.condition.fields) {
                  const val = data[fieldKey];
                  if (val === undefined || val === null || val === "") {
                    ruleViolated = true;
                    break;
                  }
                }
              }
            }
            break;
          case "date_range":
            if (rule.condition.fields && rule.condition.fields.length === 2) {
              const [startField, endField] = rule.condition.fields;
              const startDate = data[startField];
              const endDate = data[endField];
              if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
                ruleViolated = true;
              }
            }
            break;
          case "age_limit":
            const age = data["paciente_idade"];
            const ageType = data["paciente_idade_tipo"];
            if (age !== undefined && rule.condition.value !== undefined) {
              const ageInYears = this.convertToYears(Number(age), String(ageType));
              if (!this.evaluateCondition(ageInYears, rule.condition.operator || "lessThan", rule.condition.value)) {
                ruleViolated = true;
              }
            }
            break;
        }

        if (ruleViolated) {
          errors.push({
            field: rule.condition.fields?.[0] || "_rule",
            message: rule.message,
            code: `RULE_${rule.id}`,
          });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private evaluateCondition(value: any, operator: string, target: any): boolean {
    switch (operator) {
      case "equals":
        return value === target;
      case "notEquals":
        return value !== target;
      case "greaterThan":
        return Number(value) > Number(target);
      case "lessThan":
        return Number(value) < Number(target);
      case "in":
        return Array.isArray(target) && target.includes(value);
      case "between":
        if (Array.isArray(target) && target.length === 2) {
          return Number(value) >= target[0] && Number(value) <= target[1];
        }
        return false;
      default:
        return false;
    }
  }

  private convertToYears(age: number, ageType: string): number {
    switch (ageType) {
      case "1": return age / (24 * 365);
      case "2": return age / 365;
      case "3": return age / 12;
      case "4": return age;
      default: return age;
    }
  }

  searchTemplates(query: string): TemplateListItem[] {
    const normalizedQuery = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    return this.getAllTemplates().filter((t) => {
      const nome = t.nome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const agravo = t.agravoCode.toLowerCase();
      const cid = t.cid10.toLowerCase();
      const categoria = t.categoria.toLowerCase();
      
      return nome.includes(normalizedQuery) ||
             agravo.includes(normalizedQuery) ||
             cid.includes(normalizedQuery) ||
             categoria.includes(normalizedQuery);
    });
  }

  getTemplatesByCategoria(categoria: string): TemplateListItem[] {
    return this.getAllTemplates().filter((t) => t.categoria === categoria);
  }

  getCategorias(): string[] {
    const categorias = new Set<string>();
    for (const template of SINAN_TEMPLATES) {
      categorias.add(template.categoria);
    }
    return Array.from(categorias).sort();
  }

  getUniqueAgravoCodes(): string[] {
    return Object.keys(SINAN_TEMPLATES_BY_AGRAVO).sort();
  }
}

export const sinanTemplateService = new SinanTemplateService();
