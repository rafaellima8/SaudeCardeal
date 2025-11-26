/**
 * Serviço de Fila de Atendimento
 * Implementa geração automática de senhas e ordenação por prioridade + timestamp
 * Conforme e-SUS PEC v5.3
 */

import { db } from "../db";
import * as schema from "@shared/schema";
import { eq, and, sql, desc, asc } from "drizzle-orm";
import type { InsertAttendanceQueue, AttendanceQueue } from "@shared/schema";

// Prefixos de senha por prioridade
const TICKET_PREFIXES = {
  emergency: 'E',
  urgent: 'U',
  normal: 'N',
} as const;

// Pesos de prioridade para ordenação (maior = mais prioritário)
const PRIORITY_WEIGHTS = {
  emergency: 100,
  urgent: 50,
  normal: 0,
} as const;

/**
 * Obtém a data atual no fuso horário de Brasília (UTC-3)
 */
function getBrazilianDate(): { start: Date; end: Date } {
  const now = new Date();
  const brasiliaOffset = -3 * 60;
  const localOffset = now.getTimezoneOffset();
  const totalOffset = (brasiliaOffset - localOffset) * 60 * 1000;
  
  const brazilNow = new Date(now.getTime() + totalOffset);
  
  const start = new Date(brazilNow);
  start.setHours(0, 0, 0, 0);
  
  const end = new Date(brazilNow);
  end.setHours(23, 59, 59, 999);
  
  return { start: new Date(start.getTime() - totalOffset), end: new Date(end.getTime() - totalOffset) };
}

/**
 * Gera senha sequencial para a fila de atendimento
 * Formato: [Prefixo][Sequencial] (ex: N001, U002, E003)
 * Usa fuso horário de Brasília para particionamento diário
 */
export async function generateTicket(
  unitId: string,
  priority: 'normal' | 'urgent' | 'emergency'
): Promise<string> {
  const { start, end } = getBrazilianDate();
  const prefix = TICKET_PREFIXES[priority];
  
  const lastEntry = await db
    .select({ ticket: schema.attendanceQueue.ticket })
    .from(schema.attendanceQueue)
    .where(
      and(
        eq(schema.attendanceQueue.unitId, unitId),
        sql`${schema.attendanceQueue.arrivedAt} >= ${Math.floor(start.getTime() / 1000)}`,
        sql`${schema.attendanceQueue.arrivedAt} <= ${Math.floor(end.getTime() / 1000)}`
      )
    )
    .orderBy(desc(schema.attendanceQueue.arrivedAt))
    .limit(1);
  
  let nextNumber = 1;
  
  if (lastEntry.length > 0) {
    const lastTicket = lastEntry[0].ticket;
    const lastNumber = parseInt(lastTicket.substring(1)) || 0;
    nextNumber = lastNumber + 1;
  }
  
  return `${prefix}${nextNumber.toString().padStart(3, '0')}`;
}

/**
 * Adiciona paciente na fila de atendimento com senha automática
 */
export async function addToQueue(
  data: Omit<InsertAttendanceQueue, 'ticket'>
): Promise<AttendanceQueue> {
  const ticket = await generateTicket(
    data.unitId,
    data.priority as 'normal' | 'urgent' | 'emergency'
  );
  
  const [entry] = await db
    .insert(schema.attendanceQueue)
    .values({
      ...data,
      ticket,
      arrivedAt: new Date(),
      status: 'waiting',
    })
    .returning();
  
  return entry;
}

/**
 * Busca fila ordenada por prioridade + ordem de chegada
 * Ordenação: emergency > urgent > normal, dentro de cada prioridade por arrivedAt ASC
 */
export async function getOrderedQueue(params: {
  unitId: string;
  professionalId?: string;
  careLineId?: string;
  status?: string;
}): Promise<AttendanceQueue[]> {
  const conditions = [
    eq(schema.attendanceQueue.unitId, params.unitId),
  ];
  
  if (params.professionalId) {
    conditions.push(eq(schema.attendanceQueue.professionalId, params.professionalId));
  }
  
  if (params.careLineId) {
    conditions.push(eq(schema.attendanceQueue.careLineId, params.careLineId));
  }
  
  if (params.status) {
    conditions.push(eq(schema.attendanceQueue.status, params.status as any));
  }
  
  // Ordenar por prioridade (usando CASE WHEN) e depois por arrivedAt
  const queue = await db
    .select()
    .from(schema.attendanceQueue)
    .where(and(...conditions))
    .orderBy(
      sql`CASE 
        WHEN ${schema.attendanceQueue.priority} = 'emergency' THEN 1
        WHEN ${schema.attendanceQueue.priority} = 'urgent' THEN 2
        ELSE 3
      END`,
      asc(schema.attendanceQueue.arrivedAt)
    );
  
  return queue;
}

/**
 * Busca próximo paciente da fila (primeiro waiting por prioridade)
 */
export async function getNextInQueue(params: {
  unitId: string;
  professionalId?: string;
  careLineId?: string;
}): Promise<AttendanceQueue | null> {
  const queue = await getOrderedQueue({
    ...params,
    status: 'waiting',
  });
  
  return queue[0] || null;
}

/**
 * Chama paciente da fila (atualiza status para in_progress)
 */
export async function callPatient(
  queueId: string,
  professionalId: string
): Promise<AttendanceQueue | null> {
  const [updated] = await db
    .update(schema.attendanceQueue)
    .set({
      status: 'in_progress',
      calledAt: new Date(),
      professionalId,
    })
    .where(eq(schema.attendanceQueue.id, queueId))
    .returning();
  
  return updated || null;
}

/**
 * Finaliza atendimento na fila
 */
export async function completeQueueEntry(
  queueId: string,
  consultationId?: string
): Promise<AttendanceQueue | null> {
  const [updated] = await db
    .update(schema.attendanceQueue)
    .set({
      status: 'completed',
      completedAt: new Date(),
      consultationId,
    })
    .where(eq(schema.attendanceQueue.id, queueId))
    .returning();
  
  return updated || null;
}

/**
 * Cancela entrada na fila
 */
export async function cancelQueueEntry(queueId: string): Promise<AttendanceQueue | null> {
  const [updated] = await db
    .update(schema.attendanceQueue)
    .set({
      status: 'cancelled',
      completedAt: new Date(),
    })
    .where(eq(schema.attendanceQueue.id, queueId))
    .returning();
  
  return updated || null;
}

/**
 * Estatísticas da fila do dia
 */
export async function getQueueStats(unitId: string): Promise<{
  total: number;
  waiting: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  avgWaitTime: number;
  byPriority: Record<string, number>;
}> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const entries = await db
    .select()
    .from(schema.attendanceQueue)
    .where(
      and(
        eq(schema.attendanceQueue.unitId, unitId),
        sql`date(${schema.attendanceQueue.arrivedAt}, 'unixepoch') = date('now')`
      )
    );
  
  const stats = {
    total: entries.length,
    waiting: 0,
    inProgress: 0,
    completed: 0,
    cancelled: 0,
    avgWaitTime: 0,
    byPriority: {
      normal: 0,
      urgent: 0,
      emergency: 0,
    } as Record<string, number>,
  };
  
  let totalWaitTime = 0;
  let waitTimeCount = 0;
  
  for (const entry of entries) {
    stats[entry.status as keyof typeof stats]++;
    stats.byPriority[entry.priority]++;
    
    if (entry.calledAt && entry.arrivedAt) {
      const waitTime = (new Date(entry.calledAt).getTime() - new Date(entry.arrivedAt).getTime()) / 1000 / 60;
      totalWaitTime += waitTime;
      waitTimeCount++;
    }
  }
  
  if (waitTimeCount > 0) {
    stats.avgWaitTime = Math.round(totalWaitTime / waitTimeCount);
  }
  
  return stats;
}

export const queueService = {
  generateTicket,
  addToQueue,
  getOrderedQueue,
  getNextInQueue,
  callPatient,
  completeQueueEntry,
  cancelQueueEntry,
  getQueueStats,
};
