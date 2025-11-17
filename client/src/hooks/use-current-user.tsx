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
 * Hook para obter informações do usuário atual
 * TODO: Integrar com sistema de autenticação real
 */
export function useCurrentUser() {
  const { data: user, isLoading } = useQuery<CurrentUser>({
    queryKey: ['/api/auth/me'],
    // Por enquanto retorna usuário mockado para demonstração
    // Em produção, isso virá de uma API real
    queryFn: async () => {
      // Simula chamada à API
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Retorna usuário mockado baseado em localStorage para fins de desenvolvimento
      const mockRole = (localStorage.getItem('dev_user_role') as UserRole) || 'acs';
      const roleNames: Record<UserRole, string> = {
        admin: 'Administrador',
        medico: 'Médico(a)',
        enfermeiro: 'Enfermeiro(a)',
        acs: 'Agente Comunitário',
        farmaceutico: 'Farmacêutico(a)',
        gestor: 'Gestor(a)',
        recepcao: 'Recepcionista',
      };
      
      return {
        id: '1',
        name: mockRole === 'acs' ? 'João Silva' : 'Dr. Maria Silva',
        email: mockRole === 'acs' ? 'joao.silva@saude.gov.br' : 'maria.silva@saude.gov.br',
        role: mockRole,
        unitId: '1',
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  return {
    user,
    isLoading,
    isACS: user?.role === 'acs',
    isAdmin: user?.role === 'admin',
    isGestor: user?.role === 'gestor',
  };
}

/**
 * Componente de desenvolvimento para alternar entre perfis
 */
export function DevRoleSwitcher() {
  if (import.meta.env.PROD) return null;

  const roles: UserRole[] = ['acs', 'admin', 'medico', 'enfermeiro', 'farmaceutico', 'gestor', 'recepcao'];
  const currentRole = (localStorage.getItem('dev_user_role') as UserRole) || 'acs';

  const handleRoleChange = (role: UserRole) => {
    localStorage.setItem('dev_user_role', role);
    window.location.reload();
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 rounded-lg border bg-card p-3 shadow-lg">
      <div className="text-xs font-semibold text-muted-foreground mb-2">Dev: Trocar Perfil</div>
      <select
        value={currentRole}
        onChange={(e) => handleRoleChange(e.target.value as UserRole)}
        className="w-full rounded border bg-background px-2 py-1 text-sm"
        data-testid="dev-role-switcher"
      >
        {roles.map((role) => (
          <option key={role} value={role}>
            {role.toUpperCase()}
          </option>
        ))}
      </select>
    </div>
  );
}
