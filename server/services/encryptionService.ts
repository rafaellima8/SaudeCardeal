/**
 * Serviço de Criptografia AES-256-GCM
 * Para proteção de dados sensíveis conforme LGPD
 * 
 * @module encryptionService
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const SALT_LENGTH = 32;

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY || process.env.SESSION_SECRET || 'default-key-for-development-only';
  return crypto.scryptSync(key, 'munisaude-salt', 32);
}

export interface EncryptedData {
  encrypted: string;
  iv: string;
  tag: string;
}

/**
 * Criptografa dados sensíveis usando AES-256-GCM
 */
export function encrypt(plaintext: string): EncryptedData {
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = getEncryptionKey();
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const tag = cipher.getAuthTag();
  
  return {
    encrypted,
    iv: iv.toString('hex'),
    tag: tag.toString('hex'),
  };
}

/**
 * Descriptografa dados usando AES-256-GCM
 */
export function decrypt(data: EncryptedData): string {
  const key = getEncryptionKey();
  const iv = Buffer.from(data.iv, 'hex');
  const tag = Buffer.from(data.tag, 'hex');
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  
  let decrypted = decipher.update(data.encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Criptografa e serializa para armazenamento em banco
 */
export function encryptForStorage(plaintext: string): string {
  if (!plaintext) return '';
  const data = encrypt(plaintext);
  return JSON.stringify(data);
}

/**
 * Deserializa e descriptografa dados do banco
 */
export function decryptFromStorage(storedData: string): string {
  if (!storedData) return '';
  try {
    const data = JSON.parse(storedData) as EncryptedData;
    return decrypt(data);
  } catch {
    return storedData;
  }
}

/**
 * Criptografa campos sensíveis de um objeto cidadão
 */
export function encryptCitizenData(citizen: Record<string, any>): Record<string, any> {
  const sensitiveFields = ['cpf', 'cns', 'phone', 'email', 'address'];
  const encrypted = { ...citizen };
  
  for (const field of sensitiveFields) {
    if (encrypted[field] && typeof encrypted[field] === 'string') {
      encrypted[`${field}Encrypted`] = encryptForStorage(encrypted[field]);
      encrypted[`${field}Masked`] = maskSensitiveData(encrypted[field], field);
    }
  }
  
  return encrypted;
}

/**
 * Descriptografa campos sensíveis de um objeto cidadão
 */
export function decryptCitizenData(citizen: Record<string, any>): Record<string, any> {
  const sensitiveFields = ['cpf', 'cns', 'phone', 'email', 'address'];
  const decrypted = { ...citizen };
  
  for (const field of sensitiveFields) {
    const encryptedField = `${field}Encrypted`;
    if (decrypted[encryptedField]) {
      decrypted[field] = decryptFromStorage(decrypted[encryptedField]);
      delete decrypted[encryptedField];
    }
  }
  
  return decrypted;
}

/**
 * Mascara dados sensíveis para exibição
 */
export function maskSensitiveData(data: string, type: string): string {
  if (!data) return '';
  
  switch (type) {
    case 'cpf':
      const cpfClean = data.replace(/\D/g, '');
      if (cpfClean.length !== 11) return '***.***.***-**';
      return `${cpfClean.slice(0, 3)}.***.***-${cpfClean.slice(9)}`;
    
    case 'cns':
      const cnsClean = data.replace(/\D/g, '');
      if (cnsClean.length !== 15) return '*** **** **** ****';
      return `${cnsClean.slice(0, 3)} **** **** ${cnsClean.slice(11)}`;
    
    case 'phone':
      const phoneClean = data.replace(/\D/g, '');
      if (phoneClean.length < 8) return '****-****';
      return `****-${phoneClean.slice(-4)}`;
    
    case 'email':
      const [user, domain] = data.split('@');
      if (!domain) return '***@***.***';
      const maskedUser = user.length > 2 
        ? `${user[0]}${'*'.repeat(user.length - 2)}${user[user.length - 1]}`
        : '***';
      return `${maskedUser}@${domain}`;
    
    case 'address':
      const parts = data.split(',');
      if (parts.length > 1) {
        return `${parts[0].substring(0, 10)}..., ${parts[parts.length - 1]}`;
      }
      return data.length > 15 ? `${data.substring(0, 15)}...` : data;
    
    default:
      return data.length > 4 ? `${data.substring(0, 2)}${'*'.repeat(data.length - 4)}${data.substring(data.length - 2)}` : '****';
  }
}

/**
 * Gera hash SHA-256 para indexação segura
 */
export function hashForIndex(data: string): string {
  if (!data) return '';
  const salt = process.env.INDEX_SALT || 'munisaude-index-salt';
  return crypto.createHash('sha256').update(data + salt).digest('hex');
}

/**
 * Verifica integridade de dados com HMAC
 */
export function generateHMAC(data: string): string {
  const key = getEncryptionKey();
  return crypto.createHmac('sha256', key).update(data).digest('hex');
}

export function verifyHMAC(data: string, hmac: string): boolean {
  const computed = generateHMAC(data);
  return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(hmac));
}

export const encryptionService = {
  encrypt,
  decrypt,
  encryptForStorage,
  decryptFromStorage,
  encryptCitizenData,
  decryptCitizenData,
  maskSensitiveData,
  hashForIndex,
  generateHMAC,
  verifyHMAC,
};
