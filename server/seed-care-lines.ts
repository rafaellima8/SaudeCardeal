import { db } from "./db";
import * as schema from "@shared/schema";

const generateId = () => Math.random().toString(36).substring(2, 15);

async function seedCareLines() {
  console.log("🌱 Iniciando seed do sistema de linhas de cuidado...\n");

  // ===================================================================
  // 1. ESPECIALIDADES
  // ===================================================================
  console.log("📋 Criando especialidades...");
  
  const obstetriciaId = generateId();
  const endocrinologiaId = generateId();
  
  await db.insert(schema.specialties).values([
    {
      id: obstetriciaId,
      name: "Obstetrícia",
      code: "OBST",
      description: "Acompanhamento gestacional e pré-natal",
      active: true,
      createdAt: new Date(),
    },
    {
      id: endocrinologiaId,
      name: "Endocrinologia",
      code: "ENDO",
      description: "Distúrbios metabólicos e endócrinos",
      active: true,
      createdAt: new Date(),
    },
  ]).onConflictDoNothing();
  
  console.log("  ✓ 2 especialidades criadas");

  // ===================================================================
  // 2. LINHAS DE CUIDADO
  // ===================================================================
  console.log("\n📋 Criando linhas de cuidado...");
  
  const prenatalId = generateId();
  const diabetesId = generateId();
  
  await db.insert(schema.careLines).values([
    {
      id: prenatalId,
      name: "Pré-natal",
      code: "PRENATAL",
      description: "Acompanhamento completo da gestação conforme e-SUS APS",
      specialtyId: obstetriciaId,
      riskStratification: true,
      active: true,
      createdAt: new Date(),
    },
    {
      id: diabetesId,
      name: "Diabetes Mellitus",
      code: "DIABETES",
      description: "Manejo e acompanhamento de pacientes diabéticos",
      specialtyId: endocrinologiaId,
      riskStratification: true,
      active: true,
      createdAt: new Date(),
    },
  ]).onConflictDoNothing();
  
  console.log("  ✓ 2 linhas de cuidado criadas");

  // ===================================================================
  // 3. TEMPLATE PRÉ-NATAL
  // ===================================================================
  console.log("\n📋 Criando template de Pré-natal...");
  
  const prenatalTemplateId = generateId();
  
  await db.insert(schema.consultationTemplates).values({
    id: prenatalTemplateId,
    name: "Consulta Pré-natal (e-SUS AB)",
    specialtyId: obstetriciaId,
    careLineId: prenatalId,
    description: "Formulário completo de consulta pré-natal conforme SISAB v5.3",
    active: true,
    createdAt: new Date(),
  }).onConflictDoNothing();
  
  // Campos do template pré-natal
  const prenatalFields = [
    // DADOS OBSTÉTRICOS
    {
      id: generateId(),
      templateId: prenatalTemplateId,
      fieldName: "ig_semanas",
      fieldLabel: "Idade Gestacional (semanas)",
      fieldType: "number",
      required: true,
      order: 1,
      validationRules: { min: 1, max: 42 },
      helperText: "Semanas completas de gestação",
      createdAt: new Date(),
    },
    {
      id: generateId(),
      templateId: prenatalTemplateId,
      fieldName: "ig_dias",
      fieldLabel: "IG - Dias adicionais",
      fieldType: "number",
      required: false,
      order: 2,
      validationRules: { min: 0, max: 6 },
      helperText: "Dias adicionais (0-6)",
      createdAt: new Date(),
    },
    {
      id: generateId(),
      templateId: prenatalTemplateId,
      fieldName: "dum",
      fieldLabel: "Data da Última Menstruação (DUM)",
      fieldType: "date",
      required: true,
      order: 3,
      helperText: "Data da última menstruação",
      createdAt: new Date(),
    },
    {
      id: generateId(),
      templateId: prenatalTemplateId,
      fieldName: "dpp",
      fieldLabel: "Data Provável do Parto (DPP)",
      fieldType: "date",
      required: true,
      order: 4,
      helperText: "Data prevista do parto",
      createdAt: new Date(),
    },
    {
      id: generateId(),
      templateId: prenatalTemplateId,
      fieldName: "gravidez_planejada",
      fieldLabel: "Gravidez Planejada?",
      fieldType: "select",
      fieldOptions: ["Sim", "Não", "Não sabe"],
      required: true,
      order: 5,
      createdAt: new Date(),
    },
    {
      id: generateId(),
      templateId: prenatalTemplateId,
      fieldName: "gestacoes_previas",
      fieldLabel: "Número de Gestações Prévias",
      fieldType: "number",
      required: true,
      order: 6,
      validationRules: { min: 0, max: 20 },
      createdAt: new Date(),
    },
    {
      id: generateId(),
      templateId: prenatalTemplateId,
      fieldName: "partos_previos",
      fieldLabel: "Número de Partos Prévios",
      fieldType: "number",
      required: true,
      order: 7,
      validationRules: { min: 0, max: 20 },
      createdAt: new Date(),
    },
    {
      id: generateId(),
      templateId: prenatalTemplateId,
      fieldName: "abortos_previos",
      fieldLabel: "Número de Abortos Prévios",
      fieldType: "number",
      required: false,
      order: 8,
      validationRules: { min: 0, max: 20 },
      createdAt: new Date(),
    },
    
    // EXAMES SOLICITADOS
    {
      id: generateId(),
      templateId: prenatalTemplateId,
      fieldName: "hb_hematocrito",
      fieldLabel: "Hemoglobina/Hematócrito solicitado?",
      fieldType: "checkbox",
      required: false,
      order: 9,
      createdAt: new Date(),
    },
    {
      id: generateId(),
      templateId: prenatalTemplateId,
      fieldName: "glicemia_jejum",
      fieldLabel: "Glicemia de jejum solicitada?",
      fieldType: "checkbox",
      required: false,
      order: 10,
      createdAt: new Date(),
    },
    {
      id: generateId(),
      templateId: prenatalTemplateId,
      fieldName: "vdrl",
      fieldLabel: "VDRL solicitado?",
      fieldType: "checkbox",
      required: false,
      order: 11,
      createdAt: new Date(),
    },
    {
      id: generateId(),
      templateId: prenatalTemplateId,
      fieldName: "hiv",
      fieldLabel: "Teste HIV solicitado?",
      fieldType: "checkbox",
      required: false,
      order: 12,
      createdAt: new Date(),
    },
    {
      id: generateId(),
      templateId: prenatalTemplateId,
      fieldName: "toxoplasmose",
      fieldLabel: "Sorologia toxoplasmose solicitada?",
      fieldType: "checkbox",
      required: false,
      order: 13,
      createdAt: new Date(),
    },
    {
      id: generateId(),
      templateId: prenatalTemplateId,
      fieldName: "hepatite_b",
      fieldLabel: "HBsAg solicitado?",
      fieldType: "checkbox",
      required: false,
      order: 14,
      createdAt: new Date(),
    },
    {
      id: generateId(),
      templateId: prenatalTemplateId,
      fieldName: "us_obstetrico",
      fieldLabel: "Ultrassom obstétrico solicitado?",
      fieldType: "checkbox",
      required: false,
      order: 15,
      createdAt: new Date(),
    },
    
    // DADOS CLÍNICOS ESPECÍFICOS
    {
      id: generateId(),
      templateId: prenatalTemplateId,
      fieldName: "altura_uterina",
      fieldLabel: "Altura Uterina (cm)",
      fieldType: "number",
      required: false,
      order: 16,
      validationRules: { min: 10, max: 50 },
      helperText: "Altura do fundo uterino em centímetros",
      createdAt: new Date(),
    },
    {
      id: generateId(),
      templateId: prenatalTemplateId,
      fieldName: "bcf",
      fieldLabel: "BCF (Batimentos Cardíacos Fetais)",
      fieldType: "number",
      required: false,
      order: 17,
      validationRules: { min: 100, max: 180 },
      helperText: "Frequência cardíaca fetal (bpm)",
      createdAt: new Date(),
    },
    {
      id: generateId(),
      templateId: prenatalTemplateId,
      fieldName: "movimentos_fetais",
      fieldLabel: "Movimentos Fetais",
      fieldType: "select",
      fieldOptions: ["Presentes", "Ausentes", "Não avaliado"],
      required: false,
      order: 18,
      createdAt: new Date(),
    },
    {
      id: generateId(),
      templateId: prenatalTemplateId,
      fieldName: "edema",
      fieldLabel: "Edema",
      fieldType: "select",
      fieldOptions: ["Ausente", "+/4+", "++/4+", "+++/4+", "++++/4+"],
      required: false,
      order: 19,
      createdAt: new Date(),
    },
    {
      id: generateId(),
      templateId: prenatalTemplateId,
      fieldName: "risco_gestacional",
      fieldLabel: "Classificação de Risco",
      fieldType: "select",
      fieldOptions: ["Habitual", "Intermediário", "Alto Risco"],
      required: true,
      order: 20,
      helperText: "Conforme protocolo do Ministério da Saúde",
      createdAt: new Date(),
    },
    {
      id: generateId(),
      templateId: prenatalTemplateId,
      fieldName: "vacina_dupla_adulto",
      fieldLabel: "Vacinação dT/dTpa em dia?",
      fieldType: "select",
      fieldOptions: ["Sim", "Não", "Recusou"],
      required: false,
      order: 21,
      createdAt: new Date(),
    },
  ];
  
  await db.insert(schema.templateFields).values(prenatalFields).onConflictDoNothing();
  console.log(`  ✓ Template pré-natal criado com ${prenatalFields.length} campos`);

  // ===================================================================
  // 4. TEMPLATE DIABETES
  // ===================================================================
  console.log("\n📋 Criando template de Diabetes...");
  
  const diabetesTemplateId = generateId();
  
  await db.insert(schema.consultationTemplates).values({
    id: diabetesTemplateId,
    name: "Consulta Diabetes (e-SUS AB)",
    specialtyId: endocrinologiaId,
    careLineId: diabetesId,
    description: "Acompanhamento de paciente diabético conforme linha de cuidado",
    active: true,
    createdAt: new Date(),
  }).onConflictDoNothing();
  
  // Campos do template diabetes
  const diabetesFields = [
    {
      id: generateId(),
      templateId: diabetesTemplateId,
      fieldName: "tipo_diabetes",
      fieldLabel: "Tipo de Diabetes",
      fieldType: "select",
      fieldOptions: ["Tipo 1", "Tipo 2", "Gestacional", "MODY", "Outro"],
      required: true,
      order: 1,
      createdAt: new Date(),
    },
    {
      id: generateId(),
      templateId: diabetesTemplateId,
      fieldName: "tempo_diagnostico",
      fieldLabel: "Tempo de Diagnóstico (anos)",
      fieldType: "number",
      required: false,
      order: 2,
      validationRules: { min: 0, max: 80 },
      createdAt: new Date(),
    },
    {
      id: generateId(),
      templateId: diabetesTemplateId,
      fieldName: "glicemia_jejum_resultado",
      fieldLabel: "Glicemia de Jejum (mg/dL)",
      fieldType: "number",
      required: false,
      order: 3,
      validationRules: { min: 30, max: 600 },
      helperText: "Resultado do último exame",
      createdAt: new Date(),
    },
    {
      id: generateId(),
      templateId: diabetesTemplateId,
      fieldName: "glicemia_pos_prandial",
      fieldLabel: "Glicemia Pós-Prandial (mg/dL)",
      fieldType: "number",
      required: false,
      order: 4,
      validationRules: { min: 30, max: 600 },
      createdAt: new Date(),
    },
    {
      id: generateId(),
      templateId: diabetesTemplateId,
      fieldName: "hba1c",
      fieldLabel: "HbA1c (%)",
      fieldType: "number",
      required: false,
      order: 5,
      validationRules: { min: 4.0, max: 18.0 },
      helperText: "Hemoglobina glicada - meta < 7%",
      createdAt: new Date(),
    },
    {
      id: generateId(),
      templateId: diabetesTemplateId,
      fieldName: "hba1c_meta",
      fieldLabel: "HbA1c na meta?",
      fieldType: "select",
      fieldOptions: ["Sim (< 7%)", "Não (≥ 7%)", "Não realizado"],
      required: false,
      order: 6,
      createdAt: new Date(),
    },
    {
      id: generateId(),
      templateId: diabetesTemplateId,
      fieldName: "uso_insulina",
      fieldLabel: "Uso de Insulina",
      fieldType: "select",
      fieldOptions: ["Sim", "Não"],
      required: true,
      order: 7,
      createdAt: new Date(),
    },
    {
      id: generateId(),
      templateId: diabetesTemplateId,
      fieldName: "tipo_insulina",
      fieldLabel: "Tipo de Insulina em uso",
      fieldType: "select",
      fieldOptions: JSON.stringify([
        "NPH", 
        "Regular", 
        "NPH + Regular", 
        "Análogo Lenta", 
        "Análogo Rápida",
        "Esquema Basal-Bolus"
      ]),
      required: false,
      order: 8,
      createdAt: new Date(),
    },
    {
      id: generateId(),
      templateId: diabetesTemplateId,
      fieldName: "uso_metformina",
      fieldLabel: "Uso de Metformina",
      fieldType: "checkbox",
      required: false,
      order: 9,
      createdAt: new Date(),
    },
    {
      id: generateId(),
      templateId: diabetesTemplateId,
      fieldName: "complicacoes_micro",
      fieldLabel: "Complicações Microvasculares",
      fieldType: "select",
      fieldOptions: JSON.stringify([
        "Nenhuma",
        "Retinopatia",
        "Nefropatia",
        "Neuropatia",
        "Múltiplas"
      ]),
      required: false,
      order: 10,
      createdAt: new Date(),
    },
    {
      id: generateId(),
      templateId: diabetesTemplateId,
      fieldName: "complicacoes_macro",
      fieldLabel: "Complicações Macrovasculares",
      fieldType: "select",
      fieldOptions: JSON.stringify([
        "Nenhuma",
        "DAC (Doença Arterial Coronariana)",
        "AVE prévio",
        "Doença arterial periférica",
        "Múltiplas"
      ]),
      required: false,
      order: 11,
      createdAt: new Date(),
    },
    {
      id: generateId(),
      templateId: diabetesTemplateId,
      fieldName: "pe_diabetico",
      fieldLabel: "Avaliação do Pé Diabético",
      fieldType: "select",
      fieldOptions: JSON.stringify([
        "Baixo risco",
        "Risco moderado",
        "Alto risco",
        "Úlcera ativa"
      ]),
      required: false,
      order: 12,
      helperText: "Conforme classificação de risco",
      createdAt: new Date(),
    },
    {
      id: generateId(),
      templateId: diabetesTemplateId,
      fieldName: "exame_fundo_olho",
      fieldLabel: "Fundo de olho realizado no último ano?",
      fieldType: "select",
      fieldOptions: ["Sim", "Não", "Nunca realizado"],
      required: false,
      order: 13,
      createdAt: new Date(),
    },
    {
      id: generateId(),
      templateId: diabetesTemplateId,
      fieldName: "funcao_renal",
      fieldLabel: "Avaliação da Função Renal",
      fieldType: "select",
      fieldOptions: JSON.stringify([
        "Normal (TFG ≥ 90)",
        "DRC estágio 2 (TFG 60-89)",
        "DRC estágio 3 (TFG 30-59)",
        "DRC estágio 4 ou 5 (TFG < 30)",
        "Não avaliado"
      ]),
      required: false,
      order: 14,
      createdAt: new Date(),
    },
    {
      id: generateId(),
      templateId: diabetesTemplateId,
      fieldName: "controle_lipidico",
      fieldLabel: "Controle Lipídico",
      fieldType: "select",
      fieldOptions: JSON.stringify([
        "Adequado",
        "LDL elevado",
        "Triglicerídeos elevados",
        "Dislipidemia mista",
        "Não avaliado"
      ]),
      required: false,
      order: 15,
      createdAt: new Date(),
    },
    {
      id: generateId(),
      templateId: diabetesTemplateId,
      fieldName: "pa_controlada",
      fieldLabel: "Pressão Arterial Controlada?",
      fieldType: "select",
      fieldOptions: JSON.stringify([
        "Sim (< 130/80 mmHg)",
        "Não",
        "Não aferida"
      ]),
      required: false,
      order: 16,
      createdAt: new Date(),
    },
    {
      id: generateId(),
      templateId: diabetesTemplateId,
      fieldName: "orientacao_nutricional",
      fieldLabel: "Orientação Nutricional Realizada?",
      fieldType: "checkbox",
      required: false,
      order: 17,
      createdAt: new Date(),
    },
    {
      id: generateId(),
      templateId: diabetesTemplateId,
      fieldName: "atividade_fisica",
      fieldLabel: "Pratica Atividade Física Regular?",
      fieldType: "select",
      fieldOptions: JSON.stringify([
        "Sim (≥ 150 min/semana)",
        "Irregularmente",
        "Não"
      ]),
      required: false,
      order: 18,
      createdAt: new Date(),
    },
  ];
  
  await db.insert(schema.templateFields).values(diabetesFields).onConflictDoNothing();
  console.log(`  ✓ Template diabetes criado com ${diabetesFields.length} campos`);

  // ===================================================================
  // 5. PROTOCOLOS CLÍNICOS (ALERTAS AUTOMÁTICOS)
  // ===================================================================
  console.log("\n📋 Criando protocolos clínicos...");
  
  const protocols = [
    // PROTOCOLOS PRÉ-NATAL
    {
      id: generateId(),
      name: "Alto Risco Gestacional - Encaminhar",
      careLineId: prenatalId,
      specialtyId: obstetriciaId,
      triggerCondition: JSON.stringify([
        { field: "risco_gestacional", operator: "eq", value: "Alto Risco" }
      ]),
      alertMessage: "⚠️ Gestante de ALTO RISCO identificada. Encaminhar para pré-natal especializado.",
      alertLevel: "critical",
      action: JSON.stringify({
        type: "auto_referral",
        target: "Pré-natal Alto Risco",
      }),
      active: true,
      createdAt: new Date(),
    },
    {
      id: generateId(),
      name: "VDRL Pendente - 1º Trimestre",
      careLineId: prenatalId,
      specialtyId: obstetriciaId,
      triggerCondition: JSON.stringify([
        { field: "ig_semanas", operator: "gte", value: 12 },
        { field: "vdrl", operator: "eq", value: false }
      ]),
      alertMessage: "⚠️ VDRL ainda não solicitado no 1º trimestre.",
      alertLevel: "warning",
      action: JSON.stringify({
        type: "notify",
      }),
      active: true,
      createdAt: new Date(),
    },
    {
      id: generateId(),
      name: "HIV Pendente - 1º Trimestre",
      careLineId: prenatalId,
      specialtyId: obstetriciaId,
      triggerCondition: JSON.stringify([
        { field: "ig_semanas", operator: "gte", value: 12 },
        { field: "hiv", operator: "eq", value: false }
      ]),
      alertMessage: "⚠️ Teste HIV ainda não solicitado no 1º trimestre.",
      alertLevel: "warning",
      action: JSON.stringify({
        type: "notify",
      }),
      active: true,
      createdAt: new Date(),
    },
    
    // PROTOCOLOS DIABETES
    {
      id: generateId(),
      name: "HbA1c Descompensada",
      careLineId: diabetesId,
      specialtyId: endocrinologiaId,
      triggerCondition: JSON.stringify([
        { field: "hba1c", operator: "gte", value: 9.0 }
      ]),
      alertMessage: "🚨 HbA1c ≥ 9% - Diabetes DESCOMPENSADA. Revisar esquema terapêutico urgentemente.",
      alertLevel: "critical",
      action: JSON.stringify({
        type: "schedule_followup",
        days: 30,
      }),
      active: true,
      createdAt: new Date(),
    },
    {
      id: generateId(),
      name: "HbA1c Acima da Meta",
      careLineId: diabetesId,
      specialtyId: endocrinologiaId,
      triggerCondition: JSON.stringify([
        { field: "hba1c", operator: "gte", value: 7.0 },
        { field: "hba1c", operator: "lt", value: 9.0 }
      ]),
      alertMessage: "⚠️ HbA1c entre 7-9% - Acima da meta. Considerar ajuste terapêutico.",
      alertLevel: "warning",
      action: JSON.stringify({
        type: "notify",
      }),
      active: true,
      createdAt: new Date(),
    },
    {
      id: generateId(),
      name: "Fundo de Olho Pendente",
      careLineId: diabetesId,
      specialtyId: endocrinologiaId,
      triggerCondition: JSON.stringify([
        { field: "exame_fundo_olho", operator: "eq", value: "Não" }
      ]),
      alertMessage: "📅 Fundo de olho não realizado no último ano. Solicitar avaliação oftalmológica.",
      alertLevel: "warning",
      action: JSON.stringify({
        type: "notify",
      }),
      active: true,
      createdAt: new Date(),
    },
    {
      id: generateId(),
      name: "Alto Risco Pé Diabético",
      careLineId: diabetesId,
      specialtyId: endocrinologiaId,
      triggerCondition: JSON.stringify([
        { field: "pe_diabetico", operator: "eq", value: "Alto risco" }
      ]),
      alertMessage: "🦶 Pé diabético de ALTO RISCO. Reforçar cuidados e acompanhamento frequente.",
      alertLevel: "critical",
      action: JSON.stringify({
        type: "schedule_followup",
        days: 60,
      }),
      active: true,
      createdAt: new Date(),
    },
    {
      id: generateId(),
      name: "Úlcera Pé Diabético Ativa",
      careLineId: diabetesId,
      specialtyId: endocrinologiaId,
      triggerCondition: JSON.stringify([
        { field: "pe_diabetico", operator: "eq", value: "Úlcera ativa" }
      ]),
      alertMessage: "🚨 ÚLCERA PÉ DIABÉTICO ATIVA! Encaminhar para curativo especializado.",
      alertLevel: "critical",
      action: JSON.stringify({
        type: "auto_referral",
        target: "Curativo Especializado",
      }),
      active: true,
      createdAt: new Date(),
    },
  ];
  
  await db.insert(schema.clinicalProtocols).values(protocols).onConflictDoNothing();
  console.log(`  ✓ ${protocols.length} protocolos clínicos criados`);

  // ===================================================================
  // RESUMO FINAL
  // ===================================================================
  console.log("\n" + "=".repeat(60));
  console.log("✅ SEED CONCLUÍDO COM SUCESSO!");
  console.log("=".repeat(60));
  console.log("\n📊 Resumo:");
  console.log(`  • ${2} Especialidades criadas`);
  console.log(`  • ${2} Linhas de Cuidado criadas`);
  console.log(`  • ${2} Templates criados`);
  console.log(`  • ${prenatalFields.length + diabetesFields.length} Campos dinâmicos criados`);
  console.log(`  • ${protocols.length} Protocolos clínicos ativos`);
  console.log("\n🎯 Próximos passos:");
  console.log("  1. Implementar API CRUD para templates");
  console.log("  2. Criar componente DynamicConsultationForm");
  console.log("  3. Integrar na tela medical-attendance.tsx");
  console.log("\n");
}

seedCareLines()
  .then(() => {
    console.log("🎉 Seed finalizado com sucesso!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Erro ao executar seed:", error);
    process.exit(1);
  });
