/**
 * Serviço de Criptografia para Dados Sensíveis
 * Implementa AES-256-GCM para LGPD compliance
 * 
 * @module cryptoService
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;

// Chave derivada do ambiente ou gerada dinamicamente
const MASTER_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');

/**
 * Deriva uma chave usando PBKDF2
 */
function deriveKey(salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(MASTER_KEY, salt, 100000, 32, 'sha256');
}

/**
 * Criptografa dados sensíveis (CPF, CNS, etc)
 * @param plaintext Texto a ser criptografado
 * @returns String criptografada em formato base64 (salt:iv:authTag:ciphertext)
 */
export function encrypt(plaintext: string): string {
  if (!plaintext) return plaintext;
  
  const salt = crypto.randomBytes(SALT_LENGTH);
  const key = deriveKey(salt);
  const iv = crypto.randomBytes(IV_LENGTH);
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return [
    salt.toString('hex'),
    iv.toString('hex'),
    authTag.toString('hex'),
    encrypted
  ].join(':');
}

/**
 * Descriptografa dados sensíveis
 * @param ciphertext Texto criptografado no formato salt:iv:authTag:ciphertext
 * @returns Texto original
 */
export function decrypt(ciphertext: string): string {
  if (!ciphertext || !ciphertext.includes(':')) return ciphertext;
  
  try {
    const [saltHex, ivHex, authTagHex, encrypted] = ciphertext.split(':');
    
    const salt = Buffer.from(saltHex, 'hex');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const key = deriveKey(salt);
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Erro ao descriptografar:', error);
    return ciphertext; // Retorna original se falhar (dados não criptografados)
  }
}

/**
 * Gera hash SHA-256 para verificação de integridade
 */
export function hashData(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Gera assinatura digital HMAC-SHA256
 */
export function signDocument(documentContent: string, timestamp: Date): {
  signature: string;
  timestamp: string;
  hash: string;
} {
  const timestampStr = timestamp.toISOString();
  const contentToSign = `${documentContent}|${timestampStr}`;
  
  const hash = hashData(contentToSign);
  const signature = crypto.createHmac('sha256', MASTER_KEY)
    .update(contentToSign)
    .digest('hex');
  
  return {
    signature,
    timestamp: timestampStr,
    hash
  };
}

/**
 * Verifica assinatura digital
 */
export function verifySignature(
  documentContent: string,
  signature: string,
  timestamp: string
): boolean {
  const contentToSign = `${documentContent}|${timestamp}`;
  const expectedSignature = crypto.createHmac('sha256', MASTER_KEY)
    .update(contentToSign)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}

/**
 * Mascara CPF para exibição (***.***.***-XX)
 */
export function maskCPF(cpf: string): string {
  if (!cpf || cpf.length < 11) return cpf;
  const clean = cpf.replace(/\D/g, '');
  return `***.***.*${clean.slice(-4, -2)}-${clean.slice(-2)}`;
}

/**
 * Mascara CNS para exibição
 */
export function maskCNS(cns: string): string {
  if (!cns || cns.length < 15) return cns;
  const clean = cns.replace(/\D/g, '');
  return `*** **** **** ${clean.slice(-4)}`;
}

/**
 * Criptografa campos sensíveis de um cidadão
 */
export function encryptCitizenData(citizen: {
  cpf?: string;
  cns?: string;
  email?: string;
  phone?: string;
}): {
  cpf?: string;
  cns?: string;
  email?: string;
  phone?: string;
  cpfHash?: string;
  cnsHash?: string;
} {
  return {
    cpf: citizen.cpf ? encrypt(citizen.cpf) : undefined,
    cns: citizen.cns ? encrypt(citizen.cns) : undefined,
    email: citizen.email ? encrypt(citizen.email) : undefined,
    phone: citizen.phone ? encrypt(citizen.phone) : undefined,
    cpfHash: citizen.cpf ? hashData(citizen.cpf.replace(/\D/g, '')) : undefined,
    cnsHash: citizen.cns ? hashData(citizen.cns.replace(/\D/g, '')) : undefined,
  };
}

/**
 * Descriptografa campos sensíveis de um cidadão
 */
export function decryptCitizenData(citizen: {
  cpf?: string;
  cns?: string;
  email?: string;
  phone?: string;
}): {
  cpf?: string;
  cns?: string;
  email?: string;
  phone?: string;
} {
  return {
    cpf: citizen.cpf ? decrypt(citizen.cpf) : undefined,
    cns: citizen.cns ? decrypt(citizen.cns) : undefined,
    email: citizen.email ? decrypt(citizen.email) : undefined,
    phone: citizen.phone ? decrypt(citizen.phone) : undefined,
  };
}

export const cryptoService = {
  encrypt,
  decrypt,
  hashData,
  signDocument,
  verifySignature,
  maskCPF,
  maskCNS,
  encryptCitizenData,
  decryptCitizenData,
};
