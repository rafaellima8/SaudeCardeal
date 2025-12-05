import { SINAN_AGRAVOS_COMPLETOS, type AgravoDefinition } from "./agravos";
import { SINAN_TEMPLATES, SINAN_TEMPLATES_BY_AGRAVO } from "./templates";
import { SinanFormTemplate } from "./template-types";

export interface RegistryCoverageReport {
  totalAgravos: number;
  coveredAgravos: number;
  missingAgravos: AgravoDefinition[];
  coveragePercentage: number;
  templatesByCategory: Record<string, number>;
}

export function getRegistryCoverage(): RegistryCoverageReport {
  const missingAgravos: AgravoDefinition[] = [];
  const templatesByCategory: Record<string, number> = {};

  for (const agravo of SINAN_AGRAVOS_COMPLETOS) {
    const templates = SINAN_TEMPLATES_BY_AGRAVO[agravo.codigo];
    if (!templates || templates.length === 0) {
      missingAgravos.push(agravo);
    }
  }

  for (const template of SINAN_TEMPLATES) {
    const category = template.categoria || "outros";
    templatesByCategory[category] = (templatesByCategory[category] || 0) + 1;
  }

  const coveredAgravos = SINAN_AGRAVOS_COMPLETOS.length - missingAgravos.length;
  const coveragePercentage = (coveredAgravos / SINAN_AGRAVOS_COMPLETOS.length) * 100;

  return {
    totalAgravos: SINAN_AGRAVOS_COMPLETOS.length,
    coveredAgravos,
    missingAgravos,
    coveragePercentage,
    templatesByCategory,
  };
}

export interface AgravoTemplateBinding {
  agravo: AgravoDefinition;
  template: SinanFormTemplate | null;
  hasTemplate: boolean;
}

export interface AgravoTemplatesBinding {
  agravo: AgravoDefinition;
  templates: SinanFormTemplate[];
  hasTemplate: boolean;
  requiresSelection: boolean;
}

export function getAgravoTemplateBindings(): AgravoTemplatesBinding[] {
  return SINAN_AGRAVOS_COMPLETOS.map((agravo: AgravoDefinition) => {
    const templates = SINAN_TEMPLATES_BY_AGRAVO[agravo.codigo] || [];
    return {
      agravo,
      templates,
      hasTemplate: templates.length > 0,
      requiresSelection: templates.length > 1,
    };
  });
}

export function getAgravoWithTemplate(agravoCode: string): AgravoTemplatesBinding | null {
  const agravo = SINAN_AGRAVOS_COMPLETOS.find((a: AgravoDefinition) => a.codigo === agravoCode);
  if (!agravo) return null;

  const templates = SINAN_TEMPLATES_BY_AGRAVO[agravoCode] || [];
  return {
    agravo,
    templates,
    hasTemplate: templates.length > 0,
    requiresSelection: templates.length > 1,
  };
}

export function getCoveredAgravosByCategory(): Record<string, AgravoTemplatesBinding[]> {
  const bindings = getAgravoTemplateBindings();
  const byCategory: Record<string, AgravoTemplatesBinding[]> = {};

  for (const binding of bindings) {
    const category = binding.agravo.categoria;
    if (!byCategory[category]) {
      byCategory[category] = [];
    }
    byCategory[category].push(binding);
  }

  return byCategory;
}

export function assertFullCoverage(): void {
  const report = getRegistryCoverage();
  if (report.missingAgravos.length > 0) {
    const missingCodes = report.missingAgravos.map(a => a.codigo).join(", ");
    console.warn(
      `SINAN registry coverage: ${report.coveragePercentage.toFixed(1)}% ` +
      `(${report.coveredAgravos}/${report.totalAgravos}). ` +
      `Missing templates for: ${missingCodes}`
    );
  }
}

export function getRegistryStats(): {
  templates: number;
  agravos: number;
  coverage: string;
  byCategory: Record<string, { total: number; covered: number }>;
} {
  const report = getRegistryCoverage();
  const bindings = getCoveredAgravosByCategory();
  
  const byCategory: Record<string, { total: number; covered: number }> = {};
  for (const [category, categoryBindings] of Object.entries(bindings)) {
    byCategory[category] = {
      total: categoryBindings.length,
      covered: categoryBindings.filter(b => b.hasTemplate).length,
    };
  }

  return {
    templates: SINAN_TEMPLATES.length,
    agravos: SINAN_AGRAVOS_COMPLETOS.length,
    coverage: `${report.coveragePercentage.toFixed(1)}%`,
    byCategory,
  };
}
