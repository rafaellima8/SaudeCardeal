import { db } from "./db";
import * as schema from "@shared/schema";
import { eq } from "drizzle-orm";
import { SINAN_AGRAVOS, buildSinanTemplate } from "../modules/forms/sinan-templates";
import { WORKFLOW_DEFINITIONS } from "../modules/workflow/workflow-engine";
import { DEFAULT_ALERTS } from "../modules/alerts/alert-scheduler";
import { STRATEGIC_REPORTS } from "../modules/reports/strategic-reports";

export async function seedFormTemplates(): Promise<number> {
  const existingTemplates = await db.select().from(schema.formTemplates).limit(1).get();
  if (existingTemplates) {
    return 0;
  }

  let count = 0;

  for (const agravo of SINAN_AGRAVOS) {
    const templateDef = buildSinanTemplate(agravo);
    
    await db.insert(schema.formTemplates).values({
      name: `Ficha SINAN - ${agravo.nome}`,
      slug: `sinan-${agravo.codigo.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      category: "sinan",
      description: `Ficha de notificação/investigação para ${agravo.nome} (CID-10: ${agravo.cid10})`,
      templateJson: templateDef,
      validationRules: {
        prazoNotificacao: agravo.prazoNotificacao,
        fichaInvestigacao: agravo.fichaInvestigacao,
        cid10: agravo.cid10,
      },
      mappingConfig: {
        cid10: agravo.cid10,
        categoria: agravo.categoria,
      },
      version: 1,
      isActive: true,
    });
    count++;
  }

  await db.insert(schema.formTemplates).values({
    name: "BPA-I - Boletim de Produção Ambulatorial Individual",
    slug: "bpa-i",
    category: "bpa",
    description: "Formulário de produção ambulatorial individual para registro de procedimentos no SIA/SUS",
    templateJson: {
      pageSize: { width: 2100, height: 2970 },
      fields: [
        { id: "cnes", label: "CNES", type: "text", required: true, x: 50, y: 100, width: 100, height: 25, fontSize: 10, mask: "0000000" },
        { id: "competencia", label: "Competência", type: "text", required: true, x: 160, y: 100, width: 80, height: 25, fontSize: 10, mask: "00/0000" },
        { id: "cns_profissional", label: "CNS Profissional", type: "text", required: true, x: 250, y: 100, width: 150, height: 25, fontSize: 10 },
        { id: "cbo", label: "CBO", type: "text", required: true, x: 410, y: 100, width: 80, height: 25, fontSize: 10 },
        { id: "cns_paciente", label: "CNS Paciente", type: "text", required: true, x: 50, y: 140, width: 150, height: 25, fontSize: 10 },
        { id: "data_atendimento", label: "Data Atendimento", type: "date", required: true, x: 210, y: 140, width: 100, height: 25, fontSize: 10 },
        { id: "procedimento", label: "Procedimento", type: "text", required: true, x: 320, y: 140, width: 120, height: 25, fontSize: 10 },
        { id: "quantidade", label: "Quantidade", type: "number", required: true, x: 450, y: 140, width: 60, height: 25, fontSize: 10 },
        { id: "cid", label: "CID-10", type: "text", required: false, x: 520, y: 140, width: 80, height: 25, fontSize: 10 },
        { id: "carater_atendimento", label: "Caráter Atendimento", type: "select", required: true, x: 50, y: 180, width: 150, height: 25, fontSize: 10, options: ["01-Eletivo", "02-Urgência"] },
      ],
    },
    validationRules: {
      requiredFields: ["cnes", "competencia", "cns_profissional", "cns_paciente", "procedimento"],
    },
    mappingConfig: {
      system: "SIA/SUS",
      exportFormat: "TXT",
    },
    version: 1,
    isActive: true,
  });
  count++;

  await db.insert(schema.formTemplates).values({
    name: "APAC - Autorização de Procedimento de Alta Complexidade",
    slug: "apac",
    category: "apac",
    description: "Formulário de autorização para procedimentos de alta complexidade/custo",
    templateJson: {
      pageSize: { width: 2100, height: 2970 },
      fields: [
        { id: "numero_apac", label: "Número APAC", type: "text", required: true, x: 50, y: 100, width: 150, height: 25, fontSize: 10 },
        { id: "cnes", label: "CNES Solicitante", type: "text", required: true, x: 210, y: 100, width: 100, height: 25, fontSize: 10 },
        { id: "cnes_executante", label: "CNES Executante", type: "text", required: true, x: 320, y: 100, width: 100, height: 25, fontSize: 10 },
        { id: "cns_paciente", label: "CNS Paciente", type: "text", required: true, x: 50, y: 140, width: 150, height: 25, fontSize: 10 },
        { id: "nome_paciente", label: "Nome Paciente", type: "text", required: true, x: 210, y: 140, width: 300, height: 25, fontSize: 10 },
        { id: "data_nascimento", label: "Data Nascimento", type: "date", required: true, x: 520, y: 140, width: 100, height: 25, fontSize: 10 },
        { id: "procedimento_principal", label: "Procedimento Principal", type: "text", required: true, x: 50, y: 180, width: 120, height: 25, fontSize: 10 },
        { id: "cid_principal", label: "CID Principal", type: "text", required: true, x: 180, y: 180, width: 80, height: 25, fontSize: 10 },
        { id: "cid_secundario", label: "CID Secundário", type: "text", required: false, x: 270, y: 180, width: 80, height: 25, fontSize: 10 },
        { id: "data_inicio", label: "Data Início Validade", type: "date", required: true, x: 50, y: 220, width: 100, height: 25, fontSize: 10 },
        { id: "data_fim", label: "Data Fim Validade", type: "date", required: true, x: 160, y: 220, width: 100, height: 25, fontSize: 10 },
        { id: "quantidade_autorizada", label: "Qtd. Autorizada", type: "number", required: true, x: 270, y: 220, width: 80, height: 25, fontSize: 10 },
      ],
    },
    validationRules: {
      requiredFields: ["numero_apac", "cnes", "cns_paciente", "procedimento_principal", "cid_principal"],
    },
    mappingConfig: {
      system: "SIA/SUS",
      exportFormat: "TXT",
    },
    version: 1,
    isActive: true,
  });
  count++;

  return count;
}

export async function seedWorkflowDefinitions(): Promise<number> {
  const existingWorkflows = await db.select().from(schema.workflowDefinitions).limit(1).get();
  if (existingWorkflows) {
    return 0;
  }

  let count = 0;

  for (const workflow of WORKFLOW_DEFINITIONS) {
    await db.insert(schema.workflowDefinitions).values({
      name: workflow.name,
      slug: workflow.slug,
      description: workflow.description,
      entityType: workflow.entityType as any,
      steps: workflow.steps,
      isActive: true,
    });
    count++;
  }

  return count;
}

export async function seedAlertRules(): Promise<number> {
  const existingRules = await db.select().from(schema.alertRules).limit(1).get();
  if (existingRules) {
    return 0;
  }

  let count = 0;

  for (const alert of DEFAULT_ALERTS) {
    await db.insert(schema.alertRules).values({
      name: alert.name,
      slug: alert.slug,
      description: alert.description,
      category: alert.category as any,
      triggerType: alert.triggerType as any,
      triggerConfig: alert.triggerConfig,
      conditions: alert.conditions || [],
      severity: alert.severity as any,
      targetRoles: alert.targetRoles || [],
      notificationChannels: alert.notificationChannels as any || ["ui"],
      isActive: true,
    });
    count++;
  }

  return count;
}

export async function seedReportDefinitions(): Promise<number> {
  const existingReports = await db.select().from(schema.reportDefinitions).limit(1).get();
  if (existingReports) {
    return 0;
  }

  let count = 0;

  for (const report of STRATEGIC_REPORTS) {
    await db.insert(schema.reportDefinitions).values({
      name: report.name,
      slug: report.slug,
      description: report.description,
      category: report.category as any,
      queryConfig: {
        query: report.query,
        parameters: report.parameters,
        columns: report.columns,
        aggregations: report.aggregations,
        charts: report.charts,
      },
      visualizationType: "dashboard",
      exportFormats: report.exportFormats as any,
      isActive: true,
    });
    count++;
  }

  return count;
}

export async function seedAllAutomation(): Promise<{
  formTemplates: number;
  workflows: number;
  alertRules: number;
  reports: number;
}> {
  console.log("🔧 Iniciando seed dos módulos de automação...");

  const formTemplates = await seedFormTemplates();
  if (formTemplates > 0) {
    console.log(`✅ ${formTemplates} templates de formulário criados`);
  } else {
    console.log("✓ Templates de formulário já existem");
  }

  const workflows = await seedWorkflowDefinitions();
  if (workflows > 0) {
    console.log(`✅ ${workflows} definições de workflow criadas`);
  } else {
    console.log("✓ Definições de workflow já existem");
  }

  const alertRules = await seedAlertRules();
  if (alertRules > 0) {
    console.log(`✅ ${alertRules} regras de alerta criadas`);
  } else {
    console.log("✓ Regras de alerta já existem");
  }

  const reports = await seedReportDefinitions();
  if (reports > 0) {
    console.log(`✅ ${reports} definições de relatório criadas`);
  } else {
    console.log("✓ Definições de relatório já existem");
  }

  return { formTemplates, workflows, alertRules, reports };
}
