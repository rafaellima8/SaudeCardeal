/**
 * Serviço de Validação de Documentos Brasileiros
 * CPF, CNS (Cartão Nacional de Saúde), CEP
 * Conforme algoritmos oficiais do governo brasileiro
 * 
 * @module documentValidationService
 */

/**
 * Valida CPF usando algoritmo oficial da Receita Federal
 * Módulo 11 com dois dígitos verificadores
 */
export function validateCPF(cpf: string): { valid: boolean; formatted: string; error?: string } {
  const cleaned = cpf.replace(/\D/g, '');
  
  if (cleaned.length !== 11) {
    return { valid: false, formatted: cpf, error: 'CPF deve ter 11 dígitos' };
  }
  
  // Rejeitar CPFs com todos os dígitos iguais
  if (/^(\d)\1{10}$/.test(cleaned)) {
    return { valid: false, formatted: cpf, error: 'CPF inválido - dígitos repetidos' };
  }
  
  // Calcular primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned[i]) * (10 - i);
  }
  let digit1 = 11 - (sum % 11);
  if (digit1 > 9) digit1 = 0;
  
  // Calcular segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleaned[i]) * (11 - i);
  }
  let digit2 = 11 - (sum % 11);
  if (digit2 > 9) digit2 = 0;
  
  const isValid = digit1 === parseInt(cleaned[9]) && digit2 === parseInt(cleaned[10]);
  
  if (!isValid) {
    return { valid: false, formatted: cpf, error: 'CPF inválido - dígitos verificadores incorretos' };
  }
  
  // Formatar: 000.000.000-00
  const formatted = cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  
  return { valid: true, formatted };
}

/**
 * Valida CNS (Cartão Nacional de Saúde)
 * Algoritmo conforme portaria MS 940/2011
 * 
 * Tipos de CNS:
 * - Definitivo: inicia com 1 ou 2 (usuário do SUS)
 * - Provisório: inicia com 7, 8 ou 9 (trabalhador do SUS)
 */
export function validateCNS(cns: string): { valid: boolean; formatted: string; type?: 'definitivo' | 'provisorio'; error?: string } {
  const cleaned = cns.replace(/\D/g, '');
  
  if (cleaned.length !== 15) {
    return { valid: false, formatted: cns, error: 'CNS deve ter 15 dígitos' };
  }
  
  const firstDigit = parseInt(cleaned[0]);
  
  // CNS Definitivo (inicia com 1 ou 2)
  if (firstDigit === 1 || firstDigit === 2) {
    const pis = cleaned.substring(0, 11);
    let soma = 0;
    
    for (let i = 0; i < 11; i++) {
      soma += parseInt(pis[i]) * (15 - i);
    }
    
    const resto = soma % 11;
    let dv = 11 - resto;
    
    if (dv === 11) dv = 0;
    
    let result = pis + '001' + dv.toString();
    
    if (dv === 10) {
      soma = 0;
      for (let i = 0; i < 11; i++) {
        soma += parseInt(pis[i]) * (15 - i);
      }
      soma += 2;
      const resto2 = soma % 11;
      dv = 11 - resto2;
      result = pis + '002' + dv.toString();
    }
    
    if (result === cleaned) {
      const formatted = cleaned.replace(/(\d{3})(\d{4})(\d{4})(\d{4})/, '$1 $2 $3 $4');
      return { valid: true, formatted, type: 'definitivo' };
    } else {
      return { valid: false, formatted: cns, error: 'CNS definitivo inválido' };
    }
  }
  
  // CNS Provisório (inicia com 7, 8 ou 9)
  if (firstDigit === 7 || firstDigit === 8 || firstDigit === 9) {
    let soma = 0;
    for (let i = 0; i < 15; i++) {
      soma += parseInt(cleaned[i]) * (15 - i);
    }
    
    if (soma % 11 === 0) {
      const formatted = cleaned.replace(/(\d{3})(\d{4})(\d{4})(\d{4})/, '$1 $2 $3 $4');
      return { valid: true, formatted, type: 'provisorio' };
    } else {
      return { valid: false, formatted: cns, error: 'CNS provisório inválido' };
    }
  }
  
  return { valid: false, formatted: cns, error: 'CNS deve iniciar com 1, 2, 7, 8 ou 9' };
}

/**
 * Valida e busca informações de CEP
 * Usa API ViaCEP (gratuita) para consulta
 */
export interface CepInfo {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  ibge: string;
  gia: string;
  ddd: string;
  siafi: string;
}

export async function validateCEP(cep: string): Promise<{
  valid: boolean;
  formatted: string;
  data?: CepInfo;
  error?: string;
}> {
  const cleaned = cep.replace(/\D/g, '');
  
  if (cleaned.length !== 8) {
    return { valid: false, formatted: cep, error: 'CEP deve ter 8 dígitos' };
  }
  
  try {
    const response = await fetch(`https://viacep.com.br/ws/${cleaned}/json/`);
    
    if (!response.ok) {
      return { valid: false, formatted: cep, error: 'Erro ao consultar CEP' };
    }
    
    const data = await response.json();
    
    if (data.erro) {
      return { valid: false, formatted: cep, error: 'CEP não encontrado' };
    }
    
    const formatted = cleaned.replace(/(\d{5})(\d{3})/, '$1-$2');
    
    return {
      valid: true,
      formatted,
      data: data as CepInfo,
    };
  } catch (error) {
    return { valid: false, formatted: cep, error: 'Falha na consulta do CEP' };
  }
}

/**
 * Valida RG (Registro Geral)
 * Validação básica - formato varia por estado
 */
export function validateRG(rg: string): { valid: boolean; formatted: string; error?: string } {
  const cleaned = rg.replace(/\D/g, '');
  
  if (cleaned.length < 7 || cleaned.length > 14) {
    return { valid: false, formatted: rg, error: 'RG deve ter entre 7 e 14 dígitos' };
  }
  
  return { valid: true, formatted: cleaned };
}

/**
 * Gera CPF válido para testes
 * NÃO USAR EM PRODUÇÃO
 */
export function generateTestCPF(): string {
  const random = () => Math.floor(Math.random() * 10);
  const digits = Array.from({ length: 9 }, random);
  
  // Primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += digits[i] * (10 - i);
  }
  let digit1 = 11 - (sum % 11);
  if (digit1 > 9) digit1 = 0;
  digits.push(digit1);
  
  // Segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += digits[i] * (11 - i);
  }
  let digit2 = 11 - (sum % 11);
  if (digit2 > 9) digit2 = 0;
  digits.push(digit2);
  
  return digits.join('').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

/**
 * Gera CNS válido para testes (provisório)
 * NÃO USAR EM PRODUÇÃO
 */
export function generateTestCNS(): string {
  let cns = '7';
  for (let i = 0; i < 14; i++) {
    cns += Math.floor(Math.random() * 10).toString();
  }
  
  // Ajustar para ser válido
  let soma = 0;
  for (let i = 0; i < 15; i++) {
    soma += parseInt(cns[i]) * (15 - i);
  }
  
  const resto = soma % 11;
  if (resto !== 0) {
    let lastDigit = parseInt(cns[14]);
    lastDigit = (lastDigit + (11 - resto)) % 10;
    cns = cns.substring(0, 14) + lastDigit.toString();
  }
  
  return cns.replace(/(\d{3})(\d{4})(\d{4})(\d{4})/, '$1 $2 $3 $4');
}

export const documentValidationService = {
  validateCPF,
  validateCNS,
  validateCEP,
  validateRG,
  generateTestCPF,
  generateTestCNS,
};
