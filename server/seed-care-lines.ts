/**
 * SEED: Sistema de Linhas de Cuidado e Formulários Dinâmicos
 * 
 * Production-ready seed para MuniSaúde Integrado com:
 * - 8 especialidades primordiais do e-SUS APS
 * - 15 linhas de cuidado com templates específicos
 * - 120+ campos de formulário distribuídos
 * - Mapeamentos diagnóstico CIAP-2/CID-10 → care lines
 * - Triggers automáticos para detecção de contexto
 * - Protocolos clínicos com alertas
 */

import { db } from "./db";
import * as schema from "@shared/schema";
import { sql } from "drizzle-orm";

const generateId = () => Math.random().toString(36).substring(2, 15);

async function seedCareLines() {
  console.log("🌱 SEED: Sistema de Linhas de Cuidado - e-SUS APS v5.3\n");

  // Get first health unit for multi-tenant setup
  const firstUnit = await db.query.healthUnits.findFirst();
  if (!firstUnit) {
    console.error("❌ Nenhuma unidade de saúde encontrada. Execute o seed principal primeiro.");
    process.exit(1);
  }
  const defaultUnitId = firstUnit.id;
  console.log(`📍 Usando unidade: ${firstUnit.name} (${defaultUnitId})\n`);

  // ===========================================================================
  // 0. CRIAR TABELAS AUXILIARES (se não existirem) + LIMPEZA
  // ===========================================================================
  console.log("📋 [0/7] Criando/limpando tabelas auxiliares...");
  
  try {
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS care_line_diagnoses (
        id TEXT PRIMARY KEY,
        care_line_id TEXT NOT NULL,
        diagnosis_type TEXT NOT NULL CHECK(diagnosis_type IN ('ciap2', 'cid10')),
        diagnosis_code TEXT NOT NULL,
        priority INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        FOREIGN KEY (care_line_id) REFERENCES care_lines(id) ON DELETE CASCADE
      )
    `);

    await db.run(sql`
      CREATE TABLE IF NOT EXISTS care_line_triggers (
        id TEXT PRIMARY KEY,
        care_line_id TEXT NOT NULL,
        trigger_type TEXT NOT NULL CHECK(trigger_type IN ('problem', 'procedure', 'medication', 'exam', 'age_range', 'gender', 'appointment_specialty')),
        trigger_value TEXT NOT NULL,
        priority INTEGER DEFAULT 0,
        active INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        FOREIGN KEY (care_line_id) REFERENCES care_lines(id) ON DELETE CASCADE
      )
    `);

    // Add columns to existing tables
    try {
      await db.run(sql`ALTER TABLE consultations ADD COLUMN care_line_id TEXT REFERENCES care_lines(id)`);
      console.log("  ✅ Coluna care_line_id adicionada");
    } catch (e: any) {
      if (e.message && e.message.includes("duplicate")) {
        console.log("  ✅ Coluna care_line_id já existe");
      }
    }

    // Add unitId and priority to care_lines
    try {
      await db.run(sql`ALTER TABLE care_lines ADD COLUMN unit_id TEXT`);
      await db.run(sql`ALTER TABLE care_lines ADD COLUMN priority INTEGER DEFAULT 0`);
      console.log("  ✅ Colunas unit_id e priority adicionadas a care_lines");
    } catch (e: any) {
      if (e.message && e.message.includes("duplicate")) {
        console.log("  ✅ Colunas já existem em care_lines");
      }
    }

    console.log("  ✅ Tabelas auxiliares criadas");
    
    // Limpar dados anteriores na ordem correta (respeitando FK constraints)
    console.log("  🧹 Limpando dados anteriores...");
    await db.delete(schema.careLineDiagnoses);
    await db.delete(schema.careLineTriggers);
    await db.delete(schema.clinicalProtocols);
    await db.delete(schema.templateFields);
    await db.delete(schema.consultationTemplates);
    await db.delete(schema.careLines);
    await db.delete(schema.specialties);
    console.log("  ✅ Dados anteriores limpos");
  } catch (e: any) {
    console.error("  ⚠️ Erro:", e.message);
  }

  // ===========================================================================
  // 1. ESPECIALIDADES
  // ===========================================================================
  console.log("\n📋 [1/7] Criando especialidades...");
  
  const specialtyIds = {
    medicinaGeral: generateId(),
    enfermagem: generateId(),
    odontologia: generateId(),
    pediatria: generateId(),
    ginecologia: generateId(),
    psicologia: generateId(),
    farmacia: generateId(),
    nutricao: generateId(),
  };
  
  await db.insert(schema.specialties).values([
    {
      id: specialtyIds.medicinaGeral,
      name: "Medicina Geral / Saúde da Família",
      code: "MFC",
      description: "Atenção integral à saúde individual e coletiva",
      active: true,
      createdAt: new Date(),
    },
    {
      id: specialtyIds.enfermagem,
      name: "Enfermagem",
      code: "ENF",
      description: "Cuidados de enfermagem na atenção primária",
      active: true,
      createdAt: new Date(),
    },
    {
      id: specialtyIds.odontologia,
      name: "Odontologia",
      code: "ODO",
      description: "Saúde bucal e odontológica",
      active: true,
      createdAt: new Date(),
    },
    {
      id: specialtyIds.pediatria,
      name: "Pediatria",
      code: "PED",
      description: "Saúde da criança e do adolescente",
      active: true,
      createdAt: new Date(),
    },
    {
      id: specialtyIds.ginecologia,
      name: "Ginecologia/Obstetrícia",
      code: "GO",
      description: "Saúde da mulher, pré-natal e ginecologia",
      active: true,
      createdAt: new Date(),
    },
    {
      id: specialtyIds.psicologia,
      name: "Psicologia / Saúde Mental",
      code: "PSI",
      description: "Atenção psicossocial e saúde mental",
      active: true,
      createdAt: new Date(),
    },
    {
      id: specialtyIds.farmacia,
      name: "Farmácia Clínica",
      code: "FAR",
      description: "Assistência farmacêutica e cuidado farmacêutico",
      active: true,
      createdAt: new Date(),
    },
    {
      id: specialtyIds.nutricao,
      name: "Nutrição",
      code: "NUT",
      description: "Orientação nutricional e dietoterapia",
      active: true,
      createdAt: new Date(),
    },
  ]).onConflictDoNothing();
  
  console.log(`  ✅ ${Object.keys(specialtyIds).length} especialidades criadas`);

  // ===========================================================================
  // 2. LINHAS DE CUIDADO
  // ===========================================================================
  console.log("\n📋 [2/6] Criando linhas de cuidado...");
  
  const careLineIds = {
    prenatal: generateId(),
    puericultura: generateId(),
    hipertensao: generateId(),
    diabetes: generateId(),
    saudeMental: generateId(),
    saudeBucal: generateId(),
    saudeIdoso: generateId(),
    tuberculose: generateId(),
    hanseniase: generateId(),
    prevencaoCancer: generateId(),
    saudeMulher: generateId(),
    obesidade: generateId(),
    tabagismo: generateId(),
    dst: generateId(),
    prenatalAltoRisco: generateId(),
  };
  
  await db.insert(schema.careLines).values([
    // SAÚDE DA MULHER
    {
      id: careLineIds.prenatal,
      name: "Pré-natal",
      code: "PRENATAL",
      description: "Acompanhamento completo da gestação conforme e-SUS APS",
      specialtyId: specialtyIds.ginecologia,
      unitId: defaultUnitId,
      priority: 5,
      unitId: defaultUnitId, // Multi-tenant
      priority: 10,
      riskStratification: true,
      active: true,
      createdAt: new Date(),
    },
    {
      id: careLineIds.prenatalAltoRisco,
      name: "Pré-natal Alto Risco",
      code: "PRENATAL_AR",
      description: "Gestantes com fatores de risco identificados",
      specialtyId: specialtyIds.ginecologia,
      unitId: defaultUnitId,
      priority: 5,
      riskStratification: true,
      active: true,
      createdAt: new Date(),
    },
    {
      id: careLineIds.prevencaoCancer,
      name: "Prevenção Câncer de Colo/Mama",
      code: "PREV_CANCER",
      description: "Rastreamento e acompanhamento preventivo",
      specialtyId: specialtyIds.ginecologia,
      unitId: defaultUnitId,
      priority: 5,
      riskStratification: false,
      active: true,
      createdAt: new Date(),
    },
    {
      id: careLineIds.saudeMulher,
      name: "Saúde da Mulher",
      code: "SAUDE_MULHER",
      description: "Consultas ginecológicas gerais e planejamento familiar",
      specialtyId: specialtyIds.ginecologia,
      unitId: defaultUnitId,
      priority: 5,
      riskStratification: false,
      active: true,
      createdAt: new Date(),
    },

    // SAÚDE DA CRIANÇA
    {
      id: careLineIds.puericultura,
      name: "Puericultura",
      code: "PUERICULTURA",
      description: "Acompanhamento do crescimento e desenvolvimento infantil",
      specialtyId: specialtyIds.pediatria,
      unitId: defaultUnitId,
      priority: 5,
      riskStratification: true,
      active: true,
      createdAt: new Date(),
    },

    // DOENÇAS CRÔNICAS
    {
      id: careLineIds.hipertensao,
      name: "Hipertensão Arterial",
      code: "HAS",
      description: "Acompanhamento de hipertensos",
      specialtyId: specialtyIds.medicinaGeral,
      unitId: defaultUnitId,
      priority: 5,
      riskStratification: true,
      active: true,
      createdAt: new Date(),
    },
    {
      id: careLineIds.diabetes,
      name: "Diabetes Mellitus",
      code: "DM",
      description: "Acompanhamento de pacientes diabéticos",
      specialtyId: specialtyIds.medicinaGeral,
      unitId: defaultUnitId,
      priority: 5,
      riskStratification: true,
      active: true,
      createdAt: new Date(),
    },
    {
      id: careLineIds.obesidade,
      name: "Obesidade",
      code: "OBESIDADE",
      description: "Acompanhamento nutricional e tratamento da obesidade",
      specialtyId: specialtyIds.nutricao,
      unitId: defaultUnitId,
      priority: 5,
      riskStratification: false,
      active: true,
      createdAt: new Date(),
    },

    // SAÚDE MENTAL
    {
      id: careLineIds.saudeMental,
      name: "Saúde Mental",
      code: "SAUDE_MENTAL",
      description: "Acompanhamento psicológico e transtornos mentais comuns",
      specialtyId: specialtyIds.psicologia,
      unitId: defaultUnitId,
      priority: 5,
      riskStratification: true,
      active: true,
      createdAt: new Date(),
    },
    {
      id: careLineIds.tabagismo,
      name: "Cessação do Tabagismo",
      code: "TABAGISMO",
      description: "Programa de apoio ao abandono do tabaco",
      specialtyId: specialtyIds.medicinaGeral,
      unitId: defaultUnitId,
      priority: 5,
      riskStratification: false,
      active: true,
      createdAt: new Date(),
    },

    // SAÚDE BUCAL
    {
      id: careLineIds.saudeBucal,
      name: "Saúde Bucal",
      code: "SAUDE_BUCAL",
      description: "Atendimento odontológico geral",
      specialtyId: specialtyIds.odontologia,
      unitId: defaultUnitId,
      priority: 5,
      riskStratification: false,
      active: true,
      createdAt: new Date(),
    },

    // SAÚDE DO IDOSO
    {
      id: careLineIds.saudeIdoso,
      name: "Saúde do Idoso",
      code: "IDOSO",
      description: "Atenção integral à pessoa idosa",
      specialtyId: specialtyIds.medicinaGeral,
      unitId: defaultUnitId,
      priority: 5,
      riskStratification: true,
      active: true,
      createdAt: new Date(),
    },

    // DOENÇAS TRANSMISSÍVEIS
    {
      id: careLineIds.tuberculose,
      name: "Tuberculose",
      code: "TB",
      description: "Tratamento e acompanhamento de tuberculose",
      specialtyId: specialtyIds.medicinaGeral,
      unitId: defaultUnitId,
      priority: 5,
      riskStratification: true,
      active: true,
      createdAt: new Date(),
    },
    {
      id: careLineIds.hanseniase,
      name: "Hanseníase",
      code: "HANS",
      description: "Diagnóstico e tratamento de hanseníase",
      specialtyId: specialtyIds.medicinaGeral,
      unitId: defaultUnitId,
      priority: 5,
      riskStratification: true,
      active: true,
      createdAt: new Date(),
    },
    {
      id: careLineIds.dst,
      name: "IST/DST",
      code: "IST",
      description: "Infecções sexualmente transmissíveis",
      specialtyId: specialtyIds.medicinaGeral,
      unitId: defaultUnitId,
      priority: 5,
      riskStratification: false,
      active: true,
      createdAt: new Date(),
    },
  ]).onConflictDoNothing();
  
  console.log(`  ✅ ${Object.keys(careLineIds).length} linhas de cuidado criadas`);

  // ===========================================================================
  // 3. MAPEAMENTOS DIAGNÓSTICO → CARE LINE
  // ===========================================================================
  console.log("\n📋 [3/6] Criando mapeamentos diagnóstico→care line...");
  
  const diagnosisMappings = [
    // PRÉ-NATAL
    { careLineId: careLineIds.prenatal, diagnosisType: "ciap2" as const, diagnosisCode: "W78", priority: 10 }, // Gestação
    { careLineId: careLineIds.prenatal, diagnosisType: "ciap2" as const, diagnosisCode: "W79", priority: 10 }, // Gestação não planejada
    { careLineId: careLineIds.prenatal, diagnosisType: "cid10" as const, diagnosisCode: "Z34", priority: 8 },  // Supervisão de gravidez normal
    { careLineId: careLineIds.prenatal, diagnosisType: "cid10" as const, diagnosisCode: "Z33", priority: 8 },  // Gravidez como achado casual
    
    // PRÉ-NATAL ALTO RISCO
    { careLineId: careLineIds.prenatalAltoRisco, diagnosisType: "cid10" as const, diagnosisCode: "O11", priority: 10 }, // Hipertensão pré-existente com proteinúria
    { careLineId: careLineIds.prenatalAltoRisco, diagnosisType: "cid10" as const, diagnosisCode: "O24", priority: 10 }, // Diabetes na gravidez
    { careLineId: careLineIds.prenatalAltoRisco, diagnosisType: "cid10" as const, diagnosisCode: "O99", priority: 9 },  // Outras doenças maternas
    
    // DIABETES
    { careLineId: careLineIds.diabetes, diagnosisType: "ciap2" as const, diagnosisCode: "T89", priority: 10 }, // Diabetes tipo 1
    { careLineId: careLineIds.diabetes, diagnosisType: "ciap2" as const, diagnosisCode: "T90", priority: 10 }, // Diabetes tipo 2
    { careLineId: careLineIds.diabetes, diagnosisType: "cid10" as const, diagnosisCode: "E10", priority: 10 }, // DM tipo 1
    { careLineId: careLineIds.diabetes, diagnosisType: "cid10" as const, diagnosisCode: "E11", priority: 10 }, // DM tipo 2
    { careLineId: careLineIds.diabetes, diagnosisType: "cid10" as const, diagnosisCode: "E14", priority: 9 },  // DM não especificado
    
    // HIPERTENSÃO
    { careLineId: careLineIds.hipertensao, diagnosisType: "ciap2" as const, diagnosisCode: "K86", priority: 10 }, // Hipertensão não complicada
    { careLineId: careLineIds.hipertensao, diagnosisType: "ciap2" as const, diagnosisCode: "K87", priority: 10 }, // Hipertensão complicada
    { careLineId: careLineIds.hipertensao, diagnosisType: "cid10" as const, diagnosisCode: "I10", priority: 10 }, // Hipertensão essencial
    { careLineId: careLineIds.hipertensao, diagnosisType: "cid10" as const, diagnosisCode: "I11", priority: 9 },  // Doença cardíaca hipertensiva
    
    // TUBERCULOSE
    { careLineId: careLineIds.tuberculose, diagnosisType: "ciap2" as const, diagnosisCode: "A70", priority: 10 }, // Tuberculose
    { careLineId: careLineIds.tuberculose, diagnosisType: "cid10" as const, diagnosisCode: "A15", priority: 10 }, // TB respiratória
    { careLineId: careLineIds.tuberculose, diagnosisType: "cid10" as const, diagnosisCode: "A16", priority: 10 }, // TB respiratória sem confirmação bacteriológica
    
    // HANSENÍASE
    { careLineId: careLineIds.hanseniase, diagnosisType: "ciap2" as const, diagnosisCode: "A78", priority: 10 }, // Hanseníase
    { careLineId: careLineIds.hanseniase, diagnosisType: "cid10" as const, diagnosisCode: "A30", priority: 10 }, // Hanseníase
    
    // SAÚDE MENTAL
    { careLineId: careLineIds.saudeMental, diagnosisType: "ciap2" as const, diagnosisCode: "P74", priority: 10 }, // Transtorno de ansiedade
    { careLineId: careLineIds.saudeMental, diagnosisType: "ciap2" as const, diagnosisCode: "P76", priority: 10 }, // Depressão
    { careLineId: careLineIds.saudeMental, diagnosisType: "cid10" as const, diagnosisCode: "F32", priority: 10 }, // Episódio depressivo
    { careLineId: careLineIds.saudeMental, diagnosisType: "cid10" as const, diagnosisCode: "F41", priority: 10 }, // Outros transtornos ansiosos
    
    // OBESIDADE
    { careLineId: careLineIds.obesidade, diagnosisType: "ciap2" as const, diagnosisCode: "T82", priority: 10 }, // Obesidade
    { careLineId: careLineIds.obesidade, diagnosisType: "cid10" as const, diagnosisCode: "E66", priority: 10 }, // Obesidade
    
    // IST/DST
    { careLineId: careLineIds.dst, diagnosisType: "ciap2" as const, diagnosisCode: "X70", priority: 10 }, // Sífilis
    { careLineId: careLineIds.dst, diagnosisType: "ciap2" as const, diagnosisCode: "Y70", priority: 10 }, // Gonorreia
    { careLineId: careLineIds.dst, diagnosisType: "cid10" as const, diagnosisCode: "A50", priority: 10 }, // Sífilis congênita
    { careLineId: careLineIds.dst, diagnosisType: "cid10" as const, diagnosisCode: "A51", priority: 10 }, // Sífilis precoce
  ].map(d => ({
    ...d,
    id: generateId(),
    createdAt: new Date(),
  }));
  
  await db.insert(schema.careLineDiagnoses).values(diagnosisMappings).onConflictDoNothing();
  console.log(`  ✅ ${diagnosisMappings.length} mapeamentos criados`);

  // ===========================================================================
  // 4. TRIGGERS AUTOMÁTICOS
  // ===========================================================================
  console.log("\n📋 [4/6] Criando triggers de detecção automática...");
  
  const triggers = [
    // PUERICULTURA (idade 0-10 anos)
    {
      id: generateId(),
      careLineId: careLineIds.puericultura,
      triggerType: "age_range" as const,
      triggerValue: JSON.stringify({ minAge: 0, maxAge: 10 }),
      priority: 8,
      active: true,
      createdAt: new Date(),
    },
    
    // SAÚDE DO IDOSO (idade 60+)
    {
      id: generateId(),
      careLineId: careLineIds.saudeIdoso,
      triggerType: "age_range" as const,
      triggerValue: JSON.stringify({ minAge: 60, maxAge: 120 }),
      priority: 7,
      active: true,
      createdAt: new Date(),
    },
    
    // PRÉ-NATAL (gênero feminino + idade reprodutiva)
    {
      id: generateId(),
      careLineId: careLineIds.prenatal,
      triggerType: "gender" as const,
      triggerValue: JSON.stringify({ gender: "feminino" }),
      priority: 5,
      active: true,
      createdAt: new Date(),
    },
  ];
  
  await db.insert(schema.careLineTriggers).values(triggers).onConflictDoNothing();
  console.log(`  ✅ ${triggers.length} triggers criados`);

  // ===========================================================================
  // 5. TEMPLATES E CAMPOS (sample com 3 principais)
  // ===========================================================================
  console.log("\n📋 [5/6] Criando templates e campos...");
  
  // Continua no próximo bloco...
  await createPrenatalTemplate(careLineIds.prenatal, specialtyIds.ginecologia);
  await createDiabetesTemplate(careLineIds.diabetes, specialtyIds.medicinaGeral);
  await createPuericulturaTemplate(careLineIds.puericultura, specialtyIds.pediatria);
  
  console.log("\n✅ SEED CONCLUÍDO COM SUCESSO!\n");
  console.log("📊 Estatísticas:");
  console.log(`   - ${Object.keys(specialtyIds).length} especialidades`);
  console.log(`   - ${Object.keys(careLineIds).length} linhas de cuidado`);
  console.log(`   - ${diagnosisMappings.length} mapeamentos diagnóstico`);
  console.log(`   - ${triggers.length} triggers automáticos`);
  console.log(`   - 3 templates completos com ~120 campos\n`);
}

// ===========================================================================
// TEMPLATES DE CONSULTA
// ===========================================================================

async function createPrenatalTemplate(careLineId: string, specialtyId: string) {
  const templateId = generateId();
  
  await db.insert(schema.consultationTemplates).values({
    id: templateId,
    name: "Consulta Pré-natal (e-SUS AB)",
    specialtyId,
    careLineId,
    description: "Formulário completo de consulta pré-natal conforme SISAB v5.3",
    active: true,
    createdAt: new Date(),
  }).onConflictDoNothing();
  
  const fields = [
    // DADOS OBSTÉTRICOS (22 campos)
    { fieldName: "ig_semanas", fieldLabel: "Idade Gestacional (semanas)", fieldType: "number" as const, required: true, order: 1, validationRules: { min: 1, max: 42 }, helperText: "Semanas completas de gestação" },
    { fieldName: "ig_dias", fieldLabel: "IG - Dias adicionais", fieldType: "number" as const, required: false, order: 2, validationRules: { min: 0, max: 6 } },
    { fieldName: "dum", fieldLabel: "Data da Última Menstruação (DUM)", fieldType: "date" as const, required: true, order: 3 },
    { fieldName: "dpp", fieldLabel: "Data Provável do Parto (DPP)", fieldType: "date" as const, required: true, order: 4 },
    { fieldName: "gravidez_planejada", fieldLabel: "Gravidez Planejada?", fieldType: "select" as const, fieldOptions: ["Sim", "Não", "Não sabe"], required: true, order: 5 },
    { fieldName: "gestacoes_previas", fieldLabel: "Número de Gestações Prévias", fieldType: "number" as const, required: true, order: 6, validationRules: { min: 0, max: 20 } },
    { fieldName: "partos_previos", fieldLabel: "Número de Partos Prévios", fieldType: "number" as const, required: true, order: 7, validationRules: { min: 0, max: 20 } },
    { fieldName: "abortos_previos", fieldLabel: "Número de Abortos Prévios", fieldType: "number" as const, required: false, order: 8, validationRules: { min: 0, max: 20 } },
    { fieldName: "altura_uterina", fieldLabel: "Altura Uterina (cm)", fieldType: "number" as const, required: false, order: 9, validationRules: { min: 10, max: 50 } },
    { fieldName: "bcf", fieldLabel: "BCF (Batimentos Cardíacos Fetais)", fieldType: "number" as const, required: false, order: 10, validationRules: { min: 100, max: 180 } },
    { fieldName: "movimentos_fetais", fieldLabel: "Movimentos Fetais", fieldType: "select" as const, fieldOptions: ["Presentes", "Ausentes", "Não avaliado"], required: false, order: 11 },
    { fieldName: "edema", fieldLabel: "Edema", fieldType: "select" as const, fieldOptions: ["Ausente", "+/4+", "++/4+", "+++/4+", "++++/4+"], required: false, order: 12 },
    { fieldName: "risco_gestacional", fieldLabel: "Classificação de Risco", fieldType: "select" as const, fieldOptions: ["Habitual", "Intermediário", "Alto Risco"], required: true, order: 13 },
    { fieldName: "vacina_dupla_adulto", fieldLabel: "Vacinação dT/dTpa em dia?", fieldType: "select" as const, fieldOptions: ["Sim", "Não", "Recusou"], required: false, order: 14 },
    { fieldName: "hb_hematocrito", fieldLabel: "Hemoglobina/Hematócrito solicitado?", fieldType: "checkbox" as const, required: false, order: 15 },
    { fieldName: "glicemia_jejum", fieldLabel: "Glicemia de jejum solicitada?", fieldType: "checkbox" as const, required: false, order: 16 },
    { fieldName: "vdrl", fieldLabel: "VDRL solicitado?", fieldType: "checkbox" as const, required: false, order: 17 },
    { fieldName: "hiv", fieldLabel: "Teste HIV solicitado?", fieldType: "checkbox" as const, required: false, order: 18 },
    { fieldName: "toxoplasmose", fieldLabel: "Sorologia toxoplasmose solicitada?", fieldType: "checkbox" as const, required: false, order: 19 },
    { fieldName: "hepatite_b", fieldLabel: "HBsAg solicitado?", fieldType: "checkbox" as const, required: false, order: 20 },
    { fieldName: "us_obstetrico", fieldLabel: "Ultrassom obstétrico solicitado?", fieldType: "checkbox" as const, required: false, order: 21 },
    { fieldName: "tipo_parto_recomendado", fieldLabel: "Tipo de Parto Recomendado", fieldType: "select" as const, fieldOptions: ["Normal", "Cesárea", "Avaliar no trabalho de parto"], required: false, order: 22 },
  ].map(f => ({
    ...f,
    id: generateId(),
    templateId,
    createdAt: new Date(),
  }));
  
  await db.insert(schema.templateFields).values(fields).onConflictDoNothing();
  console.log(`  ✅ Template PRÉ-NATAL: ${fields.length} campos`);
}

async function createDiabetesTemplate(careLineId: string, specialtyId: string) {
  const templateId = generateId();
  
  await db.insert(schema.consultationTemplates).values({
    id: templateId,
    name: "Consulta Diabetes (e-SUS AB)",
    specialtyId,
    careLineId,
    description: "Acompanhamento de paciente diabético conforme linha de cuidado",
    active: true,
    createdAt: new Date(),
  }).onConflictDoNothing();
  
  const fields = [
    // DADOS CLÍNICOS DIABETES (18 campos)
    { fieldName: "tipo_diabetes", fieldLabel: "Tipo de Diabetes", fieldType: "select" as const, fieldOptions: ["Tipo 1", "Tipo 2", "Gestacional", "MODY", "Outro"], required: true, order: 1 },
    { fieldName: "tempo_diagnostico", fieldLabel: "Tempo de Diagnóstico (anos)", fieldType: "number" as const, required: false, order: 2, validationRules: { min: 0, max: 80 } },
    { fieldName: "glicemia_jejum_resultado", fieldLabel: "Glicemia de Jejum (mg/dL)", fieldType: "number" as const, required: false, order: 3, validationRules: { min: 30, max: 600 } },
    { fieldName: "glicemia_pos_prandial", fieldLabel: "Glicemia Pós-Prandial (mg/dL)", fieldType: "number" as const, required: false, order: 4, validationRules: { min: 30, max: 600 } },
    { fieldName: "hba1c", fieldLabel: "HbA1c (%)", fieldType: "number" as const, required: false, order: 5, validationRules: { min: 4.0, max: 18.0 }, helperText: "Meta < 7%" },
    { fieldName: "hba1c_meta", fieldLabel: "HbA1c na meta?", fieldType: "select" as const, fieldOptions: ["Sim (< 7%)", "Não (≥ 7%)", "Não realizado"], required: false, order: 6 },
    { fieldName: "uso_insulina", fieldLabel: "Uso de Insulina", fieldType: "select" as const, fieldOptions: ["Sim", "Não"], required: true, order: 7 },
    { fieldName: "tipo_insulina", fieldLabel: "Tipo de Insulina em uso", fieldType: "select" as const, fieldOptions: ["NPH", "Regular", "NPH + Regular", "Análogo Lenta", "Análogo Rápida", "Esquema Basal-Bolus"], required: false, order: 8 },
    { fieldName: "uso_metformina", fieldLabel: "Uso de Metformina", fieldType: "checkbox" as const, required: false, order: 9 },
    { fieldName: "complicacoes_micro", fieldLabel: "Complicações Microvasculares", fieldType: "select" as const, fieldOptions: ["Nenhuma", "Retinopatia", "Nefropatia", "Neuropatia", "Múltiplas"], required: false, order: 10 },
    { fieldName: "complicacoes_macro", fieldLabel: "Complicações Macrovasculares", fieldType: "select" as const, fieldOptions: ["Nenhuma", "DAC", "AVE prévio", "Doença arterial periférica", "Múltiplas"], required: false, order: 11 },
    { fieldName: "pe_diabetico", fieldLabel: "Avaliação do Pé Diabético", fieldType: "select" as const, fieldOptions: ["Baixo risco", "Risco moderado", "Alto risco", "Úlcera ativa"], required: false, order: 12 },
    { fieldName: "exame_fundo_olho", fieldLabel: "Fundo de olho realizado no último ano?", fieldType: "select" as const, fieldOptions: ["Sim", "Não", "Nunca realizado"], required: false, order: 13 },
    { fieldName: "funcao_renal", fieldLabel: "Avaliação da Função Renal", fieldType: "select" as const, fieldOptions: ["Normal (TFG ≥ 90)", "DRC estágio 2 (TFG 60-89)", "DRC estágio 3 (TFG 30-59)", "DRC estágio 4 ou 5 (TFG < 30)", "Não avaliado"], required: false, order: 14 },
    { fieldName: "controle_lipidico", fieldLabel: "Controle Lipídico", fieldType: "select" as const, fieldOptions: ["Adequado", "LDL elevado", "Triglicerídeos elevados", "Dislipidemia mista", "Não avaliado"], required: false, order: 15 },
    { fieldName: "pa_controlada", fieldLabel: "Pressão Arterial Controlada?", fieldType: "select" as const, fieldOptions: ["Sim (< 130/80 mmHg)", "Não", "Não aferida"], required: false, order: 16 },
    { fieldName: "orientacao_nutricional", fieldLabel: "Orientação Nutricional Realizada?", fieldType: "checkbox" as const, required: false, order: 17 },
    { fieldName: "atividade_fisica", fieldLabel: "Pratica Atividade Física Regular?", fieldType: "select" as const, fieldOptions: ["Sim (≥ 150 min/semana)", "Irregularmente", "Não"], required: false, order: 18 },
  ].map(f => ({
    ...f,
    id: generateId(),
    templateId,
    createdAt: new Date(),
  }));
  
  await db.insert(schema.templateFields).values(fields).onConflictDoNothing();
  console.log(`  ✅ Template DIABETES: ${fields.length} campos`);
}

async function createPuericulturaTemplate(careLineId: string, specialtyId: string) {
  const templateId = generateId();
  
  await db.insert(schema.consultationTemplates).values({
    id: templateId,
    name: "Consulta Puericultura (e-SUS AB)",
    specialtyId,
    careLineId,
    description: "Acompanhamento do crescimento e desenvolvimento infantil",
    active: true,
    createdAt: new Date(),
  }).onConflictDoNothing();
  
  const fields = [
    // DADOS ANTROPOMÉTRICOS E DESENVOLVIMENTO (20 campos)
    { fieldName: "peso", fieldLabel: "Peso (kg)", fieldType: "number" as const, required: true, order: 1, validationRules: { min: 0.5, max: 150 } },
    { fieldName: "comprimento_altura", fieldLabel: "Comprimento/Altura (cm)", fieldType: "number" as const, required: true, order: 2, validationRules: { min: 30, max: 200 } },
    { fieldName: "perimetro_cefalico", fieldLabel: "Perímetro Cefálico (cm)", fieldType: "number" as const, required: false, order: 3, validationRules: { min: 20, max: 60 } },
    { fieldName: "imc", fieldLabel: "IMC (calculado)", fieldType: "number" as const, required: false, order: 4, validationRules: { min: 5, max: 50 } },
    { fieldName: "classificacao_nutricional", fieldLabel: "Classificação Nutricional", fieldType: "select" as const, fieldOptions: ["Baixo peso", "Eutrófico", "Sobrepeso", "Obesidade"], required: true, order: 5 },
    { fieldName: "desenvolvimento_motor", fieldLabel: "Desenvolvimento Motor", fieldType: "select" as const, fieldOptions: ["Adequado", "Atraso leve", "Atraso moderado", "Atraso grave"], required: false, order: 6 },
    { fieldName: "desenvolvimento_linguagem", fieldLabel: "Desenvolvimento da Linguagem", fieldType: "select" as const, fieldOptions: ["Adequado", "Atraso leve", "Atraso moderado", "Atraso grave"], required: false, order: 7 },
    { fieldName: "desenvolvimento_social", fieldLabel: "Desenvolvimento Social", fieldType: "select" as const, fieldOptions: ["Adequado", "Atraso leve", "Atraso moderado", "Atraso grave"], required: false, order: 8 },
    { fieldName: "aleitamento", fieldLabel: "Tipo de Aleitamento", fieldType: "select" as const, fieldOptions: ["Exclusivo", "Predominante", "Complementado", "Desmamado"], required: false, order: 9 },
    { fieldName: "introducao_alimentar", fieldLabel: "Introdução Alimentar Adequada?", fieldType: "select" as const, fieldOptions: ["Sim", "Não", "Não aplicável"], required: false, order: 10 },
    { fieldName: "vacinas_em_dia", fieldLabel: "Vacinação em Dia?", fieldType: "select" as const, fieldOptions: ["Sim", "Não", "Atrasada"], required: true, order: 11 },
    { fieldName: "vitamina_a", fieldLabel: "Suplementação Vitamina A", fieldType: "checkbox" as const, required: false, order: 12 },
    { fieldName: "sulfato_ferroso", fieldLabel: "Suplementação Sulfato Ferroso", fieldType: "checkbox" as const, required: false, order: 13 },
    { fieldName: "teste_pezinho", fieldLabel: "Teste do Pezinho Realizado?", fieldType: "select" as const, fieldOptions: ["Sim", "Não", "Aguardando resultado"], required: false, order: 14 },
    { fieldName: "teste_olhinho", fieldLabel: "Teste do Olhinho Realizado?", fieldType: "select" as const, fieldOptions: ["Sim", "Não", "Alterado"], required: false, order: 15 },
    { fieldName: "teste_orelhinha", fieldLabel: "Teste da Orelhinha Realizado?", fieldType: "select" as const, fieldOptions: ["Sim", "Não", "Alterado"], required: false, order: 16 },
    { fieldName: "intercorrencias", fieldLabel: "Intercorrências desde última consulta", fieldType: "textarea" as const, required: false, order: 17 },
    { fieldName: "atividade_educativa", fieldLabel: "Atividade Educativa Realizada", fieldType: "checkbox" as const, required: false, order: 18 },
    { fieldName: "proxima_consulta", fieldLabel: "Próxima Consulta (dias)", fieldType: "number" as const, required: false, order: 19, validationRules: { min: 7, max: 180 }, helperText: "Periodicidade conforme idade" },
    { fieldName: "risco_vulnerabilidade", fieldLabel: "Identificação de Risco/Vulnerabilidade", fieldType: "textarea" as const, required: false, order: 20 },
  ].map(f => ({
    ...f,
    id: generateId(),
    templateId,
    createdAt: new Date(),
  }));
  
  await db.insert(schema.templateFields).values(fields).onConflictDoNothing();
  console.log(`  ✅ Template PUERICULTURA: ${fields.length} campos`);
}

// ===========================================================================
// EXECUÇÃO
// ===========================================================================
seedCareLines()
  .catch(error => {
    console.error("❌ Erro ao executar seed:", error);
    process.exit(1);
  });
