/**
 * Queue Routing Service
 * 
 * Automatically routes patients to the correct queue/professional based on:
 * 1. Age range (pediatrics, geriatrics)
 * 2. Gender (obstetrics)
 * 3. Care line assignment
 * 4. Clinical priority
 * 5. Diagnosis codes
 */

import { db } from "../db";
import * as schema from "../../shared/schema";
import { eq, and, desc, asc, sql } from "drizzle-orm";
import { CareLineResolutionService } from "./care-line-resolution";

export interface QueueRoutingContext {
  citizenId: string;
  unitId: string;
  appointmentId?: string;
  consultationId?: string;
  appointmentType?: string;
  priority?: "normal" | "priority" | "urgent" | "emergency";
}

export interface QueueRoutingResult {
  careLineId: string | null;
  targetProfessionalId: string | null;
  targetRoom: string | null;
  routingReason: string;
  estimatedWaitTime?: number;
}

export class QueueRoutingService {
  /**
   * Automatically route a patient to the appropriate queue (MULTI-TENANT SECURE)
   */
  static async routePatient(context: QueueRoutingContext): Promise<QueueRoutingResult> {
    const { citizenId, unitId, appointmentType, priority } = context;
    
    const citizen = await db.query.citizens.findFirst({
      where: eq(schema.citizens.id, citizenId),
    });

    if (!citizen) {
      return {
        careLineId: null,
        targetProfessionalId: null,
        targetRoom: null,
        routingReason: "Cidadão não encontrado",
      };
    }

    const age = this.calculateAge(citizen.birthDate);
    const gender = citizen.gender;

    const rules = await db
      .select()
      .from(schema.queueRoutingRules)
      .where(
        and(
          eq(schema.queueRoutingRules.unitId, unitId),
          eq(schema.queueRoutingRules.active, true)
        )
      )
      .orderBy(desc(schema.queueRoutingRules.priority));

    for (const rule of rules) {
      const conditions = rule.conditions as {
        ageMin?: number;
        ageMax?: number;
        gender?: string;
        careLineId?: string;
        appointmentType?: string;
        priority?: string;
        diagnosisCodes?: string[];
      } | null;

      if (!conditions) continue;

      let matches = true;

      if (conditions.ageMin !== undefined && age < conditions.ageMin) {
        matches = false;
      }
      if (conditions.ageMax !== undefined && age > conditions.ageMax) {
        matches = false;
      }
      if (conditions.gender && conditions.gender !== gender) {
        matches = false;
      }
      if (conditions.appointmentType && conditions.appointmentType !== appointmentType) {
        matches = false;
      }
      if (conditions.priority && conditions.priority !== priority) {
        matches = false;
      }

      if (matches) {
        return {
          careLineId: rule.targetCareLineId,
          targetProfessionalId: rule.targetProfessionalId,
          targetRoom: rule.targetRoom,
          routingReason: `Regra: ${rule.name}`,
        };
      }
    }

    let careLineId: string | null = null;
    let routingReason = "Roteamento padrão";

    if (context.consultationId) {
      try {
        const resolution = await CareLineResolutionService.resolveForConsultation(
          context.consultationId,
          unitId
        );
        if (resolution.careLineId) {
          careLineId = resolution.careLineId;
          routingReason = `Linha de cuidado: ${resolution.matchDetails || resolution.matchReason}`;
        }
      } catch (e) {
      }
    }

    if (!careLineId && age <= 12) {
      const pediatricCareLine = await db.query.careLines.findFirst({
        where: and(
          eq(schema.careLines.unitId, unitId),
          eq(schema.careLines.code, "PUERICULTURA"),
          eq(schema.careLines.active, true)
        ),
      });
      if (pediatricCareLine) {
        careLineId = pediatricCareLine.id;
        routingReason = "Idade: criança (0-12 anos)";
      }
    }

    if (!careLineId && age >= 60) {
      const elderlyCareLine = await db.query.careLines.findFirst({
        where: and(
          eq(schema.careLines.unitId, unitId),
          eq(schema.careLines.code, "IDOSO"),
          eq(schema.careLines.active, true)
        ),
      });
      if (elderlyCareLine) {
        careLineId = elderlyCareLine.id;
        routingReason = "Idade: idoso (60+ anos)";
      }
    }

    return {
      careLineId,
      targetProfessionalId: null,
      targetRoom: null,
      routingReason,
    };
  }

  /**
   * Create queue entry with automatic routing
   */
  static async createRoutedQueueEntry(
    entry: schema.InsertAttendanceQueue,
    context: Partial<QueueRoutingContext> = {}
  ): Promise<{ queueEntry: schema.AttendanceQueue; routing: QueueRoutingResult }> {
    const routingContext: QueueRoutingContext = {
      citizenId: entry.citizenId,
      unitId: entry.unitId,
      appointmentType: entry.type,
      priority: entry.priority as any,
      ...context,
    };

    const routing = await this.routePatient(routingContext);

    const entryWithRouting: schema.InsertAttendanceQueue = {
      ...entry,
      careLineId: routing.careLineId || entry.careLineId,
      professionalId: routing.targetProfessionalId || entry.professionalId,
    };

    const [created] = await db
      .insert(schema.attendanceQueue)
      .values(entryWithRouting)
      .returning();

    return { queueEntry: created, routing };
  }

  /**
   * Get available slots for a professional on a specific date
   */
  static async getAvailableSlots(
    professionalId: string,
    unitId: string,
    date: Date
  ): Promise<Array<{ time: string; available: boolean; appointmentId?: string }>> {
    const dayOfWeek = date.getDay();

    const schedules = await db.query.professionalSchedules.findMany({
      where: and(
        eq(schema.professionalSchedules.professionalId, professionalId),
        eq(schema.professionalSchedules.unitId, unitId),
        eq(schema.professionalSchedules.dayOfWeek, dayOfWeek),
        eq(schema.professionalSchedules.active, true)
      ),
    });

    if (schedules.length === 0) {
      return [];
    }

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const existingAppointments = await db.query.appointments.findMany({
      where: and(
        eq(schema.appointments.professionalId, professionalId),
        eq(schema.appointments.unitId, unitId)
      ),
    });

    const bookedTimes = new Set(
      existingAppointments
        .filter(a => {
          const apptDate = new Date(a.appointmentDate);
          return apptDate >= startOfDay && apptDate <= endOfDay && a.status !== "cancelled";
        })
        .map(a => {
          const apptDate = new Date(a.appointmentDate);
          return `${apptDate.getHours().toString().padStart(2, '0')}:${apptDate.getMinutes().toString().padStart(2, '0')}`;
        })
    );

    const slots: Array<{ time: string; available: boolean; appointmentId?: string }> = [];

    for (const schedule of schedules) {
      const [startHour, startMin] = schedule.startTime.split(':').map(Number);
      const [endHour, endMin] = schedule.endTime.split(':').map(Number);
      
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;
      const duration = schedule.slotDuration;

      for (let mins = startMinutes; mins < endMinutes; mins += duration) {
        const hour = Math.floor(mins / 60);
        const min = mins % 60;
        const timeStr = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
        
        slots.push({
          time: timeStr,
          available: !bookedTimes.has(timeStr),
        });
      }
    }

    return slots.sort((a, b) => a.time.localeCompare(b.time));
  }

  /**
   * Check waiting list and auto-schedule when slots become available
   */
  static async processWaitingList(unitId: string): Promise<number> {
    const waitingEntries = await db.query.waitingList.findMany({
      where: and(
        eq(schema.waitingList.unitId, unitId),
        eq(schema.waitingList.status, "waiting")
      ),
      orderBy: [
        desc(sql`CASE 
          WHEN priority = 'emergency' THEN 4 
          WHEN priority = 'urgent' THEN 3 
          WHEN priority = 'priority' THEN 2 
          ELSE 1 
        END`),
        asc(schema.waitingList.requestDate)
      ],
    });

    let scheduledCount = 0;

    for (const entry of waitingEntries) {
      if (!entry.professionalId) continue;

      const today = new Date();
      for (let d = 0; d < 30; d++) {
        const checkDate = new Date(today);
        checkDate.setDate(today.getDate() + d);

        if (entry.preferredDays && entry.preferredDays.length > 0) {
          const dayOfWeek = checkDate.getDay();
          if (!entry.preferredDays.includes(dayOfWeek)) continue;
        }

        const slots = await this.getAvailableSlots(
          entry.professionalId,
          unitId,
          checkDate
        );

        const availableSlot = slots.find(s => s.available);
        if (availableSlot) {
          const [hour, minute] = availableSlot.time.split(':').map(Number);
          const appointmentDate = new Date(checkDate);
          appointmentDate.setHours(hour, minute, 0, 0);

          const [appointment] = await db
            .insert(schema.appointments)
            .values({
              citizenId: entry.citizenId,
              professionalId: entry.professionalId,
              unitId: entry.unitId,
              appointmentDate: appointmentDate,
              status: "scheduled",
              type: "consulta",
              notes: `Agendado automaticamente da lista de espera. Motivo: ${entry.reason || 'N/A'}`,
            })
            .returning();

          await db
            .update(schema.waitingList)
            .set({
              status: "scheduled",
              scheduledAppointmentId: appointment.id,
              notifiedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(schema.waitingList.id, entry.id));

          scheduledCount++;
          break;
        }
      }
    }

    return scheduledCount;
  }

  private static calculateAge(birthDate: Date): number {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  }
}

