import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Citizen, Professional, HealthUnit, TfdRequest, TfdTrip, TfdVehicle, TfdDriver } from '@shared/schema';
import { formatDateSUS, urgencyToCarater, genderToSUS, RACA_COR_SUS, CARATER_ATENDIMENTO_SUS } from './sus-validators';
import { getProcedureByCodigo, calculateTFDValue, SIGTAP_TFD_CATALOG } from './sigtap-tfd';

function calculateAge(birthDate: Date): number {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

function formatCPF(cpf: string): string {
  const clean = cpf.replace(/\D/g, '');
  return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

function formatCNS(cns: string): string {
  const clean = cns.replace(/\D/g, '');
  return clean.replace(/(\d{3})(\d{4})(\d{4})(\d{4})/, '$1 $2 $3 $4');
}

function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('pt-BR');
}

interface BpaIData {
  request: TfdRequest;
  citizen: Citizen;
  professional: Professional;
  unit: HealthUnit;
  trip?: TfdTrip | null;
  authorizationNumber?: string;
  distanceKm?: number;
}

export function generateBpaIPDF(data: BpaIData): Buffer {
  const { request, citizen, professional, unit, trip, authorizationNumber, distanceKm = 100 } = data;
  
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  doc.setFillColor(0, 102, 51);
  doc.rect(0, 0, pageWidth, 25, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Ministério da Saúde', 15, 8);
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Sistema Único de Saúde', 15, 13);
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('BPA-I', pageWidth - 40, 10);
  doc.setFontSize(8);
  doc.text('Boletim de Produção Ambulatorial', pageWidth - 55, 15);
  doc.text('Dados Individualizados', pageWidth - 50, 20);
  
  let y = 32;
  
  doc.setTextColor(0, 0, 0);
  doc.setFillColor(240, 240, 240);
  doc.rect(10, y, pageWidth - 20, 8, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('IDENTIFICAÇÃO DO ESTABELECIMENTO DE SAÚDE', 15, y + 5.5);
  y += 12;
  
  doc.setDrawColor(0);
  doc.setLineWidth(0.3);
  doc.rect(10, y, pageWidth - 20, 16);
  
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('NOME DO ESTABELECIMENTO DE SAÚDE', 12, y + 4);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(unit.name, 12, y + 10);
  
  doc.line(pageWidth - 40, y, pageWidth - 40, y + 16);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('CNES', pageWidth - 38, y + 4);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(unit.cnes, pageWidth - 38, y + 11);
  
  y += 20;
  
  doc.setFillColor(240, 240, 240);
  doc.rect(10, y, pageWidth - 20, 8, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('IDENTIFICAÇÃO DO PROFISSIONAL', 15, y + 5.5);
  y += 12;
  
  doc.rect(10, y, pageWidth - 20, 16);
  
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('CNS/CPF DO PROFISSIONAL', 12, y + 4);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(professional.cns || professional.cpf, 12, y + 10);
  
  doc.line(80, y, 80, y + 16);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('NOME DO PROFISSIONAL', 82, y + 4);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(professional.name, 82, y + 10);
  
  y += 20;
  
  doc.rect(10, y, 40, 12);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('CBO', 12, y + 4);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(professional.cboCode || '225130', 12, y + 9);
  
  doc.rect(50, y, 40, 12);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('MÊS/ANO', 52, y + 4);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  const competencia = new Date(request.createdAt);
  doc.text(`${String(competencia.getMonth() + 1).padStart(2, '0')}/${competencia.getFullYear()}`, 52, y + 9);
  
  doc.rect(90, y, 50, 12);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('EQUIPE', 92, y + 4);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(professional.teamINE || '', 92, y + 9);
  
  doc.rect(140, y, 60, 12);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('FOLHA', 142, y + 4);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('001', 142, y + 9);
  
  y += 18;
  
  const sequences = [1];
  
  for (const seq of sequences) {
    doc.setFillColor(230, 240, 230);
    doc.rect(10, y, pageWidth - 20, 7, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`SEQUÊNCIA ${seq}`, 15, y + 5);
    
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('Paciente em situação de RUA?', pageWidth - 55, y + 4);
    doc.rect(pageWidth - 22, y + 1, 4, 4);
    doc.text('Sim', pageWidth - 17, y + 4);
    doc.rect(pageWidth - 13, y + 1, 4, 4);
    doc.text('Não', pageWidth - 8, y + 4);
    doc.text('X', pageWidth - 12.2, y + 4.2);
    
    y += 10;
    
    doc.setFillColor(240, 240, 240);
    doc.rect(10, y, pageWidth - 20, 6, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('IDENTIFICAÇÃO DO PACIENTE', 15, y + 4);
    y += 8;
    
    doc.rect(10, y, 70, 12);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('CPF OU CNS DO PACIENTE', 12, y + 4);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(citizen.cns ? formatCNS(citizen.cns) : formatCPF(citizen.cpf), 12, y + 9);
    
    doc.rect(80, y, pageWidth - 90, 12);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('NOME DO PACIENTE', 82, y + 4);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(citizen.name.toUpperCase(), 82, y + 9);
    
    y += 14;
    
    doc.rect(10, y, 20, 10);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('SEXO', 12, y + 4);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(citizen.gender === 'M' ? 'Masc.' : 'Fem.', 12, y + 8);
    
    doc.rect(30, y, 35, 10);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('DATA NASCIMENTO', 32, y + 4);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(formatDate(citizen.birthDate), 32, y + 8);
    
    doc.rect(65, y, 25, 10);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('NACIONAL.', 67, y + 4);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('010', 67, y + 8);
    
    doc.rect(90, y, 25, 10);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('RAÇA/COR', 92, y + 4);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('99', 92, y + 8);
    
    doc.rect(115, y, 25, 10);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('ETNIA', 117, y + 4);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('', 117, y + 8);
    
    doc.rect(140, y, 25, 10);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('CEP', 142, y + 4);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(citizen.zipCode || '', 142, y + 8);
    
    doc.rect(165, y, 35, 10);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('CÓD. IBGE MUN.', 167, y + 4);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('292460', 167, y + 8);
    
    y += 12;
    
    doc.rect(10, y, 20, 10);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('COD LOG', 12, y + 4);
    
    doc.rect(30, y, 100, 10);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('ENDEREÇO', 32, y + 4);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    const endereco = `${citizen.address || ''}, ${citizen.addressNumber || 'S/N'}`;
    doc.text(endereco.slice(0, 50), 32, y + 8);
    
    doc.rect(130, y, 20, 10);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('NÚMERO', 132, y + 4);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(citizen.addressNumber || 'S/N', 132, y + 8);
    
    doc.rect(150, y, 50, 10);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('COMPLEMENTO', 152, y + 4);
    doc.setFontSize(8);
    doc.text(citizen.addressComplement || '', 152, y + 8);
    
    y += 12;
    
    doc.rect(10, y, 60, 10);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('BAIRRO', 12, y + 4);
    doc.setFontSize(8);
    doc.text(citizen.neighborhood || '', 12, y + 8);
    
    doc.rect(70, y, 60, 10);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('TELEFONE DE CONTATO', 72, y + 4);
    doc.setFontSize(8);
    doc.text(citizen.phone || '', 72, y + 8);
    
    doc.rect(130, y, 70, 10);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('E-MAIL', 132, y + 4);
    doc.setFontSize(7);
    doc.text(citizen.email || '', 132, y + 8);
    
    y += 14;
    
    doc.setFillColor(240, 240, 240);
    doc.rect(10, y, pageWidth - 20, 6, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('PROCEDIMENTO REALIZADO', 15, y + 4);
    y += 8;
    
    const procedures = calculateTFDValue(distanceKm, request.companion || false, false);
    const mainProc = procedures.procedures[0];
    
    doc.rect(10, y, 35, 10);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('DATA ATENDIMENTO', 12, y + 4);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(formatDate(request.travelDate || request.createdAt), 12, y + 8);
    
    doc.rect(45, y, 40, 10);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('CÓD. PROCEDIMENTO', 47, y + 4);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(mainProc?.codigo || request.procedureCode || '0803010125', 47, y + 8);
    
    doc.rect(85, y, 20, 10);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('QTDE.', 87, y + 4);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(String(mainProc?.quantidade || Math.ceil(distanceKm / 50) * 2), 87, y + 8);
    
    doc.rect(105, y, 95, 10);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('CNPJ', 107, y + 4);
    
    y += 12;
    
    doc.rect(10, y, 25, 10);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('SERVIÇO', 12, y + 4);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('127', 12, y + 8);
    
    doc.rect(35, y, 25, 10);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('CLASS', 37, y + 4);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('001', 37, y + 8);
    
    doc.rect(60, y, 30, 10);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('CID', 62, y + 4);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('', 62, y + 8);
    
    doc.rect(90, y, 50, 10);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('CARÁTER DE ATENDIMENTO', 92, y + 4);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(urgencyToCarater(request.urgencyLevel) === '01' ? 'Eletivo' : 'Urgência', 92, y + 8);
    
    doc.rect(140, y, 60, 10);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('Nº DA AUTORIZAÇÃO', 142, y + 4);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(authorizationNumber || '', 142, y + 8);
    
    y += 18;
  }
  
  if (y < pageHeight - 40) {
    y = pageHeight - 40;
  }
  
  doc.setFillColor(240, 240, 240);
  doc.rect(10, y, (pageWidth - 20) / 2 - 2, 30, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('RESPONSÁVEL PELO ESTABELECIMENTO', 15, y + 5);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('CARIMBO', 15, y + 12);
  doc.text('RUBRICA', 15, y + 20);
  doc.text(`DATA ___/___/______`, 15, y + 27);
  
  doc.rect((pageWidth + 2) / 2, y, (pageWidth - 20) / 2 - 2, 30, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('GESTOR MUNICIPAL/ESTADUAL', (pageWidth + 10) / 2, y + 5);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('CARIMBO', (pageWidth + 10) / 2, y + 12);
  doc.text('RUBRICA', (pageWidth + 10) / 2, y + 20);
  doc.text(`DATA ___/___/______`, (pageWidth + 10) / 2, y + 27);
  
  doc.setFillColor(0, 102, 51);
  doc.rect(0, pageHeight - 8, pageWidth, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.text('MuniSaúde Integrado - Cardeal da Silva/BA', 15, pageHeight - 3);
  doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, pageWidth - 50, pageHeight - 3);
  
  return Buffer.from(doc.output('arraybuffer'));
}

interface ApacData {
  request: TfdRequest;
  citizen: Citizen;
  professional: Professional;
  unit: HealthUnit;
  authorizer?: Professional;
  authorizationNumber?: string;
  validityStart?: Date;
  validityEnd?: Date;
}

export function generateApacPDF(data: ApacData): Buffer {
  const { request, citizen, professional, unit, authorizer, authorizationNumber, validityStart, validityEnd } = data;
  
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  doc.setFillColor(0, 102, 51);
  doc.rect(0, 0, pageWidth, 20, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Ministério da Saúde', 15, 7);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('Sistema Único de Saúde', 15, 12);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('APAC', pageWidth / 2, 8, { align: 'center' });
  doc.setFontSize(8);
  doc.text('Autorização de Procedimentos Ambulatoriais', pageWidth / 2, 13, { align: 'center' });
  doc.setFontSize(7);
  doc.text('Laudo de Solicitação / Autorização', pageWidth / 2, 17, { align: 'center' });
  
  doc.setFontSize(8);
  doc.text('pg. 1/2', pageWidth - 20, 12);
  
  let y = 27;
  
  doc.setTextColor(0, 0, 0);
  doc.setFillColor(230, 240, 230);
  doc.rect(10, y, pageWidth - 20, 7, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('IDENTIFICAÇÃO DO ESTABELECIMENTO DE SAÚDE (SOLICITANTE)', 15, y + 5);
  y += 10;
  
  doc.rect(10, y, pageWidth - 50, 12);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('NOME DO ESTABELECIMENTO DE SAÚDE SOLICITANTE', 12, y + 4);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(unit.name, 12, y + 9);
  
  doc.rect(pageWidth - 40, y, 30, 12);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('CNES', pageWidth - 38, y + 4);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(unit.cnes, pageWidth - 38, y + 9);
  
  y += 18;
  
  doc.setFillColor(230, 240, 230);
  doc.rect(10, y, pageWidth - 20, 7, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('IDENTIFICAÇÃO DO PACIENTE', 15, y + 5);
  y += 10;
  
  doc.rect(10, y, pageWidth - 50, 12);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('NOME DO PACIENTE', 12, y + 4);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(citizen.name.toUpperCase(), 12, y + 9);
  
  doc.rect(pageWidth - 40, y, 30, 12);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('Nº DO PRONTUÁRIO', pageWidth - 38, y + 4);
  
  y += 14;
  
  doc.rect(10, y, 80, 10);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('CPF OU CARTÃO NACIONAL DE SAÚDE (CNS)', 12, y + 4);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(citizen.cns ? formatCNS(citizen.cns) : formatCPF(citizen.cpf), 12, y + 8);
  
  doc.rect(90, y, 35, 10);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('DATA DE NASCIMENTO', 92, y + 4);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(formatDate(citizen.birthDate), 92, y + 8);
  
  doc.rect(125, y, 25, 10);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('SEXO', 127, y + 4);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(citizen.gender === 'M' ? 'Masc.' : 'Fem.', 127, y + 8);
  
  doc.rect(150, y, 25, 10);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('RAÇA/COR', 152, y + 4);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('99', 152, y + 8);
  
  doc.rect(175, y, 25, 10);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('ETNIA', 177, y + 4);
  
  y += 12;
  
  doc.rect(10, y, 100, 10);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('NOME DA MÃE', 12, y + 4);
  doc.setFontSize(8);
  doc.text(citizen.motherName || '', 12, y + 8);
  
  doc.rect(110, y, 90, 10);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('TELEFONE CELULAR', 112, y + 4);
  doc.setFontSize(8);
  doc.text(citizen.phone || '', 112, y + 8);
  
  y += 12;
  
  doc.rect(10, y, 100, 10);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('NOME DO RESPONSÁVEL', 12, y + 4);
  doc.setFontSize(8);
  doc.text(citizen.responsibleName || citizen.motherName || '', 12, y + 8);
  
  doc.rect(110, y, 90, 10);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('TELEFONE DE CONTATO', 112, y + 4);
  doc.setFontSize(8);
  doc.text(citizen.responsiblePhone || citizen.phone || '', 112, y + 8);
  
  y += 12;
  
  doc.rect(10, y, pageWidth - 20, 10);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('ENDEREÇO (RUA, Nº, BAIRRO)', 12, y + 4);
  doc.setFontSize(8);
  const fullAddress = `${citizen.address || ''}, ${citizen.addressNumber || 'S/N'} - ${citizen.neighborhood || ''}`;
  doc.text(fullAddress.slice(0, 80), 12, y + 8);
  
  y += 12;
  
  doc.rect(10, y, 90, 10);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('MUNICÍPIO DE RESIDÊNCIA', 12, y + 4);
  doc.setFontSize(8);
  doc.text(citizen.city || 'Cardeal da Silva', 12, y + 8);
  
  doc.rect(100, y, 40, 10);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('CÓD. IBGE MUNICÍPIO', 102, y + 4);
  doc.setFontSize(8);
  doc.text('292460', 102, y + 8);
  
  doc.rect(140, y, 20, 10);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('UF', 142, y + 4);
  doc.setFontSize(8);
  doc.text(citizen.state || 'BA', 142, y + 8);
  
  doc.rect(160, y, 40, 10);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('CEP', 162, y + 4);
  doc.setFontSize(8);
  doc.text(citizen.zipCode || '', 162, y + 8);
  
  y += 16;
  
  doc.setFillColor(230, 240, 230);
  doc.rect(10, y, pageWidth - 20, 7, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('PROCEDIMENTO(S) SOLICITADO(S)', 15, y + 5);
  y += 10;
  
  doc.rect(10, y, 35, 10);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('CÓD. PROC. PRINCIPAL', 12, y + 4);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(request.procedureCode || '0803010125', 12, y + 8);
  
  doc.rect(45, y, 20, 10);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('SERVIÇO', 47, y + 4);
  doc.setFontSize(8);
  doc.text('127', 47, y + 8);
  
  doc.rect(65, y, 20, 10);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('CLASS', 67, y + 4);
  doc.setFontSize(8);
  doc.text('001', 67, y + 8);
  
  doc.rect(85, y, 95, 10);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('NOME DO PROCEDIMENTO PRINCIPAL', 87, y + 4);
  doc.setFontSize(7);
  const procName = getProcedureByCodigo(request.procedureCode || '0803010125')?.nome || 'DESLOCAMENTO DE PACIENTE - TERRESTRE';
  doc.text(procName.slice(0, 45), 87, y + 8);
  
  doc.rect(180, y, 20, 10);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('QTDE.', 182, y + 4);
  doc.setFontSize(8);
  doc.text('1', 182, y + 8);
  
  y += 30;
  
  doc.setFillColor(230, 240, 230);
  doc.rect(10, y, pageWidth - 20, 7, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('JUSTIFICATIVA DO(S) PROCEDIMENTO(S) SOLICITADO(S)', 15, y + 5);
  y += 10;
  
  doc.rect(10, y, pageWidth - 20, 25);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  const justification = request.justification || `Paciente necessita de ${request.reason} em ${request.destination}. ${request.reasonDetail || ''}`;
  const splitJustification = doc.splitTextToSize(justification, pageWidth - 30);
  doc.text(splitJustification.slice(0, 4), 12, y + 5);
  
  y += 30;
  
  doc.setFillColor(0, 102, 51);
  doc.rect(0, pageHeight - 8, pageWidth, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.text('MuniSaúde Integrado - APAC TFD', 15, pageHeight - 3);
  doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, pageWidth - 50, pageHeight - 3);
  
  doc.addPage();
  
  doc.setFillColor(0, 102, 51);
  doc.rect(0, 0, pageWidth, 20, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Ministério da Saúde', 15, 7);
  doc.setFontSize(12);
  doc.text('APAC', pageWidth / 2, 8, { align: 'center' });
  doc.setFontSize(8);
  doc.text('Laudo de Solicitação / Autorização', pageWidth / 2, 15, { align: 'center' });
  doc.text('pg. 2/2', pageWidth - 20, 12);
  
  y = 27;
  
  doc.setTextColor(0, 0, 0);
  doc.setFillColor(230, 240, 230);
  doc.rect(10, y, pageWidth - 20, 7, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('SOLICITAÇÃO', 15, y + 5);
  y += 10;
  
  doc.rect(10, y, 100, 12);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('NOME DO PROFISSIONAL SOLICITANTE', 12, y + 4);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(professional.name, 12, y + 9);
  
  doc.rect(110, y, 35, 12);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('DATA DA SOLICITAÇÃO', 112, y + 4);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(formatDate(request.createdAt), 112, y + 9);
  
  doc.rect(145, y, 55, 12);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('ASSINATURA E CARIMBO', 147, y + 4);
  
  y += 14;
  
  doc.rect(10, y, pageWidth - 20, 12);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('CNS DO PROFISSIONAL SOLICITANTE', 12, y + 4);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(professional.cns || '', 12, y + 9);
  
  y += 18;
  
  doc.setFillColor(230, 240, 230);
  doc.rect(10, y, pageWidth - 20, 7, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('AUTORIZAÇÃO', 15, y + 5);
  y += 10;
  
  doc.rect(10, y, 70, 12);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('NOME DO PROFISSIONAL AUTORIZADOR', 12, y + 4);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(authorizer?.name || '', 12, y + 9);
  
  doc.rect(80, y, 40, 12);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('CÓD. ÓRGÃO EMISSOR', 82, y + 4);
  
  doc.rect(120, y, 80, 12);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('Nº DA AUTORIZAÇÃO (APAC)', 122, y + 4);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(authorizationNumber || '', 122, y + 9);
  
  y += 14;
  
  doc.rect(10, y, pageWidth - 20, 12);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('CNS DO PROFISSIONAL AUTORIZADOR', 12, y + 4);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(authorizer?.cns || '', 12, y + 9);
  
  y += 14;
  
  doc.rect(10, y, 40, 12);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('DATA DA AUTORIZAÇÃO', 12, y + 4);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(request.approvedAt ? formatDate(request.approvedAt) : '', 12, y + 9);
  
  doc.rect(50, y, 70, 12);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('ASSINATURA E CARIMBO', 52, y + 4);
  
  doc.rect(120, y, 80, 12);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('PERÍODO DE VALIDADE DA APAC', 122, y + 4);
  doc.setFontSize(8);
  const startDate = validityStart ? formatDate(validityStart) : '';
  const endDate = validityEnd ? formatDate(validityEnd) : '';
  doc.text(`${startDate} à ${endDate}`, 122, y + 9);
  
  doc.setFillColor(0, 102, 51);
  doc.rect(0, pageHeight - 8, pageWidth, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.text('MuniSaúde Integrado - APAC TFD', 15, pageHeight - 3);
  doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, pageWidth - 50, pageHeight - 3);
  
  return Buffer.from(doc.output('arraybuffer'));
}

interface TripReportData {
  trip: TfdTrip;
  vehicle: TfdVehicle;
  driver: TfdDriver;
  unit: HealthUnit;
  passengers: Array<{
    citizen: Citizen;
    request: TfdRequest;
    isCompanion: boolean;
  }>;
}

export function generateTripReportPDF(data: TripReportData): Buffer {
  const { trip, vehicle, driver, unit, passengers } = data;
  
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  
  doc.setFillColor(0, 102, 51);
  doc.rect(0, 0, pageWidth, 25, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('RELATÓRIO DE VIAGEM TFD', pageWidth / 2, 10, { align: 'center' });
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(unit.name, pageWidth / 2, 17, { align: 'center' });
  doc.text(`CNES: ${unit.cnes}`, pageWidth / 2, 22, { align: 'center' });
  
  let y = 35;
  
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('DADOS DA VIAGEM', 15, y);
  y += 8;
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  
  doc.text(`Destino: ${trip.destination}`, 15, y);
  y += 6;
  doc.text(`Data Saída Programada: ${formatDate(trip.scheduledDeparture)}`, 15, y);
  doc.text(`Data Retorno Programado: ${trip.scheduledReturn ? formatDate(trip.scheduledReturn) : 'N/A'}`, 110, y);
  y += 6;
  doc.text(`Data Saída Real: ${trip.actualDeparture ? formatDate(trip.actualDeparture) : 'Pendente'}`, 15, y);
  doc.text(`Data Retorno Real: ${trip.actualReturn ? formatDate(trip.actualReturn) : 'Pendente'}`, 110, y);
  y += 6;
  doc.text(`Rota: ${trip.route || 'N/A'}`, 15, y);
  y += 10;
  
  doc.setFont('helvetica', 'bold');
  doc.text('VEÍCULO', 15, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.text(`Placa: ${vehicle.plate}`, 15, y);
  doc.text(`Modelo: ${vehicle.brand} ${vehicle.model}`, 60, y);
  doc.text(`Tipo: ${vehicle.vehicleType}`, 130, y);
  y += 6;
  doc.text(`Capacidade: ${vehicle.capacity} passageiros`, 15, y);
  y += 10;
  
  doc.setFont('helvetica', 'bold');
  doc.text('MOTORISTA', 15, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.text(`Nome: ${driver.name}`, 15, y);
  doc.text(`CNH: ${driver.cnh} - Cat. ${driver.cnhCategory}`, 100, y);
  y += 6;
  doc.text(`Telefone: ${driver.phone || 'N/A'}`, 15, y);
  y += 10;
  
  doc.setFont('helvetica', 'bold');
  doc.text('QUILOMETRAGEM E CUSTOS', 15, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.text(`KM Inicial: ${trip.initialKm || 'N/A'}`, 15, y);
  doc.text(`KM Final: ${trip.finalKm || 'N/A'}`, 60, y);
  doc.text(`Total KM: ${trip.totalKm || 'N/A'}`, 105, y);
  y += 6;
  doc.text(`Combustível: ${trip.fuelLiters || 'N/A'} L`, 15, y);
  doc.text(`Custo Combustível: R$ ${trip.fuelCost?.toFixed(2) || 'N/A'}`, 60, y);
  y += 6;
  doc.text(`Custo Pedágio: R$ ${trip.tollCost?.toFixed(2) || 'N/A'}`, 15, y);
  doc.text(`Outros Custos: R$ ${trip.otherCosts?.toFixed(2) || 'N/A'}`, 60, y);
  doc.text(`TOTAL: R$ ${trip.totalCost?.toFixed(2) || 'N/A'}`, 120, y);
  y += 12;
  
  doc.setFont('helvetica', 'bold');
  doc.text(`PASSAGEIROS (${passengers.length})`, 15, y);
  y += 4;
  
  const tableData = passengers.map((p, idx) => [
    String(idx + 1),
    p.citizen.name,
    p.citizen.cns || p.citizen.cpf,
    p.isCompanion ? 'Acompanhante' : 'Paciente',
    p.request.destination,
  ]);
  
  autoTable(doc, {
    startY: y,
    head: [['#', 'Nome', 'CNS/CPF', 'Tipo', 'Destino']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [0, 102, 51], fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 50 },
      2: { cellWidth: 35 },
      3: { cellWidth: 25 },
      4: { cellWidth: 60 },
    },
  });
  
  y = (doc as any).lastAutoTable.finalY + 10;
  
  if (trip.tripReport) {
    doc.setFont('helvetica', 'bold');
    doc.text('RELATÓRIO/OBSERVAÇÕES', 15, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    const splitReport = doc.splitTextToSize(trip.tripReport, pageWidth - 30);
    doc.text(splitReport, 15, y);
    y += splitReport.length * 5;
  }
  
  if (trip.incidents) {
    y += 5;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(180, 0, 0);
    doc.text('INCIDENTES', 15, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    const splitIncidents = doc.splitTextToSize(trip.incidents, pageWidth - 30);
    doc.text(splitIncidents, 15, y);
    doc.setTextColor(0, 0, 0);
  }
  
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFillColor(0, 102, 51);
  doc.rect(0, pageHeight - 8, pageWidth, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.text('MuniSaúde Integrado - Relatório TFD', 15, pageHeight - 3);
  doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, pageWidth - 50, pageHeight - 3);
  
  return Buffer.from(doc.output('arraybuffer'));
}
