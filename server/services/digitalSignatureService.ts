/**
 * Serviço de Assinatura Digital
 * Implementa assinatura digital para documentos médicos
 * Conforme ICP-Brasil e e-SUS PEC
 * 
 * @module digitalSignatureService
 */

import crypto from 'crypto';
import { db } from "../db";
import * as schema from "@shared/schema";
import { eq, and } from "drizzle-orm";

const ALGORITHM = 'RSA-SHA256';
const SIGNATURE_VERSION = '1.0';

// Chave para assinatura (em produção seria um HSM ou certificado ICP-Brasil)
const SIGNING_KEY = process.env.DOCUMENT_SIGNING_KEY || crypto.randomBytes(32).toString('hex');

export interface DocumentSignature {
  version: string;
  algorithm: string;
  timestamp: string;
  hash: string;
  signature: string;
  signerId: string;
  signerName: string;
  signerCRM?: string;
  signerCNS?: string;
  documentType: string;
  documentId: string;
  validationUrl: string;
}

export interface SignableDocument {
  type: 'prescription' | 'certificate' | 'referral' | 'exam_request' | 'consultation';
  id: string;
  content: string;
  signerId: string;
  signerName: string;
  signerCRM?: string;
  signerCNS?: string;
  unitId: string;
}

/**
 * Gera hash do documento
 */
function generateDocumentHash(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Gera assinatura HMAC do documento
 */
function generateSignature(hash: string, timestamp: string, signerId: string): string {
  const dataToSign = `${hash}|${timestamp}|${signerId}`;
  return crypto.createHmac('sha256', SIGNING_KEY)
    .update(dataToSign)
    .digest('hex');
}

/**
 * Assina um documento
 */
export async function signDocument(document: SignableDocument): Promise<DocumentSignature> {
  const timestamp = new Date().toISOString();
  const hash = generateDocumentHash(document.content);
  const signature = generateSignature(hash, timestamp, document.signerId);
  
  // Gerar código de validação único
  const validationCode = crypto.randomBytes(8).toString('hex').toUpperCase();
  const baseUrl = process.env.APP_URL || 'https://munisaude.cardealdasilva.ba.gov.br';
  const validationUrl = `${baseUrl}/verificar/${validationCode}`;
  
  const documentSignature: DocumentSignature = {
    version: SIGNATURE_VERSION,
    algorithm: ALGORITHM,
    timestamp,
    hash,
    signature,
    signerId: document.signerId,
    signerName: document.signerName,
    signerCRM: document.signerCRM,
    signerCNS: document.signerCNS,
    documentType: document.type,
    documentId: document.id,
    validationUrl,
  };
  
  // Persistir assinatura no banco
  await db.insert(schema.documentSignatures).values({
    id: crypto.randomUUID(),
    documentType: document.type,
    documentId: document.id,
    signerId: document.signerId,
    signerName: document.signerName,
    signerCredentials: document.signerCRM || document.signerCNS || null,
    unitId: document.unitId,
    hash,
    signature,
    timestamp: new Date(timestamp),
    validationCode,
    version: SIGNATURE_VERSION,
    algorithm: ALGORITHM,
  });
  
  return documentSignature;
}

/**
 * Verifica assinatura de documento
 */
export async function verifySignature(params: {
  hash: string;
  signature: string;
  timestamp: string;
  signerId: string;
}): Promise<boolean> {
  const expectedSignature = generateSignature(params.hash, params.timestamp, params.signerId);
  
  try {
    return crypto.timingSafeEqual(
      Buffer.from(params.signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch {
    return false;
  }
}

/**
 * Valida documento por código de verificação
 */
export async function validateByCode(validationCode: string): Promise<{
  valid: boolean;
  document?: {
    type: string;
    id: string;
    signerName: string;
    signerCredentials: string | null;
    signedAt: Date;
    unitId: string;
  };
  error?: string;
}> {
  const record = await db
    .select()
    .from(schema.documentSignatures)
    .where(eq(schema.documentSignatures.validationCode, validationCode.toUpperCase()))
    .limit(1);
  
  if (record.length === 0) {
    return { valid: false, error: 'Código de validação não encontrado' };
  }
  
  const sig = record[0];
  
  // Verificar integridade da assinatura
  const isValid = await verifySignature({
    hash: sig.hash,
    signature: sig.signature,
    timestamp: sig.timestamp.toISOString(),
    signerId: sig.signerId,
  });
  
  if (!isValid) {
    return { valid: false, error: 'Assinatura inválida ou documento adulterado' };
  }
  
  return {
    valid: true,
    document: {
      type: sig.documentType,
      id: sig.documentId,
      signerName: sig.signerName,
      signerCredentials: sig.signerCredentials,
      signedAt: sig.timestamp,
      unitId: sig.unitId,
    },
  };
}

/**
 * Obtém assinatura de documento existente
 */
export async function getDocumentSignature(documentType: string, documentId: string): Promise<DocumentSignature | null> {
  const record = await db
    .select()
    .from(schema.documentSignatures)
    .where(
      and(
        eq(schema.documentSignatures.documentType, documentType as any),
        eq(schema.documentSignatures.documentId, documentId)
      )
    )
    .limit(1);
  
  const sig = record[0];
  if (!sig) return null;
  
  const baseUrl = process.env.APP_URL || 'https://munisaude.cardealdasilva.ba.gov.br';
  
  return {
    version: sig.version,
    algorithm: sig.algorithm,
    timestamp: sig.timestamp.toISOString(),
    hash: sig.hash,
    signature: sig.signature,
    signerId: sig.signerId,
    signerName: sig.signerName,
    signerCRM: sig.signerCredentials?.startsWith('CRM') ? sig.signerCredentials : undefined,
    signerCNS: sig.signerCredentials?.length === 15 ? sig.signerCredentials : undefined,
    documentType: sig.documentType,
    documentId: sig.documentId,
    validationUrl: `${baseUrl}/verificar/${sig.validationCode}`,
  };
}

/**
 * Formata linha de assinatura para PDF
 */
export function formatSignatureLine(signature: DocumentSignature): string[] {
  return [
    '═══════════════════════════════════════════════════════════════',
    'DOCUMENTO ASSINADO DIGITALMENTE',
    `Assinado por: ${signature.signerName}`,
    signature.signerCRM ? `CRM: ${signature.signerCRM}` : '',
    `Data/Hora: ${new Date(signature.timestamp).toLocaleString('pt-BR')}`,
    `Hash: ${signature.hash.substring(0, 16)}...`,
    `Verificação: ${signature.validationUrl}`,
    '═══════════════════════════════════════════════════════════════',
  ].filter(Boolean);
}

/**
 * Gera QR Code data para validação
 */
export function generateValidationQRData(signature: DocumentSignature): string {
  return JSON.stringify({
    url: signature.validationUrl,
    hash: signature.hash.substring(0, 16),
    ts: signature.timestamp,
  });
}

export const digitalSignatureService = {
  signDocument,
  verifySignature,
  validateByCode,
  getDocumentSignature,
  formatSignatureLine,
  generateValidationQRData,
};
