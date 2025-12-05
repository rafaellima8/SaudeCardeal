import { SinanFormTemplate } from "../template-types";
import { DENGUE_TEMPLATE } from "./dengue";
import { TUBERCULOSE_TEMPLATE } from "./tuberculose";
import { HANSENIASE_TEMPLATE } from "./hanseniase";
import { HEPATITES_TEMPLATE } from "./hepatites";
import { SIFILIS_CONGENITA_TEMPLATE, SIFILIS_GESTANTE_TEMPLATE } from "./sifilis";
import { VIOLENCIA_TEMPLATE } from "./violencia";
import { INTOXICACAO_TEMPLATE } from "./intoxicacao";
import { MENINGITE_TEMPLATE } from "./meningite";
import { CHIKUNGUNYA_TEMPLATE, ZIKA_TEMPLATE, FEBRE_AMARELA_TEMPLATE } from "./arboviroses";
import { LEPTOSPIROSE_TEMPLATE, RAIVA_HUMANA_TEMPLATE, ACIDENTE_ANIMAL_PECONHENTO_TEMPLATE } from "./zoonoses";
import { LEISHMANIOSE_VISCERAL_TEMPLATE, LEISHMANIOSE_TEGUMENTAR_TEMPLATE, MALARIA_TEMPLATE, CHAGAS_AGUDO_TEMPLATE } from "./endemicas";
import { SARAMPO_TEMPLATE, COQUELUCHE_TEMPLATE, TETANO_ACIDENTAL_TEMPLATE, PFA_POLIOMIELITE_TEMPLATE } from "./imunoprevenivel";

export * from "./dengue";
export * from "./tuberculose";
export * from "./hanseniase";
export * from "./hepatites";
export * from "./sifilis";
export * from "./violencia";
export * from "./intoxicacao";
export * from "./meningite";
export * from "./arboviroses";
export * from "./zoonoses";
export * from "./endemicas";
export * from "./imunoprevenivel";

export const SINAN_TEMPLATES: SinanFormTemplate[] = [
  DENGUE_TEMPLATE,
  CHIKUNGUNYA_TEMPLATE,
  ZIKA_TEMPLATE,
  FEBRE_AMARELA_TEMPLATE,
  TUBERCULOSE_TEMPLATE,
  HANSENIASE_TEMPLATE,
  HEPATITES_TEMPLATE,
  SIFILIS_CONGENITA_TEMPLATE,
  SIFILIS_GESTANTE_TEMPLATE,
  VIOLENCIA_TEMPLATE,
  INTOXICACAO_TEMPLATE,
  MENINGITE_TEMPLATE,
  LEPTOSPIROSE_TEMPLATE,
  RAIVA_HUMANA_TEMPLATE,
  ACIDENTE_ANIMAL_PECONHENTO_TEMPLATE,
  LEISHMANIOSE_VISCERAL_TEMPLATE,
  LEISHMANIOSE_TEGUMENTAR_TEMPLATE,
  MALARIA_TEMPLATE,
  CHAGAS_AGUDO_TEMPLATE,
  SARAMPO_TEMPLATE,
  COQUELUCHE_TEMPLATE,
  TETANO_ACIDENTAL_TEMPLATE,
  PFA_POLIOMIELITE_TEMPLATE,
];

export const SINAN_TEMPLATE_BY_ID: Record<string, SinanFormTemplate> = {};
export const SINAN_TEMPLATES_BY_AGRAVO: Record<string, SinanFormTemplate[]> = {};
export const SINAN_TEMPLATE_BY_COMPOSITE_KEY: Record<string, SinanFormTemplate> = {};
export const SINAN_TEMPLATES_BY_CID10: Record<string, SinanFormTemplate[]> = {};

for (const template of SINAN_TEMPLATES) {
  SINAN_TEMPLATE_BY_ID[template.id] = template;
  
  if (!SINAN_TEMPLATES_BY_AGRAVO[template.agravoCode]) {
    SINAN_TEMPLATES_BY_AGRAVO[template.agravoCode] = [];
  }
  SINAN_TEMPLATES_BY_AGRAVO[template.agravoCode].push(template);
  
  const compositeKey = `${template.agravoCode}__${template.versaoFicha}`;
  SINAN_TEMPLATE_BY_COMPOSITE_KEY[compositeKey] = template;
  
  if (template.cid10) {
    if (!SINAN_TEMPLATES_BY_CID10[template.cid10]) {
      SINAN_TEMPLATES_BY_CID10[template.cid10] = [];
    }
    SINAN_TEMPLATES_BY_CID10[template.cid10].push(template);
  }
}

export const SINAN_TEMPLATE_BY_AGRAVO: Record<string, SinanFormTemplate> = {};
for (const [agravoCode, templates] of Object.entries(SINAN_TEMPLATES_BY_AGRAVO)) {
  if (templates.length === 1) {
    SINAN_TEMPLATE_BY_AGRAVO[agravoCode] = templates[0];
  }
}

export const SINAN_TEMPLATE_MAP: Record<string, SinanFormTemplate> = {
  ...SINAN_TEMPLATE_BY_ID,
  ...SINAN_TEMPLATE_BY_AGRAVO,
  ...SINAN_TEMPLATE_BY_COMPOSITE_KEY,
};

export interface AgravoLookupResult {
  agravoCode: string;
  templates: SinanFormTemplate[];
  requiresSelection: boolean;
}

export function getTemplatesByAgravo(agravoCode: string): AgravoLookupResult {
  const templates = SINAN_TEMPLATES_BY_AGRAVO[agravoCode] || [];
  return {
    agravoCode,
    templates,
    requiresSelection: templates.length > 1,
  };
}

export function getTemplateByAgravo(agravoCode: string): SinanFormTemplate | undefined {
  const result = getTemplatesByAgravo(agravoCode);
  if (result.requiresSelection) {
    console.warn(`Agravo ${agravoCode} has ${result.templates.length} templates. Use getTemplatesByAgravo() and select by versaoFicha.`);
    return undefined;
  }
  return result.templates[0];
}

export function getTemplateByCompositeKey(agravoCode: string, versaoFicha: string): SinanFormTemplate | undefined {
  return SINAN_TEMPLATE_BY_COMPOSITE_KEY[`${agravoCode}__${versaoFicha}`];
}

export interface CidLookupResult {
  cid10: string;
  templates: SinanFormTemplate[];
  requiresSelection: boolean;
}

export function getTemplatesByCid(cid10: string): CidLookupResult {
  const directMatch = SINAN_TEMPLATES_BY_CID10[cid10] || [];
  const rangeMatches: SinanFormTemplate[] = [];
  
  for (const template of SINAN_TEMPLATES) {
    if (template.cid10 === cid10) continue;
    
    if (template.cid10Range) {
      if (template.cid10Range.includes("-")) {
        const parts = template.cid10Range.split("-");
        if (parts.length === 2 && cid10 >= parts[0] && cid10 <= parts[1]) {
          rangeMatches.push(template);
        }
      }
      if (template.cid10Range.includes(",")) {
        const ranges = template.cid10Range.split(",").map(r => r.trim());
        for (const range of ranges) {
          if (range.includes("-")) {
            const [start, end] = range.split("-");
            if (cid10 >= start && cid10 <= end) {
              rangeMatches.push(template);
              break;
            }
          } else if (cid10 === range) {
            rangeMatches.push(template);
            break;
          }
        }
      }
    }
  }
  
  const allMatches = [...directMatch, ...rangeMatches];
  const uniqueMatches = allMatches.filter((t, i, arr) => 
    arr.findIndex(x => x.id === t.id) === i
  );
  
  return {
    cid10,
    templates: uniqueMatches,
    requiresSelection: uniqueMatches.length > 1,
  };
}

export function getTemplateByCid(cid10: string): SinanFormTemplate | undefined {
  const result = getTemplatesByCid(cid10);
  if (result.requiresSelection) {
    console.warn(`CID-10 ${cid10} maps to ${result.templates.length} templates. Use getTemplatesByCid() and select by agravoCode.`);
  }
  return result.templates.length === 1 ? result.templates[0] : undefined;
}

export function getAllTemplates(): SinanFormTemplate[] {
  return SINAN_TEMPLATES;
}

export function getTemplateById(templateId: string): SinanFormTemplate | undefined {
  return SINAN_TEMPLATES.find(t => t.id === templateId);
}
