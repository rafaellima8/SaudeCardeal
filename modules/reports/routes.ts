import { Router, Request, Response } from "express";
import { z } from "zod";
import { strategicReportEngine, STRATEGIC_REPORTS } from "./strategic-reports";
import { requireAuth, getEffectiveUnitId } from "../../server/auth";

const router = Router();

const executeReportSchema = z.object({
  parameters: z.record(z.any()).optional(),
});

router.get("/definitions", requireAuth, async (req: Request, res: Response) => {
  try {
    const { category } = req.query;
    
    const builtInDefinitions = STRATEGIC_REPORTS.map(report => ({
      id: report.id,
      name: report.name,
      slug: report.slug,
      description: report.description,
      category: report.category,
      exportFormats: report.exportFormats,
      isBuiltIn: true,
    }));
    
    if (category) {
      res.json(builtInDefinitions.filter(d => d.category === category));
    } else {
      res.json(builtInDefinitions);
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/definitions/:slug", requireAuth, async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    
    const builtInReport = strategicReportEngine.getReport(slug);
    if (builtInReport) {
      return res.json({ ...builtInReport, isBuiltIn: true });
    }

    res.status(404).json({ error: "Relatório não encontrado" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/categories", requireAuth, async (_req: Request, res: Response) => {
  res.json([
    { value: "previne", label: "Previne Brasil", icon: "heart", count: 1 },
    { value: "mac", label: "MAC - Produção Ambulatorial", icon: "activity", count: 1 },
    { value: "aih", label: "AIH - Internações", icon: "building", count: 1 },
    { value: "vigilancia", label: "Vigilância Epidemiológica", icon: "eye", count: 1 },
    { value: "suas_saude", label: "SUAS + Saúde", icon: "users", count: 2 },
    { value: "farmacia", label: "Farmácia", icon: "pill", count: 1 },
    { value: "financeiro", label: "Financeiro", icon: "dollar-sign", count: 1 },
  ]);
});

router.post("/execute/:slug", requireAuth, async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const effectiveUnitId = getEffectiveUnitId(req);
    const userId = req.session?.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "Não autorizado" });
    }

    const data = executeReportSchema.parse(req.body);

    const report = strategicReportEngine.getReport(slug);
    if (!report) {
      return res.status(404).json({ error: "Relatório não encontrado" });
    }

    const startTime = Date.now();
    const mockData = generateReportData(report);
    const executionTime = Date.now() - startTime;

    res.json({
      executionId: crypto.randomUUID(),
      reportSlug: slug,
      reportName: report.name,
      parameters: data.parameters,
      executedAt: new Date().toISOString(),
      executedBy: userId,
      data: mockData.data,
      aggregations: mockData.aggregations,
      totalRows: mockData.data?.length || 0,
      executionTime,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Dados inválidos", details: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
});

function generateReportData(report: any): { data: any[]; aggregations: Record<string, any> } {
  const data: any[] = [];
  const aggregations: Record<string, any> = {};

  if (report.slug === "previne-brasil") {
    data.push(
      { indicador: "Pré-natal (6+ consultas)", meta: 60, realizado: 52.3, atingimento: 87.2, populacao_alvo: 180, atendidos: 94, valor_estimado: 12500 },
      { indicador: "Saúde da Criança", meta: 70, realizado: 65.8, atingimento: 94.0, populacao_alvo: 320, atendidos: 211, valor_estimado: 18900 },
      { indicador: "Hipertensos acompanhados", meta: 50, realizado: 42.1, atingimento: 84.2, populacao_alvo: 890, atendidos: 375, valor_estimado: 28500 },
      { indicador: "Diabéticos acompanhados", meta: 50, realizado: 38.5, atingimento: 77.0, populacao_alvo: 420, atendidos: 162, valor_estimado: 15200 },
      { indicador: "Citopatológico", meta: 40, realizado: 35.2, atingimento: 88.0, populacao_alvo: 1200, atendidos: 422, valor_estimado: 22100 },
      { indicador: "Vacinação em dia", meta: 95, realizado: 89.4, atingimento: 94.1, populacao_alvo: 540, atendidos: 483, valor_estimado: 31500 },
    );
    aggregations["Total Estimado"] = data.reduce((sum, r) => sum + r.valor_estimado, 0);
    aggregations["Atingimento Médio"] = (data.reduce((sum, r) => sum + r.atingimento, 0) / data.length).toFixed(1) + "%";
  } else if (report.slug === "vigilancia-epi") {
    data.push(
      { agravo: "Dengue", total_notificacoes: 45, confirmados: 32, descartados: 8, em_investigacao: 5, duplicidades: 2, prazos_vencidos: 1, taxa_incidencia: 125.5 },
      { agravo: "Tuberculose", total_notificacoes: 12, confirmados: 10, descartados: 1, em_investigacao: 1, duplicidades: 0, prazos_vencidos: 0, taxa_incidencia: 35.2 },
      { agravo: "Hanseníase", total_notificacoes: 8, confirmados: 6, descartados: 1, em_investigacao: 1, duplicidades: 0, prazos_vencidos: 0, taxa_incidencia: 22.1 },
      { agravo: "COVID-19", total_notificacoes: 89, confirmados: 67, descartados: 15, em_investigacao: 7, duplicidades: 3, prazos_vencidos: 2, taxa_incidencia: 245.8 },
      { agravo: "Acidentes com Animais", total_notificacoes: 23, confirmados: 23, descartados: 0, em_investigacao: 0, duplicidades: 0, prazos_vencidos: 0, taxa_incidencia: 63.5 },
    );
    aggregations["Total Notificações"] = data.reduce((sum, r) => sum + r.total_notificacoes, 0);
    aggregations["Total Confirmados"] = data.reduce((sum, r) => sum + r.confirmados, 0);
  } else if (report.slug === "farmacia-completo") {
    data.push(
      { medicamento: "Amoxicilina 500mg", estoque_atual: 450, estoque_minimo: 200, consumo_medio: 85, dias_cobertura: 5.3, status: "Adequado", vencimento_proximo: "2025-06-15" },
      { medicamento: "Losartana 50mg", estoque_atual: 120, estoque_minimo: 150, consumo_medio: 45, dias_cobertura: 2.7, status: "Baixo", vencimento_proximo: "2025-08-20" },
      { medicamento: "Metformina 850mg", estoque_atual: 380, estoque_minimo: 200, consumo_medio: 62, dias_cobertura: 6.1, status: "Adequado", vencimento_proximo: "2025-09-10" },
      { medicamento: "Omeprazol 20mg", estoque_atual: 85, estoque_minimo: 100, consumo_medio: 38, dias_cobertura: 2.2, status: "Baixo", vencimento_proximo: "2025-04-05" },
      { medicamento: "Dipirona 500mg", estoque_atual: 890, estoque_minimo: 300, consumo_medio: 125, dias_cobertura: 7.1, status: "Adequado", vencimento_proximo: "2025-12-30" },
    );
    aggregations["Estoque Total"] = data.reduce((sum, r) => sum + r.estoque_atual, 0);
  } else if (report.slug === "fraldas-assistencia") {
    data.push(
      { tamanho: "RN", estoque_atual: 200, entregas_periodo: 45, beneficiarios_ativos: 8, demanda_media: 15, meses_cobertura: 4.4, tendencia: "Estável" },
      { tamanho: "P", estoque_atual: 350, entregas_periodo: 120, beneficiarios_ativos: 22, demanda_media: 42, meses_cobertura: 2.9, tendencia: "Alta" },
      { tamanho: "M", estoque_atual: 480, entregas_periodo: 180, beneficiarios_ativos: 35, demanda_media: 65, meses_cobertura: 2.7, tendencia: "Alta" },
      { tamanho: "G", estoque_atual: 45, entregas_periodo: 95, beneficiarios_ativos: 18, demanda_media: 32, meses_cobertura: 0.5, tendencia: "Crítico" },
      { tamanho: "XG", estoque_atual: 280, entregas_periodo: 65, beneficiarios_ativos: 12, demanda_media: 22, meses_cobertura: 4.2, tendencia: "Estável" },
      { tamanho: "Geriátrica G", estoque_atual: 180, entregas_periodo: 88, beneficiarios_ativos: 28, demanda_media: 30, meses_cobertura: 2.0, tendencia: "Alta" },
    );
    aggregations["Estoque Total"] = data.reduce((sum, r) => sum + r.estoque_atual, 0);
    aggregations["Total Entregas"] = data.reduce((sum, r) => sum + r.entregas_periodo, 0);
  } else if (report.slug === "producao-mac") {
    data.push(
      { procedimento: "Consulta Médica em Atenção Básica", codigo: "03.01.01.007-2", quantidade: 850, valor_unitario: 10.00, valor_total: 8500.00 },
      { procedimento: "Curativo grau I", codigo: "04.01.01.001-1", quantidade: 320, valor_unitario: 3.50, valor_total: 1120.00 },
      { procedimento: "Administração de Medicamentos", codigo: "03.01.10.001-8", quantidade: 480, valor_unitario: 1.00, valor_total: 480.00 },
      { procedimento: "Glicemia Capilar", codigo: "02.02.01.038-3", quantidade: 650, valor_unitario: 1.85, valor_total: 1202.50 },
      { procedimento: "Aferição de Pressão Arterial", codigo: "03.01.10.002-6", quantidade: 920, valor_unitario: 0.50, valor_total: 460.00 },
    );
    aggregations["Total Procedimentos"] = data.reduce((sum, r) => sum + r.quantidade, 0);
    aggregations["Valor Total"] = data.reduce((sum, r) => sum + r.valor_total, 0);
  } else if (report.slug === "tfd-completo") {
    data.push(
      { destino: "Salvador", viagens: 45, passageiros: 89, km_total: 5400, custo_combustivel: 2700, procedimentos_realizados: 78 },
      { destino: "Feira de Santana", viagens: 28, passageiros: 52, km_total: 2240, custo_combustivel: 1120, procedimentos_realizados: 45 },
      { destino: "Alagoinhas", viagens: 18, passageiros: 32, km_total: 1080, custo_combustivel: 540, procedimentos_realizados: 28 },
      { destino: "Santo Antônio de Jesus", viagens: 12, passageiros: 22, km_total: 960, custo_combustivel: 480, procedimentos_realizados: 18 },
    );
    aggregations["Total Viagens"] = data.reduce((sum, r) => sum + r.viagens, 0);
    aggregations["Total Passageiros"] = data.reduce((sum, r) => sum + r.passageiros, 0);
    aggregations["Custo Total Combustível"] = data.reduce((sum, r) => sum + r.custo_combustivel, 0);
  } else {
    for (let i = 0; i < 5; i++) {
      data.push({
        item: `Item ${i + 1}`,
        valor: Math.floor(Math.random() * 1000),
        percentual: Math.floor(Math.random() * 100),
      });
    }
  }

  return { data, aggregations };
}

router.get("/executions", requireAuth, async (req: Request, res: Response) => {
  try {
    const sampleExecutions = [
      {
        id: "exec-1",
        reportSlug: "previne-brasil",
        reportName: "Relatório Previne Brasil",
        status: "completed",
        executedAt: new Date(Date.now() - 3600000).toISOString(),
        completedAt: new Date(Date.now() - 3595000).toISOString(),
        executionTime: 5000,
        rowCount: 6,
      },
      {
        id: "exec-2",
        reportSlug: "farmacia-completo",
        reportName: "Relatório Farmácia Completo",
        status: "completed",
        executedAt: new Date(Date.now() - 86400000).toISOString(),
        completedAt: new Date(Date.now() - 86395000).toISOString(),
        executionTime: 3200,
        rowCount: 45,
      },
    ];

    res.json(sampleExecutions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
