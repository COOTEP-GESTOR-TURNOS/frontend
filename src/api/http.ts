/** Cliente de la API del backend principal. Mismo origen: nginx (o Vite en desarrollo) reenvía /api. */
const BASE = '/api/v1';

/** El token de acceso vive solo en memoria (sección 9 del informe); nunca en localStorage. */
let tokenAcceso: string | null = null;

export function fijarToken(token: string | null): void {
  tokenAcceso = token;
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
}

export async function pedir<T>(
  metodo: string,
  ruta: string,
  opciones: { cuerpo?: unknown; cabeceras?: Record<string, string> } = {},
): Promise<T | null> {
  const respuesta = await fetch(`${BASE}${ruta}`, {
    method: metodo,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(tokenAcceso ? { Authorization: `Bearer ${tokenAcceso}` } : {}),
      ...opciones.cabeceras,
    },
    body: opciones.cuerpo === undefined ? undefined : JSON.stringify(opciones.cuerpo),
  });
  if (respuesta.status === 204) return null;
  const datos = await respuesta.json().catch(() => null);
  if (!respuesta.ok) {
    throw new ErrorApi(respuesta.status, (datos as Problema) ?? { title: 'Error', status: respuesta.status });
  }
  return datos as T;
}
