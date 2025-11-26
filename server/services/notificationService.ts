/**
 * Serviço de Notificações
 * Sistema de alertas persistentes e notificações em tempo real
 * 
 * @module notificationService
 */

import { db } from "../db";
import * as schema from "@shared/schema";
import { eq, and, desc, isNull, sql } from "drizzle-orm";

export type NotificationType = 
  | 'clinical_alert'      // Alerta clínico (protocolo)
  | 'prescription_ready'  // Prescrição pronta para dispensação
  | 'stock_low'          // Estoque baixo
  | 'exam_result'        // Resultado de exame disponível
  | 'referral_update'    // Atualização de encaminhamento
  | 'appointment_reminder' // Lembrete de agendamento
  | 'system'             // Notificação do sistema
  | 'tfd_update';        // Atualização TFD

export type NotificationPriority = 'low' | 'medium' | 'high' | 'critical';

export interface CreateNotificationParams {
  userId?: string;
  unitId: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  actionUrl?: string;
  metadata?: Record<string, any>;
  expiresAt?: Date;
}

export interface Notification {
  id: string;
  userId: string | null;
  unitId: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  entityType: string | null;
  entityId: string | null;
  actionUrl: string | null;
  metadata: Record<string, any> | null;
  readAt: Date | null;
  dismissedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
}

// In-memory store for WebSocket connections (production would use Redis)
const wsConnections = new Map<string, Set<any>>();

/**
 * Cria uma nova notificação
 */
export async function createNotification(params: CreateNotificationParams): Promise<void> {
  const id = crypto.randomUUID();
  
  await db.insert(schema.notifications).values({
    id,
    userId: params.userId || null,
    unitId: params.unitId,
    type: params.type,
    priority: params.priority,
    title: params.title,
    message: params.message,
    entityType: params.entityType || null,
    entityId: params.entityId || null,
    actionUrl: params.actionUrl || null,
    metadata: params.metadata ? JSON.stringify(params.metadata) : null,
    expiresAt: params.expiresAt || null,
  });
  
  // Broadcast via WebSocket (se houver conexões)
  broadcastNotification(params.unitId, params.userId, {
    id,
    ...params,
    createdAt: new Date(),
  });
}

/**
 * Cria notificação para farmácia sobre nova prescrição
 */
export async function notifyPharmacyNewPrescription(params: {
  unitId: string;
  prescriptionId: string;
  citizenName: string;
  medication: string;
}): Promise<void> {
  await createNotification({
    unitId: params.unitId,
    type: 'prescription_ready',
    priority: 'medium',
    title: 'Nova Prescrição',
    message: `Prescrição de ${params.medication} para ${params.citizenName} aguardando dispensação`,
    entityType: 'prescription',
    entityId: params.prescriptionId,
    actionUrl: `/farmacia/dispensacao?prescriptionId=${params.prescriptionId}`,
  });
}

/**
 * Cria alerta clínico persistente
 */
export async function createClinicalAlert(params: {
  userId: string;
  unitId: string;
  citizenId: string;
  citizenName: string;
  consultationId: string;
  alertType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  recommendation: string;
}): Promise<void> {
  await createNotification({
    userId: params.userId,
    unitId: params.unitId,
    type: 'clinical_alert',
    priority: params.severity,
    title: `Alerta: ${params.alertType}`,
    message: params.message,
    entityType: 'consultation',
    entityId: params.consultationId,
    actionUrl: `/atendimento/${params.consultationId}`,
    metadata: {
      citizenId: params.citizenId,
      citizenName: params.citizenName,
      alertType: params.alertType,
      recommendation: params.recommendation,
    },
  });
}

/**
 * Notifica sobre estoque baixo
 */
export async function notifyLowStock(params: {
  unitId: string;
  medicationId: string;
  medicationName: string;
  currentQuantity: number;
  minimumQuantity: number;
}): Promise<void> {
  await createNotification({
    unitId: params.unitId,
    type: 'stock_low',
    priority: params.currentQuantity === 0 ? 'critical' : 'high',
    title: 'Estoque Baixo',
    message: `${params.medicationName}: ${params.currentQuantity} unidades (mínimo: ${params.minimumQuantity})`,
    entityType: 'medication',
    entityId: params.medicationId,
    actionUrl: `/farmacia/estoque?medicationId=${params.medicationId}`,
    metadata: {
      currentQuantity: params.currentQuantity,
      minimumQuantity: params.minimumQuantity,
    },
  });
}

/**
 * Busca notificações do usuário
 */
export async function getUserNotifications(params: {
  userId?: string;
  unitId: string;
  unreadOnly?: boolean;
  type?: NotificationType;
  limit?: number;
  offset?: number;
}): Promise<Notification[]> {
  const conditions = [
    eq(schema.notifications.unitId, params.unitId),
    isNull(schema.notifications.dismissedAt),
  ];
  
  if (params.userId) {
    conditions.push(
      sql`(${schema.notifications.userId} = ${params.userId} OR ${schema.notifications.userId} IS NULL)`
    );
  }
  
  if (params.unreadOnly) {
    conditions.push(isNull(schema.notifications.readAt));
  }
  
  if (params.type) {
    conditions.push(eq(schema.notifications.type, params.type));
  }
  
  const notifications = await db
    .select()
    .from(schema.notifications)
    .where(and(...conditions))
    .orderBy(desc(schema.notifications.createdAt))
    .limit(params.limit || 50)
    .offset(params.offset || 0);
  
  return notifications.map(n => ({
    ...n,
    metadata: n.metadata ? JSON.parse(n.metadata as string) : null,
  }));
}

/**
 * Conta notificações não lidas
 */
export async function getUnreadCount(params: {
  userId?: string;
  unitId: string;
}): Promise<number> {
  const conditions = [
    eq(schema.notifications.unitId, params.unitId),
    isNull(schema.notifications.readAt),
    isNull(schema.notifications.dismissedAt),
  ];
  
  if (params.userId) {
    conditions.push(
      sql`(${schema.notifications.userId} = ${params.userId} OR ${schema.notifications.userId} IS NULL)`
    );
  }
  
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.notifications)
    .where(and(...conditions));
  
  return result[0]?.count || 0;
}

/**
 * Marca notificação como lida
 */
export async function markAsRead(notificationId: string): Promise<void> {
  await db
    .update(schema.notifications)
    .set({ readAt: new Date() })
    .where(eq(schema.notifications.id, notificationId));
}

/**
 * Marca todas as notificações como lidas
 */
export async function markAllAsRead(params: {
  userId?: string;
  unitId: string;
}): Promise<void> {
  const conditions = [
    eq(schema.notifications.unitId, params.unitId),
    isNull(schema.notifications.readAt),
  ];
  
  if (params.userId) {
    conditions.push(
      sql`(${schema.notifications.userId} = ${params.userId} OR ${schema.notifications.userId} IS NULL)`
    );
  }
  
  await db
    .update(schema.notifications)
    .set({ readAt: new Date() })
    .where(and(...conditions));
}

/**
 * Descarta notificação
 */
export async function dismissNotification(notificationId: string): Promise<void> {
  await db
    .update(schema.notifications)
    .set({ dismissedAt: new Date() })
    .where(eq(schema.notifications.id, notificationId));
}

/**
 * Registra conexão WebSocket
 */
export function registerWSConnection(unitId: string, userId: string, ws: any): void {
  const key = `${unitId}:${userId}`;
  if (!wsConnections.has(key)) {
    wsConnections.set(key, new Set());
  }
  wsConnections.get(key)!.add(ws);
}

/**
 * Remove conexão WebSocket
 */
export function removeWSConnection(unitId: string, userId: string, ws: any): void {
  const key = `${unitId}:${userId}`;
  wsConnections.get(key)?.delete(ws);
}

/**
 * Broadcast notificação via WebSocket
 */
function broadcastNotification(unitId: string, userId: string | undefined, notification: any): void {
  // Broadcast para usuário específico
  if (userId) {
    const userKey = `${unitId}:${userId}`;
    wsConnections.get(userKey)?.forEach(ws => {
      try {
        ws.send(JSON.stringify({ type: 'notification', data: notification }));
      } catch (error) {
        console.error('Erro ao enviar notificação via WebSocket:', error);
      }
    });
  }
  
  // Broadcast para toda a unidade (notificações sem userId)
  wsConnections.forEach((connections, key) => {
    if (key.startsWith(`${unitId}:`)) {
      connections.forEach(ws => {
        try {
          ws.send(JSON.stringify({ type: 'notification', data: notification }));
        } catch (error) {
          console.error('Erro ao enviar notificação via WebSocket:', error);
        }
      });
    }
  });
}

export const notificationService = {
  createNotification,
  notifyPharmacyNewPrescription,
  createClinicalAlert,
  notifyLowStock,
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  dismissNotification,
  registerWSConnection,
  removeWSConnection,
};
