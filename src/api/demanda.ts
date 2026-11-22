import { pedir } from './http';
import { agregarFiltros, type FiltrosAnalitica } from './filtrosAnalitica';
import type { IndicadoresAgencia, ValoresIndicadores } from './indicadores';

export const TIPOS_EVENTO = {
  FESTIVO_LOCAL: 'Festivo local',
  PAGO_SUBSIDIO_FAMILIAR: 'Pago de subsidio familiar',
  PAGO_NOMINA: 'Pago de nómina',
} as const;

export type TipoEvento = keyof typeof TIPOS_EVENTO;
export type NivelDemanda = 'BAJA' | 'MEDIA' | 'ALTA';

export interface DatosEvento {
  fecha: string;
  tipo: TipoEvento;
}

export interface EventoAgencia extends DatosEvento {
  id: string;
  agenciaId?: string;
  agenciaNombre?: string;
}

export interface DiaDemanda {
  fecha: string;
  diaHabil: boolean;
  finDeSemana: boolean;
  festivoNacional: string | null;
  festivosPutumayo: string[];
  vencimientoCredito: boolean;
  eventos: EventoAgencia[];
  turnosRegistrados: number | null;
  turnosEstimados: number | null;
  nivelDemanda: NivelDemanda | null;
}

export interface CalendarioDemanda {
  agenciaId: string | null;
  mes: string;
  fuente: 'REAL' | 'SIMULADA';
  estadoPronostico: 'DISPONIBLE' | 'HISTORIAL_INSUFICIENTE' | 'SOLO_CALENDARIO' | 'INCOMPLETO';
  dias: DiaDemanda[];
}

export interface TableroMensual {
  fuente: CalendarioDemanda['fuente'];
  actualizadoEn: string | null;
  desde: string;
  hasta: string;
  resumen: ValoresIndicadores;
  agencias: IndicadoresAgencia[];
  calendario: CalendarioDemanda;
}

const rutaAgencia = (agenciaId: string) => `/analitica/agencias/${encodeURIComponent(agenciaId)}`;

export const demandaApi = {
  tablero: (mes: string, agenciaId: string, filtros?: Omit<FiltrosAnalitica, 'agenciaId'>) => {
    const consulta = agregarFiltros(new URLSearchParams({ mes }), { agenciaId, ...filtros });
    return pedir<TableroMensual>('GET', `/analitica/tablero?${consulta}`);
  },
  consultar: (agenciaId: string, mes: string, servicioId?: string) =>
    pedir<CalendarioDemanda>('GET', `${rutaAgencia(agenciaId)}/demanda?${agregarFiltros(new URLSearchParams({ mes }), { servicioId })}`),
  crearEvento: (agenciaId: string, cuerpo: DatosEvento) =>
    pedir<EventoAgencia>('POST', `${rutaAgencia(agenciaId)}/eventos`, { cuerpo }),
  editarEvento: (agenciaId: string, eventoId: string, cuerpo: DatosEvento) =>
    pedir<EventoAgencia>('PATCH', `${rutaAgencia(agenciaId)}/eventos/${encodeURIComponent(eventoId)}`, { cuerpo }),
  eliminarEvento: (agenciaId: string, eventoId: string) =>
    pedir<never>('DELETE', `${rutaAgencia(agenciaId)}/eventos/${encodeURIComponent(eventoId)}`),
};

const formatearMes = new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const formatearFecha = new Intl.DateTimeFormat('es-CO', { dateStyle: 'full', timeZone: 'UTC' });
const nivelTexto = { BAJA: 'Baja', MEDIA: 'Media', ALTA: 'Alta' };

/** Cada fecha del servidor representa un día civil de Colombia. UTC permite operar sin desplazarlo. */
export function mesDesplazado(mes: string, desplazamiento: number): string {
  const fecha = new Date(`${mes}-01T00:00:00Z`);
  fecha.setUTCMonth(fecha.getUTCMonth() + desplazamiento);
  return fecha.toISOString().slice(0, 7);
}

export const nombreMes = (mes: string): string => formatearMes.format(new Date(`${mes}-01T00:00:00Z`));
export const nombreFecha = (fecha: string): string => formatearFecha.format(new Date(`${fecha}T00:00:00Z`));
export const huecosDelMes = (mes: string): number => (new Date(`${mes}-01T00:00:00Z`).getUTCDay() + 6) % 7;
export const nombreNivel = (nivel: NivelDemanda): string => nivelTexto[nivel];

export function resumenDia(dia: DiaDemanda, hoy: string): string {
  const cifras: string[] = [];
  if (dia.diaHabil === false) cifras.push('Día no hábil');
  if (dia.turnosRegistrados !== null) cifras.push(`${dia.turnosRegistrados.toLocaleString('es-CO')} turnos registrados`);
  if (dia.diaHabil !== false && dia.turnosEstimados !== null) {
    const nivel = dia.nivelDemanda ? ` · Demanda ${nombreNivel(dia.nivelDemanda).toLowerCase()}` : '';
    cifras.push(`${dia.turnosEstimados.toLocaleString('es-CO')} turnos estimados${nivel}`);
  }
  return cifras.length ? cifras.join(' · ') : dia.fecha < hoy ? 'Sin historial' : 'Sin pronóstico';
}

export function marcasDia(dia: DiaDemanda): string[] {
  return [
    ...(dia.finDeSemana ? ['Fin de semana'] : []),
    ...(dia.festivoNacional ? [`Festivo nacional · ${dia.festivoNacional}`] : []),
    ...dia.festivosPutumayo.map((nombre) => `Día cívico de Putumayo · ${nombre}`),
    ...(dia.vencimientoCredito ? ['Vencimiento de crédito'] : []),
  ];
}

export function horaCorte(instante: string): string {
  return new Date(instante).toLocaleString('es-CO', { timeZone: 'America/Bogota', dateStyle: 'short', timeStyle: 'short' });
}
