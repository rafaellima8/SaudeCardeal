import type { SinanFormTemplate, SinanField, SinanFormGroup } from "../template-types";
export type { SinanFormTemplate, SinanField, SinanFormGroup } from "../template-types";
import { DENGUE_TEMPLATE } from "./dengue";
import { TUBERCULOSE_TEMPLATE } from "./tuberculose";
import { HANSENIASE_TEMPLATE } from "./hanseniase";
import { 
  HEPATITES_TEMPLATE, HEPATITE_B_TEMPLATE, HEPATITE_C_TEMPLATE, 
  HEPATITE_D_TEMPLATE, HEPATITE_E_TEMPLATE 
} from "./hepatites";
import { SIFILIS_CONGENITA_TEMPLATE, SIFILIS_GESTANTE_TEMPLATE } from "./sifilis";
import { VIOLENCIA_TEMPLATE } from "./violencia";
import { INTOXICACAO_TEMPLATE } from "./intoxicacao";
import { 
  MENINGITE_TEMPLATE, MENINGITE_TUBERCULOSA_TEMPLATE, DOENCA_MENINGOCOCICA_TEMPLATE,
  MENINGITE_VIRAL_TEMPLATE, MENINGITE_OUTRAS_TEMPLATE 
} from "./meningite";
import { 
  CHIKUNGUNYA_TEMPLATE, ZIKA_TEMPLATE, FEBRE_AMARELA_TEMPLATE,
  ENCEFALITE_ARBOVIRUS_TEMPLATE, FEBRE_NILO_TEMPLATE, FEBRE_OROPOUCHE_TEMPLATE,
  FEBRE_MAYARO_TEMPLATE, MICROCEFALIA_TEMPLATE, DENGUE_HEMORRAGICA_TEMPLATE
} from "./arboviroses";
import { 
  LEPTOSPIROSE_TEMPLATE, RAIVA_HUMANA_TEMPLATE, ACIDENTE_ANIMAL_PECONHENTO_TEMPLATE,
  ATENDIMENTO_ANTIRABICO_TEMPLATE, TULAREMIA_TEMPLATE, DOENCA_LYME_TEMPLATE, FEBRE_Q_TEMPLATE
} from "./zoonoses";
import { 
  LEISHMANIOSE_VISCERAL_TEMPLATE, LEISHMANIOSE_TEGUMENTAR_TEMPLATE, MALARIA_TEMPLATE, CHAGAS_AGUDO_TEMPLATE,
  MALARIA_VIVAX_TEMPLATE, MALARIA_MALARIAE_TEMPLATE, MALARIA_OVALE_TEMPLATE, MALARIA_NAO_ESPECIFICADA_TEMPLATE,
  CHAGAS_CRONICO_TEMPLATE
} from "./endemicas";
import { SARAMPO_TEMPLATE, COQUELUCHE_TEMPLATE, TETANO_ACIDENTAL_TEMPLATE, PFA_POLIOMIELITE_TEMPLATE } from "./imunoprevenivel";
import { DIFTERIA_TEMPLATE, INFLUENZA_TEMPLATE, SRAG_TEMPLATE, COVID19_TEMPLATE, INFLUENZA_PANDEMICA_TEMPLATE } from "./respiratorias";
import { 
  EBOLA_TEMPLATE, MARBURG_TEMPLATE, LASSA_TEMPLATE, HANTAVIROSE_TEMPLATE,
  MPOX_TEMPLATE, VARICELA_TEMPLATE, RUBEOLA_TEMPLATE, SRC_TEMPLATE, CAXUMBA_TEMPLATE 
} from "./virais";
import { COLERA_TEMPLATE, BOTULISMO_TEMPLATE, FEBRE_TIFOIDE_TEMPLATE, DTA_SURTO_TEMPLATE } from "./alimentares";
import { 
  HIV_AIDS_TEMPLATE, GESTANTE_HIV_TEMPLATE, CRIANCA_EXPOSTA_HIV_TEMPLATE,
  SIFILIS_ADQUIRIDA_TEMPLATE, GONORREIA_TEMPLATE, HERPES_GENITAL_TEMPLATE,
  HIV_CRIANCA_TEMPLATE, HIV_GESTANTE_PARTURIENTE_TEMPLATE
} from "./ist";
import { 
  ESQUISTOSSOMOSE_TEMPLATE, CISTICERCOSE_TEMPLATE, TENIASE_TEMPLATE,
  TOXOPLASMOSE_GESTANTE_TEMPLATE, TOXOPLASMOSE_CONGENITA_TEMPLATE 
} from "./parasitarias";
import { 
  ACIDENTE_TRABALHO_GRAVE_TEMPLATE, ACIDENTE_TRABALHO_CRIANCA_TEMPLATE,
  ACIDENTE_BIOLOGICO_TEMPLATE, LER_DORT_TEMPLATE, PAIR_TEMPLATE,
  PNEUMOCONIOSE_TEMPLATE, DERMATOSE_OCUPACIONAL_TEMPLATE,
  CANCER_RELACIONADO_TRABALHO_TEMPLATE, TRANSTORNO_MENTAL_TRABALHO_TEMPLATE,
  INTOXICACAO_OCUPACIONAL_TEMPLATE
} from "./trabalho";
import {
  PESTE_TEMPLATE, ANTRAZ_TEMPLATE, BRUCELOSE_TEMPLATE, TETANO_NEONATAL_TEMPLATE,
  ROTAVIRUS_TEMPLATE, FEBRE_MACULOSA_TEMPLATE, TIFO_ENDEMICO_TEMPLATE,
  TRACOMA_TEMPLATE, FILARIOSE_TEMPLATE, ONCOCERCOSE_TEMPLATE,
  DEFICIENCIA_VIT_A_TEMPLATE, BERIBERI_TEMPLATE, ANOMALIA_CONGENITA_TEMPLATE,
  OBITO_MATERNO_TEMPLATE, OBITO_INFANTIL_TEMPLATE, TIFO_EPIDEMICO_TEMPLATE,
  GEOHELMINTÍASES_TEMPLATE, INTERVENCAO_LEGAL_TEMPLATE, PORTADOR_DOENCA_TEMPLATE,
  SURTO_DTA_TEMPLATE, ONCOBIOLOGICO_TEMPLATE, CONTATO_DOENCA_TEMPLATE
} from "./outros";

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
export * from "./respiratorias";
export * from "./virais";
export * from "./alimentares";
export * from "./ist";
export * from "./parasitarias";
export * from "./trabalho";
export * from "./outros";

export const SINAN_TEMPLATES: SinanFormTemplate[] = [
  DENGUE_TEMPLATE,
  CHIKUNGUNYA_TEMPLATE,
  ZIKA_TEMPLATE,
  FEBRE_AMARELA_TEMPLATE,
  ENCEFALITE_ARBOVIRUS_TEMPLATE,
  FEBRE_NILO_TEMPLATE,
  FEBRE_OROPOUCHE_TEMPLATE,
  FEBRE_MAYARO_TEMPLATE,
  MICROCEFALIA_TEMPLATE,
  TUBERCULOSE_TEMPLATE,
  HANSENIASE_TEMPLATE,
  HEPATITES_TEMPLATE,
  HEPATITE_B_TEMPLATE,
  HEPATITE_C_TEMPLATE,
  HEPATITE_D_TEMPLATE,
  HEPATITE_E_TEMPLATE,
  SIFILIS_CONGENITA_TEMPLATE,
  SIFILIS_GESTANTE_TEMPLATE,
  VIOLENCIA_TEMPLATE,
  INTOXICACAO_TEMPLATE,
  MENINGITE_TEMPLATE,
  MENINGITE_TUBERCULOSA_TEMPLATE,
  DOENCA_MENINGOCOCICA_TEMPLATE,
  MENINGITE_VIRAL_TEMPLATE,
  MENINGITE_OUTRAS_TEMPLATE,
  LEPTOSPIROSE_TEMPLATE,
  RAIVA_HUMANA_TEMPLATE,
  ACIDENTE_ANIMAL_PECONHENTO_TEMPLATE,
  ATENDIMENTO_ANTIRABICO_TEMPLATE,
  TULAREMIA_TEMPLATE,
  DOENCA_LYME_TEMPLATE,
  FEBRE_Q_TEMPLATE,
  LEISHMANIOSE_VISCERAL_TEMPLATE,
  LEISHMANIOSE_TEGUMENTAR_TEMPLATE,
  MALARIA_TEMPLATE,
  CHAGAS_AGUDO_TEMPLATE,
  MALARIA_VIVAX_TEMPLATE,
  MALARIA_MALARIAE_TEMPLATE,
  MALARIA_OVALE_TEMPLATE,
  MALARIA_NAO_ESPECIFICADA_TEMPLATE,
  CHAGAS_CRONICO_TEMPLATE,
  SARAMPO_TEMPLATE,
  COQUELUCHE_TEMPLATE,
  TETANO_ACIDENTAL_TEMPLATE,
  PFA_POLIOMIELITE_TEMPLATE,
  DIFTERIA_TEMPLATE,
  INFLUENZA_TEMPLATE,
  SRAG_TEMPLATE,
  COVID19_TEMPLATE,
  INFLUENZA_PANDEMICA_TEMPLATE,
  EBOLA_TEMPLATE,
  MARBURG_TEMPLATE,
  LASSA_TEMPLATE,
  HANTAVIROSE_TEMPLATE,
  MPOX_TEMPLATE,
  VARICELA_TEMPLATE,
  RUBEOLA_TEMPLATE,
  SRC_TEMPLATE,
  CAXUMBA_TEMPLATE,
  COLERA_TEMPLATE,
  BOTULISMO_TEMPLATE,
  FEBRE_TIFOIDE_TEMPLATE,
  DTA_SURTO_TEMPLATE,
  HIV_AIDS_TEMPLATE,
  GESTANTE_HIV_TEMPLATE,
  CRIANCA_EXPOSTA_HIV_TEMPLATE,
  SIFILIS_ADQUIRIDA_TEMPLATE,
  GONORREIA_TEMPLATE,
  HERPES_GENITAL_TEMPLATE,
  HIV_CRIANCA_TEMPLATE,
  HIV_GESTANTE_PARTURIENTE_TEMPLATE,
  ESQUISTOSSOMOSE_TEMPLATE,
  CISTICERCOSE_TEMPLATE,
  TENIASE_TEMPLATE,
  TOXOPLASMOSE_GESTANTE_TEMPLATE,
  TOXOPLASMOSE_CONGENITA_TEMPLATE,
  ACIDENTE_TRABALHO_GRAVE_TEMPLATE,
  ACIDENTE_TRABALHO_CRIANCA_TEMPLATE,
  ACIDENTE_BIOLOGICO_TEMPLATE,
  LER_DORT_TEMPLATE,
  PAIR_TEMPLATE,
  PNEUMOCONIOSE_TEMPLATE,
  DERMATOSE_OCUPACIONAL_TEMPLATE,
  CANCER_RELACIONADO_TRABALHO_TEMPLATE,
  TRANSTORNO_MENTAL_TRABALHO_TEMPLATE,
  PESTE_TEMPLATE,
  ANTRAZ_TEMPLATE,
  BRUCELOSE_TEMPLATE,
  TETANO_NEONATAL_TEMPLATE,
  ROTAVIRUS_TEMPLATE,
  FEBRE_MACULOSA_TEMPLATE,
  TIFO_ENDEMICO_TEMPLATE,
  TRACOMA_TEMPLATE,
  FILARIOSE_TEMPLATE,
  ONCOCERCOSE_TEMPLATE,
  DEFICIENCIA_VIT_A_TEMPLATE,
  BERIBERI_TEMPLATE,
  ANOMALIA_CONGENITA_TEMPLATE,
  OBITO_MATERNO_TEMPLATE,
  OBITO_INFANTIL_TEMPLATE,
  TIFO_EPIDEMICO_TEMPLATE,
  GEOHELMINTÍASES_TEMPLATE,
  INTERVENCAO_LEGAL_TEMPLATE,
  PORTADOR_DOENCA_TEMPLATE,
  SURTO_DTA_TEMPLATE,
  ONCOBIOLOGICO_TEMPLATE,
  CONTATO_DOENCA_TEMPLATE,
  DENGUE_HEMORRAGICA_TEMPLATE,
  INTOXICACAO_OCUPACIONAL_TEMPLATE,
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
    throw new Error(`Agravo ${agravoCode} has ${result.templates.length} templates. Use getTemplatesByAgravo() or getTemplateByCompositeKey() to select a specific version.`);
  }
  return result.templates[0];
}

export function getTemplateByAgravoSafe(agravoCode: string): SinanFormTemplate | AgravoLookupResult {
  const result = getTemplatesByAgravo(agravoCode);
  if (result.requiresSelection) {
    return result;
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
    throw new Error(`CID-10 ${cid10} maps to ${result.templates.length} templates. Use getTemplatesByCid() to get all and select manually.`);
  }
  return result.templates.length === 1 ? result.templates[0] : undefined;
}

export function getAllTemplates(): SinanFormTemplate[] {
  return SINAN_TEMPLATES;
}

export function getTemplateById(templateId: string): SinanFormTemplate | undefined {
  return SINAN_TEMPLATE_BY_ID[templateId];
}

export function getTemplateCoverage(): { 
  total: number; 
  implemented: number; 
  percentage: number;
  byCategory: Record<string, { total: number; implemented: number }>;
} {
  const categories: Record<string, { total: number; implemented: number }> = {};
  
  for (const template of SINAN_TEMPLATES) {
    if (!categories[template.categoria]) {
      categories[template.categoria] = { total: 0, implemented: 0 };
    }
    categories[template.categoria].implemented++;
    categories[template.categoria].total++;
  }
  
  return {
    total: 82,
    implemented: SINAN_TEMPLATES.length,
    percentage: Math.round((SINAN_TEMPLATES.length / 82) * 100),
    byCategory: categories,
  };
}
