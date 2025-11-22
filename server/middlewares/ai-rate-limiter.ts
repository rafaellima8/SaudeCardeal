import type { Request, Response, NextFunction } from "express";

// ============================================================================
// IN-MEMORY RATE LIMITER FOR AI ENDPOINTS
// ============================================================================
// NOTA: Este rate limiter usa armazenamento em memória e reseta ao reiniciar o servidor.
// Para ambientes com múltiplas instâncias, substitua por Redis ou similar.
// Atualmente, o sistema deve rodar em instância única até implementar persistência.

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Configuration
const AI_RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const AI_RATE_LIMIT_MAX_REQUESTS = 10; // 10 requests per minute per user

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  rateLimitStore.forEach((entry, userId) => {
    if (entry.resetAt < now) {
      rateLimitStore.delete(userId);
    }
  });
}, 5 * 60 * 1000);

export function aiRateLimiter(req: Request, res: Response, next: NextFunction) {
  const userId = req.session.user?.id;
  
  if (!userId) {
    return res.status(401).json({ error: "Não autenticado" });
  }

  const now = Date.now();
  const entry = rateLimitStore.get(userId);

  if (!entry || entry.resetAt < now) {
    // Create new entry or reset expired one
    rateLimitStore.set(userId, {
      count: 1,
      resetAt: now + AI_RATE_LIMIT_WINDOW_MS,
    });
    return next();
  }

  if (entry.count >= AI_RATE_LIMIT_MAX_REQUESTS) {
    const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);
    return res.status(429).json({
      error: "Limite de requisições de IA excedido",
      message: `Você excedeu o limite de ${AI_RATE_LIMIT_MAX_REQUESTS} requisições por minuto para IA. Tente novamente em ${retryAfterSeconds} segundos.`,
      retryAfter: retryAfterSeconds,
    });
  }

  entry.count++;
  return next();
}
