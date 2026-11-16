export type Rol = 'SUPERADMIN' | 'ADMIN_AGENCIA' | 'FUNCIONARIO' | 'ASOCIADO';

export interface AsignacionRol {
  rol: Rol;
  agenciaId?: string;
  servicioId?: string;
}

/** La interfaz oculta lo que el rol no puede hacer; el backend vuelve a verificarlo en cada API. */
export function puedeAcceder(roles: AsignacionRol[], permitidos: Rol[]): boolean {
  return roles.some((asignacion) => permitidos.includes(asignacion.rol));
}

/** Panel inicial de cada rol después de iniciar sesión. Los directivos de agencia abren la administración. */
export function panelInicial(roles: AsignacionRol[]): string {
  if (puedeAcceder(roles, ['SUPERADMIN', 'ADMIN_AGENCIA'])) return '/administracion';
  if (puedeAcceder(roles, ['FUNCIONARIO'])) return '/funcionario';
  if (puedeAcceder(roles, ['ASOCIADO'])) return '/asociado';
  return '/no-autorizado';
}

/** Enlaces del menú según los roles. */
export function menuPara(roles: AsignacionRol[]): { ruta: string; texto: string }[] {
  const menu: { ruta: string; texto: string }[] = [];
  if (puedeAcceder(roles, ['SUPERADMIN', 'ADMIN_AGENCIA'])) menu.push({ ruta: '/administracion', texto: 'Administración' });
  if (puedeAcceder(roles, ['SUPERADMIN', 'ADMIN_AGENCIA'])) menu.push({ ruta: '/indicadores', texto: 'Indicadores' });
  if (puedeAcceder(roles, ['FUNCIONARIO', 'ADMIN_AGENCIA'])) menu.push({ ruta: '/funcionario', texto: 'Atención' });
  if (puedeAcceder(roles, ['ASOCIADO'])) menu.push({ ruta: '/asociado', texto: 'Mi turno' });
  menu.push({ ruta: '/mi-cuenta', texto: 'Mi cuenta' });
  return menu;
}

export function esSuperadmin(roles: AsignacionRol[]): boolean {
  return roles.some((r) => r.rol === 'SUPERADMIN');
}

export function agenciasAdministradas(roles: AsignacionRol[]): string[] {
  return roles.filter((r) => r.rol === 'ADMIN_AGENCIA' && r.agenciaId).map((r) => r.agenciaId!);
}

/** Espejo de la política del backend (RN-15) para ocultar botones que fallarían con 403. */
export function puedeAsignarRol(actor: AsignacionRol[], asignacion: AsignacionRol): boolean {
  if (esSuperadmin(actor)) return true;
  return asignacion.rol === 'FUNCIONARIO' && !!asignacion.agenciaId && agenciasAdministradas(actor).includes(asignacion.agenciaId);
}
