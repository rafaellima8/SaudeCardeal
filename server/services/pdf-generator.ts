import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Citizen, Professional, HealthUnit, Prescription } from '@shared/schema';

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

function addInstitutionalHeader(doc: jsPDF, unit: HealthUnit): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPosition = 15;

  doc.setFillColor(16, 185, 129);
  doc.rect(0, 0, pageWidth, 45, 'F');

  const logoSvg = generateLogoSvg({ width: 32, height: 32, variant: 'inverse' });
  const logoDataUri = `data:image/svg+xml;base64,${Buffer.from(logoSvg).toString('base64')}`;
  doc.addImage(logoDataUri, 'SVG', 15, 12, 20, 20);

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

  return 55;
}

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

function calculateAge(birthDate: Date): number {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
}

const administrationRouteLabels: Record<string, string> = {
  oral: 'Via oral',
  topical: 'Uso tópico',
  injectable: 'Injetável',
  inhalation: 'Inalatório',
  sublingual: 'Sublingual',
  rectal: 'Retal',
  ophthalmic: 'Oftálmico',
  nasal: 'Nasal',
  auricular: 'Auricular',
};

export function generatePrescriptionPDF(
  prescription: Prescription,
  citizen: Citizen,
  professional: Professional,
  unit: HealthUnit
): Buffer {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  let yPosition = addInstitutionalHeader(doc, unit);
  yPosition += 5;

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('RECEITA MÉDICA', pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 10;
  doc.setDrawColor(16, 185, 129);
  doc.setLineWidth(0.5);
  doc.line(15, yPosition, pageWidth - 15, yPosition);
  yPosition += 8;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Médico(a):', 15, yPosition);
  doc.setFont('helvetica', 'normal');
  doc.text(professional.name, 45, yPosition);
  
  yPosition += 6;
  doc.setFont('helvetica', 'bold');
  doc.text(`${professional.councilType}:`, 15, yPosition);
  doc.setFont('helvetica', 'normal');
  doc.text(`${professional.councilNumber} - ${professional.councilState}`, 45, yPosition);
  
  yPosition += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('Especialidade:', 15, yPosition);
  doc.setFont('helvetica', 'normal');
  doc.text(professional.specialty, 55, yPosition);
  
  yPosition += 10;

  doc.setFont('helvetica', 'bold');
  doc.text('Paciente:', 15, yPosition);
  doc.setFont('helvetica', 'normal');
  doc.text(citizen.name, 45, yPosition);
  
  yPosition += 6;
  const age = calculateAge(citizen.birthDate);
  doc.setFont('helvetica', 'bold');
  doc.text('Idade:', 15, yPosition);
  doc.setFont('helvetica', 'normal');
  doc.text(`${age} anos`, 35, yPosition);
  
  if (citizen.cns) {
    doc.setFont('helvetica', 'bold');
    doc.text('CNS:', 80, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(citizen.cns, 95, yPosition);
  }
  
  yPosition += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('CPF:', 15, yPosition);
  doc.setFont('helvetica', 'normal');
  doc.text(citizen.cpf, 30, yPosition);

  yPosition += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('Data:', 15, yPosition);
  doc.setFont('helvetica', 'normal');
  doc.text(new Date(prescription.createdAt).toLocaleDateString('pt-BR'), 35, yPosition);
  
  yPosition += 12;
  doc.setDrawColor(200, 200, 200);
  doc.line(15, yPosition, pageWidth - 15, yPosition);
  yPosition += 10;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('PRESCRIÇÃO:', 15, yPosition);
  yPosition += 10;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(`1. ${prescription.medication}`, 15, yPosition);
  yPosition += 6;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  const details: string[] = [];
  if (prescription.dosage) details.push(`Dosagem: ${prescription.dosage}${prescription.dosageUnit || ''}`);
  if (prescription.administrationRoute) {
    details.push(`Via: ${administrationRouteLabels[prescription.administrationRoute] || prescription.administrationRoute}`);
  }
  if (prescription.frequency) details.push(`Frequência: ${prescription.frequency}`);
  if (prescription.duration) details.push(`Duração: ${prescription.duration}`);
  if (prescription.quantity) details.push(`Quantidade: ${prescription.quantity}`);
  
  if (details.length > 0) {
    doc.text(details.join(' | '), 20, yPosition);
    yPosition += 6;
  }
  
  if (prescription.instructions) {
    yPosition += 2;
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(60, 60, 60);
    const splitInstructions = doc.splitTextToSize(`Orientações: ${prescription.instructions}`, pageWidth - 40);
    doc.text(splitInstructions, 20, yPosition);
    yPosition += (splitInstructions.length * 5) + 2;
    doc.setTextColor(0, 0, 0);
  }

  if (prescription.specialInstructions) {
    yPosition += 2;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(180, 0, 0);
    const splitSpecial = doc.splitTextToSize(`ATENÇÃO: ${prescription.specialInstructions}`, pageWidth - 40);
    doc.text(splitSpecial, 20, yPosition);
    yPosition += (splitSpecial.length * 5) + 2;
    doc.setTextColor(0, 0, 0);
  }

  if (prescription.useContinuous) {
    yPosition += 4;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 100, 0);
    doc.text('USO CONTÍNUO', 20, yPosition);
    doc.setTextColor(0, 0, 0);
  }

  if (prescription.isControlled) {
    yPosition += 8;
    doc.setFillColor(255, 240, 240);
    doc.rect(15, yPosition - 4, pageWidth - 30, 12, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(180, 0, 0);
    doc.text(`MEDICAMENTO CONTROLADO - ${prescription.controlType || 'Portaria 344/98'}`, pageWidth / 2, yPosition + 2, { align: 'center' });
    doc.setTextColor(0, 0, 0);
    yPosition += 12;
  }

  yPosition += 20;
  if (yPosition > 250) {
    doc.addPage();
    yPosition = 30;
  }
  
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.line(pageWidth / 2 - 40, yPosition, pageWidth / 2 + 40, yPosition);
  yPosition += 5;
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(professional.name, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 4;
  doc.text(`${professional.councilType}: ${professional.councilNumber} - ${professional.councilState}`, pageWidth / 2, yPosition, { align: 'center' });

  addFooter(doc);

  return Buffer.from(doc.output('arraybuffer'));
}
