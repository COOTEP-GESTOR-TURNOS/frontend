import type { AsignacionRol } from '../auth/permisos';
import { pedir } from './http';

export type TipoDocumento = 'CC' | 'CE' | 'TI' | 'PA';
export const TIPOS_DOCUMENTO: { valor: TipoDocumento; texto: string }[] = [
  { valor: 'CC', texto: 'Cédula de ciudadanía' },
  { valor: 'CE', texto: 'Cédula de extranjería' },
  { valor: 'TI', texto: 'Tarjeta de identidad' },
  { valor: 'PA', texto: 'Pasaporte' },
];

export interface Perfil {
  id: string;
  email: string;
  nombre: string;
  tipoDocumento: TipoDocumento | null;
  numeroDocumento: string | null;
  fechaNacimiento: string | null;
  roles: AsignacionRol[];
  mfaActivo: boolean;
  tienePassword: boolean;
  perfilCompleto: boolean;
}

export type Paso = 'CAMBIAR_CLAVE' | 'CONFIGURAR_MFA' | 'VERIFICAR_MFA';

export interface SesionAbierta {
  estado: 'SESION_INICIADA';
  tokenAcceso: string;
  expiraEn: number;
  usuario: Perfil;
}

export interface PasoPendiente {
  estado: 'PASO_PENDIENTE';
  reto: string;
  paso: Paso;
  nombre: string;
}

export type ResultadoIngreso = SesionAbierta | PasoPendiente;

export interface DatosRegistro {
  email: string;
  nombre: string;
  tipoDocumento: TipoDocumento;
  numeroDocumento: string;
  fechaNacimiento?: string;
  clave: string;
}

const sinRenovar = { renovarSi401: false };

/** Endpoints de /auth del backend principal (sección 9 del informe). */
export const authApi = {
  login: (correo: string, clave: string) =>
    pedir<ResultadoIngreso>('POST', '/auth/login', { cuerpo: { correo, clave }, ...sinRenovar }),
  claveInicial: (reto: string, claveNueva: string) =>
    pedir<ResultadoIngreso>('POST', '/auth/clave-inicial', { cuerpo: { reto, claveNueva }, ...sinRenovar }),
  configurarMfa: (reto: string) =>
    pedir<{ secreto: string; uri: string; qr: string }>('POST', '/auth/mfa/configurar', { cuerpo: { reto }, ...sinRenovar }),
  verificarMfa: (reto: string, codigo: string) =>
    pedir<ResultadoIngreso>('POST', '/auth/mfa/verificar', { cuerpo: { reto, codigo }, ...sinRenovar }),
  renovar: () => pedir<SesionAbierta>('POST', '/auth/renovar', { cuerpo: {}, ...sinRenovar }),
  cerrarSesion: () => pedir<void>('POST', '/auth/cerrar-sesion', { cuerpo: {}, ...sinRenovar }),
  yo: () => pedir<Perfil>('GET', '/auth/yo'),
  actualizarPerfil: (cambios: Partial<Pick<Perfil, 'nombre' | 'tipoDocumento' | 'numeroDocumento' | 'fechaNacimiento'>>) =>
    pedir<void>('PATCH', '/auth/yo', { cuerpo: cambios }),
  cambiarClave: (claveNueva: string, claveActual?: string) =>
    pedir<void>('POST', '/auth/yo/clave', { cuerpo: { claveNueva, ...(claveActual ? { claveActual } : {}) } }),
  registro: (datos: DatosRegistro) =>
    pedir<{ email: string; mensaje: string }>('POST', '/auth/registro', { cuerpo: datos, ...sinRenovar }),
  verificarCorreo: (token: string) => pedir<void>('POST', '/auth/verificar-correo', { cuerpo: { token }, ...sinRenovar }),
  reenviarVerificacion: (correo: string) =>
    pedir<{ mensaje: string }>('POST', '/auth/verificar-correo/reenviar', { cuerpo: { correo }, ...sinRenovar }),
  recuperar: (correo: string) => pedir<{ mensaje: string }>('POST', '/auth/recuperar', { cuerpo: { correo }, ...sinRenovar }),
  restablecer: (token: string, claveNueva: string) =>
    pedir<void>('POST', '/auth/restablecer', { cuerpo: { token, claveNueva }, ...sinRenovar }),
};

/** Mínimo de la política de contraseñas: 15 sin MFA, 8 con MFA (NIST SP 800-63B-4). */
export function minimoClave(roles: AsignacionRol[]): number {
  return roles.some((r) => r.rol === 'SUPERADMIN' || r.rol === 'ADMIN_AGENCIA') ? 8 : 15;
}
