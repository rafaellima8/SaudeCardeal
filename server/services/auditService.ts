/**
 * Serviço de Auditoria de Acesso a Prontuários Médicos
 * Conformidade LGPD e e-SUS PEC
 */

import { db } from "../db";
import * as schema from "@shared/schema";
import { eq, and, gte, lte, desc, asc, sql } from "drizzle-orm";
import type { InsertMedicalRecordsAuditLog, MedicalRecordsAuditLog } from "@shared/schema";
import type { Request } from "express";

export type AuditAction = "view" | "create" | "update" | "delete" | "print" | "export" | "share";
export type AuditEntityType = "consultation" | "prescription" | "exam" | "referral" | "certificate" | "triage" | "history" | "full_record";

export interface AuditContext {
  userId: string;
  unitId: string;
  professionalId?: string;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
}

/**
 * Extrai contexto de auditoria da requisição Express
 */
export function extractAuditContext(req: Request): AuditContext | null {
  const session = req.session as any;
  if (!session?.user?.id) return null;
  
  return {
    userId: session.user.id,
    unitId: session.user.unitId || '',
    professionalId: session.user.professionalId,
    ipAddress: req.ip || req.connection?.remoteAddress,
    userAgent: req.get('User-Agent'),
    sessionId: req.sessionID,
  };
}

/**
 * Registra acesso a prontuário médico
 */
export async function logMedicalRecordAccess(params: {
  citizenId: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: string;
  accessReason?: string;
  sensitiveDataAccessed?: boolean;
  metadata?: Record<string, any>;
  context: AuditContext;
}): Promise<MedicalRecordsAuditLog> {
  const [log] = await db
    .insert(schema.medicalRecordsAuditLogs)
    .values({
      citizenId: params.citizenId,
      userId: params.context.userId,
      professionalId: params.context.professionalId,
      unitId: params.context.unitId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      accessReason: params.accessReason,
      ipAddress: params.context.ipAddress,
      userAgent: params.context.userAgent,
      sessionId: params.context.sessionId,
      sensitiveDataAccessed: params.sensitiveDataAccessed || false,
      metadata: params.metadata || {},
    })
    .returning();
  
  return log;
}

/**
 * Registra acesso a múltiplos prontuários (batch)
 */
export async function logBatchMedicalRecordAccess(params: {
  citizenIds: string[];
  action: AuditAction;
  entityType: AuditEntityType;
  accessReason?: string;
  context: AuditContext;
}): Promise<void> {
  const records = params.citizenIds.map(citizenId => ({
    citizenId,
    userId: params.context.userId,
    professionalId: params.context.professionalId,
    unitId: params.context.unitId,
    action: params.action,
    entityType: params.entityType,
    accessReason: params.accessReason,
    ipAddress: params.context.ipAddress,
    userAgent: params.context.userAgent,
    sessionId: params.context.sessionId,
    sensitiveDataAccessed: false,
    metadata: {},
  }));
  
  await db.insert(schema.medicalRecordsAuditLogs).values(records);
}

// Roles que podem acessar dados de todas as unidades
const CROSS_UNIT_AUDIT_ROLES = ['admin', 'gestor'];

/**
 * Busca histórico de acessos de um cidadão (com validação multi-tenant)
 */
export async function getCitizenAccessHistory(params: {
  citizenId: string;
  unitId: string;
  userRole?: string;
  startDate?: Date;
  endDate?: Date;
  action?: AuditAction;
  limit?: number;
  offset?: number;
}): Promise<MedicalRecordsAuditLog[]> {
  const conditions = [
    eq(schema.medicalRecordsAuditLogs.citizenId, params.citizenId),
  ];
  
  // Aplicar filtro de unidade se não for role cross-unit
  if (!params.userRole || !CROSS_UNIT_AUDIT_ROLES.includes(params.userRole)) {
    conditions.push(eq(schema.medicalRecordsAuditLogs.unitId, params.unitId));
  }
  
  if (params.startDate) {
    conditions.push(gte(schema.medicalRecordsAuditLogs.createdAt, params.startDate));
  }
  
  if (params.endDate) {
    conditions.push(lte(schema.medicalRecordsAuditLogs.createdAt, params.endDate));
  }
  
  if (params.action) {
    conditions.push(eq(schema.medicalRecordsAuditLogs.action, params.action));
  }
  
  const logs = await db
    .select()
    .from(schema.medicalRecordsAuditLogs)
    .where(and(...conditions))
    .orderBy(desc(schema.medicalRecordsAuditLogs.createdAt))
    .limit(params.limit || 100)
    .offset(params.offset || 0);
  
  return logs;
}

/**
 * Busca acessos por usuário (com validação multi-tenant)
 */
export async function getUserAccessHistory(params: {
  userId: string;
  requestingUnitId: string;
  requestingUserRole?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}): Promise<MedicalRecordsAuditLog[]> {
  const conditions = [
    eq(schema.medicalRecordsAuditLogs.userId, params.userId),
  ];
  
  // Aplicar filtro de unidade se não for role cross-unit
  if (!params.requestingUserRole || !CROSS_UNIT_AUDIT_ROLES.includes(params.requestingUserRole)) {
    conditions.push(eq(schema.medicalRecordsAuditLogs.unitId, params.requestingUnitId));
  }
  
  if (params.startDate) {
    conditions.push(gte(schema.medicalRecordsAuditLogs.createdAt, params.startDate));
  }
  
  if (params.endDate) {
    conditions.push(lte(schema.medicalRecordsAuditLogs.createdAt, params.endDate));
  }
  
  const logs = await db
    .select()
    .from(schema.medicalRecordsAuditLogs)
    .where(and(...conditions))
    .orderBy(desc(schema.medicalRecordsAuditLogs.createdAt))
    .limit(params.limit || 100);
  
  return logs;
}

/**
 * Relatório de acessos por período
 */
export async function getAccessReport(params: {
  unitId: string;
  startDate: Date;
  endDate: Date;
}): Promise<{
  totalAccesses: number;
  byAction: Record<string, number>;
  byEntityType: Record<string, number>;
  byUser: { userId: string; count: number }[];
  sensitiveAccesses: number;
}> {
  const conditions = [
    eq(schema.medicalRecordsAuditLogs.unitId, params.unitId),
    gte(schema.medicalRecordsAuditLogs.createdAt, params.startDate),
    lte(schema.medicalRecordsAuditLogs.createdAt, params.endDate),
  ];
  
  const logs = await db
    .select()
    .from(schema.medicalRecordsAuditLogs)
    .where(and(...conditions));
  
  const report = {
    totalAccesses: logs.length,
    byAction: {} as Record<string, number>,
    byEntityType: {} as Record<string, number>,
    byUser: [] as { userId: string; count: number }[],
    sensitiveAccesses: 0,
  };
  
  const userCounts: Record<string, number> = {};
  
  for (const log of logs) {
    report.byAction[log.action] = (report.byAction[log.action] || 0) + 1;
    report.byEntityType[log.entityType] = (report.byEntityType[log.entityType] || 0) + 1;
    userCounts[log.userId] = (userCounts[log.userId] || 0) + 1;
    if (log.sensitiveDataAccessed) {
      report.sensitiveAccesses++;
    }
  }
  
  report.byUser = Object.entries(userCounts)
    .map(([userId, count]) => ({ userId, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);
  
  return report;
}

/**
 * Detecta acessos suspeitos (padrões anormais)
 */
export async function detectSuspiciousAccess(params: {
  unitId: string;
  hours: number;
}): Promise<{
  highVolumeUsers: { userId: string; accessCount: number }[];
  unusualHourAccesses: MedicalRecordsAuditLog[];
  sensitiveAccessSpike: boolean;
}> {
  const startDate = new Date();
  startDate.setHours(startDate.getHours() - params.hours);
  
  const logs = await db
    .select()
    .from(schema.medicalRecordsAuditLogs)
    .where(
      and(
        eq(schema.medicalRecordsAuditLogs.unitId, params.unitId),
        gte(schema.medicalRecordsAuditLogs.createdAt, startDate)
      )
    );
  
  const userCounts: Record<string, number> = {};
  const unusualHourAccesses: MedicalRecordsAuditLog[] = [];
  let sensitiveCount = 0;
  
  for (const log of logs) {
    userCounts[log.userId] = (userCounts[log.userId] || 0) + 1;
    
    // Horários incomuns: entre 22h e 6h
    const hour = new Date(log.createdAt).getHours();
    if (hour >= 22 || hour <= 6) {
      unusualHourAccesses.push(log);
    }
    
    if (log.sensitiveDataAccessed) {
      sensitiveCount++;
    }
  }
  
  // Usuários com mais de 50 acessos no período
  const highVolumeUsers = Object.entries(userCounts)
    .filter(([_, count]) => count > 50)
    .map(([userId, count]) => ({ userId, accessCount: count }))
    .sort((a, b) => b.accessCount - a.accessCount);
  
  // Pico de acessos sensíveis: mais de 20% dos acessos
  const sensitiveAccessSpike = logs.length > 10 && sensitiveCount / logs.length > 0.2;
  
  return {
    highVolumeUsers,
    unusualHourAccesses: unusualHourAccesses.slice(0, 50),
    sensitiveAccessSpike,
  };
}

/**
 * Middleware para auditoria automática
 */
export function createAuditMiddleware(entityType: AuditEntityType, action: AuditAction) {
  return async (req: Request, citizenId: string, entityId?: string) => {
    const context = extractAuditContext(req);
    if (!context) return;
    
    await logMedicalRecordAccess({
      citizenId,
      action,
      entityType,
      entityId,
      context,
    });
  };
}

export const auditService = {
  extractAuditContext,
  logMedicalRecordAccess,
  logBatchMedicalRecordAccess,
  getCitizenAccessHistory,
  getUserAccessHistory,
  getAccessReport,
  detectSuspiciousAccess,
  createAuditMiddleware,
};
