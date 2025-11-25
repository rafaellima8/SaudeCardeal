/**
 * Serviço de Exportação e-SUS AB / SISAB
 * 
 * Responsável por converter dados do sistema MuniSaúde para o formato
 * da Ficha de Atendimento Individual (FAI) do e-SUS AB.
 * 
 * Referências:
 * - e-SUS APS v5.3
 * - Manual SISAB (Sistema de Informação em Saúde para a Atenção Básica)
 * - DATASUS - Ministério da Saúde
 */

import type { 
  Consultation, 
  Citizen, 
  Professional, 
  HealthUnit,
  Prescription,
  MedicalReferral,
  Exam
} from '@shared/schema';

/**
 * Estrutura da Ficha de Atendimento Individual (FAI) - e-SUS AB
 * 
 * Nota: Esta é uma representação simplificada. O formato real do e-SUS
 * pode exigir campos adicionais ou estruturas específicas conforme
 * a versão e especificações do DATASUS.
 */
export interface ESUSFichaAtendimentoIndividual {
  // ========================================
  // 1. IDENTIFICAÇÃO DO ESTABELECIMENTO
  // ========================================
  identificacaoEstabelecimento: {
    codigoIbgeMunicipio: string;       // 7 dígitos
    cnesUnidade: string;                // Cadastro Nacional de Estabelecimentos de Saúde
    ine: string | null;                 // Identificador Nacional de Equipe
    dataAtendimento: string;            // YYYY-MM-DD
    turno: 'manha' | 'tarde' | 'noite'; // Calculado pela hora
  };

  // ========================================
  // 2. IDENTIFICAÇÃO DO PROFISSIONAL
  // ========================================
  profissional: {
    cns: string;                        // Cartão Nacional de Saúde
    cbo: string;                        // Classificação Brasileira de Ocupações
    nome: string;
  };

  // ========================================
  // 3. IDENTIFICAÇÃO DO CIDADÃO
  // ========================================
  cidadao: {
    cns: string | null;                 // CNS do paciente
    nome: string;
    dataNascimento: string;             // YYYY-MM-DD
    sexo: 'M' | 'F';
    municipioResidencia: string | null; // Código IBGE
  };

  // ========================================
  // 4. INFORMAÇÕES DO ATENDIMENTO
  // ========================================
  atendimento: {
    // Tipo de atendimento
    tipoAtendimento: 'consulta_agendada' | 'consulta_dia' | 'atendimento_urgencia' | 'escuta_inicial' | null;
    
    // Modalidade
    modalidade: 'presencial' | 'domiciliar' | 'teleatendimento' | null;
    
    // Racionalidade em saúde
    racionalidade: 'medicina_tradicional_chinesa' | 'antroposofia' | 'homeopatia' | 'fitoterapia' | 'outras_praticas' | null;
    
    // Vigilância em saúde
    vigilanciaSaude: {
      pesquisaVetores: boolean;
      acaoEducativa: boolean;
    };
  };

  // ========================================
  // 5. AVALIAÇÃO ANTROPOMÉTRICA
  // ========================================
  antropometria: {
    peso: number | null;          // kg
    altura: number | null;        // cm
    perimetroCefalico: number | null; // cm (crianças)
  };

  // ========================================
  // 6. SINAIS VITAIS
  // ========================================
  sinaisVitais: {
    pressaoArterialSistolica: number | null;  // mmHg
    pressaoArterialDiastolica: number | null; // mmHg
    frequenciaCardiaca: number | null;        // bpm
    frequenciaRespiratoria: number | null;    // irpm
    temperatura: number | null;               // °C
    saturacaoO2: number | null;              // %
    glicemia: number | null;                 // mg/dL
  };

  // ========================================
  // 7. PROBLEMAS/CONDIÇÕES AVALIADAS
  // ========================================
  problemasCondicoes: {
    // Condições crônicas marcadas (identificadas durante o atendimento)
    hipertensao: boolean;
    diabetes: boolean;
    obesidade: boolean;
    gestante: boolean;
    prenatal: boolean;
    puericultura: boolean;
    
    // Outros problemas/condições específicas
    tuberculose: boolean;
    hanseniase: boolean;
    saúdeMental: boolean;
    alcoolDrogas: boolean;
  };

  // ========================================
  // 8. DIAGNÓSTICOS (CIAP-2 / CID-10)
  // ========================================
  diagnosticos: Array<{
    codigo: string;           // Código CIAP-2 ou CID-10
    tipo: 'ciap2' | 'cid10';
    principal: boolean;       // Se é o diagnóstico principal
  }>;

  // ========================================
  // 9. PROCEDIMENTOS E PEQUENAS CIRURGIAS
  // ========================================
  procedimentos: Array<{
    codigoSigtap: string | null;  // Código SIGTAP (Tabela SUS)
    descricao: string;
    quantidade: number;
  }>;

  // ========================================
  // 10. EXAMES SOLICITADOS
  // ========================================
  examesSolicitados: Array<{
    codigoSigtap: string | null;
    descricao: string;
    prioridade: 'rotina' | 'urgente' | 'emergencia';
  }>;

  // ========================================
  // 11. MEDICAMENTOS PRESCRITOS
  // ========================================
  medicamentos: Array<{
    medicamento: string;
    dosagem: string;
    frequencia: string;
    duracao: string;
  }>;

  // ========================================
  // 12. ENCAMINHAMENTOS
  // ========================================
  encaminhamentos: Array<{
    destino: string;              // UPA, CAPS, Especialidade, etc.
    especialidade: string | null;
    prioridade: 'normal' | 'urgente' | 'emergencia';
    motivo: string;
  }>;

  // ========================================
  // 13. DESFECHO DO ATENDIMENTO
  // ========================================
  desfecho: {
    retornoConsulta: boolean;
    encaminhamento: boolean;
    altaEpisodio: boolean;
  };

  // ========================================
  // 14. METADADOS DE EXPORTAÇÃO
  // ========================================
  metadados: {
    versaoSistema: string;
    dataExportacao: string;    // ISO 8601
    statusEnvio: 'pendente' | 'enviado' | 'erro';
  };
}

/**
 * Calcula o turno do atendimento baseado na hora
 */
function calcularTurno(dataHora: string): 'manha' | 'tarde' | 'noite' {
  const hora = new Date(dataHora).getHours();
  
  if (hora >= 6 && hora < 12) return 'manha';
  if (hora >= 12 && hora < 18) return 'tarde';
  return 'noite';
}

/**
 * Interface para configurações do tenant (unidade de saúde)
 */
export interface TenantConfig {
  codigoIbgeMunicipio: string;  // Ex: "2906501" (Cardeal da Silva/BA)
  cnesUnidade: string;           // Ex: "2345678"
  ine: string | null;            // Identificador Nacional de Equipe
}

/**
 * Interface para dados completos do atendimento
 */
export interface ConsultationExportData {
  consultation: Consultation;
  citizen: Citizen;
  professional: Professional;
  unit: HealthUnit;
  prescriptions: Prescription[];
  referrals: MedicalReferral[];
  exams: Exam[];
  tenantConfig: TenantConfig;
}

/**
 * Converte um atendimento médico completo para o formato FAI do e-SUS AB
 * 
 * @param data - Dados completos do atendimento
 * @returns Objeto estruturado no formato FAI
 */
export function mapConsultationToFAI(data: ConsultationExportData): ESUSFichaAtendimentoIndividual {
  const { consultation, citizen, professional, unit, prescriptions, referrals, exams, tenantConfig } = data;

  // Extrair diagnósticos do campo SOAP (arrays de códigos)
  const diagnosticos: Array<{
    codigo: string;
    tipo: 'ciap2' | 'cid10';
    principal: boolean;
  }> = [];
  
  // CIAP-2 codes (array)
  if (consultation.ciap2Codes && consultation.ciap2Codes.length > 0) {
    consultation.ciap2Codes.forEach((code, index) => {
      diagnosticos.push({
        codigo: code,
        tipo: 'ciap2' as const,
        principal: index === 0, // Primeiro código é principal
      });
    });
  }
  
  // CID-10 codes (array)
  if (consultation.cid10Codes && consultation.cid10Codes.length > 0) {
    consultation.cid10Codes.forEach((code, index) => {
      diagnosticos.push({
        codigo: code,
        tipo: 'cid10' as const,
        principal: diagnosticos.length === 0 && index === 0, // Principal se não houver CIAP-2
      });
    });
  }

  // Mapear prescrições
  const medicamentos = prescriptions.map(p => ({
    medicamento: p.medication,
    dosagem: p.dosage,
    frequencia: p.frequency,
    duracao: p.duration,
  }));

  // Mapear encaminhamentos (converter prioridades para português)
  const encaminhamentosFormatados = referrals.map(r => ({
    destino: r.destination,
    especialidade: r.specialty,
    prioridade: r.priority === 'urgent' ? 'urgente' as const 
              : r.priority === 'emergency' ? 'emergencia' as const 
              : 'normal' as const,
    motivo: r.reason,
  }));

  // Mapear exames
  // Nota: Schema atual não tem sigtapCode ou priority
  // TODO: Adicionar esses campos ao schema de exams
  const examesSolicitados = exams.map(e => ({
    codigoSigtap: null, // TODO: Adicionar campo sigtapCode ao schema
    descricao: e.examType,
    prioridade: 'rotina' as const, // TODO: Adicionar campo priority ao schema
  }));

  // Determinar tipo de atendimento
  // Nota: Pode ser expandido com dados reais do sistema
  const tipoAtendimento = consultation.type === 'scheduled' 
    ? 'consulta_agendada' as const
    : 'consulta_dia' as const;

  // Montar objeto FAI
  const fai: ESUSFichaAtendimentoIndividual = {
    identificacaoEstabelecimento: {
      codigoIbgeMunicipio: tenantConfig.codigoIbgeMunicipio,
      cnesUnidade: tenantConfig.cnesUnidade,
      ine: tenantConfig.ine,
      dataAtendimento: new Date(consultation.consultationDate).toISOString().split('T')[0],
      turno: calcularTurno(new Date(consultation.consultationDate).toISOString()),
    },

    profissional: {
      cns: professional.cns || '',
      cbo: '', // TODO: Adicionar campo cboCode no schema de Professional
      nome: professional.name,
    },

    cidadao: {
      cns: citizen.cns,
      nome: citizen.name,
      dataNascimento: citizen.birthDate,
      sexo: citizen.gender,
      municipioResidencia: citizen.municipalityCode,
    },

    atendimento: {
      tipoAtendimento,
      modalidade: 'presencial', // Pode ser expandido
      racionalidade: null,      // Expandir se necessário
      vigilanciaSaude: {
        pesquisaVetores: false,
        acaoEducativa: false,
      },
    },

    antropometria: {
      peso: null, // TODO: Extrair de avaliação ACE ou campos específicos
      altura: null,
      perimetroCefalico: null,
    },

    sinaisVitais: {
      pressaoArterialSistolica: null, // TODO: Extrair de fad_evaluations
      pressaoArterialDiastolica: null,
      frequenciaCardiaca: null,
      frequenciaRespiratoria: null,
      temperatura: null,
      saturacaoO2: null,
      glicemia: null,
    },

    problemasCondicoes: {
      hipertensao: false,  // Pode ser inferido dos diagnósticos
      diabetes: false,     // Pode ser inferido dos diagnósticos
      obesidade: false,
      gestante: false,
      prenatal: false,
      puericultura: false,
      tuberculose: false,
      hanseniase: false,
      saúdeMental: false,
      alcoolDrogas: false,
    },

    diagnosticos,

    procedimentos: [],  // Expandir com dados de procedimentos se disponível

    examesSolicitados,

    medicamentos,

    encaminhamentos: encaminhamentosFormatados,

    desfecho: {
      retornoConsulta: referrals.length > 0,
      encaminhamento: referrals.length > 0,
      altaEpisodio: false,
    },

    metadados: {
      versaoSistema: 'MuniSaúde v1.0.0',
      dataExportacao: new Date().toISOString(),
      statusEnvio: 'pendente',
    },
  };

  return fai;
}

/**
 * Valida se os dados obrigatórios para exportação estão presentes
 * Conforme especificação SISAB v5.3
 */
export function validateExportData(fai: ESUSFichaAtendimentoIndividual): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // ========================================
  // CAMPOS OBRIGATÓRIOS (SISAB rejeita sem eles)
  // ========================================
  
  // Estabelecimento
  if (!fai.identificacaoEstabelecimento.codigoIbgeMunicipio) {
    errors.push('Código IBGE do município é obrigatório');
  }
  if (!fai.identificacaoEstabelecimento.cnesUnidade) {
    errors.push('CNES da unidade é obrigatório');
  }
  if (!fai.identificacaoEstabelecimento.dataAtendimento) {
    errors.push('Data do atendimento é obrigatória');
  }
  if (!fai.identificacaoEstabelecimento.turno) {
    errors.push('Turno do atendimento é obrigatório');
  }

  // Profissional
  if (!fai.profissional.cns) {
    errors.push('CNS do profissional é obrigatório');
  }
  if (!fai.profissional.cbo || fai.profissional.cbo === '') {
    errors.push('CBO (Classificação Brasileira de Ocupações) do profissional é obrigatório - adicionar campo ao schema');
  }

  // Cidadão
  if (!fai.cidadao.cns) {
    errors.push('CNS do cidadão é obrigatório');
  }
  if (!fai.cidadao.dataNascimento) {
    errors.push('Data de nascimento do cidadão é obrigatória');
  }
  if (!fai.cidadao.sexo) {
    errors.push('Sexo do cidadão é obrigatório');
  }

  // Atendimento
  if (!fai.atendimento.tipoAtendimento) {
    errors.push('Tipo de atendimento é obrigatório');
  }
  if (!fai.atendimento.modalidade) {
    errors.push('Modalidade do atendimento é obrigatória');
  }

  // Diagnósticos
  if (fai.diagnosticos.length === 0) {
    errors.push('Pelo menos um diagnóstico (CIAP-2 ou CID-10) é obrigatório');
  }
  
  const diagnosticoPrincipal = fai.diagnosticos.find(d => d.principal);
  if (!diagnosticoPrincipal) {
    errors.push('É obrigatório marcar um diagnóstico como principal');
  }

  // ========================================
  // CAMPOS RECOMENDADOS (alertas)
  // ========================================
  
  if (!fai.antropometria.peso && !fai.antropometria.altura) {
    warnings.push('Dados antropométricos (peso/altura) não fornecidos - considerar adicionar ao sistema');
  }
  
  if (!fai.sinaisVitais.pressaoArterialSistolica && !fai.sinaisVitais.pressaoArterialDiastolica) {
    warnings.push('Sinais vitais não fornecidos - considerar integração com avaliações ACE/FAD');
  }

  if (fai.examesSolicitados.length > 0) {
    const semSigtap = fai.examesSolicitados.filter(e => !e.codigoSigtap);
    if (semSigtap.length > 0) {
      warnings.push(`${semSigtap.length} exame(s) sem código SIGTAP - adicionar campo ao schema de exams`);
    }
  }

  if (fai.procedimentos.length > 0) {
    const semSigtap = fai.procedimentos.filter(p => !p.codigoSigtap);
    if (semSigtap.length > 0) {
      warnings.push(`${semSigtap.length} procedimento(s) sem código SIGTAP`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
