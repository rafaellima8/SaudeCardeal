import { useQuery } from "@tanstack/react-query";
import type { UserRole } from "@/lib/permissions";

/**
 * Interface do usuário atual
 */
export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  unitId?: string;
}

/**
 * Hook para obter informações do usuário atual autenticado
 */
export function useCurrentUser() {
  const { data: user, isLoading, error } = useQuery<CurrentUser>({
    queryKey: ['/api/auth/me'],
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  return {
    user,
    isLoading,
    isAuthenticated: !error && !!user,
    isACS: user?.role === 'acs',
    isAdmin: user?.role === 'admin',
    isGestor: user?.role === 'gestor',
  };
}

