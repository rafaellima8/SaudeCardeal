import { db } from "../db";
import { aiAuditLogs } from "@shared/schema";
import type { InsertAiAuditLog } from "@shared/schema";

// ============================================================================
// AI AUDIT LOGGING - Compliance & Security
// ============================================================================

export async function logAIInteraction(audit: InsertAiAuditLog): Promise<void> {
  try {
    await db.insert(aiAuditLogs).values(audit);
  } catch (error) {
    console.error("[AI Audit] Failed to log interaction:", error);
    // Don't throw - audit failure should not block AI operations
  }
}
