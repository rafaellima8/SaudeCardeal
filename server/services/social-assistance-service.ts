import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { storage } from "../storage";
import type { DiaperAuthorization, DiaperDelivery, SaBeneficiary } from "@shared/schema";

interface CsvRow {
  cpf?: string;
  nis?: string;
  nome: string;
  tamanho: string;
  quantidade: number;
  telefone?: string;
  endereco?: string;
}

interface ValidationError {
  row: number;
  field: string;
  value: string;
  error: string;
}

interface ParseResult {
  validRows: CsvRow[];
  invalidRows: ValidationError[];
  totalRows: number;
}

const VALID_SIZES = ['RN', 'P', 'M', 'G', 'XG', 'XXG', 'geriatrica_P', 'geriatrica_M', 'geriatrica_G', 'geriatrica_XG'];

function normalizeSize(size: string): string | null {
  const normalized = size.trim().toUpperCase();
  
  const sizeMap: Record<string, string> = {
    'RN': 'RN',
    'RECEM NASCIDO': 'RN',
    'RECÉM NASCIDO': 'RN',
    'P': 'P',
    'PEQUENO': 'P',
    'M': 'M',
    'MEDIO': 'M',
    'MÉDIO': 'M',
    'G': 'G',
    'GRANDE': 'G',
    'XG': 'XG',
    'EXTRA GRANDE': 'XG',
    'XXG': 'XXG',
    'GERIATRICA P': 'geriatrica_P',
    'GERIÁTRICA P': 'geriatrica_P',
    'GER P': 'geriatrica_P',
    'GERIATRICA M': 'geriatrica_M',
    'GERIÁTRICA M': 'geriatrica_M',
    'GER M': 'geriatrica_M',
    'GERIATRICA G': 'geriatrica_G',
    'GERIÁTRICA G': 'geriatrica_G',
    'GER G': 'geriatrica_G',
    'GERIATRICA XG': 'geriatrica_XG',
    'GERIÁTRICA XG': 'geriatrica_XG',
    'GER XG': 'geriatrica_XG',
  };

  return sizeMap[normalized] || (VALID_SIZES.includes(normalized) ? normalized : null);
}

function validateCPF(cpf: string): boolean {
  const cleaned = cpf.replace(/\D/g, '');
  if (cleaned.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cleaned)) return false;
  
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned[i]) * (10 - i);
  }
  let digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;
  if (digit !== parseInt(cleaned[9])) return false;
  
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleaned[i]) * (11 - i);
  }
  digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;
  return digit === parseInt(cleaned[10]);
}

function validateNIS(nis: string): boolean {
  const cleaned = nis.replace(/\D/g, '');
  if (cleaned.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cleaned)) return false;
  
  const weights = [3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleaned[i]) * weights[i];
  }
  const remainder = sum % 11;
  const checkDigit = remainder < 2 ? 0 : 11 - remainder;
  return checkDigit === parseInt(cleaned[10]);
}

export function validateCsvFormat(csvContent: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!csvContent || csvContent.trim().length === 0) {
    errors.push('Arquivo CSV vazio');
    return { valid: false, errors };
  }

  const lines = csvContent.trim().split('\n');
  if (lines.length < 2) {
    errors.push('CSV deve conter pelo menos cabeçalho e uma linha de dados');
    return { valid: false, errors };
  }

  const header = lines[0].toLowerCase().split(/[,;]/).map(h => h.trim().replace(/"/g, ''));
  
  const hasNomeColumn = header.some(h => h.includes('nome') || h.includes('beneficiario'));
  const hasTamanhoColumn = header.some(h => h.includes('tamanho') || h.includes('tam'));
  const hasQtdColumn = header.some(h => h.includes('qtd') || h.includes('quantidade'));

  if (!hasNomeColumn) {
    errors.push('Coluna "nome" ou "beneficiario" é obrigatória no cabeçalho');
  }
  if (!hasTamanhoColumn) {
    errors.push('Coluna "tamanho" ou "tam" é obrigatória no cabeçalho');
  }
  if (!hasQtdColumn) {
    errors.push('Coluna "quantidade" ou "qtd" é obrigatória no cabeçalho');
  }

  return { valid: errors.length === 0, errors };
}

export function parseCsvContent(csvContent: string): ParseResult {
  const formatValidation = validateCsvFormat(csvContent);
  if (!formatValidation.valid) {
    return { 
      validRows: [], 
      invalidRows: formatValidation.errors.map((error, i) => ({
        row: 0,
        field: 'formato',
        value: '',
        error
      })), 
      totalRows: 0 
    };
  }

  const lines = csvContent.trim().split('\n');
  const header = lines[0].toLowerCase().split(/[,;]/).map(h => h.trim().replace(/"/g, ''));
  
  const cpfIdx = header.findIndex(h => h.includes('cpf'));
  const nisIdx = header.findIndex(h => h.includes('nis'));
  const nomeIdx = header.findIndex(h => h.includes('nome') || h.includes('beneficiario'));
  const tamanhoIdx = header.findIndex(h => h.includes('tamanho') || h.includes('tam'));
  const qtdIdx = header.findIndex(h => h.includes('qtd') || h.includes('quantidade'));
  const telIdx = header.findIndex(h => h.includes('tel') || h.includes('fone') || h.includes('celular'));
  const endIdx = header.findIndex(h => h.includes('endereco') || h.includes('end') || h.includes('logradouro'));

  const validRows: CsvRow[] = [];
  const invalidRows: ValidationError[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = line.split(/[,;]/).map(v => v.trim().replace(/"/g, ''));
    const rowNum = i + 1;

    const nome = nomeIdx >= 0 ? values[nomeIdx]?.trim() : '';
    const cpf = cpfIdx >= 0 ? values[cpfIdx]?.replace(/\D/g, '') : '';
    const nis = nisIdx >= 0 ? values[nisIdx]?.trim() : '';
    const tamanhoRaw = tamanhoIdx >= 0 ? values[tamanhoIdx]?.trim() : '';
    const qtdRaw = qtdIdx >= 0 ? values[qtdIdx]?.trim() : '';
    const telefone = telIdx >= 0 ? values[telIdx]?.trim() : '';
    const endereco = endIdx >= 0 ? values[endIdx]?.trim() : '';

    let hasError = false;

    if (!nome) {
      invalidRows.push({ row: rowNum, field: 'nome', value: nome, error: 'Nome é obrigatório' });
      hasError = true;
    }

    if (cpf && !validateCPF(cpf)) {
      invalidRows.push({ row: rowNum, field: 'cpf', value: cpf, error: 'CPF inválido' });
      hasError = true;
    }

    const nisCleaned = nis.replace(/\D/g, '');
    if (nisCleaned && !validateNIS(nisCleaned)) {
      invalidRows.push({ row: rowNum, field: 'nis', value: nis, error: 'NIS inválido (deve ter 11 dígitos com dígito verificador correto)' });
      hasError = true;
    }

    const tamanho = normalizeSize(tamanhoRaw);
    if (!tamanho) {
      invalidRows.push({ row: rowNum, field: 'tamanho', value: tamanhoRaw, error: 'Tamanho de fralda inválido' });
      hasError = true;
    }

    const quantidade = parseInt(qtdRaw);
    if (isNaN(quantidade) || quantidade <= 0) {
      invalidRows.push({ row: rowNum, field: 'quantidade', value: qtdRaw, error: 'Quantidade deve ser um número positivo' });
      hasError = true;
    }

    if (!hasError && tamanho) {
      validRows.push({
        cpf: cpf || undefined,
        nis: nis || undefined,
        nome,
        tamanho,
        quantidade,
        telefone: telefone || undefined,
        endereco: endereco || undefined,
      });
    }
  }

  return {
    validRows,
    invalidRows,
    totalRows: lines.length - 1,
  };
}

export async function processMonthlyList(
  listId: string,
  unitId: string,
  userId: string
): Promise<{ requestsCreated: number; authorizationsCreated: number; errors: string[] }> {
  const list = await storage.getDiaperMonthlyListById(listId);
  if (!list || !list.csvContent) {
    throw new Error('Lista não encontrada ou sem conteúdo CSV');
  }

  const { validRows } = parseCsvContent(list.csvContent);
  
  let requestsCreated = 0;
  let authorizationsCreated = 0;
  const errors: string[] = [];

  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const validUntil = new Date(periodEnd);
  validUntil.setMonth(validUntil.getMonth() + 1);

  for (const row of validRows) {
    try {
      let beneficiary = row.cpf ? await storage.getSaBeneficiaryByCpf(row.cpf) : null;
      
      if (!beneficiary) {
        beneficiary = await storage.createSaBeneficiary({
          name: row.nome,
          cpf: row.cpf || null,
          nis: row.nis || null,
          phone: row.telefone || null,
          address: row.endereco || null,
          unitId,
          recommendedSize: row.tamanho as any,
        });
      }

      const requestNumber = await storage.generateDiaperRequestNumber();
      const request = await storage.createDiaperRequest({
        beneficiaryId: beneficiary.id,
        unitId,
        requestNumber,
        diaperSize: row.tamanho as any,
        quantityRequested: row.quantidade,
        periodStart,
        periodEnd,
        requestedById: userId,
        requestType: 'lista_mensal',
        monthlyListId: listId,
        status: 'autorizado',
      });
      requestsCreated++;

      const authNumber = await storage.generateDiaperAuthorizationNumber();
      await storage.createDiaperAuthorization({
        requestId: request.id,
        beneficiaryId: beneficiary.id,
        unitId,
        authorizationNumber: authNumber,
        diaperSize: row.tamanho as any,
        quantityAuthorized: row.quantidade,
        periodStart,
        periodEnd,
        validUntil,
        issuedById: userId,
        issuedAt: new Date(),
        authorizationType: 'batch',
      });
      authorizationsCreated++;

    } catch (error: any) {
      errors.push(`Erro ao processar ${row.nome}: ${error.message}`);
    }
  }

  await storage.updateDiaperMonthlyList(listId, {
    processingStatus: errors.length === 0 ? 'concluido' : 'erro',
    processingCompletedAt: new Date(),
    validRecords: requestsCreated,
    invalidRecords: errors.length,
  });

  return { requestsCreated, authorizationsCreated, errors };
}

export async function generateAuthorizationPDF(authorizationId: string): Promise<Buffer> {
  const auth = await storage.getDiaperAuthorizationById(authorizationId);
  if (!auth) throw new Error('Autorização não encontrada');

  const beneficiary = await storage.getSaBeneficiaryById(auth.beneficiaryId);
  if (!beneficiary) throw new Error('Beneficiário não encontrado');

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('AUTORIZAÇÃO PARA RETIRADA DE FRALDAS', pageWidth / 2, 20, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Secretaria Municipal de Assistência Social', pageWidth / 2, 28, { align: 'center' });
  doc.text('Cardeal da Silva - Bahia', pageWidth / 2, 33, { align: 'center' });

  doc.line(20, 40, pageWidth - 20, 40);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`Autorização Nº: ${auth.authorizationNumber}`, 20, 50);

  doc.setFont('helvetica', 'normal');
  doc.text(`Data de Emissão: ${new Date(auth.issuedAt).toLocaleDateString('pt-BR')}`, pageWidth - 70, 50);

  const sizeLabels: Record<string, string> = {
    'RN': 'Recém-Nascido (RN)',
    'P': 'Pequeno (P)',
    'M': 'Médio (M)',
    'G': 'Grande (G)',
    'XG': 'Extra Grande (XG)',
    'XXG': 'Extra Extra Grande (XXG)',
    'geriatrica_P': 'Geriátrica P',
    'geriatrica_M': 'Geriátrica M',
    'geriatrica_G': 'Geriátrica G',
    'geriatrica_XG': 'Geriátrica XG',
  };

  autoTable(doc, {
    startY: 60,
    head: [['DADOS DO BENEFICIÁRIO']],
    body: [
      [`Nome: ${beneficiary.name}`],
      [`CPF: ${beneficiary.cpf || 'Não informado'}  |  NIS: ${beneficiary.nis || 'Não informado'}`],
      [`Endereço: ${beneficiary.address || 'Não informado'}`],
      [`Telefone: ${beneficiary.phone || 'Não informado'}`],
    ],
    theme: 'plain',
    styles: { fontSize: 10, cellPadding: 3 },
    headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
  });

  const finalY1 = (doc as any).lastAutoTable.finalY + 10;

  autoTable(doc, {
    startY: finalY1,
    head: [['DETALHES DA AUTORIZAÇÃO']],
    body: [
      [`Tamanho: ${sizeLabels[auth.diaperSize] || auth.diaperSize}`],
      [`Quantidade Autorizada: ${auth.quantityAuthorized} unidades`],
      [`Período de Vigência: ${new Date(auth.periodStart).toLocaleDateString('pt-BR')} a ${new Date(auth.periodEnd).toLocaleDateString('pt-BR')}`],
      [`Válido até: ${auth.validUntil ? new Date(auth.validUntil).toLocaleDateString('pt-BR') : 'Não definido'}`],
    ],
    theme: 'plain',
    styles: { fontSize: 10, cellPadding: 3 },
    headStyles: { fillColor: [39, 174, 96], textColor: 255, fontStyle: 'bold' },
  });

  const finalY2 = (doc as any).lastAutoTable.finalY + 20;

  doc.setFontSize(9);
  doc.text('OBSERVAÇÕES:', 20, finalY2);
  doc.text('1. Esta autorização é pessoal e intransferível.', 20, finalY2 + 6);
  doc.text('2. A retirada deve ser feita pelo beneficiário ou responsável legal.', 20, finalY2 + 12);
  doc.text('3. Apresentar documento de identificação com foto no momento da retirada.', 20, finalY2 + 18);
  doc.text('4. Em caso de perda, procure a Secretaria de Assistência Social.', 20, finalY2 + 24);

  const signY = finalY2 + 50;
  doc.line(40, signY, 100, signY);
  doc.text('Responsável pela Emissão', 50, signY + 5);

  doc.line(120, signY, 180, signY);
  doc.text('Carimbo/Assinatura', 135, signY + 5);

  doc.setFontSize(8);
  doc.text(`Documento gerado em ${new Date().toLocaleString('pt-BR')}`, pageWidth / 2, 285, { align: 'center' });

  return Buffer.from(doc.output('arraybuffer'));
}

export async function generateDeliveryReceiptPDF(deliveryId: string): Promise<Buffer> {
  const delivery = await storage.getDiaperDeliveryById(deliveryId);
  if (!delivery) throw new Error('Entrega não encontrada');

  const beneficiary = await storage.getSaBeneficiaryById(delivery.beneficiaryId);
  if (!beneficiary) throw new Error('Beneficiário não encontrado');

  const authorization = await storage.getDiaperAuthorizationById(delivery.authorizationId);

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('COMPROVANTE DE ENTREGA DE FRALDAS', pageWidth / 2, 20, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Secretaria Municipal de Assistência Social', pageWidth / 2, 28, { align: 'center' });
  doc.text('Cardeal da Silva - Bahia', pageWidth / 2, 33, { align: 'center' });

  doc.line(20, 40, pageWidth - 20, 40);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`Entrega Nº: ${delivery.deliveryNumber}`, 20, 50);
  doc.setFont('helvetica', 'normal');
  doc.text(`Data: ${new Date(delivery.deliveredAt).toLocaleDateString('pt-BR')}`, pageWidth - 60, 50);

  const sizeLabels: Record<string, string> = {
    'RN': 'Recém-Nascido (RN)',
    'P': 'Pequeno (P)',
    'M': 'Médio (M)',
    'G': 'Grande (G)',
    'XG': 'Extra Grande (XG)',
    'XXG': 'Extra Extra Grande (XXG)',
    'geriatrica_P': 'Geriátrica P',
    'geriatrica_M': 'Geriátrica M',
    'geriatrica_G': 'Geriátrica G',
    'geriatrica_XG': 'Geriátrica XG',
  };

  autoTable(doc, {
    startY: 60,
    head: [['BENEFICIÁRIO', 'PRODUTO', 'QUANTIDADE']],
    body: [
      [
        `${beneficiary.name}\nCPF: ${beneficiary.cpf || '-'}`,
        `Fraldas ${sizeLabels[delivery.diaperSize] || delivery.diaperSize}`,
        `${delivery.quantityDelivered} unidades`,
      ],
    ],
    theme: 'striped',
    styles: { fontSize: 10, cellPadding: 5 },
    headStyles: { fillColor: [41, 128, 185], textColor: 255 },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { cellWidth: 60 },
      2: { cellWidth: 40 },
    },
  });

  const finalY1 = (doc as any).lastAutoTable.finalY + 10;

  if (authorization) {
    autoTable(doc, {
      startY: finalY1,
      head: [['REFERÊNCIA']],
      body: [
        [`Autorização: ${authorization.authorizationNumber}`],
        [`Período: ${new Date(authorization.periodStart).toLocaleDateString('pt-BR')} a ${new Date(authorization.periodEnd).toLocaleDateString('pt-BR')}`],
      ],
      theme: 'plain',
      styles: { fontSize: 9 },
      headStyles: { fillColor: [149, 165, 166], textColor: 255 },
    });
  }

  const finalY2 = (doc as any).lastAutoTable.finalY + 15;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('RECEBEDOR:', 20, finalY2);
  doc.setFont('helvetica', 'normal');
  doc.text(`Nome: ${delivery.receivedByName}`, 20, finalY2 + 7);
  doc.text(`CPF/Documento: ${delivery.receivedByCpf || 'Não informado'}`, 20, finalY2 + 14);

  const signY = finalY2 + 40;
  doc.line(30, signY, 100, signY);
  doc.text('Assinatura do Recebedor', 45, signY + 5);

  doc.line(120, signY, 190, signY);
  doc.text('Assinatura do Funcionário', 135, signY + 5);

  doc.setFontSize(9);
  doc.text('Declaro ter recebido os itens descritos acima em perfeito estado.', pageWidth / 2, signY + 20, { align: 'center' });

  doc.setFontSize(8);
  doc.text(`Documento gerado em ${new Date().toLocaleString('pt-BR')}`, pageWidth / 2, 285, { align: 'center' });

  return Buffer.from(doc.output('arraybuffer'));
}

export async function generateDonationTermPDF(authorizationId: string): Promise<Buffer> {
  const auth = await storage.getDiaperAuthorizationById(authorizationId);
  if (!auth) throw new Error('Autorização não encontrada');

  const beneficiary = await storage.getSaBeneficiaryById(auth.beneficiaryId);
  if (!beneficiary) throw new Error('Beneficiário não encontrado');

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('TERMO DE DOAÇÃO DE FRALDAS', pageWidth / 2, 20, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Secretaria Municipal de Assistência Social', pageWidth / 2, 28, { align: 'center' });
  doc.text('Cardeal da Silva - Bahia', pageWidth / 2, 33, { align: 'center' });

  doc.line(20, 40, pageWidth - 20, 40);

  const sizeLabels: Record<string, string> = {
    'RN': 'Recém-Nascido (RN)',
    'P': 'Pequeno (P)',
    'M': 'Médio (M)',
    'G': 'Grande (G)',
    'XG': 'Extra Grande (XG)',
    'XXG': 'Extra Extra Grande (XXG)',
    'geriatrica_P': 'Geriátrica P',
    'geriatrica_M': 'Geriátrica M',
    'geriatrica_G': 'Geriátrica G',
    'geriatrica_XG': 'Geriátrica XG',
  };

  const text1 = `A Secretaria Municipal de Assistência Social de Cardeal da Silva - BA, no uso de suas atribuições legais, vem por meio deste TERMO DE DOAÇÃO, conceder ao(a) beneficiário(a):`;

  doc.setFontSize(11);
  const lines1 = doc.splitTextToSize(text1, pageWidth - 40);
  doc.text(lines1, 20, 50);

  const y1 = 50 + (lines1.length * 6) + 10;

  doc.setFont('helvetica', 'bold');
  doc.text(`Nome: ${beneficiary.name}`, 20, y1);
  doc.text(`CPF: ${beneficiary.cpf || 'Não informado'}`, 20, y1 + 7);
  doc.text(`NIS: ${beneficiary.nis || 'Não informado'}`, 20, y1 + 14);

  const y2 = y1 + 30;
  doc.setFont('helvetica', 'normal');
  const text2 = `A doação de ${auth.quantityAuthorized} (${extenso(auth.quantityAuthorized)}) unidades de fraldas descartáveis, tamanho ${sizeLabels[auth.diaperSize] || auth.diaperSize}, para uso exclusivo do beneficiário ou pessoa sob sua responsabilidade.`;
  
  const lines2 = doc.splitTextToSize(text2, pageWidth - 40);
  doc.text(lines2, 20, y2);

  const y3 = y2 + (lines2.length * 6) + 15;
  doc.setFont('helvetica', 'bold');
  doc.text('CONDIÇÕES:', 20, y3);
  doc.setFont('helvetica', 'normal');
  
  const conditions = [
    '1. Este benefício é de caráter social e gratuito, destinado exclusivamente a famílias em situação de vulnerabilidade social.',
    '2. É vedada a comercialização ou transferência a terceiros dos itens recebidos.',
    '3. O beneficiário compromete-se a utilizar os produtos para os fins destinados.',
    '4. A concessão deste benefício não implica em direito adquirido para períodos futuros.',
    '5. O descumprimento das condições acima poderá acarretar a suspensão do benefício.',
  ];

  let yPos = y3 + 10;
  for (const condition of conditions) {
    const condLines = doc.splitTextToSize(condition, pageWidth - 45);
    doc.text(condLines, 25, yPos);
    yPos += condLines.length * 5 + 3;
  }

  const y4 = yPos + 15;
  doc.text(`Cardeal da Silva - BA, ${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}.`, pageWidth / 2, y4, { align: 'center' });

  const signY = y4 + 30;
  doc.line(30, signY, 90, signY);
  doc.text('Beneficiário/Responsável', 40, signY + 5);

  doc.line(120, signY, 180, signY);
  doc.text('Secretaria de Assistência Social', 125, signY + 5);

  doc.setFontSize(8);
  doc.text(`Ref: ${auth.authorizationNumber}`, 20, 285);
  doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, pageWidth - 20, 285, { align: 'right' });

  return Buffer.from(doc.output('arraybuffer'));
}

function extenso(num: number): string {
  const unidades = ['', 'uma', 'duas', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
  const dezenas = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
  const centenas = ['', 'cento', 'duzentas', 'trezentas', 'quatrocentas', 'quinhentas', 'seiscentas', 'setecentas', 'oitocentas', 'novecentas'];

  if (num === 0) return 'zero';
  if (num === 100) return 'cem';
  if (num < 20) return unidades[num];
  if (num < 100) {
    const dezena = Math.floor(num / 10);
    const unidade = num % 10;
    return dezenas[dezena] + (unidade ? ' e ' + unidades[unidade] : '');
  }
  if (num < 1000) {
    const centena = Math.floor(num / 100);
    const resto = num % 100;
    return centenas[centena] + (resto ? ' e ' + extenso(resto) : '');
  }
  return num.toString();
}
