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

/** Secciones del menú en orden; Mi cuenta la ven todos. */
const MENU: { ruta: string; permitidos: Rol[]; texto: string | ((roles: AsignacionRol[]) => string) }[] = [
  { ruta: '/administracion', permitidos: ['SUPERADMIN', 'ADMIN_AGENCIA'], texto: 'Administración' },
  { ruta: '/gestion-agencia', permitidos: ['SUPERADMIN', 'ADMIN_AGENCIA'], texto: (roles) => (esSuperadmin(roles) ? 'Agencias' : 'Mi agencia') },
  { ruta: '/indicadores', permitidos: ['SUPERADMIN', 'ADMIN_AGENCIA'], texto: 'Indicadores' },
  { ruta: '/auditoria', permitidos: ['SUPERADMIN'], texto: 'Auditoría' },
  { ruta: '/funcionario', permitidos: ['FUNCIONARIO', 'ADMIN_AGENCIA'], texto: 'Atención' },
  { ruta: '/asociado', permitidos: ['ASOCIADO'], texto: 'Mi turno' },
  { ruta: '/mi-cuenta', permitidos: ['SUPERADMIN', 'ADMIN_AGENCIA', 'FUNCIONARIO', 'ASOCIADO'], texto: 'Mi cuenta' },
];

/** Enlaces del menú según los roles. */
export function menuPara(roles: AsignacionRol[]): { ruta: string; texto: string }[] {
  return MENU.filter((m) => m.ruta === '/mi-cuenta' || puedeAcceder(roles, m.permitidos)).map((m) => ({
    ruta: m.ruta,
    texto: typeof m.texto === 'function' ? m.texto(roles) : m.texto,
  }));
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
