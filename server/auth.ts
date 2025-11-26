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

/**
 * MULTI-TENANT SECURITY ENFORCEMENT
 * 
 * Interface for tenant-scoped operations.
 * All data access should be scoped to the user's health unit unless
 * the user has a cross-unit role (admin, gestor).
 */
export interface TenantScope {
  unitId: string | null;
  allowCrossUnit: boolean;
  userId: string;
  userRole: UserRole;
}

/**
 * Roles that can access data across multiple health units.
 * All other roles are strictly bound to their assigned unit.
 */
export const CROSS_UNIT_ROLES: UserRole[] = ["admin", "gestor"];

/**
 * Extracts tenant scope from the current session.
 * Returns null if session is invalid.
 */
export function getTenantScope(req: Request): TenantScope | null {
  if (!req.session?.user) {
    return null;
  }
  
  const user = req.session.user;
  const allowCrossUnit = CROSS_UNIT_ROLES.includes(user.role);
  
  return {
    unitId: user.unitId || null,
    allowCrossUnit,
    userId: user.id,
    userRole: user.role,
  };
}

/**
 * Middleware that enforces multi-tenant scope on routes.
 * - Validates session has unitId (for non-cross-unit roles)
 * - Blocks client-provided unitId unless user has cross-unit role
 * - Injects validated scope into request for downstream use
 */
export function enforceUnitScope(options?: { 
  allowCrossUnit?: boolean;
  requireUnitId?: boolean;
}) {
  const { allowCrossUnit = false, requireUnitId = true } = options || {};
  
  return (req: Request, res: Response, next: NextFunction) => {
    const scope = getTenantScope(req);
    
    if (!scope) {
      return res.status(401).json({ error: "Não autenticado" });
    }
    
    const isCrossUnitUser = CROSS_UNIT_ROLES.includes(scope.userRole);
    
    if (!isCrossUnitUser && requireUnitId && !scope.unitId) {
      return res.status(403).json({ 
        error: "Usuário não está vinculado a uma unidade de saúde" 
      });
    }
    
    if (!isCrossUnitUser && !allowCrossUnit) {
      const clientUnitId = req.query.unitId as string | undefined;
      if (clientUnitId && clientUnitId !== scope.unitId) {
        return res.status(403).json({ 
          error: "Acesso negado: não é permitido acessar dados de outra unidade" 
        });
      }
      
      // Override client unitId with session unitId if user has a unit assigned
      if (req.query.unitId !== undefined && scope.unitId) {
        req.query.unitId = scope.unitId;
      }
    }
    
    (req as any).tenantScope = scope;
    
    next();
  };
}

/**
 * Helper to get validated unitId for queries.
 * For cross-unit users, returns the requested unitId or null (all units).
 * For regular users, always returns their session unitId.
 */
export function getEffectiveUnitId(req: Request): string | null {
  const scope = (req as any).tenantScope as TenantScope | undefined;
  
  if (!scope) {
    return req.session?.user?.unitId || null;
  }
  
  if (scope.allowCrossUnit || CROSS_UNIT_ROLES.includes(scope.userRole)) {
    return (req.query.unitId as string) || null;
  }
  
  return scope.unitId;
}

/**
 * Validates that an entity belongs to the user's unit.
 * For cross-unit users, always returns true.
 * For regular users, validates entityUnitId matches session unitId.
 */
export function validateEntityAccess(req: Request, entityUnitId: string | null): boolean {
  const scope = (req as any).tenantScope as TenantScope | undefined;
  const sessionUser = req.session?.user;
  
  if (!sessionUser) {
    return false;
  }
  
  if (CROSS_UNIT_ROLES.includes(sessionUser.role)) {
    return true;
  }
  
  if (!entityUnitId) {
    return true;
  }
  
  return entityUnitId === sessionUser.unitId;
}
