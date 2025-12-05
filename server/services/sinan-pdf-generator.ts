import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { SinanFormTemplate, SinanField, SinanFormGroup } from "@shared/sinan/template-types";
import { sinanTemplateService } from "./sinan-template-service";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface SinanPdfOptions {
  includeHeader?: boolean;
  includeFooter?: boolean;
  includeWatermark?: boolean;
  pageSize?: "a4" | "letter";
}

export interface SinanNotificationData {
  id: string;
  notificationNumber: string;
  agravoCode: string;
  templateId?: string;
  formData: Record<string, any>;
  createdAt: Date;
  status: string;
  unitName?: string;
  notifierName?: string;
}

const SINAN_COLORS = {
  primary: [0, 102, 153] as [number, number, number],
  secondary: [51, 51, 51] as [number, number, number],
  accent: [255, 153, 0] as [number, number, number],
  lightGray: [245, 245, 245] as [number, number, number],
  border: [200, 200, 200] as [number, number, number],
  text: [33, 33, 33] as [number, number, number],
};

const FIELD_LABELS: Record<string, string> = {
  tipo_notificacao: "Tipo de Notificação",
  agravo_doenca: "Agravo/Doença",
  dt_notificacao: "Data da Notificação",
  uf_notificacao: "UF Notificação",
  municipio_notificacao: "Município de Notificação",
  unidade_saude: "Unidade de Saúde",
  paciente_nome: "Nome do Paciente",
  paciente_dt_nascimento: "Data de Nascimento",
  paciente_idade: "Idade",
  paciente_idade_tipo: "Tipo de Idade",
  paciente_sexo: "Sexo",
  paciente_gestante: "Gestante",
  paciente_raca_cor: "Raça/Cor",
  paciente_escolaridade: "Escolaridade",
  paciente_cns: "CNS",
  paciente_cpf: "CPF",
  paciente_nome_mae: "Nome da Mãe",
  res_uf: "UF Residência",
  res_municipio: "Município de Residência",
  res_bairro: "Bairro",
  res_logradouro: "Logradouro",
  res_numero: "Número",
  res_complemento: "Complemento",
  res_cep: "CEP",
  res_telefone: "Telefone",
  res_zona: "Zona",
  classificacao_final: "Classificação Final",
  criterio_confirmacao: "Critério de Confirmação",
  evolucao_caso: "Evolução do Caso",
  dt_obito: "Data do Óbito",
  dt_encerramento: "Data de Encerramento",
  observacoes: "Observações",
  nome_investigador: "Investigador",
};

const VALUE_LABELS: Record<string, Record<string, string>> = {
  tipo_notificacao: { "1": "Individual", "2": "Surto", "3": "Agregado" },
  paciente_sexo: { M: "Masculino", F: "Feminino", I: "Ignorado" },
  paciente_idade_tipo: { "1": "Hora", "2": "Dia", "3": "Mês", "4": "Ano" },
  paciente_gestante: {
    "1": "1º Trimestre", "2": "2º Trimestre", "3": "3º Trimestre",
    "4": "Idade gestacional ignorada", "5": "Não", "6": "Não se aplica", "9": "Ignorado",
  },
  paciente_raca_cor: {
    "1": "Branca", "2": "Preta", "3": "Amarela", "4": "Parda", "5": "Indígena", "9": "Ignorado",
  },
  res_zona: { "1": "Urbana", "2": "Rural", "3": "Periurbana", "9": "Ignorado" },
  classificacao_final: { "1": "Confirmado", "2": "Descartado", "8": "Inconclusivo" },
  criterio_confirmacao: { "1": "Laboratorial", "2": "Clínico-epidemiológico", "3": "Em investigação" },
  evolucao_caso: { "1": "Cura", "2": "Óbito pelo agravo", "3": "Óbito por outras causas", "9": "Ignorado" },
};

export class SinanPdfGenerator {
  private doc: jsPDF;
  private pageWidth: number;
  private pageHeight: number;
  private margin: number;
  private contentWidth: number;
  private currentY: number;

  constructor(options: SinanPdfOptions = {}) {
    const pageSize = options.pageSize || "a4";
    this.doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: pageSize,
    });

    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.pageHeight = this.doc.internal.pageSize.getHeight();
    this.margin = 15;
    this.contentWidth = this.pageWidth - 2 * this.margin;
    this.currentY = this.margin;
  }

  generateNotificationPdf(
    notification: SinanNotificationData,
    template: SinanFormTemplate,
    options: SinanPdfOptions = {}
  ): Buffer {
    this.drawHeader(notification, template);
    this.currentY += 5;

    const fieldsByGroup = sinanTemplateService.getFieldsByGroup(template);

    for (const group of template.groups) {
      if (this.currentY > this.pageHeight - 40) {
        this.addPage();
      }

      this.drawGroupHeader(group);
      const groupFields = fieldsByGroup[group.id] || [];
      this.drawGroupFields(groupFields, notification.formData);
      this.currentY += 5;
    }

    if (options.includeFooter !== false) {
      this.drawFooter(notification);
    }

    return Buffer.from(this.doc.output("arraybuffer"));
  }

  private drawHeader(notification: SinanNotificationData, template: SinanFormTemplate) {
    this.doc.setFillColor(...SINAN_COLORS.primary);
    this.doc.rect(0, 0, this.pageWidth, 35, "F");

    this.doc.setTextColor(255, 255, 255);
    this.doc.setFontSize(14);
    this.doc.setFont("helvetica", "bold");
    this.doc.text("REPÚBLICA FEDERATIVA DO BRASIL", this.pageWidth / 2, 10, { align: "center" });

    this.doc.setFontSize(11);
    this.doc.text("MINISTÉRIO DA SAÚDE", this.pageWidth / 2, 16, { align: "center" });

    this.doc.setFontSize(12);
    this.doc.text("SINAN - Sistema de Informação de Agravos de Notificação", this.pageWidth / 2, 23, { align: "center" });

    this.doc.setFontSize(10);
    this.doc.text(`FICHA DE NOTIFICAÇÃO INDIVIDUAL - ${template.nome.toUpperCase()}`, this.pageWidth / 2, 30, { align: "center" });

    this.currentY = 40;

    this.doc.setTextColor(...SINAN_COLORS.text);
    this.doc.setFillColor(...SINAN_COLORS.lightGray);
    this.doc.rect(this.margin, this.currentY, this.contentWidth, 12, "F");
    this.doc.setDrawColor(...SINAN_COLORS.border);
    this.doc.rect(this.margin, this.currentY, this.contentWidth, 12, "S");

    this.doc.setFontSize(8);
    this.doc.setFont("helvetica", "normal");
    const leftInfo = `Nº Notificação: ${notification.notificationNumber || "N/A"}`;
    const centerInfo = `CID-10: ${template.cid10}`;
    const rightInfo = `Data: ${format(notification.createdAt, "dd/MM/yyyy", { locale: ptBR })}`;

    this.doc.text(leftInfo, this.margin + 3, this.currentY + 7);
    this.doc.text(centerInfo, this.pageWidth / 2, this.currentY + 7, { align: "center" });
    this.doc.text(rightInfo, this.pageWidth - this.margin - 3, this.currentY + 7, { align: "right" });

    this.currentY += 17;
  }

  private drawGroupHeader(group: SinanFormGroup) {
    this.doc.setFillColor(...SINAN_COLORS.primary);
    this.doc.rect(this.margin, this.currentY, this.contentWidth, 7, "F");

    this.doc.setTextColor(255, 255, 255);
    this.doc.setFontSize(9);
    this.doc.setFont("helvetica", "bold");
    this.doc.text(group.nome.toUpperCase(), this.margin + 3, this.currentY + 5);

    this.currentY += 10;
  }

  private drawGroupFields(fields: SinanField[], formData: Record<string, any>) {
    const tableData: [string, string][] = [];

    for (const field of fields) {
      const rawValue = formData[field.key];
      const displayValue = this.formatFieldValue(field, rawValue);
      const label = FIELD_LABELS[field.key] || field.label;
      tableData.push([label, displayValue]);
    }

    if (tableData.length === 0) return;

    autoTable(this.doc, {
      startY: this.currentY,
      head: [],
      body: tableData,
      theme: "grid",
      margin: { left: this.margin, right: this.margin },
      styles: {
        fontSize: 8,
        cellPadding: 2,
        textColor: SINAN_COLORS.text,
        lineColor: SINAN_COLORS.border,
        lineWidth: 0.1,
      },
      columnStyles: {
        0: { cellWidth: 50, fontStyle: "bold", fillColor: SINAN_COLORS.lightGray },
        1: { cellWidth: "auto" },
      },
      didDrawPage: () => {
        this.currentY = (this.doc as any).lastAutoTable.finalY + 3;
      },
    });

    this.currentY = (this.doc as any).lastAutoTable?.finalY + 3 || this.currentY;
  }

  private formatFieldValue(field: SinanField, value: any): string {
    if (value === undefined || value === null || value === "") {
      return "-";
    }

    if (field.type === "date") {
      try {
        const date = new Date(value);
        return format(date, "dd/MM/yyyy", { locale: ptBR });
      } catch {
        return String(value);
      }
    }

    if (field.type === "checkbox") {
      return value ? "Sim" : "Não";
    }

    if (field.options && field.options.length > 0) {
      const option = field.options.find((o) => o.value === String(value));
      if (option) return option.label;
    }

    if (VALUE_LABELS[field.key]) {
      const mapped = VALUE_LABELS[field.key][String(value)];
      if (mapped) return mapped;
    }

    return String(value);
  }

  private drawFooter(notification: SinanNotificationData) {
    const footerY = this.pageHeight - 25;

    this.doc.setDrawColor(...SINAN_COLORS.border);
    this.doc.line(this.margin, footerY, this.pageWidth - this.margin, footerY);

    this.doc.setTextColor(...SINAN_COLORS.secondary);
    this.doc.setFontSize(7);
    this.doc.setFont("helvetica", "normal");

    const leftText = notification.unitName ? `Unidade: ${notification.unitName}` : "";
    const centerText = notification.notifierName ? `Notificado por: ${notification.notifierName}` : "";
    const rightText = `Gerado em: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}`;

    this.doc.text(leftText, this.margin, footerY + 5);
    this.doc.text(centerText, this.pageWidth / 2, footerY + 5, { align: "center" });
    this.doc.text(rightText, this.pageWidth - this.margin, footerY + 5, { align: "right" });

    this.doc.setFontSize(6);
    this.doc.text(
      "Este documento foi gerado pelo sistema MuniSaúde Integrado - Cardeal da Silva/BA",
      this.pageWidth / 2,
      footerY + 10,
      { align: "center" }
    );

    this.doc.text(
      `Status: ${notification.status.toUpperCase()} | ID: ${notification.id}`,
      this.pageWidth / 2,
      footerY + 14,
      { align: "center" }
    );
  }

  private addPage() {
    this.doc.addPage();
    this.currentY = this.margin;
  }

  generateBlankForm(template: SinanFormTemplate): Buffer {
    this.drawBlankHeader(template);
    this.currentY += 5;

    const fieldsByGroup = sinanTemplateService.getFieldsByGroup(template);

    for (const group of template.groups) {
      if (this.currentY > this.pageHeight - 40) {
        this.addPage();
      }

      this.drawGroupHeader(group);
      const groupFields = fieldsByGroup[group.id] || [];
      this.drawBlankFields(groupFields);
      this.currentY += 5;
    }

    this.drawBlankFooter(template);

    return Buffer.from(this.doc.output("arraybuffer"));
  }

  private drawBlankHeader(template: SinanFormTemplate) {
    this.doc.setFillColor(...SINAN_COLORS.primary);
    this.doc.rect(0, 0, this.pageWidth, 35, "F");

    this.doc.setTextColor(255, 255, 255);
    this.doc.setFontSize(14);
    this.doc.setFont("helvetica", "bold");
    this.doc.text("REPÚBLICA FEDERATIVA DO BRASIL", this.pageWidth / 2, 10, { align: "center" });

    this.doc.setFontSize(11);
    this.doc.text("MINISTÉRIO DA SAÚDE", this.pageWidth / 2, 16, { align: "center" });

    this.doc.setFontSize(12);
    this.doc.text("SINAN - Sistema de Informação de Agravos de Notificação", this.pageWidth / 2, 23, { align: "center" });

    this.doc.setFontSize(10);
    this.doc.text(`FICHA DE NOTIFICAÇÃO - ${template.nome.toUpperCase()}`, this.pageWidth / 2, 30, { align: "center" });

    this.currentY = 40;

    this.doc.setTextColor(...SINAN_COLORS.text);
    this.doc.setFillColor(...SINAN_COLORS.lightGray);
    this.doc.rect(this.margin, this.currentY, this.contentWidth, 12, "F");
    this.doc.setDrawColor(...SINAN_COLORS.border);
    this.doc.rect(this.margin, this.currentY, this.contentWidth, 12, "S");

    this.doc.setFontSize(8);
    this.doc.setFont("helvetica", "normal");
    const info = `CID-10: ${template.cid10} | Prazo: ${template.prazoNotificacao === "imediata" ? "Imediato (24h)" : "Semanal"} | Versão: ${template.versaoFicha}`;
    this.doc.text(info, this.pageWidth / 2, this.currentY + 7, { align: "center" });

    this.currentY += 17;
  }

  private drawBlankFields(fields: SinanField[]) {
    const tableData: [string, string][] = [];

    for (const field of fields) {
      const label = FIELD_LABELS[field.key] || field.label;
      const isRequired = field.required ? " *" : "";
      tableData.push([label + isRequired, ""]);
    }

    if (tableData.length === 0) return;

    autoTable(this.doc, {
      startY: this.currentY,
      head: [],
      body: tableData,
      theme: "grid",
      margin: { left: this.margin, right: this.margin },
      styles: {
        fontSize: 8,
        cellPadding: 3,
        textColor: SINAN_COLORS.text,
        lineColor: SINAN_COLORS.border,
        lineWidth: 0.1,
        minCellHeight: 8,
      },
      columnStyles: {
        0: { cellWidth: 55, fontStyle: "bold", fillColor: SINAN_COLORS.lightGray },
        1: { cellWidth: "auto" },
      },
    });

    this.currentY = (this.doc as any).lastAutoTable?.finalY + 3 || this.currentY;
  }

  private drawBlankFooter(template: SinanFormTemplate) {
    const footerY = this.pageHeight - 30;

    this.doc.setFontSize(7);
    this.doc.setTextColor(...SINAN_COLORS.secondary);
    this.doc.text("* Campos obrigatórios", this.margin, footerY);

    this.doc.setDrawColor(...SINAN_COLORS.border);
    this.doc.line(this.margin, footerY + 5, this.pageWidth - this.margin, footerY + 5);

    this.doc.setFontSize(6);
    this.doc.text(
      "Este formulário deve ser preenchido de acordo com as normas do SINAN/MS",
      this.pageWidth / 2,
      footerY + 10,
      { align: "center" }
    );
  }
}

export const sinanPdfGenerator = new SinanPdfGenerator();
