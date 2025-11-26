/**
 * Seed de Especialidades e Regras de Encaminhamento Inteligente
 * 
 * Popula as tabelas:
 * - specialties: 10 especialidades do município
 * - referral_rules: Regras de matching por palavras-chave e CID
 * 
 * Executar: npx tsx server/seed-specialties.ts
 */

import { db } from "./db";
import * as schema from "@shared/schema";
import { eq, sql } from "drizzle-orm";

interface SpecialtyData {
  name: string;
  code: string;
  slug: string;
  description: string;
}

interface RuleData {
  specialtySlug: string;
  keywords: string[];
  cidCodes?: string[];
  ciapCodes?: string[];
  baseWeight: number;
  observations?: string;
}

const SPECIALTIES: SpecialtyData[] = [
  { name: "Endocrinologia", code: "ENDO", slug: "endocrino", description: "Distúrbios hormonais, diabetes, tireoide" },
  { name: "Obstetrícia", code: "OBST", slug: "obstetricia", description: "Gestação, pré-natal, parto" },
  { name: "Pediatria", code: "PEDI", slug: "pediatria", description: "Saúde infantil e adolescente" },
  { name: "Geriatria", code: "GERI", slug: "geriatria", description: "Saúde do idoso" },
  { name: "Ortopedia", code: "ORTO", slug: "ortopedia", description: "Sistema musculoesquelético" },
  { name: "Cardiologia", code: "CARD", slug: "cardiologia", description: "Sistema cardiovascular" },
  { name: "Ultrassonografia", code: "USG", slug: "ultrassonografia", description: "Diagnóstico por imagem" },
  { name: "Urologia", code: "URO", slug: "urologia", description: "Sistema urinário e reprodutor masculino" },
  { name: "Otorrinolaringologia", code: "ORL", slug: "otorrino", description: "Ouvido, nariz e garganta" },
  { name: "Psiquiatria", code: "PSIQ", slug: "psiquiatria", description: "Saúde mental" },
];

const REFERRAL_RULES: RuleData[] = [
  {
    specialtySlug: "endocrino",
    keywords: ["diabetes", "diabetico", "hipotireoidismo", "tireoide", "hipertireoidismo", "colesterol", "obesidade", "hormonio", "insulina", "glicemia", "metabolismo"],
    cidCodes: ["E10", "E11", "E03", "E05", "E66", "E78"],
    ciapCodes: ["T89", "T90", "T85"],
    baseWeight: 25,
    observations: "Doenças metabólicas e hormonais",
  },
  {
    specialtySlug: "obstetricia",
    keywords: ["gravidez", "gestante", "pre natal", "prenatal", "gravida", "sangramento na gravidez", "parto", "obstetra", "gestacao", "trimestre", "feto", "contracao"],
    cidCodes: ["O00", "O20", "O21", "O24", "O47", "Z32", "Z33", "Z34"],
    ciapCodes: ["W78", "W79", "W80", "W81", "W84"],
    baseWeight: 30,
    observations: "Acompanhamento gestacional e parto",
  },
  {
    specialtySlug: "pediatria",
    keywords: ["crianca", "febre em crianca", "pediatra", "puericultura", "infantil", "bebe", "recem nascido", "neonato", "vacina crianca", "crescimento", "desenvolvimento"],
    cidCodes: ["P07", "P22", "J06", "A08", "R50"],
    ciapCodes: ["A03", "A04", "A97"],
    baseWeight: 25,
    observations: "Saúde da criança e adolescente até 18 anos",
  },
  {
    specialtySlug: "geriatria",
    keywords: ["idoso", "queda", "demencia", "alzheimer", "fragilidade", "envelhecimento", "terceira idade", "senil", "incontinencia", "polifarmacia", "sarcopenia"],
    cidCodes: ["F00", "F01", "F03", "G30", "R54", "W19"],
    ciapCodes: ["P70", "A04", "U04"],
    baseWeight: 25,
    observations: "Saúde do idoso (60+ anos)",
  },
  {
    specialtySlug: "ortopedia",
    keywords: ["dor lombar", "lombalgia", "fratura", "queda com dor", "dor joelho", "coluna", "artrose", "tendinite", "bursite", "luxacao", "entorse", "escoliose", "hernia disco", "radiculopatia"],
    cidCodes: ["M54", "S72", "M17", "M47", "M51", "S82", "S42", "M75"],
    ciapCodes: ["L01", "L02", "L03", "L14", "L15", "L76", "L86"],
    baseWeight: 30,
    observations: "Sistema musculoesquelético e trauma",
  },
  {
    specialtySlug: "cardiologia",
    keywords: ["dor peito", "angina", "hipertensao", "pressao alta", "taquicardia", "arritmia", "palpitacao", "insuficiencia cardiaca", "sopro", "infarto", "cardiovascular"],
    cidCodes: ["I10", "I11", "I20", "I21", "I25", "I48", "I50", "R00"],
    ciapCodes: ["K74", "K75", "K76", "K77", "K78", "K79", "K86"],
    baseWeight: 30,
    observations: "Doenças cardiovasculares",
  },
  {
    specialtySlug: "ultrassonografia",
    keywords: ["ultrassom", "ecografia", "ultrassonografia", "ecografia abdominal", "ecocardiograma", "doppler", "morfologico"],
    cidCodes: [],
    baseWeight: 15,
    observations: "Diagnóstico por imagem ultrassonográfica",
  },
  {
    specialtySlug: "urologia",
    keywords: ["urina sangue", "hematuria", "dificuldade urinar", "prostata", "psa", "calculo renal", "infeccao urinaria recorrente", "incontinencia urinaria", "bexiga", "renal"],
    cidCodes: ["N40", "N20", "N30", "N39", "R31", "R33", "C61"],
    ciapCodes: ["U01", "U02", "U04", "U05", "U06", "U14", "U75"],
    baseWeight: 25,
    observations: "Sistema urinário e reprodutor masculino",
  },
  {
    specialtySlug: "otorrino",
    keywords: ["dor ouvido", "otite", "rinite", "sinusite", "zumbido", "surdez", "perda auditiva", "amigdalite", "laringite", "rouquidao", "vertigem", "tontura"],
    cidCodes: ["H60", "H65", "H66", "J01", "J30", "J31", "J32", "H93", "R42"],
    ciapCodes: ["H01", "H02", "H03", "H71", "H72", "H81", "H82", "R21", "R97"],
    baseWeight: 25,
    observations: "Ouvido, nariz e garganta",
  },
  {
    specialtySlug: "psiquiatria",
    keywords: ["depressao", "ansiedade grave", "ideacao suicida", "psicose", "esquizofrenia", "bipolar", "panico", "transtorno mental", "autolesao", "dependencia quimica", "alcoolismo"],
    cidCodes: ["F20", "F31", "F32", "F33", "F40", "F41", "F60", "F10", "X84"],
    ciapCodes: ["P01", "P02", "P03", "P15", "P16", "P17", "P18", "P19", "P73", "P74", "P76"],
    baseWeight: 30,
    observations: "Saúde mental e transtornos psiquiátricos",
  },
];

export async function seedSpecialtiesAndRules(): Promise<void> {
  console.log("[SEED] Iniciando seed de especialidades e regras de encaminhamento...");
  
  try {
    // 1. Inserir ou atualizar especialidades
    for (const spec of SPECIALTIES) {
      const existing = await db.select().from(schema.specialties).where(eq(schema.specialties.slug, spec.slug));
      
      if (existing.length === 0) {
        await db.insert(schema.specialties).values(spec);
        console.log(`  [+] Especialidade criada: ${spec.name}`);
      } else {
        await db.update(schema.specialties)
          .set({ name: spec.name, code: spec.code, description: spec.description })
          .where(eq(schema.specialties.slug, spec.slug));
        console.log(`  [~] Especialidade atualizada: ${spec.name}`);
      }
    }
    
    // 2. Buscar mapa de especialidades por slug
    const allSpecialties = await db.select().from(schema.specialties);
    const specialtyMap = new Map(allSpecialties.map(s => [s.slug, s.id]));
    
    // 3. Inserir regras de encaminhamento
    for (const rule of REFERRAL_RULES) {
      const specialtyId = specialtyMap.get(rule.specialtySlug);
      if (!specialtyId) {
        console.warn(`  [!] Especialidade não encontrada: ${rule.specialtySlug}`);
        continue;
      }
      
      // Verificar se já existe regra para esta especialidade
      const existing = await db.select()
        .from(schema.referralRules)
        .where(eq(schema.referralRules.specialtyId, specialtyId));
      
      if (existing.length === 0) {
        await db.insert(schema.referralRules).values({
          specialtyId,
          keywords: rule.keywords,
          cidCodes: rule.cidCodes || null,
          ciapCodes: rule.ciapCodes || null,
          baseWeight: rule.baseWeight,
          cidWeight: 20,
          observations: rule.observations || null,
          active: true,
        });
        console.log(`  [+] Regra criada para: ${rule.specialtySlug} (${rule.keywords.length} palavras-chave)`);
      } else {
        // Atualizar regra existente
        await db.update(schema.referralRules)
          .set({
            keywords: rule.keywords,
            cidCodes: rule.cidCodes || null,
            ciapCodes: rule.ciapCodes || null,
            baseWeight: rule.baseWeight,
            observations: rule.observations || null,
            updatedAt: new Date(),
          })
          .where(eq(schema.referralRules.specialtyId, specialtyId));
        console.log(`  [~] Regra atualizada para: ${rule.specialtySlug}`);
      }
    }
    
    console.log("[SEED] ✅ Seed de especialidades e regras concluído com sucesso!");
    console.log(`       ${SPECIALTIES.length} especialidades`);
    console.log(`       ${REFERRAL_RULES.length} regras de encaminhamento`);
  } catch (error) {
    console.error("[SEED] ❌ Erro ao executar seed:", error);
    throw error;
  }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  seedSpecialtiesAndRules()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
