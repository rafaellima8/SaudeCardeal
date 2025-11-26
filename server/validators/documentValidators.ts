/**
 * Validadores de Documentos Brasileiros
 * Implementação conforme algoritmos oficiais do Ministério da Saúde e Receita Federal
 */

/**
 * Valida CPF usando algoritmo módulo 11
 * @param cpf - CPF com ou sem formatação
 * @returns true se válido, false caso contrário
 */
export function validateCPF(cpf: string): boolean {
  const cleanCpf = cpf.replace(/\D/g, '');
  
  if (cleanCpf.length !== 11) return false;
  
  // Rejeita CPFs conhecidos como inválidos (todos dígitos iguais)
  if (/^(\d)\1{10}$/.test(cleanCpf)) return false;
  
  // Calcula primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCpf.charAt(i)) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCpf.charAt(9))) return false;
  
  // Calcula segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCpf.charAt(i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCpf.charAt(10))) return false;
  
  return true;
}

/**
 * Valida CNS (Cartão Nacional de Saúde) usando algoritmo módulo 11
 * @param cns - CNS com 15 dígitos
 * @returns true se válido, false caso contrário
 */
export function validateCNS(cns: string): boolean {
  const cleanCns = cns.replace(/\D/g, '');
  
  if (cleanCns.length !== 15) return false;
  
  const firstDigit = cleanCns.charAt(0);
  
  // CNS definitivo (começa com 1 ou 2)
  if (firstDigit === '1' || firstDigit === '2') {
    return validateCNSDefinitivo(cleanCns);
  }
  
  // CNS provisório (começa com 7, 8 ou 9)
  if (firstDigit === '7' || firstDigit === '8' || firstDigit === '9') {
    return validateCNSProvisorio(cleanCns);
  }
  
  return false;
}

/**
 * Valida CNS definitivo (algoritmo módulo 11 com pesos)
 */
function validateCNSDefinitivo(cns: string): boolean {
  const pis = cns.substring(0, 11);
  
  let sum = 0;
  for (let i = 0; i < 11; i++) {
    sum += parseInt(pis.charAt(i)) * (15 - i);
  }
  
  let remainder = sum % 11;
  let dv = 11 - remainder;
  
  if (dv === 11) dv = 0;
  
  if (dv === 10) {
    sum = 0;
    for (let i = 0; i < 11; i++) {
      sum += parseInt(pis.charAt(i)) * (15 - i);
    }
    sum += 2;
    remainder = sum % 11;
    dv = 11 - remainder;
    
    const expectedCns = pis + '001' + dv.toString();
    return cns === expectedCns;
  }
  
  const expectedCns = pis + '000' + dv.toString();
  return cns === expectedCns;
}

/**
 * Valida CNS provisório (soma dos dígitos mod 11 === 0)
 */
function validateCNSProvisorio(cns: string): boolean {
  let sum = 0;
  for (let i = 0; i < 15; i++) {
    sum += parseInt(cns.charAt(i)) * (15 - i);
  }
  return sum % 11 === 0;
}

/**
 * Formata CPF para exibição (XXX.XXX.XXX-XX)
 */
export function formatCPF(cpf: string): string {
  const cleanCpf = cpf.replace(/\D/g, '');
  if (cleanCpf.length !== 11) return cpf;
  return cleanCpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

/**
 * Formata CNS para exibição (XXX XXXX XXXX XXXX)
 */
export function formatCNS(cns: string): string {
  const cleanCns = cns.replace(/\D/g, '');
  if (cleanCns.length !== 15) return cns;
  return cleanCns.replace(/(\d{3})(\d{4})(\d{4})(\d{4})/, '$1 $2 $3 $4');
}

/**
 * Mascara CPF para exibição segura (***.***.XXX-XX)
 */
export function maskCPF(cpf: string): string {
  const cleanCpf = cpf.replace(/\D/g, '');
  if (cleanCpf.length !== 11) return '***.***.***-**';
  return `***.***${cleanCpf.substring(6, 9)}-${cleanCpf.substring(9, 11)}`;
}

/**
 * Valida CEP brasileiro
 */
export function validateCEP(cep: string): boolean {
  const cleanCep = cep.replace(/\D/g, '');
  return cleanCep.length === 8 && /^[0-9]{8}$/.test(cleanCep);
}

/**
 * Formata CEP para exibição (XXXXX-XXX)
 */
export function formatCEP(cep: string): string {
  const cleanCep = cep.replace(/\D/g, '');
  if (cleanCep.length !== 8) return cep;
  return cleanCep.replace(/(\d{5})(\d{3})/, '$1-$2');
}

/**
 * Resultado da validação de documentos
 */
export interface DocumentValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Valida todos os documentos de um cidadão
 */
export function validateCitizenDocuments(data: {
  cpf: string;
  cns?: string | null;
  zipCode?: string | null;
}): DocumentValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Validar CPF (obrigatório)
  if (!data.cpf) {
    errors.push('CPF é obrigatório');
  } else if (!validateCPF(data.cpf)) {
    errors.push('CPF inválido');
  }
  
  // Validar CNS (opcional, mas se fornecido deve ser válido)
  if (data.cns && data.cns.length > 0) {
    if (!validateCNS(data.cns)) {
      errors.push('CNS inválido');
    }
  } else {
    warnings.push('CNS não informado - cadastro pode ter limitações no CADSUS');
  }
  
  // Validar CEP (opcional, mas se fornecido deve ser válido)
  if (data.zipCode && data.zipCode.length > 0) {
    if (!validateCEP(data.zipCode)) {
      errors.push('CEP inválido');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
