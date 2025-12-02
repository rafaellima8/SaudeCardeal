export const SUS_TFD_PROCEDURES = {
  TRANSPORTE_PACIENTE_TERRESTRE: '0803010125',
  TRANSPORTE_ACOMPANHANTE_TERRESTRE: '0803010109',
  AJUDA_CUSTO_PACIENTE_PERNOITE: '0803010010',
  AJUDA_CUSTO_PACIENTE_SEM_PERNOITE: '0803010028',
  AJUDA_CUSTO_ACOMPANHANTE_PERNOITE: '0803010044',
  AJUDA_CUSTO_ACOMPANHANTE_SEM_PERNOITE: '0803010052',
} as const;

export const RACA_COR_SUS = {
  '01': 'BRANCA',
  '02': 'PRETA',
  '03': 'PARDA',
  '04': 'AMARELA',
  '05': 'INDIGENA',
  '99': 'SEM INFORMACAO',
} as const;

export const CARATER_ATENDIMENTO_SUS = {
  '01': 'Eletivo',
  '02': 'Urgência',
  '03': 'Acidente no local de trabalho ou a serviço da empresa',
  '04': 'Acidente no trajeto para o trabalho',
  '05': 'Outros tipos de Acidente de Trânsito',
  '06': 'Outros tipos de Lesões e Envenenamentos',
} as const;

export const MOTIVO_SAIDA_PERMANENCIA = {
  '11': 'ALTA CURADO',
  '12': 'ALTA MELHORADO',
  '14': 'ALTA A PEDIDO',
  '15': 'ALTA COM PREVISAO DE RETORNO PARA ACOMPANHAMENTO DO PACIENTE',
  '16': 'ALTA POR EVASAO',
  '18': 'ALTA POR OUTROS MOTIVOS',
  '21': 'PERMANENCIA POR CARACTERISTICAS PROPRIAS DA DOENCA',
  '22': 'PERMANENCIA POR INTERCORRENCIA',
  '23': 'PERMANENCIA POR IMPOSSIBILIDADE SOCIO-FAMILIAR',
  '24': 'PERMANENCIA POR PROCESSO DE DOACAO DE ORGAOS, TECIDOS E CELULAS - DOADOR VIVO',
  '25': 'PERMANENCIA POR PROCESSO DE DOACAO DE ORGAOS, TECIDOS E CELULAS - DOADOR MORTO',
  '26': 'PERMANENCIA POR MUDANCA DE PROCEDIMENTO',
  '27': 'PERMANENCIA POR REOPERACAO',
  '28': 'PERMANENCIA POR OUTROS MOTIVOS',
  '31': 'TRANSFERIDO PARA OUTRO ESTABELECIMENTO',
  '41': 'OBITO COM DECLARACAO DE OBITO FORNECIDA PELO MEDICO ASSISTENTE',
  '42': 'OBITO COM DECLARACAO DE OBITO FORNECIDA PELO IML',
  '43': 'OBITO COM DECLARACAO DE OBITO FORNECIDA PELO SVO',
  '51': 'ENCERRAMENTO ADMINISTRATIVO',
  '61': 'ALTA DA MAE/PUERPERA E DO RECEM-NASCIDO',
  '62': 'ALTA DA MAE/PUERPERA E PERMANENCIA DO RECEM-NASCIDO',
  '63': 'ALTA DO RECEM-NASCIDO E PERMANENCIA DA MAE/PUERPERA',
  '64': 'ALTA DA MAE/PUERPERA COM OBITO DO RECEM-NASCIDO',
  '65': 'ALTA DO RECEM-NASCIDO COM OBITO DA MAE/PUERPERA',
  '66': 'ALTA DA MAE/PUERPERA COM TRANSFERENCIA DO RECEM-NASCIDO',
  '67': 'ALTA DO RECEM-NASCIDO E TRANSFERENCIA DA MAE/PUERPERA',
} as const;

export const NACIONALIDADES = {
  '010': 'BRASILEIRA',
  '020': 'NATURALIZADO BRASILEIRO',
  '021': 'ARGENTINO',
  '022': 'BOLIVIANO',
  '023': 'CHILENO',
  '024': 'PARAGUAIO',
  '025': 'URUGUAIO',
  '026': 'VENEZUELANO',
  '027': 'COLOMBIANO',
  '028': 'PERUANO',
  '029': 'EQUATORIANO',
  '030': 'ALEMAO',
  '031': 'BELGA',
  '032': 'BRITANICO',
  '034': 'CANADENSE',
  '035': 'ESPANHOL',
  '036': 'NORTE-AMERICANO (EUA)',
  '037': 'FRANCES',
  '038': 'SUICO',
  '039': 'ITALIANO',
  '040': 'HAITIANO',
  '041': 'JAPONES',
  '042': 'CHINES',
  '043': 'COREANO',
  '044': 'RUSSO',
  '045': 'PORTUGUES',
  '046': 'PAQUISTANES',
  '047': 'INDIANO',
  '048': 'OUTROS LATINO-AMERICANOS',
  '049': 'OUTROS ASIATICOS',
  '050': 'OUTROS',
  '051': 'ANGOLANO',
  '060': 'AFRICANOS',
  '070': 'OUTROS EUROPEUS',
} as const;

export function validateCPF(cpf: string): boolean {
  const cleanCpf = cpf.replace(/\D/g, '');
  
  if (cleanCpf.length !== 11) return false;
  if (/^(\d)\1+$/.test(cleanCpf)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCpf[i]) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCpf[9])) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCpf[i]) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCpf[10])) return false;

  return true;
}

export function validateCNS(cns: string): boolean {
  const cleanCns = cns.replace(/\D/g, '');
  
  if (cleanCns.length !== 15) return false;

  const firstDigit = cleanCns[0];
  
  if (['1', '2'].includes(firstDigit)) {
    let sum = 0;
    for (let i = 0; i < 11; i++) {
      sum += parseInt(cleanCns[i]) * (15 - i);
    }
    const remainder = sum % 11;
    const dv = remainder === 0 ? 0 : 11 - remainder;
    
    if (dv === 10) {
      sum = 0;
      for (let i = 0; i < 11; i++) {
        sum += parseInt(cleanCns[i]) * (15 - i);
      }
      sum += 2;
      const newRemainder = sum % 11;
      const newDv = newRemainder === 0 ? 0 : 11 - newRemainder;
      return newDv === parseInt(cleanCns.slice(11));
    }
    
    return dv.toString().padStart(4, '0') === cleanCns.slice(11);
  }
  
  if (['7', '8', '9'].includes(firstDigit)) {
    let sum = 0;
    for (let i = 0; i < 15; i++) {
      sum += parseInt(cleanCns[i]) * (15 - i);
    }
    return sum % 11 === 0;
  }

  return false;
}

export function validateIBGECode(code: string): boolean {
  const cleanCode = code.replace(/\D/g, '');
  return cleanCode.length === 6 || cleanCode.length === 7;
}

export function validateCID10(cid: string): boolean {
  const pattern = /^[A-Z]\d{2}(\.\d{1,2})?$/i;
  return pattern.test(cid.toUpperCase());
}

export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

export function formatDateSUS(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

export function formatCompetenciaSUS(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}${month}`;
}

export function padLeft(value: string | number, length: number, char: string = '0'): string {
  return String(value).padStart(length, char);
}

export function padRight(value: string, length: number, char: string = ' '): string {
  return String(value).padEnd(length, char).slice(0, length);
}

export function calculateCNESDigit(cnes: string): string {
  const cleanCnes = cnes.replace(/\D/g, '').slice(0, 6);
  if (cleanCnes.length !== 6) return '';
  
  const weights = [2, 3, 4, 5, 6, 7];
  let sum = 0;
  
  for (let i = 5; i >= 0; i--) {
    sum += parseInt(cleanCnes[i]) * weights[5 - i];
  }
  
  const remainder = sum % 11;
  const digit = remainder < 2 ? 0 : 11 - remainder;
  
  return cleanCnes + digit;
}

export function generateBPAControlSum(lineCount: number): string {
  const base = 1111;
  const increment = Math.floor(lineCount / 100);
  return String(Math.min(base + increment, 2221)).padStart(4, '0');
}

export interface TfdValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateTfdRequestForSUS(data: {
  citizenCpf?: string;
  citizenCns?: string;
  destinationIbge?: string;
  procedureCode?: string;
  cid?: string;
  companion?: boolean;
  companionJustification?: string;
  urgencyLevel?: string;
  distanceKm?: number;
}): TfdValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!data.citizenCpf && !data.citizenCns) {
    errors.push('CNS ou CPF do paciente é obrigatório');
  } else {
    if (data.citizenCpf && !validateCPF(data.citizenCpf)) {
      errors.push('CPF do paciente inválido');
    }
    if (data.citizenCns && !validateCNS(data.citizenCns)) {
      errors.push('CNS do paciente inválido');
    }
    if (data.citizenCpf && data.citizenCns) {
      warnings.push('Apenas CNS ou CPF deve ser informado, não ambos (prioridade CNS)');
    }
  }

  if (data.destinationIbge && !validateIBGECode(data.destinationIbge)) {
    errors.push('Código IBGE do município de destino inválido');
  }

  if (data.procedureCode && !/^\d{10}$/.test(data.procedureCode)) {
    errors.push('Código do procedimento SIGTAP inválido (deve ter 10 dígitos)');
  }

  if (data.cid && !validateCID10(data.cid)) {
    errors.push('CID-10 inválido');
  }

  if (data.companion && !data.companionJustification) {
    errors.push('Justificativa para acompanhante é obrigatória');
  }

  if (data.distanceKm !== undefined && data.distanceKm < 50) {
    warnings.push('Distância inferior a 50km pode não ser elegível para TFD');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export interface BpaILineData {
  cnes: string;
  competencia: string;
  cnsProf: string;
  cboProf: string;
  dataAtendimento: string;
  folha: number;
  sequencia: number;
  procedimento: string;
  cnsPaciente: string;
  sexo: string;
  ibgeMunicipio: string;
  cid: string;
  idade: number;
  quantidade: number;
  carater: string;
  numeroAutorizacao: string;
  origem: string;
  nomePaciente: string;
  dataNascimento: string;
  raca: string;
  etnia: string;
  nacionalidade: string;
  cep: string;
}

export function generateBpaILine(data: BpaILineData): string {
  const line: string[] = [];
  
  line.push('03');
  line.push(padLeft(data.cnes, 7));
  line.push(padLeft(data.competencia, 6));
  line.push(padLeft(data.cnsProf, 15));
  line.push(padRight(data.cboProf, 6));
  line.push(padLeft(data.dataAtendimento, 8));
  line.push(padLeft(data.folha, 3));
  line.push(padLeft(data.sequencia, 2));
  line.push(padLeft(data.procedimento, 10));
  line.push(padLeft(data.cnsPaciente, 15));
  line.push(padRight(data.sexo, 1));
  line.push(padLeft(data.ibgeMunicipio, 6));
  line.push(padRight(data.cid || '', 4));
  line.push(padLeft(data.idade, 3));
  line.push(padLeft(data.quantidade, 6));
  line.push(padLeft(data.carater, 2));
  line.push(padRight(data.numeroAutorizacao || '', 13));
  line.push(padRight(data.origem || 'BPA', 3));
  line.push(padRight(data.nomePaciente, 30));
  line.push(padLeft(data.dataNascimento, 8));
  line.push(padLeft(data.raca || '99', 2));
  line.push(padLeft(data.etnia || '', 4));
  line.push(padLeft(data.nacionalidade || '010', 3));
  
  return line.join('') + '\r\n';
}

export function generateBpaHeader(data: {
  competencia: string;
  lineCount: number;
  sheetCount: number;
  orgaoResponsavel: string;
  siglaOrgao: string;
  cgcCpf: string;
  orgaoDestino: string;
  destinoIndicador: 'M' | 'E';
  versao: string;
}): string {
  const line: string[] = [];
  
  line.push('01');
  line.push('#BPA#');
  line.push(padLeft(data.competencia, 6));
  line.push(padLeft(data.lineCount, 6));
  line.push(padLeft(data.sheetCount, 6));
  line.push(generateBPAControlSum(data.lineCount));
  line.push(padRight(data.orgaoResponsavel, 30));
  line.push(padRight(data.siglaOrgao, 6));
  line.push(padLeft(data.cgcCpf, 14));
  line.push(padRight(data.orgaoDestino, 40));
  line.push(data.destinoIndicador);
  line.push(padRight(data.versao, 10));
  
  return line.join('') + '\r\n';
}

export interface ApacLineData {
  competencia: string;
  numeroApac: string;
  codUf: string;
  cnes: string;
  dataProcessamento: string;
  dataIniValidade: string;
  dataFimValidade: string;
  tipoAtendimento: string;
  tipoApac: '1' | '2' | '3';
  nomePaciente: string;
  nomeMae: string;
  logradouro: string;
  numero: string;
  complemento: string;
  cep: string;
  municipio: string;
  dataNascimento: string;
  sexo: string;
  nomeResponsavel: string;
  procedimentoPrincipal: string;
  motivoSaida: string;
  dataObitoAlta: string;
  nomeAutorizador: string;
  cnsPaciente: string;
  cnsResponsavel: string;
  cnsAutorizador: string;
  cidCausas: string;
  numeroProntuario: string;
  cnesSolicitante: string;
  dataSolicitacao: string;
  dataAutorizacao: string;
  codigoEmissor: string;
  carater: string;
  apacAnterior: string;
  raca: string;
  nomeResponsavelPaciente: string;
  nacionalidade: string;
  etnia: string;
  codigoLogradouro: string;
  bairro: string;
}

export function generateApacLine(data: ApacLineData): string {
  const line: string[] = [];
  
  line.push('14');
  line.push(padLeft(data.competencia, 6));
  line.push(padLeft(data.numeroApac, 13));
  line.push(padLeft(data.codUf, 2));
  line.push(padLeft(data.cnes, 7));
  line.push(padLeft(data.dataProcessamento, 8));
  line.push(padLeft(data.dataIniValidade, 8));
  line.push(padLeft(data.dataFimValidade, 8));
  line.push(padLeft(data.tipoAtendimento, 2));
  line.push(data.tipoApac);
  line.push(padRight(data.nomePaciente, 30));
  line.push(padRight(data.nomeMae, 30));
  line.push(padRight(data.logradouro, 30));
  line.push(padRight(data.numero, 5));
  line.push(padRight(data.complemento || '', 10));
  line.push(padLeft(data.cep, 8));
  line.push(padLeft(data.municipio, 7));
  line.push(padLeft(data.dataNascimento, 8));
  line.push(data.sexo);
  line.push(padRight(data.nomeResponsavel, 30));
  line.push(padLeft(data.procedimentoPrincipal, 10));
  line.push(padLeft(data.motivoSaida, 2));
  line.push(padRight(data.dataObitoAlta || '', 8));
  line.push(padRight(data.nomeAutorizador, 30));
  line.push(padLeft(data.cnsPaciente, 15));
  line.push(padLeft(data.cnsResponsavel, 15));
  line.push(padLeft(data.cnsAutorizador, 15));
  line.push(padRight(data.cidCausas || '', 4));
  line.push(padRight(data.numeroProntuario || '', 10));
  line.push(padRight(data.cnesSolicitante || '', 7));
  line.push(padLeft(data.dataSolicitacao, 8));
  line.push(padLeft(data.dataAutorizacao, 8));
  line.push(padRight(data.codigoEmissor, 10));
  line.push(padLeft(data.carater, 2));
  line.push(padRight(data.apacAnterior || '', 13));
  line.push(padLeft(data.raca || '99', 2));
  line.push(padRight(data.nomeResponsavelPaciente, 30));
  line.push(padLeft(data.nacionalidade || '010', 3));
  line.push(padLeft(data.etnia || '', 4));
  line.push(padRight(data.codigoLogradouro || '', 3));
  line.push(padRight(data.bairro || '', 30));
  
  return line.join('') + '\r\n';
}

export function generateApacHeader(data: {
  competencia: string;
  lineCount: number;
  orgaoResponsavel: string;
  siglaOrgao: string;
  cgcCpf: string;
  orgaoDestino: string;
  destinoIndicador: 'M' | 'E';
  dataGeracao: string;
  versao: string;
}): string {
  const line: string[] = [];
  
  line.push('01');
  line.push('#APAC');
  line.push(padLeft(data.competencia, 6));
  line.push(padLeft(data.lineCount, 6));
  line.push(generateBPAControlSum(data.lineCount));
  line.push(padRight(data.orgaoResponsavel, 30));
  line.push(padRight(data.siglaOrgao, 6));
  line.push(padLeft(data.cgcCpf, 14));
  line.push(padRight(data.orgaoDestino, 40));
  line.push(data.destinoIndicador);
  line.push(padLeft(data.dataGeracao, 8));
  line.push(padRight(data.versao, 15));
  
  return line.join('') + '\r\n';
}

export function urgencyToCarater(urgency: string): string {
  switch (urgency) {
    case 'eletivo': return '01';
    case 'urgente': return '02';
    case 'emergencia': return '02';
    default: return '01';
  }
}

export function genderToSUS(gender: string): string {
  switch (gender?.toUpperCase()) {
    case 'M': return 'M';
    case 'F': return 'F';
    default: return 'I';
  }
}
