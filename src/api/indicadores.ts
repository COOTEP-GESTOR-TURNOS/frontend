import { pedir } from './http';
import { agregarFiltros, type FiltrosAnalitica, type RangoAnalitica } from './filtrosAnalitica';
import { fechaColombia } from './recomendaciones';

export interface ValoresIndicadores {
  solicitados?: number | null;
  pendientes?: number | null;
  atendidos: number;
  cancelados: number;
  ausentes: number;
  esperaPromedioMin: number;
  atencionPromedioMin: number;
  proporcionPreferencial: number;
}

export interface IndicadoresAgencia extends ValoresIndicadores {
  agenciaId: string;
  nombre: string;
  disponible: boolean;
}

export interface TableroIndicadores {
  desde: string;
  hasta: string;
  ambito: 'GLOBAL' | 'AGENCIA';
  agencias: IndicadoresAgencia[];
  total: ValoresIndicadores;
}

/** RF-19: GET /api/v1/indicadores. El backend aplica el ámbito: el directivo solo recibe su agencia. */
export const indicadoresApi = {
  consultar: ({ desde, hasta, ...filtros }: RangoAnalitica & FiltrosAnalitica) => {
    const consulta = agregarFiltros(new URLSearchParams({ desde, hasta }), filtros);
    return pedir<TableroIndicadores>('GET', `/indicadores?${consulta.toString()}`);
  },
};

/** Últimos n días hasta hoy, con la fecha de Colombia (hoy cuenta como uno de ellos). */
export function ultimosDias(dias: number, ahora = new Date()): { desde: string; hasta: string } {
  return { desde: fechaColombia(-(dias - 1), ahora), hasta: fechaColombia(0, ahora) };
}

export function totalTurnos(v: ValoresIndicadores): number {
  return v.atendidos + v.cancelados + v.ausentes;
}

/** Porcentaje entero, "0 %" si no hay base. */
export function porcentaje(parte: number, base: number): string {
  return base ? `${Math.round((parte / base) * 100)} %` : '0 %';
}

export function minutos(valor: number): string {
  return `${valor.toLocaleString('es-CO', { maximumFractionDigits: 1 })} min`;
}

export function entero(valor: number): string {
  return valor.toLocaleString('es-CO');
}
