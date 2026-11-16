/** Cliente de la API del backend principal. Mismo origen: nginx (o Vite en desarrollo) reenvía /api. */
const BASE = '/api/v1';

/** El token de acceso vive solo en memoria (sección 9 del informe); nunca en localStorage. */
let tokenAcceso: string | null = null;
/** La sesión registra aquí cómo renovar el token cuando la API responde 401. */
let renovador: (() => Promise<string | null>) | null = null;

export function fijarToken(token: string | null): void {
  tokenAcceso = token;
}

export function fijarRenovador(funcion: (() => Promise<string | null>) | null): void {
  renovador = funcion;
}

export interface Problema {
  title: string;
  status: number;
  detail?: string;
  codigo?: string;
}

/** Error con el formato Problem Details (RFC 9457) que devuelven los backends. */
export class ErrorApi extends Error {
  constructor(
    readonly status: number,
    readonly problema: Problema,
  ) {
    super(problema.detail ?? problema.title);
  }

  get codigo(): string | undefined {
    return this.problema.codigo;
  }
}

/** Mensaje para mostrar a la persona a partir de cualquier error. */
export function mensajeDeError(error: unknown, porDefecto = 'No se pudo completar la acción'): string {
  if (error instanceof ErrorApi) return error.problema.detail ?? error.message;
  if (error instanceof TypeError) return 'No hay conexión con el servidor';
  return porDefecto;
}

interface Opciones {
  cuerpo?: unknown;
  cabeceras?: Record<string, string>;
  /** false en las rutas de /auth: un 401 ahí es la respuesta, no un token vencido. */
  renovarSi401?: boolean;
}

async function enviar(metodo: string, ruta: string, opciones: Opciones): Promise<Response> {
  return fetch(`${BASE}${ruta}`, {
    method: metodo,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      // Cabecera anti-CSRF: la exige el backend en las peticiones que usan la cookie de sesión.
      'X-Cootep-Csrf': '1',
      ...(tokenAcceso ? { Authorization: `Bearer ${tokenAcceso}` } : {}),
      ...opciones.cabeceras,
    },
    body: opciones.cuerpo === undefined ? undefined : JSON.stringify(opciones.cuerpo),
  });
}

export async function pedir<T>(metodo: string, ruta: string, opciones: Opciones = {}): Promise<T | null> {
  let respuesta = await enviar(metodo, ruta, opciones);
  // El token de acceso dura 10 min: si venció, se renueva una vez con la cookie y se reintenta.
  if (respuesta.status === 401 && opciones.renovarSi401 !== false && tokenAcceso && renovador) {
    const nuevo = await renovador().catch(() => null);
    if (nuevo) respuesta = await enviar(metodo, ruta, opciones);
  }
  if (respuesta.status === 204) return null;
  const datos = await respuesta.json().catch(() => null);
  if (!respuesta.ok) {
    throw new ErrorApi(respuesta.status, (datos as Problema) ?? { title: 'Error', status: respuesta.status });
  }
  return datos as T;
}
