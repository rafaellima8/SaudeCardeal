import { db } from "../db";
import * as schema from "@shared/schema";
import { eq, and, sql, desc } from "drizzle-orm";

interface ReferralContext {
  referralId: string;
  userId: string;
  userName: string;
  unitId: string;
}

interface StatusChangeResult {
  success: boolean;
  referral: typeof schema.medicalReferrals.$inferSelect | null;
  message: string;
  queuePosition?: number;
}

interface CounterReferralData {
  report: string;
  diagnosis?: string;
  conducts?: string;
  followUp?: string;
  attachments?: string[];
}

export class ReferralWorkflowService {
  
  async addToCareLine(referralId: string, careLineId: string, context: ReferralContext): Promise<StatusChangeResult> {
    try {
      const [referral] = await db
        .select()
        .from(schema.medicalReferrals)
        .where(eq(schema.medicalReferrals.id, referralId))
        .limit(1);
      
      if (!referral) {
        return { success: false, referral: null, message: "Encaminhamento não encontrado" };
      }
      
      const [careLine] = await db
        .select()
        .from(schema.careLines)
        .where(eq(schema.careLines.id, careLineId))
        .limit(1);
      
      if (!careLine) {
        return { success: false, referral: null, message: "Linha de cuidado não encontrada" };
      }
      
      const existingQueue = await db
        .select({ count: sql<number>`count(*)` })
        .from(schema.medicalReferrals)
        .where(
          and(
            eq(schema.medicalReferrals.careLineId, careLineId),
            eq(schema.medicalReferrals.status, "pending")
          )
        );
      
      const queuePosition = (existingQueue[0]?.count || 0) + 1;
      
      const statusHistory = (referral.statusHistory || []) as any[];
      statusHistory.push({
        status: "queue_added",
        changedAt: new Date().toISOString(),
        changedBy: context.userName,
        reason: `Adicionado à fila: ${careLine.name}`,
      });
      
      const [updated] = await db
        .update(schema.medicalReferrals)
        .set({
          careLineId,
          queuePosition,
          queueEnteredAt: new Date(),
          statusHistory: statusHistory as any,
          updatedAt: new Date(),
        })
        .where(eq(schema.medicalReferrals.id, referralId))
        .returning();
      
      return {
        success: true,
        referral: updated,
        message: `Encaminhamento adicionado à fila ${careLine.name} na posição ${queuePosition}`,
        queuePosition,
      };
    } catch (error: any) {
      return { success: false, referral: null, message: error.message };
    }
  }
  
  async changeStatus(
    referralId: string,
    newStatus: "pending" | "scheduled" | "in_progress" | "completed" | "cancelled",
    context: ReferralContext,
    reason?: string
  ): Promise<StatusChangeResult> {
    try {
      const [referral] = await db
        .select()
        .from(schema.medicalReferrals)
        .where(eq(schema.medicalReferrals.id, referralId))
        .limit(1);
      
      if (!referral) {
        return { success: false, referral: null, message: "Encaminhamento não encontrado" };
      }
      
      const validTransitions: Record<string, string[]> = {
        pending: ["scheduled", "cancelled"],
        scheduled: ["in_progress", "cancelled"],
        in_progress: ["completed", "cancelled"],
      };
      
      const allowedStatuses = validTransitions[referral.status] || [];
      if (!allowedStatuses.includes(newStatus)) {
        return {
          success: false,
          referral: null,
          message: `Transição inválida: ${referral.status} → ${newStatus}`,
        };
      }
      
      const statusHistory = (referral.statusHistory || []) as any[];
      statusHistory.push({
        status: newStatus,
        changedAt: new Date().toISOString(),
        changedBy: context.userName,
        reason: reason || `Status alterado para ${newStatus}`,
      });
      
      const updateData: any = {
        status: newStatus,
        statusHistory,
        updatedAt: new Date(),
      };
      
      if (newStatus === "completed") {
        updateData.completedDate = new Date();
      }
      
      const [updated] = await db
        .update(schema.medicalReferrals)
        .set(updateData)
        .where(eq(schema.medicalReferrals.id, referralId))
        .returning();
      
      return { success: true, referral: updated, message: `Status atualizado para ${newStatus}` };
    } catch (error: any) {
      return { success: false, referral: null, message: error.message };
    }
  }
  
  async registerCounterReferral(
    referralId: string,
    data: CounterReferralData,
    context: ReferralContext
  ): Promise<StatusChangeResult> {
    try {
      const [referral] = await db
        .select()
        .from(schema.medicalReferrals)
        .where(eq(schema.medicalReferrals.id, referralId))
        .limit(1);
      
      if (!referral) {
        return { success: false, referral: null, message: "Encaminhamento não encontrado" };
      }
      
      if (referral.status !== "in_progress" && referral.status !== "completed") {
        return {
          success: false,
          referral: null,
          message: "Contra-referência só pode ser registrada em encaminhamentos em andamento ou concluídos",
        };
      }
      
      const statusHistory = (referral.statusHistory || []) as any[];
      statusHistory.push({
        status: "counter_referral",
        changedAt: new Date().toISOString(),
        changedBy: context.userName,
        reason: "Contra-referência registrada",
      });
      
      const [professional] = await db
        .select()
        .from(schema.professionals)
        .where(eq(schema.professionals.userId, context.userId))
        .limit(1);
      
      const [updated] = await db
        .update(schema.medicalReferrals)
        .set({
          status: "completed",
          completedDate: new Date(),
          counterReferralDate: new Date(),
          counterReferralProfessionalId: professional?.id || null,
          counterReferralReport: data.report,
          counterReferralDiagnosis: data.diagnosis || null,
          counterReferralConducts: data.conducts || null,
          counterReferralFollowUp: data.followUp || null,
          counterReferralAttachments: data.attachments || null,
          statusHistory: statusHistory as any,
          updatedAt: new Date(),
        })
        .where(eq(schema.medicalReferrals.id, referralId))
        .returning();
      
      return {
        success: true,
        referral: updated,
        message: "Contra-referência registrada com sucesso",
      };
    } catch (error: any) {
      return { success: false, referral: null, message: error.message };
    }
  }
  
  async getQueueByCareLine(careLineId: string, unitId?: string) {
    const conditions = [
      eq(schema.medicalReferrals.careLineId, careLineId),
      eq(schema.medicalReferrals.status, "pending"),
    ];
    
    if (unitId) {
      conditions.push(eq(schema.medicalReferrals.unitId, unitId));
    }
    
    const queue = await db
      .select({
        referral: schema.medicalReferrals,
        citizen: schema.citizens,
      })
      .from(schema.medicalReferrals)
      .leftJoin(schema.citizens, eq(schema.medicalReferrals.citizenId, schema.citizens.id))
      .where(and(...conditions))
      .orderBy(
        sql`CASE 
          WHEN ${schema.medicalReferrals.priority} = 'emergency' THEN 1
          WHEN ${schema.medicalReferrals.priority} = 'urgent' THEN 2
          ELSE 3
        END`,
        sql`CASE 
          WHEN ${schema.medicalReferrals.clinicalRisk} = 'alto' THEN 1
          WHEN ${schema.medicalReferrals.clinicalRisk} = 'medio' THEN 2
          ELSE 3
        END`,
        schema.medicalReferrals.queueEnteredAt
      );
    
    return queue;
  }
  
  async getIndicators(unitId: string, startDate?: Date, endDate?: Date) {
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate || new Date();
    
    const totalReferrals = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.medicalReferrals)
      .where(
        and(
          eq(schema.medicalReferrals.unitId, unitId),
          sql`${schema.medicalReferrals.referralDate} >= ${start}`,
          sql`${schema.medicalReferrals.referralDate} <= ${end}`
        )
      );
    
    const completedReferrals = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.medicalReferrals)
      .where(
        and(
          eq(schema.medicalReferrals.unitId, unitId),
          eq(schema.medicalReferrals.status, "completed"),
          sql`${schema.medicalReferrals.referralDate} >= ${start}`,
          sql`${schema.medicalReferrals.referralDate} <= ${end}`
        )
      );
    
    const withCounterReferral = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.medicalReferrals)
      .where(
        and(
          eq(schema.medicalReferrals.unitId, unitId),
          sql`${schema.medicalReferrals.counterReferralDate} IS NOT NULL`,
          sql`${schema.medicalReferrals.referralDate} >= ${start}`,
          sql`${schema.medicalReferrals.referralDate} <= ${end}`
        )
      );
    
    const cancelledReferrals = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.medicalReferrals)
      .where(
        and(
          eq(schema.medicalReferrals.unitId, unitId),
          eq(schema.medicalReferrals.status, "cancelled"),
          sql`${schema.medicalReferrals.referralDate} >= ${start}`,
          sql`${schema.medicalReferrals.referralDate} <= ${end}`
        )
      );
    
    const total = totalReferrals[0]?.count || 0;
    const completed = completedReferrals[0]?.count || 0;
    const counterReferrals = withCounterReferral[0]?.count || 0;
    const cancelled = cancelledReferrals[0]?.count || 0;
    
    return {
      totalReferrals: total,
      completedReferrals: completed,
      counterReferralRate: total > 0 ? ((counterReferrals / total) * 100).toFixed(1) : "0",
      cancellationRate: total > 0 ? ((cancelled / total) * 100).toFixed(1) : "0",
      completionRate: total > 0 ? ((completed / total) * 100).toFixed(1) : "0",
      period: { start, end },
    };
  }
}

export const referralWorkflowService = new ReferralWorkflowService();
