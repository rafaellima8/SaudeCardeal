export interface SigtapProcedure {
  codigo: string;
  nome: string;
  grupo: string;
  subgrupo: string;
  formaOrganizacao: string;
  valorSH: number;
  valorSP: number;
  valorTotal: number;
  instrumentoRegistro: 'BPA-I' | 'BPA-C' | 'APAC';
  requerApac: boolean;
  sexo: 'M' | 'F' | 'A';
  idadeMinima: number;
  idadeMaxima: number;
  cbo: string[];
  modalidade: string;
  descricao: string;
}

export const SIGTAP_TFD_CATALOG: SigtapProcedure[] = [
  {
    codigo: '0803010125',
    nome: 'UNIDADE DE REMUNERACAO PARA DESLOCAMENTO DE PACIENTE POR TRANSPORTE TERRESTRE',
    grupo: '08 - ACOES COMPLEMENTARES DA ATENCAO A SAUDE',
    subgrupo: '03 - TRATAMENTO FORA DE DOMICILIO',
    formaOrganizacao: '01 - DESLOCAMENTO/AJUDA DE CUSTO',
    valorSH: 0,
    valorSP: 0.48,
    valorTotal: 0.48,
    instrumentoRegistro: 'BPA-I',
    requerApac: false,
    sexo: 'A',
    idadeMinima: 0,
    idadeMaxima: 130,
    cbo: ['225125', '225130', '225133', '225135', '225140', '225142', '225145', '225150', '225155'],
    modalidade: 'TERRESTRE',
    descricao: 'Cada 50km de distância percorrida para deslocamento de paciente.',
  },
  {
    codigo: '0803010109',
    nome: 'UNIDADE DE REMUNERACAO PARA DESLOCAMENTO DE ACOMPANHANTE POR TRANSPORTE TERRESTRE',
    grupo: '08 - ACOES COMPLEMENTARES DA ATENCAO A SAUDE',
    subgrupo: '03 - TRATAMENTO FORA DE DOMICILIO',
    formaOrganizacao: '01 - DESLOCAMENTO/AJUDA DE CUSTO',
    valorSH: 0,
    valorSP: 0.48,
    valorTotal: 0.48,
    instrumentoRegistro: 'BPA-I',
    requerApac: false,
    sexo: 'A',
    idadeMinima: 0,
    idadeMaxima: 130,
    cbo: ['225125', '225130', '225133', '225135', '225140', '225142', '225145', '225150', '225155'],
    modalidade: 'TERRESTRE',
    descricao: 'Cada 50km de distância percorrida para deslocamento de acompanhante (quando indicado pelo médico assistente).',
  },
  {
    codigo: '0803010010',
    nome: 'AJUDA DE CUSTO PARA ALIMENTACAO/PERNOITE DE PACIENTE',
    grupo: '08 - ACOES COMPLEMENTARES DA ATENCAO A SAUDE',
    subgrupo: '03 - TRATAMENTO FORA DE DOMICILIO',
    formaOrganizacao: '01 - DESLOCAMENTO/AJUDA DE CUSTO',
    valorSH: 0,
    valorSP: 24.75,
    valorTotal: 24.75,
    instrumentoRegistro: 'BPA-I',
    requerApac: false,
    sexo: 'A',
    idadeMinima: 0,
    idadeMaxima: 130,
    cbo: ['225125', '225130', '225133', '225135', '225140', '225142', '225145', '225150', '225155'],
    modalidade: 'DIARIA',
    descricao: 'Ajuda de custo para alimentação e pernoite de paciente (quando necessário pernoitar).',
  },
  {
    codigo: '0803010028',
    nome: 'AJUDA DE CUSTO PARA ALIMENTACAO DE PACIENTE SEM PERNOITE',
    grupo: '08 - ACOES COMPLEMENTARES DA ATENCAO A SAUDE',
    subgrupo: '03 - TRATAMENTO FORA DE DOMICILIO',
    formaOrganizacao: '01 - DESLOCAMENTO/AJUDA DE CUSTO',
    valorSH: 0,
    valorSP: 8.25,
    valorTotal: 8.25,
    instrumentoRegistro: 'BPA-I',
    requerApac: false,
    sexo: 'A',
    idadeMinima: 0,
    idadeMaxima: 130,
    cbo: ['225125', '225130', '225133', '225135', '225140', '225142', '225145', '225150', '225155'],
    modalidade: 'ALIMENTACAO',
    descricao: 'Ajuda de custo para alimentação de paciente (sem pernoite).',
  },
  {
    codigo: '0803010044',
    nome: 'AJUDA DE CUSTO PARA ALIMENTACAO/PERNOITE DE ACOMPANHANTE',
    grupo: '08 - ACOES COMPLEMENTARES DA ATENCAO A SAUDE',
    subgrupo: '03 - TRATAMENTO FORA DE DOMICILIO',
    formaOrganizacao: '01 - DESLOCAMENTO/AJUDA DE CUSTO',
    valorSH: 0,
    valorSP: 24.75,
    valorTotal: 24.75,
    instrumentoRegistro: 'BPA-I',
    requerApac: false,
    sexo: 'A',
    idadeMinima: 0,
    idadeMaxima: 130,
    cbo: ['225125', '225130', '225133', '225135', '225140', '225142', '225145', '225150', '225155'],
    modalidade: 'DIARIA',
    descricao: 'Ajuda de custo para alimentação e pernoite de acompanhante (quando indicado pelo médico assistente e necessário pernoitar).',
  },
  {
    codigo: '0803010052',
    nome: 'AJUDA DE CUSTO PARA ALIMENTACAO DE ACOMPANHANTE SEM PERNOITE',
    grupo: '08 - ACOES COMPLEMENTARES DA ATENCAO A SAUDE',
    subgrupo: '03 - TRATAMENTO FORA DE DOMICILIO',
    formaOrganizacao: '01 - DESLOCAMENTO/AJUDA DE CUSTO',
    valorSH: 0,
    valorSP: 8.25,
    valorTotal: 8.25,
    instrumentoRegistro: 'BPA-I',
    requerApac: false,
    sexo: 'A',
    idadeMinima: 0,
    idadeMaxima: 130,
    cbo: ['225125', '225130', '225133', '225135', '225140', '225142', '225145', '225150', '225155'],
    modalidade: 'ALIMENTACAO',
    descricao: 'Ajuda de custo para alimentação de acompanhante (sem pernoite, quando indicado pelo médico assistente).',
  },
  {
    codigo: '0803010117',
    nome: 'UNIDADE DE REMUNERACAO PARA DESLOCAMENTO DE ACOMPANHANTE POR TRANSPORTE AEREO',
    grupo: '08 - ACOES COMPLEMENTARES DA ATENCAO A SAUDE',
    subgrupo: '03 - TRATAMENTO FORA DE DOMICILIO',
    formaOrganizacao: '01 - DESLOCAMENTO/AJUDA DE CUSTO',
    valorSH: 0,
    valorSP: 169.50,
    valorTotal: 169.50,
    instrumentoRegistro: 'BPA-I',
    requerApac: false,
    sexo: 'A',
    idadeMinima: 0,
    idadeMaxima: 130,
    cbo: ['225125', '225130', '225133', '225135', '225140', '225142', '225145', '225150', '225155'],
    modalidade: 'AEREO',
    descricao: 'Por trecho para deslocamento de acompanhante por transporte aéreo.',
  },
  {
    codigo: '0803010133',
    nome: 'UNIDADE DE REMUNERACAO PARA DESLOCAMENTO DE PACIENTE POR TRANSPORTE AEREO',
    grupo: '08 - ACOES COMPLEMENTARES DA ATENCAO A SAUDE',
    subgrupo: '03 - TRATAMENTO FORA DE DOMICILIO',
    formaOrganizacao: '01 - DESLOCAMENTO/AJUDA DE CUSTO',
    valorSH: 0,
    valorSP: 169.50,
    valorTotal: 169.50,
    instrumentoRegistro: 'BPA-I',
    requerApac: false,
    sexo: 'A',
    idadeMinima: 0,
    idadeMaxima: 130,
    cbo: ['225125', '225130', '225133', '225135', '225140', '225142', '225145', '225150', '225155'],
    modalidade: 'AEREO',
    descricao: 'Por trecho para deslocamento de paciente por transporte aéreo.',
  },
  {
    codigo: '0803010141',
    nome: 'UNIDADE DE REMUNERACAO PARA DESLOCAMENTO DE ACOMPANHANTE POR TRANSPORTE FLUVIAL',
    grupo: '08 - ACOES COMPLEMENTARES DA ATENCAO A SAUDE',
    subgrupo: '03 - TRATAMENTO FORA DE DOMICILIO',
    formaOrganizacao: '01 - DESLOCAMENTO/AJUDA DE CUSTO',
    valorSH: 0,
    valorSP: 8.50,
    valorTotal: 8.50,
    instrumentoRegistro: 'BPA-I',
    requerApac: false,
    sexo: 'A',
    idadeMinima: 0,
    idadeMaxima: 130,
    cbo: ['225125', '225130', '225133', '225135', '225140', '225142', '225145', '225150', '225155'],
    modalidade: 'FLUVIAL',
    descricao: 'Por hora navegada para deslocamento de acompanhante por transporte fluvial.',
  },
  {
    codigo: '0803010150',
    nome: 'UNIDADE DE REMUNERACAO PARA DESLOCAMENTO DE PACIENTE POR TRANSPORTE FLUVIAL',
    grupo: '08 - ACOES COMPLEMENTARES DA ATENCAO A SAUDE',
    subgrupo: '03 - TRATAMENTO FORA DE DOMICILIO',
    formaOrganizacao: '01 - DESLOCAMENTO/AJUDA DE CUSTO',
    valorSH: 0,
    valorSP: 8.50,
    valorTotal: 8.50,
    instrumentoRegistro: 'BPA-I',
    requerApac: false,
    sexo: 'A',
    idadeMinima: 0,
    idadeMaxima: 130,
    cbo: ['225125', '225130', '225133', '225135', '225140', '225142', '225145', '225150', '225155'],
    modalidade: 'FLUVIAL',
    descricao: 'Por hora navegada para deslocamento de paciente por transporte fluvial.',
  },
];

export function getProcedureByCodigo(codigo: string): SigtapProcedure | undefined {
  return SIGTAP_TFD_CATALOG.find(p => p.codigo === codigo);
}

export function getProceduresByModalidade(modalidade: string): SigtapProcedure[] {
  return SIGTAP_TFD_CATALOG.filter(p => p.modalidade === modalidade);
}

export function calculateTFDValue(distanceKm: number, hasCompanion: boolean, requiresOvernight: boolean): {
  procedures: Array<{ codigo: string; nome: string; quantidade: number; valorUnitario: number; valorTotal: number }>;
  totalValue: number;
} {
  const procedures: Array<{ codigo: string; nome: string; quantidade: number; valorUnitario: number; valorTotal: number }> = [];
  
  const units = Math.ceil(distanceKm / 50);
  
  const transportePaciente = getProcedureByCodigo('0803010125')!;
  procedures.push({
    codigo: transportePaciente.codigo,
    nome: transportePaciente.nome,
    quantidade: units * 2,
    valorUnitario: transportePaciente.valorTotal,
    valorTotal: units * 2 * transportePaciente.valorTotal,
  });
  
  if (hasCompanion) {
    const transporteAcompanhante = getProcedureByCodigo('0803010109')!;
    procedures.push({
      codigo: transporteAcompanhante.codigo,
      nome: transporteAcompanhante.nome,
      quantidade: units * 2,
      valorUnitario: transporteAcompanhante.valorTotal,
      valorTotal: units * 2 * transporteAcompanhante.valorTotal,
    });
  }
  
  if (requiresOvernight) {
    const alimentacaoPaciente = getProcedureByCodigo('0803010010')!;
    procedures.push({
      codigo: alimentacaoPaciente.codigo,
      nome: alimentacaoPaciente.nome,
      quantidade: 1,
      valorUnitario: alimentacaoPaciente.valorTotal,
      valorTotal: alimentacaoPaciente.valorTotal,
    });
    
    if (hasCompanion) {
      const alimentacaoAcompanhante = getProcedureByCodigo('0803010044')!;
      procedures.push({
        codigo: alimentacaoAcompanhante.codigo,
        nome: alimentacaoAcompanhante.nome,
        quantidade: 1,
        valorUnitario: alimentacaoAcompanhante.valorTotal,
        valorTotal: alimentacaoAcompanhante.valorTotal,
      });
    }
  } else {
    const alimentacaoPacienteSemPernoite = getProcedureByCodigo('0803010028')!;
    procedures.push({
      codigo: alimentacaoPacienteSemPernoite.codigo,
      nome: alimentacaoPacienteSemPernoite.nome,
      quantidade: 1,
      valorUnitario: alimentacaoPacienteSemPernoite.valorTotal,
      valorTotal: alimentacaoPacienteSemPernoite.valorTotal,
    });
    
    if (hasCompanion) {
      const alimentacaoAcompanhanteSemPernoite = getProcedureByCodigo('0803010052')!;
      procedures.push({
        codigo: alimentacaoAcompanhanteSemPernoite.codigo,
        nome: alimentacaoAcompanhanteSemPernoite.nome,
        quantidade: 1,
        valorUnitario: alimentacaoAcompanhanteSemPernoite.valorTotal,
        valorTotal: alimentacaoAcompanhanteSemPernoite.valorTotal,
      });
    }
  }
  
  const totalValue = procedures.reduce((sum, p) => sum + p.valorTotal, 0);
  
  return { procedures, totalValue };
}

export function searchSigtapProcedures(query: string): SigtapProcedure[] {
  const normalizedQuery = query.toLowerCase().trim();
  
  if (!normalizedQuery) {
    return SIGTAP_TFD_CATALOG;
  }
  
  return SIGTAP_TFD_CATALOG.filter(p => 
    p.codigo.includes(normalizedQuery) ||
    p.nome.toLowerCase().includes(normalizedQuery) ||
    p.descricao.toLowerCase().includes(normalizedQuery) ||
    p.modalidade.toLowerCase().includes(normalizedQuery)
  );
}

export function validateProcedureForPatient(
  procedureCodigo: string,
  patientAge: number,
  patientGender: 'M' | 'F'
): { valid: boolean; errors: string[] } {
  const procedure = getProcedureByCodigo(procedureCodigo);
  const errors: string[] = [];
  
  if (!procedure) {
    errors.push(`Procedimento ${procedureCodigo} não encontrado no catálogo SIGTAP TFD`);
    return { valid: false, errors };
  }
  
  if (patientAge < procedure.idadeMinima) {
    errors.push(`Idade mínima para este procedimento: ${procedure.idadeMinima} anos`);
  }
  
  if (patientAge > procedure.idadeMaxima) {
    errors.push(`Idade máxima para este procedimento: ${procedure.idadeMaxima} anos`);
  }
  
  if (procedure.sexo !== 'A' && procedure.sexo !== patientGender) {
    errors.push(`Procedimento restrito ao sexo ${procedure.sexo === 'M' ? 'masculino' : 'feminino'}`);
  }
  
  return { valid: errors.length === 0, errors };
}
