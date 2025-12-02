import type { Citizen, Professional, HealthUnit, TfdRequest, TfdTrip, TfdTripPassenger } from '@shared/schema';
import {
  generateBpaHeader,
  generateBpaILine,
  generateApacHeader,
  generateApacLine,
  formatDateSUS,
  formatCompetenciaSUS,
  padLeft,
  padRight,
  urgencyToCarater,
  genderToSUS,
  validateCNS,
  validateCPF,
} from './sus-validators';
import { calculateTFDValue, getProcedureByCodigo } from './sigtap-tfd';

export interface BpaExportConfig {
  competencia: Date;
  orgaoResponsavel: string;
  siglaOrgao: string;
  cgcCpf: string;
  orgaoDestino: string;
  destinoIndicador: 'M' | 'E';
  versao: string;
}

export interface TfdExportRecord {
  request: TfdRequest;
  citizen: Citizen;
  professional: Professional;
  unit: HealthUnit;
  trip?: TfdTrip | null;
  distanceKm?: number;
}

export interface BpaExportResult {
  content: string;
  filename: string;
  recordCount: number;
  sheetCount: number;
  errors: string[];
  warnings: string[];
}

export function generateBpaIExport(
  records: TfdExportRecord[],
  config: BpaExportConfig
): BpaExportResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const lines: string[] = [];
  
  let folha = 1;
  let sequencia = 1;
  const maxSequenciaPorFolha = 3;
  
  for (const record of records) {
    const { request, citizen, professional, unit, distanceKm = 100 } = record;
    
    if (!citizen.cns && !citizen.cpf) {
      errors.push(`Paciente ${citizen.name}: CNS ou CPF obrigatório`);
      continue;
    }
    
    if (citizen.cns && !validateCNS(citizen.cns)) {
      warnings.push(`Paciente ${citizen.name}: CNS inválido, usando CPF`);
    }
    
    const patientId = citizen.cns || citizen.cpf;
    const birthDate = new Date(citizen.birthDate);
    const age = Math.floor((new Date().getTime() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    
    const procedures = calculateTFDValue(distanceKm, request.companion || false, false);
    
    for (const proc of procedures.procedures) {
      const lineData = {
        cnes: unit.cnes,
        competencia: formatCompetenciaSUS(config.competencia),
        cnsProf: professional.cns || professional.cpf,
        cboProf: professional.cboCode || '225130',
        dataAtendimento: formatDateSUS(new Date(request.travelDate || request.createdAt)),
        folha,
        sequencia,
        procedimento: proc.codigo,
        cnsPaciente: patientId.replace(/\D/g, ''),
        sexo: genderToSUS(citizen.gender),
        ibgeMunicipio: '292460',
        cid: '',
        idade: age,
        quantidade: proc.quantidade,
        carater: urgencyToCarater(request.urgencyLevel),
        numeroAutorizacao: '',
        origem: 'BPA',
        nomePaciente: citizen.name.toUpperCase().slice(0, 30),
        dataNascimento: formatDateSUS(birthDate),
        raca: '99',
        etnia: '',
        nacionalidade: '010',
        cep: citizen.zipCode?.replace(/\D/g, '') || '',
      };
      
      lines.push(generateBpaILine(lineData));
      
      sequencia++;
      if (sequencia > maxSequenciaPorFolha) {
        sequencia = 1;
        folha++;
      }
    }
  }
  
  const header = generateBpaHeader({
    competencia: formatCompetenciaSUS(config.competencia),
    lineCount: lines.length,
    sheetCount: folha,
    orgaoResponsavel: config.orgaoResponsavel,
    siglaOrgao: config.siglaOrgao,
    cgcCpf: config.cgcCpf,
    orgaoDestino: config.orgaoDestino,
    destinoIndicador: config.destinoIndicador,
    versao: config.versao,
  });
  
  const content = header + lines.join('');
  
  const competenciaStr = formatCompetenciaSUS(config.competencia);
  const filename = `BPA_I_${config.siglaOrgao}_${competenciaStr}.txt`;
  
  return {
    content,
    filename,
    recordCount: lines.length,
    sheetCount: folha,
    errors,
    warnings,
  };
}

export interface ApacExportConfig {
  competencia: Date;
  orgaoResponsavel: string;
  siglaOrgao: string;
  cgcCpf: string;
  orgaoDestino: string;
  destinoIndicador: 'M' | 'E';
  versao: string;
  codUf: string;
}

export interface ApacExportRecord {
  request: TfdRequest;
  citizen: Citizen;
  professional: Professional;
  authorizer?: Professional;
  unit: HealthUnit;
  authorizationNumber: string;
  validityStart: Date;
  validityEnd: Date;
}

export interface ApacExportResult {
  content: string;
  filename: string;
  recordCount: number;
  errors: string[];
  warnings: string[];
}

export function generateApacExport(
  records: ApacExportRecord[],
  config: ApacExportConfig
): ApacExportResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const lines: string[] = [];
  
  for (const record of records) {
    const { request, citizen, professional, authorizer, unit, authorizationNumber, validityStart, validityEnd } = record;
    
    if (!citizen.cns && !citizen.cpf) {
      errors.push(`Paciente ${citizen.name}: CNS ou CPF obrigatório`);
      continue;
    }
    
    if (!request.justification) {
      errors.push(`Solicitação ${request.id}: Justificativa clínica obrigatória para APAC`);
      continue;
    }
    
    const birthDate = new Date(citizen.birthDate);
    
    const lineData: Parameters<typeof generateApacLine>[0] = {
      competencia: formatCompetenciaSUS(config.competencia),
      numeroApac: authorizationNumber,
      codUf: config.codUf,
      cnes: unit.cnes,
      dataProcessamento: formatDateSUS(new Date()),
      dataIniValidade: formatDateSUS(validityStart),
      dataFimValidade: formatDateSUS(validityEnd),
      tipoAtendimento: '01',
      tipoApac: '3',
      nomePaciente: citizen.name.toUpperCase().slice(0, 30),
      nomeMae: (citizen.motherName || '').toUpperCase().slice(0, 30),
      logradouro: (citizen.address || '').toUpperCase().slice(0, 30),
      numero: citizen.addressNumber || 'SN',
      complemento: citizen.addressComplement || '',
      cep: citizen.zipCode?.replace(/\D/g, '') || '',
      municipio: '2924605',
      dataNascimento: formatDateSUS(birthDate),
      sexo: genderToSUS(citizen.gender),
      nomeResponsavel: professional.name.toUpperCase().slice(0, 30),
      procedimentoPrincipal: request.procedureCode || '0803010125',
      motivoSaida: '15',
      dataObitoAlta: '',
      nomeAutorizador: authorizer?.name.toUpperCase().slice(0, 30) || '',
      cnsPaciente: (citizen.cns || citizen.cpf).replace(/\D/g, ''),
      cnsResponsavel: (professional.cns || professional.cpf).replace(/\D/g, ''),
      cnsAutorizador: (authorizer?.cns || authorizer?.cpf || '').replace(/\D/g, ''),
      cidCausas: '',
      numeroProntuario: '',
      cnesSolicitante: unit.cnes,
      dataSolicitacao: formatDateSUS(new Date(request.createdAt)),
      dataAutorizacao: request.approvedAt ? formatDateSUS(new Date(request.approvedAt)) : '',
      codigoEmissor: config.siglaOrgao,
      carater: urgencyToCarater(request.urgencyLevel),
      apacAnterior: '',
      raca: '99',
      nomeResponsavelPaciente: (citizen.responsibleName || citizen.motherName || '').toUpperCase().slice(0, 30),
      nacionalidade: '010',
      etnia: '',
      codigoLogradouro: '',
      bairro: (citizen.neighborhood || '').toUpperCase().slice(0, 30),
    };
    
    lines.push(generateApacLine(lineData));
  }
  
  const header = generateApacHeader({
    competencia: formatCompetenciaSUS(config.competencia),
    lineCount: lines.length,
    orgaoResponsavel: config.orgaoResponsavel,
    siglaOrgao: config.siglaOrgao,
    cgcCpf: config.cgcCpf,
    orgaoDestino: config.orgaoDestino,
    destinoIndicador: config.destinoIndicador,
    dataGeracao: formatDateSUS(new Date()),
    versao: config.versao,
  });
  
  const content = header + lines.join('');
  
  const competenciaStr = formatCompetenciaSUS(config.competencia);
  const filename = `APAC_${config.siglaOrgao}_${competenciaStr}.txt`;
  
  return {
    content,
    filename,
    recordCount: lines.length,
    errors,
    warnings,
  };
}

export interface TfdSummary {
  totalRequests: number;
  completedRequests: number;
  totalTrips: number;
  completedTrips: number;
  totalPassengers: number;
  totalKm: number;
  totalCost: number;
  procedureBreakdown: Array<{
    codigo: string;
    nome: string;
    quantidade: number;
    valorTotal: number;
  }>;
  monthlyBreakdown: Array<{
    month: string;
    requests: number;
    trips: number;
    km: number;
    cost: number;
  }>;
}

export function generateTfdSummaryReport(
  requests: TfdRequest[],
  trips: TfdTrip[],
  passengers: TfdTripPassenger[]
): TfdSummary {
  const summary: TfdSummary = {
    totalRequests: requests.length,
    completedRequests: requests.filter(r => r.status === 'completed').length,
    totalTrips: trips.length,
    completedTrips: trips.filter(t => t.status === 'concluida').length,
    totalPassengers: passengers.length,
    totalKm: trips.reduce((sum, t) => sum + (t.totalKm || 0), 0),
    totalCost: trips.reduce((sum, t) => sum + (t.totalCost || 0), 0),
    procedureBreakdown: [],
    monthlyBreakdown: [],
  };
  
  const procedureMap = new Map<string, { nome: string; quantidade: number; valorTotal: number }>();
  
  for (const req of requests) {
    const code = req.procedureCode || '0803010125';
    const proc = getProcedureByCodigo(code);
    if (proc) {
      const existing = procedureMap.get(code) || { nome: proc.nome, quantidade: 0, valorTotal: 0 };
      existing.quantidade += 1;
      existing.valorTotal += proc.valorTotal;
      procedureMap.set(code, existing);
    }
  }
  
  summary.procedureBreakdown = Array.from(procedureMap.entries()).map(([codigo, data]) => ({
    codigo,
    ...data,
  }));
  
  const monthMap = new Map<string, { requests: number; trips: number; km: number; cost: number }>();
  
  for (const req of requests) {
    const date = new Date(req.createdAt);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const existing = monthMap.get(monthKey) || { requests: 0, trips: 0, km: 0, cost: 0 };
    existing.requests += 1;
    monthMap.set(monthKey, existing);
  }
  
  for (const trip of trips) {
    const date = new Date(trip.scheduledDeparture);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const existing = monthMap.get(monthKey) || { requests: 0, trips: 0, km: 0, cost: 0 };
    existing.trips += 1;
    existing.km += trip.totalKm || 0;
    existing.cost += trip.totalCost || 0;
    monthMap.set(monthKey, existing);
  }
  
  summary.monthlyBreakdown = Array.from(monthMap.entries())
    .map(([month, data]) => ({ month, ...data }))
    .sort((a, b) => a.month.localeCompare(b.month));
  
  return summary;
}

export function generateTfdCsvExport(records: TfdExportRecord[]): string {
  const headers = [
    'ID Solicitação',
    'Data Solicitação',
    'Data Viagem',
    'Paciente',
    'CPF',
    'CNS',
    'Destino',
    'Motivo',
    'Procedimento',
    'Código SIGTAP',
    'Urgência',
    'Status',
    'Acompanhante',
    'Profissional Solicitante',
    'Unidade',
    'CNES',
  ];
  
  const rows = records.map(r => [
    r.request.id,
    new Date(r.request.createdAt).toLocaleDateString('pt-BR'),
    r.request.travelDate ? new Date(r.request.travelDate).toLocaleDateString('pt-BR') : '',
    r.citizen.name,
    r.citizen.cpf,
    r.citizen.cns || '',
    r.request.destination,
    r.request.reason,
    r.request.procedure || '',
    r.request.procedureCode || '',
    r.request.urgencyLevel,
    r.request.status,
    r.request.companion ? 'Sim' : 'Não',
    r.professional.name,
    r.unit.name,
    r.unit.cnes,
  ]);
  
  const csvContent = [
    headers.join(';'),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';')),
  ].join('\r\n');
  
  return csvContent;
}
