/**
 * Sistema de permissões por perfil de usuário
 * Define quais funcionalidades cada role pode acessar
 */

export type UserRole = "admin" | "medico" | "enfermeiro" | "acs" | "farmaceutico" | "gestor" | "recepcao" | "assistencia_social";

export interface MenuItem {
  title: string;
  url: string;
  allowedRoles: UserRole[];
}

/**
 * Configuração de permissões de menu por funcionalidade
 */
export const menuPermissions = {
  dashboard: ["admin", "medico", "enfermeiro", "farmaceutico", "gestor", "recepcao", "assistencia_social"] as UserRole[],
  recepcao: ["admin", "recepcao", "enfermeiro"] as UserRole[],
  pacientes: ["admin", "medico", "enfermeiro", "recepcao"] as UserRole[],
  agendamentos: ["admin", "medico", "enfermeiro", "recepcao"] as UserRole[],
  "fila de atendimento": ["admin", "medico", "enfermeiro", "recepcao"] as UserRole[],
  atendimentos: ["admin", "medico", "enfermeiro"] as UserRole[],
  prescricoes: ["admin", "medico", "enfermeiro", "farmaceutico"] as UserRole[],
  territorio: ["admin", "acs", "enfermeiro", "gestor"] as UserRole[],
  "ace dashboard": ["admin", "acs", "gestor"] as UserRole[],
  "ace imoveis": ["admin", "acs", "gestor"] as UserRole[],
  "ace visitas": ["admin", "acs", "gestor"] as UserRole[],
  "ace focos": ["admin", "acs", "gestor"] as UserRole[],
  ace: ["admin", "acs", "gestor"] as UserRole[],
  endemias: ["admin", "acs", "gestor"] as UserRole[],
  farmacia: ["admin", "farmaceutico", "gestor"] as UserRole[],
  dispensacao: ["admin", "farmaceutico", "gestor"] as UserRole[],
  estoque: ["admin", "farmaceutico", "gestor"] as UserRole[],
  fraldas: ["admin", "farmaceutico", "gestor", "assistencia_social"] as UserRole[],
  tfd: ["admin", "gestor", "recepcao"] as UserRole[],
  "assistencia social": ["admin", "gestor", "assistencia_social"] as UserRole[],
  beneficiarios: ["admin", "gestor", "assistencia_social"] as UserRole[],
  relatorios: ["admin", "medico", "gestor", "assistencia_social"] as UserRole[],
  unidades: ["admin", "gestor"] as UserRole[],
  profissionais: ["admin", "gestor"] as UserRole[],
  indicadores: ["admin", "gestor"] as UserRole[],
  "protocolos clinicos": ["admin", "gestor"] as UserRole[],
  "formularios dinamicos": ["admin", "gestor"] as UserRole[],
  "exportacao e-sus": ["admin", "gestor"] as UserRole[],
  sinan: ["admin", "medico", "enfermeiro", "gestor"] as UserRole[],
  formularios: ["admin", "gestor"] as UserRole[],
  workflows: ["admin", "gestor"] as UserRole[],
  alertas: ["admin", "gestor", "farmaceutico", "assistencia_social"] as UserRole[],
  "relatorios estrategicos": ["admin", "gestor"] as UserRole[],
};

/**
 * Verifica se um usuário tem permissão para acessar uma funcionalidade
 */
export function hasPermission(userRole: UserRole, feature: keyof typeof menuPermissions): boolean {
  return menuPermissions[feature].includes(userRole);
}

/**
 * Filtra itens de menu baseado no role do usuário
 */
export function filterMenuByRole<T extends { title: string }>(
  items: T[],
  userRole: UserRole
): T[] {
  return items.filter((item) => {
    const featureKey = item.title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") as keyof typeof menuPermissions;
    // Check if the feature key exists in menuPermissions
    if (!menuPermissions[featureKey]) {
      console.warn(`Permission key "${featureKey}" not found for menu item "${item.title}"`);
      return false;
    }
    return hasPermission(userRole, featureKey);
  });
}
