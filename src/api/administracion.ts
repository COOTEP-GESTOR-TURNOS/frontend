import type { AsignacionRol, Rol } from '../auth/permisos';
import type { TipoDocumento } from './auth';
import { pedir } from './http';

export interface AsignacionGuardada extends AsignacionRol {
  id: string;
  asignadoEn: string;
}

export interface FichaUsuario {
  id: string;
  email: string;
  nombre: string;
  tipoDocumento: TipoDocumento | null;
  numeroDocumento: string | null;
  fechaNacimiento: string | null;
  activo: boolean;
  emailVerificado: boolean;
  mfaActivo: boolean;
  tienePassword: boolean;
  creadoEn: string;
  ultimoIngresoEn: string | null;
  roles: AsignacionGuardada[];
}

export interface PaginaUsuarios {
  elementos: FichaUsuario[];
  total: number;
  pagina: number;
  tamano: number;
}

export interface FiltroUsuarios {
  texto?: string;
  rol?: Rol;
  agenciaId?: string;
  activo?: boolean;
  pagina?: number;
}

export interface ServicioCatalogo {
  id: string;
  codigo: string;
  nombre: string;
  prefijo: string;
  ventanillas: number;
}

export interface AgenciaCatalogo {
  id: string;
  codigo: string;
  nombre: string;
  municipio: string;
  activa: boolean;
  servicios: ServicioCatalogo[];
}

export interface NuevoUsuario extends AsignacionRol {
  email: string;
  nombre: string;
  tipoDocumento?: TipoDocumento;
  numeroDocumento?: string;
}

function consulta(f: FiltroUsuarios): string {
  const p = new URLSearchParams();
  for (const [clave, valor] of Object.entries(f)) {
    if (valor !== undefined && valor !== '') p.set(clave, String(valor));
  }
  const texto = p.toString();
  return texto ? `?${texto}` : '';
}

/** Endpoints de /admin/usuarios y del catálogo (RF-06, RF-18). */
export const administracionApi = {
  agencias: () => pedir<AgenciaCatalogo[]>('GET', '/agencias'),
  listar: (f: FiltroUsuarios) => pedir<PaginaUsuarios>('GET', `/admin/usuarios${consulta(f)}`),
  obtener: (id: string) => pedir<FichaUsuario>('GET', `/admin/usuarios/${id}`),
  crear: (datos: NuevoUsuario) =>
    pedir<{ usuario: FichaUsuario; activacionEnviada: boolean }>('POST', '/admin/usuarios', { cuerpo: datos }),
  actualizar: (id: string, cambios: Partial<Pick<FichaUsuario, 'nombre' | 'activo'>>) =>
    pedir<FichaUsuario>('PATCH', `/admin/usuarios/${id}`, { cuerpo: cambios }),
  asignarRol: (id: string, asignacion: AsignacionRol) =>
    pedir<FichaUsuario>('POST', `/admin/usuarios/${id}/roles`, { cuerpo: asignacion }),
  revocarRol: (id: string, asignacionId: string) =>
    pedir<FichaUsuario>('DELETE', `/admin/usuarios/${id}/roles/${asignacionId}`),
  reenviarActivacion: (id: string) => pedir<void>('POST', `/admin/usuarios/${id}/activacion`),
  restablecerMfa: (id: string) => pedir<void>('POST', `/admin/usuarios/${id}/mfa/restablecer`),
};

export const NOMBRE_ROL: Record<Rol, string> = {
  SUPERADMIN: 'Superadministrador',
  ADMIN_AGENCIA: 'Administrador de agencia',
  FUNCIONARIO: 'Funcionario',
  ASOCIADO: 'Asociado',
};
