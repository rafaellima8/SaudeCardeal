export interface ReportParameter {
  name: string;
  type: "date" | "daterange" | "select" | "text" | "number";
  label: string;
  required: boolean;
  options?: Array<{ value: string; label: string }>;
  defaultValue?: any;
}

export interface ReportColumn {
  key: string;
  label: string;
  type: "text" | "number" | "currency" | "percentage" | "date" | "boolean";
  width?: number;
  align?: "left" | "center" | "right";
  format?: string;
}

export interface ReportDefinitionConfig {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: "previne" | "mac" | "aih" | "vigilancia" | "suas_saude" | "farmacia" | "epidemiologico" | "financeiro";
  parameters: ReportParameter[];
  columns: ReportColumn[];
  query: string;
  aggregations?: Array<{
    field: string;
    operation: "sum" | "avg" | "count" | "min" | "max";
    label: string;
  }>;
  charts?: Array<{
    type: "bar" | "line" | "pie" | "area";
    title: string;
    xField: string;
    yField: string;
    groupBy?: string;
  }>;
  exportFormats: ("pdf" | "csv" | "xlsx" | "json")[];
}

export const STRATEGIC_REPORTS: ReportDefinitionConfig[] = [
  {
    id: "previne_brasil_completo",
    name: "Relatório Previne Brasil Completo",
    slug: "previne-brasil",
    description: "Indicadores completos do Previne Brasil para captação de recursos e monitoramento de metas",
    category: "previne",
    parameters: [
      { name: "competencia", type: "date", label: "Competência", required: true },
      { name: "unitId", type: "select", label: "Unidade de Saúde", required: false },
    ],
    columns: [
      { key: "indicador", label: "Indicador", type: "text", width: 300 },
      { key: "meta", label: "Meta", type: "percentage", width: 80, align: "center" },
      { key: "realizado", label: "Realizado", type: "percentage", width: 80, align: "center" },
      { key: "atingimento", label: "Atingimento", type: "percentage", width: 100, align: "center" },
      { key: "populacao_alvo", label: "População Alvo", type: "number", width: 120, align: "right" },
      { key: "atendidos", label: "Atendidos", type: "number", width: 100, align: "right" },
      { key: "valor_estimado", label: "Valor Estimado", type: "currency", width: 120, align: "right" },
    ],
    query: "previne_brasil_indicators",
    aggregations: [
      { field: "valor_estimado", operation: "sum", label: "Total Estimado" },
      { field: "atingimento", operation: "avg", label: "Atingimento Médio" },
    ],
    charts: [
      { type: "bar", title: "Atingimento por Indicador", xField: "indicador", yField: "atingimento" },
      { type: "pie", title: "Distribuição de Recursos", xField: "indicador", yField: "valor_estimado" },
    ],
    exportFormats: ["pdf", "csv", "xlsx"],
  },
  {
    id: "producao_ambulatorial_mac",
    name: "Produção Ambulatorial MAC",
    slug: "producao-mac",
    description: "Relatório de produção ambulatorial para faturamento MAC com análise de oportunidades",
    category: "mac",
    parameters: [
      { name: "competencia", type: "date", label: "Competência", required: true },
      { name: "unitId", type: "select", label: "Unidade de Saúde", required: false },
      { name: "procedimentoGrupo", type: "select", label: "Grupo de Procedimento", required: false },
    ],
    columns: [
      { key: "procedimento_codigo", label: "Código", type: "text", width: 100 },
      { key: "procedimento_nome", label: "Procedimento", type: "text", width: 300 },
      { key: "quantidade", label: "Quantidade", type: "number", width: 100, align: "right" },
      { key: "valor_unitario", label: "Valor Unit.", type: "currency", width: 100, align: "right" },
      { key: "valor_total", label: "Valor Total", type: "currency", width: 120, align: "right" },
      { key: "media_mensal", label: "Média Mensal", type: "number", width: 100, align: "right" },
      { key: "variacao", label: "Variação %", type: "percentage", width: 100, align: "center" },
    ],
    query: "producao_ambulatorial_mac",
    aggregations: [
      { field: "quantidade", operation: "sum", label: "Total Procedimentos" },
      { field: "valor_total", operation: "sum", label: "Valor Total" },
    ],
    charts: [
      { type: "bar", title: "Top 10 Procedimentos por Valor", xField: "procedimento_nome", yField: "valor_total" },
      { type: "line", title: "Evolução da Produção", xField: "competencia", yField: "quantidade", groupBy: "procedimento_grupo" },
    ],
    exportFormats: ["pdf", "csv", "xlsx"],
  },
  {
    id: "aih_checklist_glosas",
    name: "AIH - Checklist e Prevenção de Glosas",
    slug: "aih-glosas",
    description: "Análise de AIH com identificação de riscos de glosa e checklist de documentação",
    category: "aih",
    parameters: [
      { name: "periodoInicio", type: "date", label: "Data Início", required: true },
      { name: "periodoFim", type: "date", label: "Data Fim", required: true },
      { name: "status", type: "select", label: "Status", required: false, options: [
        { value: "pendente", label: "Pendente" },
        { value: "enviada", label: "Enviada" },
        { value: "aprovada", label: "Aprovada" },
        { value: "glosada", label: "Glosada" },
      ]},
    ],
    columns: [
      { key: "numero_aih", label: "Nº AIH", type: "text", width: 120 },
      { key: "paciente", label: "Paciente", type: "text", width: 200 },
      { key: "procedimento", label: "Procedimento", type: "text", width: 200 },
      { key: "valor", label: "Valor", type: "currency", width: 100, align: "right" },
      { key: "risco_glosa", label: "Risco Glosa", type: "text", width: 100, align: "center" },
      { key: "documentos_faltantes", label: "Docs Faltantes", type: "number", width: 100, align: "center" },
      { key: "status", label: "Status", type: "text", width: 100 },
    ],
    query: "aih_checklist",
    aggregations: [
      { field: "valor", operation: "sum", label: "Valor Total" },
      { field: "risco_glosa", operation: "count", label: "AIHs com Risco" },
    ],
    charts: [
      { type: "pie", title: "Distribuição por Status", xField: "status", yField: "count" },
      { type: "bar", title: "Principais Motivos de Glosa", xField: "motivo", yField: "quantidade" },
    ],
    exportFormats: ["pdf", "csv", "xlsx"],
  },
  {
    id: "vigilancia_epidemiologica",
    name: "Vigilância Epidemiológica",
    slug: "vigilancia-epi",
    description: "Panorama epidemiológico com notificações, duplicidades e prazos",
    category: "vigilancia",
    parameters: [
      { name: "periodoInicio", type: "date", label: "Data Início", required: true },
      { name: "periodoFim", type: "date", label: "Data Fim", required: true },
      { name: "agravo", type: "select", label: "Agravo", required: false },
    ],
    columns: [
      { key: "agravo", label: "Agravo", type: "text", width: 200 },
      { key: "total_notificacoes", label: "Total", type: "number", width: 80, align: "right" },
      { key: "confirmados", label: "Confirmados", type: "number", width: 100, align: "right" },
      { key: "descartados", label: "Descartados", type: "number", width: 100, align: "right" },
      { key: "em_investigacao", label: "Em Invest.", type: "number", width: 100, align: "right" },
      { key: "duplicidades", label: "Duplicidades", type: "number", width: 100, align: "right" },
      { key: "prazos_vencidos", label: "Prazos Venc.", type: "number", width: 100, align: "right" },
      { key: "taxa_incidencia", label: "Taxa Incid.", type: "number", width: 100, align: "right" },
    ],
    query: "vigilancia_epidemiologica",
    aggregations: [
      { field: "total_notificacoes", operation: "sum", label: "Total Notificações" },
      { field: "confirmados", operation: "sum", label: "Total Confirmados" },
    ],
    charts: [
      { type: "bar", title: "Notificações por Agravo", xField: "agravo", yField: "total_notificacoes" },
      { type: "line", title: "Curva Epidêmica", xField: "semana_epi", yField: "casos", groupBy: "agravo" },
    ],
    exportFormats: ["pdf", "csv", "xlsx"],
  },
  {
    id: "suas_saude_integrado",
    name: "Relatório Integrado SUAS + Saúde",
    slug: "suas-saude",
    description: "Famílias vulneráveis, gestantes de risco e crianças sem acompanhamento",
    category: "suas_saude",
    parameters: [
      { name: "competencia", type: "date", label: "Competência", required: true },
      { name: "unitId", type: "select", label: "Unidade", required: false },
    ],
    columns: [
      { key: "indicador", label: "Indicador", type: "text", width: 300 },
      { key: "total", label: "Total", type: "number", width: 100, align: "right" },
      { key: "em_acompanhamento", label: "Acompanhados", type: "number", width: 120, align: "right" },
      { key: "sem_acompanhamento", label: "Sem Acomp.", type: "number", width: 120, align: "right" },
      { key: "percentual", label: "% Cobertura", type: "percentage", width: 100, align: "center" },
      { key: "prioridade", label: "Prioridade", type: "text", width: 100, align: "center" },
    ],
    query: "suas_saude_integrado",
    aggregations: [
      { field: "total", operation: "sum", label: "Total Famílias" },
      { field: "sem_acompanhamento", operation: "sum", label: "Sem Acompanhamento" },
    ],
    charts: [
      { type: "bar", title: "Cobertura por Indicador", xField: "indicador", yField: "percentual" },
    ],
    exportFormats: ["pdf", "csv", "xlsx"],
  },
  {
    id: "farmacia_completo",
    name: "Relatório Farmácia Completo",
    slug: "farmacia-completo",
    description: "Estoque, dispensações, medicamentos em falta e consumo anormal",
    category: "farmacia",
    parameters: [
      { name: "periodoInicio", type: "date", label: "Data Início", required: true },
      { name: "periodoFim", type: "date", label: "Data Fim", required: true },
      { name: "unitId", type: "select", label: "Unidade", required: false },
    ],
    columns: [
      { key: "medicamento", label: "Medicamento", type: "text", width: 250 },
      { key: "estoque_atual", label: "Estoque Atual", type: "number", width: 100, align: "right" },
      { key: "estoque_minimo", label: "Est. Mínimo", type: "number", width: 100, align: "right" },
      { key: "consumo_medio", label: "Consumo Médio", type: "number", width: 120, align: "right" },
      { key: "dias_cobertura", label: "Dias Cobert.", type: "number", width: 100, align: "right" },
      { key: "status", label: "Status", type: "text", width: 100, align: "center" },
      { key: "vencimento_proximo", label: "Venc. Próximo", type: "date", width: 120 },
    ],
    query: "farmacia_completo",
    aggregations: [
      { field: "estoque_atual", operation: "sum", label: "Estoque Total" },
    ],
    charts: [
      { type: "pie", title: "Distribuição por Status", xField: "status", yField: "count" },
      { type: "bar", title: "Top 10 Consumo", xField: "medicamento", yField: "consumo_medio" },
    ],
    exportFormats: ["pdf", "csv", "xlsx"],
  },
  {
    id: "fraldas_assistencia",
    name: "Relatório de Fraldas - Assistência Social",
    slug: "fraldas-assistencia",
    description: "Estoque, entregas, beneficiários e demanda de fraldas",
    category: "suas_saude",
    parameters: [
      { name: "periodoInicio", type: "date", label: "Data Início", required: true },
      { name: "periodoFim", type: "date", label: "Data Fim", required: true },
      { name: "unitId", type: "select", label: "Unidade", required: false },
      { name: "tamanho", type: "select", label: "Tamanho", required: false, options: [
        { value: "RN", label: "RN" },
        { value: "P", label: "P" },
        { value: "M", label: "M" },
        { value: "G", label: "G" },
        { value: "XG", label: "XG" },
        { value: "XXG", label: "XXG" },
        { value: "geriatrica_P", label: "Geriátrica P" },
        { value: "geriatrica_M", label: "Geriátrica M" },
        { value: "geriatrica_G", label: "Geriátrica G" },
        { value: "geriatrica_XG", label: "Geriátrica XG" },
      ]},
    ],
    columns: [
      { key: "tamanho", label: "Tamanho", type: "text", width: 120 },
      { key: "estoque_atual", label: "Estoque Atual", type: "number", width: 120, align: "right" },
      { key: "entregas_periodo", label: "Entregas", type: "number", width: 100, align: "right" },
      { key: "beneficiarios_ativos", label: "Beneficiários", type: "number", width: 120, align: "right" },
      { key: "demanda_media", label: "Demanda Média", type: "number", width: 120, align: "right" },
      { key: "meses_cobertura", label: "Meses Cobert.", type: "number", width: 120, align: "right" },
      { key: "tendencia", label: "Tendência", type: "text", width: 100, align: "center" },
    ],
    query: "fraldas_assistencia",
    aggregations: [
      { field: "estoque_atual", operation: "sum", label: "Estoque Total" },
      { field: "entregas_periodo", operation: "sum", label: "Total Entregas" },
    ],
    charts: [
      { type: "bar", title: "Estoque por Tamanho", xField: "tamanho", yField: "estoque_atual" },
      { type: "line", title: "Evolução de Entregas", xField: "mes", yField: "entregas", groupBy: "tamanho" },
    ],
    exportFormats: ["pdf", "csv", "xlsx"],
  },
  {
    id: "tfd_completo",
    name: "Relatório TFD Completo",
    slug: "tfd-completo",
    description: "Transporte de pacientes, custos, procedimentos e BPA/APAC",
    category: "financeiro",
    parameters: [
      { name: "periodoInicio", type: "date", label: "Data Início", required: true },
      { name: "periodoFim", type: "date", label: "Data Fim", required: true },
      { name: "destino", type: "text", label: "Município Destino", required: false },
    ],
    columns: [
      { key: "municipio_destino", label: "Destino", type: "text", width: 200 },
      { key: "total_viagens", label: "Viagens", type: "number", width: 80, align: "right" },
      { key: "pacientes", label: "Pacientes", type: "number", width: 80, align: "right" },
      { key: "km_total", label: "KM Total", type: "number", width: 100, align: "right" },
      { key: "custo_estimado", label: "Custo Est.", type: "currency", width: 120, align: "right" },
      { key: "valor_sigtap", label: "Valor SIGTAP", type: "currency", width: 120, align: "right" },
      { key: "bpa_gerados", label: "BPA", type: "number", width: 80, align: "right" },
      { key: "apac_gerados", label: "APAC", type: "number", width: 80, align: "right" },
    ],
    query: "tfd_completo",
    aggregations: [
      { field: "total_viagens", operation: "sum", label: "Total Viagens" },
      { field: "valor_sigtap", operation: "sum", label: "Valor SIGTAP Total" },
    ],
    charts: [
      { type: "bar", title: "Viagens por Destino", xField: "municipio_destino", yField: "total_viagens" },
      { type: "pie", title: "Distribuição de Custos", xField: "categoria", yField: "custo" },
    ],
    exportFormats: ["pdf", "csv", "xlsx"],
  },
];

export class StrategicReportEngine {
  private reports: Map<string, ReportDefinitionConfig> = new Map();

  constructor() {
    STRATEGIC_REPORTS.forEach(report => {
      this.reports.set(report.slug, report);
    });
  }

  getReport(slug: string): ReportDefinitionConfig | undefined {
    return this.reports.get(slug);
  }

  getAllReports(): ReportDefinitionConfig[] {
    return Array.from(this.reports.values());
  }

  getReportsByCategory(category: string): ReportDefinitionConfig[] {
    return Array.from(this.reports.values()).filter(r => r.category === category);
  }

  formatValue(value: any, type: string, format?: string): string {
    if (value === null || value === undefined) return "-";

    switch (type) {
      case "currency":
        return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value));
      case "percentage":
        return `${Number(value).toFixed(1)}%`;
      case "number":
        return new Intl.NumberFormat("pt-BR").format(Number(value));
      case "date":
        return new Date(value).toLocaleDateString("pt-BR");
      case "boolean":
        return value ? "Sim" : "Não";
      default:
        return String(value);
    }
  }
}

class ExtendedStrategicReportEngine extends StrategicReportEngine {
  getReportOrNull(slug: string): ReportDefinitionConfig | null {
    return this.getReport(slug) || null;
  }

  getAllCategories(): string[] {
    return [...new Set(STRATEGIC_REPORTS.map(r => r.category))];
  }
}

export const strategicReportEngine = new ExtendedStrategicReportEngine();
