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

/** Panel inicial de cada rol después de iniciar sesión. */
export function panelInicial(roles: AsignacionRol[]): string {
  if (puedeAcceder(roles, ['SUPERADMIN'])) return '/administracion';
  if (puedeAcceder(roles, ['ADMIN_AGENCIA', 'FUNCIONARIO'])) return '/funcionario';
  if (puedeAcceder(roles, ['ASOCIADO'])) return '/asociado';
  return '/no-autorizado';
}
