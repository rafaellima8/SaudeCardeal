import type { Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import type { UserRole } from "@/lib/permissions";

/**
 * Interface para dados do usuário na sessão
 */
export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  unitId?: string;
}

/**
 * Extende o tipo de Session do express-session
 */
declare module "express-session" {
  interface SessionData {
    user?: SessionUser;
  }
}

/**
 * Autentica um usuário com email e senha
 */
export async function authenticateUser(
  email: string,
  password: string
): Promise<SessionUser | null> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user) {
    return null;
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

  if (!isPasswordValid) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as UserRole,
    unitId: user.unitId || undefined,
  };
}

/**
 * Middleware para verificar se o usuário está autenticado
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.user) {
    return res.status(401).json({ error: "Não autenticado" });
  }

  next();
}

/**
 * Middleware para verificar se o usuário tem um dos roles permitidos
 */
export function requireRole(allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.session.user) {
      return res.status(401).json({ error: "Não autenticado" });
    }

    if (!allowedRoles.includes(req.session.user.role)) {
      return res.status(403).json({ error: "Acesso negado" });
    }

    next();
  };
}
