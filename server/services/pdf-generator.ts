import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Consultation, Citizen, Professional, HealthUnit, MedicalPrescription } from '@shared/schema';

/**
 * Gera logo SVG como string para uso em PDFs
 */
function generateLogoSvg(options: { width: number; height: number; variant?: 'color' | 'inverse' } = { width: 32, height: 32 }): string {
  const { width, height, variant = 'color' } = options;
  
  const primaryColor = variant === 'inverse' ? '#FFFFFF' : '#10B981';
  const secondaryColor = variant === 'inverse' ? '#E0F2FE' : '#3B82F6';
  const bgOpacity = '0.1';

  const svg = `
    <svg width="${width}" height="${height}" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="30" fill="${primaryColor}" opacity="${bgOpacity}"/>
      <path d="M32 16V48M16 32H48" stroke="${primaryColor}" stroke-width="6" stroke-linecap="round"/>
      <path 
        d="M12 32 L18 32 L22 24 L28 40 L34 20 L38 32 L42 32" 
        stroke="${secondaryColor}" 
        stroke-width="2.5" 
        stroke-linecap="round" 
        stroke-linejoin="round" 
        opacity="0.8" 
        transform="translate(0, 8)"
      />
    </svg>
  `.trim();

  return svg;
}

/**
 * Adiciona cabeçalho institucional padrão ao PDF
 */
function addInstitutionalHeader(doc: jsPDF, unit: HealthUnit): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPosition = 15;

  // Faixa verde institucional
  doc.setFillColor(16, 185, 129); // Verde saúde #10B981
  doc.rect(0, 0, pageWidth, 45, 'F');

  // Logo SVG
  const logoSvg = generateLogoSvg({ width: 32, height: 32, variant: 'inverse' });
  const logoDataUri = `data:image/svg+xml;base64,${Buffer.from(logoSvg).toString('base64')}`;
  doc.addImage(logoDataUri, 'SVG', 15, 12, 20, 20);

  // Texto do cabeçalho
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Prefeitura Municipal de Cardeal da Silva', pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 7;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Secretaria Municipal de Saúde', pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 6;
  doc.setFontSize(10);
  doc.text(unit.name, pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 5;
  doc.setFontSize(9);
  doc.text(unit.address, pageWidth / 2, yPosition, { align: 'center' });

  return 55; // Retorna a posição Y após o cabeçalho
}

/**
 * Adiciona rodapé ao PDF
 */
function addFooter(doc: jsPDF) {
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  doc.setFillColor(0, 120, 215);
  doc.rect(0, pageHeight - 12, pageWidth, 12, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `MuniSaúde Integrado - Cardeal da Silva/BA`,
    15,
    pageHeight - 5
  );
  doc.text(
    `Emitido em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
    pageWidth - 15,
    pageHeight - 5,
    { align: 'right' }
  );
}

/**
 * Calcula idade a partir da data de nascimento
 */
function calculateAge(birthDate: Date): number {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
}

/**
 * Interface para dados de prescrição médica
 */
export interface PrescriptionPDFData {
  consultation: Consultation;
  citizen: Citizen;
  professional: Professional;
  unit: HealthUnit;
  prescriptions: MedicalPrescription[];
}

/**
 * Gera PDF de Receita Médica
 */
export function generatePrescriptionPDF(data: PrescriptionPDFData): Buffer {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Cabeçalho institucional
  let yPosition = addInstitutionalHeader(doc, data.unit);
  yPosition += 5;

  // Título do documento
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('RECEITA MÉDICA', pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 10;
  doc.setDrawColor(16, 185, 129);
  doc.setLineWidth(0.5);
  doc.line(15, yPosition, pageWidth - 15, yPosition);
  yPosition += 8;

  // Dados do Profissional
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Médico(a):', 15, yPosition);
  doc.setFont('helvetica', 'normal');
  doc.text(data.professional.name, 40, yPosition);
  
  yPosition += 6;
  doc.setFont('helvetica', 'bold');
  doc.text(`${data.professional.councilType}:`, 15, yPosition);
  doc.setFont('helvetica', 'normal');
  doc.text(`${data.professional.councilNumber} - ${data.professional.councilState}`, 40, yPosition);
  
  yPosition += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('Especialidade:', 15, yPosition);
  doc.setFont('helvetica', 'normal');
  doc.text(data.professional.specialty, 40, yPosition);
  
  yPosition += 10;

  // Dados do Paciente
  doc.setFont('helvetica', 'bold');
  doc.text('Paciente:', 15, yPosition);
  doc.setFont('helvetica', 'normal');
  doc.text(data.citizen.name, 40, yPosition);
  
  yPosition += 6;
  const age = calculateAge(data.citizen.birthDate);
  doc.setFont('helvetica', 'bold');
  doc.text('Idade:', 15, yPosition);
  doc.setFont('helvetica', 'normal');
  doc.text(`${age} anos`, 40, yPosition);
  
  if (data.citizen.cns) {
    doc.setFont('helvetica', 'bold');
    doc.text('CNS:', 100, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(data.citizen.cns, 115, yPosition);
  }
  
  yPosition += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('Data:', 15, yPosition);
  doc.setFont('helvetica', 'normal');
  doc.text(new Date(data.consultation.consultationDate).toLocaleDateString('pt-BR'), 40, yPosition);
  
  yPosition += 12;
  doc.setDrawColor(200, 200, 200);
  doc.line(15, yPosition, pageWidth - 15, yPosition);
  yPosition += 8;

  // Prescrições
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('PRESCRIÇÃO:', 15, yPosition);
  yPosition += 8;

  if (data.prescriptions.length === 0) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 100, 100);
    doc.text('Nenhum medicamento prescrito', 15, yPosition);
  } else {
    data.prescriptions.forEach((prescription, index) => {
      // Verificar se precisa de nova página
      if (yPosition > 240) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text(`${index + 1}. ${prescription.medication}`, 15, yPosition);
      yPosition += 6;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
      const details: string[] = [];
      if (prescription.dosage) details.push(`Dosagem: ${prescription.dosage}`);
      if (prescription.route) details.push(`Via: ${prescription.route}`);
      if (prescription.frequency) details.push(`Frequência: ${prescription.frequency}`);
      if (prescription.duration) details.push(`Duração: ${prescription.duration}`);
      
      if (details.length > 0) {
        doc.text(details.join(' | '), 20, yPosition);
        yPosition += 6;
      }
      
      if (prescription.instructions) {
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(60, 60, 60);
        const splitInstructions = doc.splitTextToSize(prescription.instructions, pageWidth - 40);
        doc.text(splitInstructions, 20, yPosition);
        yPosition += (splitInstructions.length * 5) + 2;
        doc.setTextColor(0, 0, 0);
      }
      
      yPosition += 4;
    });
  }

  // Assinatura
  yPosition += 15;
  if (yPosition > 250) {
    doc.addPage();
    yPosition = 20;
  }
  
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.line(pageWidth / 2 - 40, yPosition, pageWidth / 2 + 40, yPosition);
  yPosition += 5;
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(data.professional.name, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 4;
  doc.text(`${data.professional.councilType}: ${data.professional.councilNumber} - ${data.professional.councilState}`, pageWidth / 2, yPosition, { align: 'center' });

  // Rodapé
  addFooter(doc);

  return Buffer.from(doc.output('arraybuffer'));
}

/**
 * Interface para dados de atestado médico
 */
export interface MedicalCertificateData {
  consultation: Consultation;
  citizen: Citizen;
  professional: Professional;
  unit: HealthUnit;
  certificateType: string;
  startDate: Date;
  endDate: Date;
  reason?: string;
}

/**
 * Gera PDF de Atestado Médico
 */
export function generateMedicalCertificatePDF(data: MedicalCertificateData): Buffer {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Cabeçalho institucional
  let yPosition = addInstitutionalHeader(doc, data.unit);
  yPosition += 5;

  // Título do documento
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('ATESTADO MÉDICO', pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 10;
  doc.setDrawColor(16, 185, 129);
  doc.setLineWidth(0.5);
  doc.line(15, yPosition, pageWidth - 15, yPosition);
  yPosition += 15;

  // Corpo do atestado
  const age = calculateAge(data.citizen.birthDate);
  const daysDiff = Math.ceil((data.endDate.getTime() - data.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  
  const certificateTypeText = data.certificateType === 'trabalho' ? 'laborais' : 
                              data.certificateType === 'escola' ? 'escolares' : 'habituais';

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  
  const text1 = `Atesto, para os devidos fins, que o(a) Sr(a). `;
  const text2Bold = data.citizen.name;
  const text3 = `, ${age} anos, portador(a) do CPF ${data.citizen.cpf}`;
  if (data.citizen.cns) {
    doc.text(text1 + text2Bold + text3 + ` e CNS ${data.citizen.cns}, esteve sob meus cuidados`, 15, yPosition, { maxWidth: pageWidth - 30 });
  } else {
    doc.text(text1 + text2Bold + text3 + `, esteve sob meus cuidados`, 15, yPosition, { maxWidth: pageWidth - 30 });
  }
  yPosition += 7;
  
  const consultationDateStr = new Date(data.consultation.consultationDate).toLocaleDateString('pt-BR', { 
    day: '2-digit', 
    month: 'long', 
    year: 'numeric' 
  });
  
  doc.text(`profissionais nesta unidade de saúde na data de ${consultationDateStr}`, 15, yPosition, { maxWidth: pageWidth - 30 });
  yPosition += 7;
  
  if (daysDiff === 1) {
    doc.text(`e necessita de 1 (um) dia de afastamento das suas atividades ${certificateTypeText},`, 15, yPosition, { maxWidth: pageWidth - 30 });
  } else {
    doc.text(`e necessita de ${daysDiff} (${numberToWords(daysDiff)}) dias de afastamento das suas atividades ${certificateTypeText},`, 15, yPosition, { maxWidth: pageWidth - 30 });
  }
  yPosition += 7;
  
  const startDateStr = data.startDate.toLocaleDateString('pt-BR');
  const endDateStr = data.endDate.toLocaleDateString('pt-BR');
  
  doc.text(`no período de ${startDateStr} a ${endDateStr}.`, 15, yPosition, { maxWidth: pageWidth - 30 });
  yPosition += 10;

  // Motivo (se fornecido)
  if (data.reason && data.reason.trim().length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.text('Motivo:', 15, yPosition);
    yPosition += 6;
    doc.setFont('helvetica', 'normal');
    const splitReason = doc.splitTextToSize(data.reason, pageWidth - 30);
    doc.text(splitReason, 15, yPosition);
    yPosition += (splitReason.length * 6) + 5;
  }

  // CID (opcional - pode ser expandido futuramente)
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('Código CID: _________________________', 15, yPosition);
  yPosition += 15;

  // Local e Data
  yPosition += 10;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  
  const locationDate = `Cardeal da Silva/BA, ${new Date().toLocaleDateString('pt-BR', { 
    day: '2-digit', 
    month: 'long', 
    year: 'numeric' 
  })}`;
  doc.text(locationDate, pageWidth / 2, yPosition, { align: 'center' });
  
  // Assinatura
  yPosition += 25;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.line(pageWidth / 2 - 40, yPosition, pageWidth / 2 + 40, yPosition);
  yPosition += 5;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(data.professional.name, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 5;
  doc.setFont('helvetica', 'normal');
  doc.text(`${data.professional.councilType}: ${data.professional.councilNumber} - ${data.professional.councilState}`, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 4;
  doc.setFontSize(9);
  doc.text(data.professional.specialty, pageWidth / 2, yPosition, { align: 'center' });

  // Rodapé
  addFooter(doc);

  return Buffer.from(doc.output('arraybuffer'));
}

/**
 * Converte número para extenso (simplificado, até 31 dias)
 */
function numberToWords(num: number): string {
  const words = [
    '', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez',
    'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove', 'vinte',
    'vinte e um', 'vinte e dois', 'vinte e três', 'vinte e quatro', 'vinte e cinco', 
    'vinte e seis', 'vinte e sete', 'vinte e oito', 'vinte e nove', 'trinta', 'trinta e um'
  ];
  
  return words[num] || num.toString();
}
