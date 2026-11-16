import { pedir } from './http';

export interface FranjaRecomendada {
  desde: string;
  hasta: string;
  esperaMedianaMin: number;
  turnos: number;
}

export interface RecomendacionHorario {
  agenciaId: string;
  servicioId: string;
  fecha: string;
  tipoDia: string | null;
  horario: { apertura: string; cierre: string };
  disponible: boolean;
  franjas: FranjaRecomendada[];
}

/** RF-10: GET /api/v1/recomendaciones (el backend principal consulta la analítica y guarda 15 min en Redis). */
export const recomendacionesApi = {
  consultar: (agenciaId: string, servicioId: string, fecha: string) =>
    pedir<RecomendacionHorario>('GET', `/recomendaciones?${new URLSearchParams({ agenciaId, servicioId, fecha }).toString()}`),
};

/** Fecha AAAA-MM-DD en Colombia, hoy (0) o dentro de n días. Colombia no cambia de horario en el año. */
export function fechaColombia(dias = 0, ahora = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' }).format(
    new Date(ahora.getTime() + dias * 86_400_000),
  );
}

/** "menos de 1 min", "unos 3 min": la cifra es una mediana histórica, no una promesa. */
export function textoEspera(minutos: number): string {
  return minutos < 1 ? 'menos de 1 min de espera' : `unos ${Math.round(minutos)} min de espera`;
}
