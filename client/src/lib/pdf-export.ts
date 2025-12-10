import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { generateLogoSvg } from './logo-svg';

interface ReportData {
  summary: {
    totalPatients: number;
    newPatients: number;
    totalConsultations: number;
    totalPrescriptions: number;
    totalExams: number;
    tfdRequests: number;
  };
  consultationsByType: Array<{ type: string; count: number }>;
  topDiagnoses: Array<{ diagnosis: string; count: number }>;
  medicationUsage: Array<{ medication: string; quantity: number }>;
  ageDistribution: Array<{ range: string; count: number }>;
}

interface ExportOptions {
  period: string;
  unitName: string;
}

const periodLabels: Record<string, string> = {
  '7': 'Últimos 7 dias',
  '30': 'Últimos 30 dias',
  '90': 'Últimos 90 dias',
  '365': 'Último ano',
};

export function exportReportToPDF(data: ReportData, options: ExportOptions) {
  if (!data || !data.summary) {
    throw new Error('Dados do relatório não disponíveis ou incompletos');
  }
  
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPosition = 15;

  // ========== CABEÇALHO COM LOGO E IDENTIDADE VISUAL ==========
  // Faixa verde institucional
  doc.setFillColor(16, 185, 129); // Verde saúde #10B981
  doc.rect(0, 0, pageWidth, 45, 'F');

  // Logo SVG no canto superior esquerdo (branco sobre fundo verde)
  const logoSvg = generateLogoSvg({ width: 32, height: 32, variant: 'color' });
  const logoDataUri = `data:image/svg+xml;base64,${btoa(logoSvg)}`;
  // Criar versão invertida do logo para usar sobre fundo verde
  const logoInverseSvg = generateLogoSvg({ width: 32, height: 32, variant: 'color', primaryColor: '#FFFFFF', secondaryColor: '#E0F2FE' });
  const logoInverseUri = `data:image/svg+xml;base64,${btoa(logoInverseSvg)}`;
  doc.addImage(logoInverseUri, 'SVG', 15, 12, 20, 20);

  // Texto do cabeçalho
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('MuniSaúde Integrado', pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 8;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('Secretaria Municipal de Saúde', pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 6;
  doc.setFontSize(10);
  doc.text('Cardeal da Silva - Bahia', pageWidth / 2, yPosition, { align: 'center' });

  yPosition = 55;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Relatório de Indicadores de Saúde', pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text(`Período: ${periodLabels[options.period] || options.period}`, pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 5;
  doc.text(`Unidade: ${options.unitName}`, pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 5;
  doc.text(`Data de geração: ${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`, pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 8;
  doc.setDrawColor(16, 185, 129); // Verde institucional
  doc.setLineWidth(0.5);
  doc.line(15, yPosition, pageWidth - 15, yPosition);

  yPosition += 10;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('RESUMO GERAL', 15, yPosition);
  
  yPosition += 7;
  const summaryData = [
    ['Total de Pacientes', data.summary.totalPatients.toLocaleString('pt-BR')],
    ['Novos Pacientes', data.summary.newPatients.toLocaleString('pt-BR')],
    ['Consultas Realizadas', data.summary.totalConsultations.toLocaleString('pt-BR')],
    ['Prescrições Emitidas', data.summary.totalPrescriptions.toLocaleString('pt-BR')],
    ['Exames Solicitados', data.summary.totalExams.toLocaleString('pt-BR')],
    ['Solicitações TFD', data.summary.tfdRequests.toLocaleString('pt-BR')],
  ];

  autoTable(doc, {
    startY: yPosition,
    head: [['Indicador', 'Valor']],
    body: summaryData,
    theme: 'striped',
    styles: { fontSize: 10, cellPadding: 4, lineColor: [200, 200, 200], lineWidth: 0.1 },
    headStyles: { 
      fillColor: [16, 185, 129], // Verde institucional
      textColor: 255, 
      fontStyle: 'bold',
      fontSize: 11,
      halign: 'center'
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 'auto' },
      1: { halign: 'center', fontStyle: 'bold', textColor: [16, 185, 129] } // Verde institucional
    },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    margin: { left: 15, right: 15 },
  });

  yPosition = (doc as any).lastAutoTable.finalY + 10;

  if (data.consultationsByType.length > 0) {
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('CONSULTAS POR TIPO', 15, yPosition);
    
    yPosition += 7;
    const consultationsData = data.consultationsByType.map(item => [
      item.type || 'Não especificado',
      item.count.toLocaleString('pt-BR')
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['Tipo de Consulta', 'Quantidade']],
      body: consultationsData,
      theme: 'striped',
      styles: { fontSize: 10, cellPadding: 4, lineColor: [200, 200, 200], lineWidth: 0.1 },
      headStyles: { 
        fillColor: [0, 120, 215], 
        textColor: 255, 
        fontStyle: 'bold',
        fontSize: 11,
        halign: 'center'
      },
      columnStyles: {
        1: { halign: 'center', fontStyle: 'bold', textColor: [0, 120, 215] }
      },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      margin: { left: 15, right: 15 },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 10;
  }

  if (yPosition > 240) {
    doc.addPage();
    yPosition = 20;
  }

  if (data.topDiagnoses.length > 0) {
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('TOP 5 DIAGNÓSTICOS MAIS FREQUENTES', 15, yPosition);
    
    yPosition += 7;
    const diagnosesData = data.topDiagnoses.slice(0, 5).map((item, index) => [
      (index + 1).toString() + 'º',
      item.diagnosis || 'Não especificado',
      item.count.toLocaleString('pt-BR')
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['Posição', 'Diagnóstico', 'Casos']],
      body: diagnosesData,
      theme: 'striped',
      styles: { fontSize: 10, cellPadding: 4, lineColor: [200, 200, 200], lineWidth: 0.1 },
      headStyles: { 
        fillColor: [0, 120, 215], 
        textColor: 255, 
        fontStyle: 'bold',
        fontSize: 11,
        halign: 'center'
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 25 },
        2: { halign: 'center', fontStyle: 'bold', textColor: [0, 120, 215] }
      },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      margin: { left: 15, right: 15 },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 10;
  }

  if (yPosition > 240) {
    doc.addPage();
    yPosition = 20;
  }

  if (data.medicationUsage.length > 0) {
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('TOP 5 MEDICAMENTOS MAIS PRESCRITOS', 15, yPosition);
    
    yPosition += 7;
    const medicationsData = data.medicationUsage.slice(0, 5).map((item, index) => [
      (index + 1).toString() + 'º',
      item.medication || 'Não especificado',
      item.quantity.toLocaleString('pt-BR')
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['Posição', 'Medicamento', 'Quantidade']],
      body: medicationsData,
      theme: 'striped',
      styles: { fontSize: 10, cellPadding: 4, lineColor: [200, 200, 200], lineWidth: 0.1 },
      headStyles: { 
        fillColor: [0, 120, 215], 
        textColor: 255, 
        fontStyle: 'bold',
        fontSize: 11,
        halign: 'center'
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 25 },
        2: { halign: 'center', fontStyle: 'bold', textColor: [0, 120, 215] }
      },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      margin: { left: 15, right: 15 },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 10;
  }

  if (yPosition > 240) {
    doc.addPage();
    yPosition = 20;
  }

  if (data.ageDistribution.length > 0) {
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('DISTRIBUIÇÃO ETÁRIA DOS PACIENTES', 15, yPosition);
    
    yPosition += 7;
    const totalPatients = Math.max(data.summary.totalPatients, 1);
    const ageData = data.ageDistribution.map(item => [
      item.range,
      item.count.toLocaleString('pt-BR'),
      `${((item.count / totalPatients) * 100).toFixed(1)}%`
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['Faixa Etária', 'Pacientes', 'Percentual']],
      body: ageData,
      theme: 'striped',
      styles: { fontSize: 10, cellPadding: 4, lineColor: [200, 200, 200], lineWidth: 0.1 },
      headStyles: { 
        fillColor: [0, 120, 215], 
        textColor: 255, 
        fontStyle: 'bold',
        fontSize: 11,
        halign: 'center'
      },
      columnStyles: {
        1: { halign: 'center', fontStyle: 'bold', textColor: [0, 120, 215] },
        2: { halign: 'center', fontStyle: 'bold' }
      },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      margin: { left: 15, right: 15 },
    });
  }

  const totalPages = doc.getNumberOfPages();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    
    doc.setFillColor(0, 120, 215);
    doc.rect(0, pageHeight - 12, pageWidth, 12, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `PEC Integrado Municipal - Cardeal da Silva/BA`,
      15,
      pageHeight - 5
    );
    doc.text(
      `Página ${i} de ${totalPages}`,
      pageWidth - 15,
      pageHeight - 5,
      { align: 'right' }
    );
  }

  const fileName = `relatorio_saude_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}
