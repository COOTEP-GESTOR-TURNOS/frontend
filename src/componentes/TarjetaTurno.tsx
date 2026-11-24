import { LuMapPin, LuUsersRound } from 'react-icons/lu';
import type { EstadoTurno, Turno } from '../api/turnos';
import { ChipEstado } from './ChipEstado';
import { Etiqueta } from './Etiqueta';

/** Estados en los que la posición en la fila ya no importa. */
const TEXTO_POR_ESTADO: Partial<Record<EstadoTurno, string>> = {
  LLAMADO: 'Acércate a la ventanilla',
  EN_ATENCION: 'Te están atendiendo',
  ATENDIDO: 'Este turno ya terminó',
  CANCELADO: 'Este turno ya terminó',
  AUSENTE: 'Este turno ya terminó',
};

function textoEspera(minutos: number | null | undefined): string {
  return typeof minutos === 'number' ? ` · unos ${Math.max(1, Math.ceil(minutos))} min` : '';
}

function textoPersonas(turno: Turno): string {
  if (turno.personasDelante === null) return 'Calculando tu posición…';
  if (turno.personasDelante === 0) return 'Eres el siguiente';
  return `${turno.personasDelante} ${turno.personasDelante === 1 ? 'persona' : 'personas'} delante${textoEspera(turno.esperaEstimadaMin)}`;
}

function textoPosicion(turno: Turno): string {
  return TEXTO_POR_ESTADO[turno.estado] ?? textoPersonas(turno);
}

/**
 * `lugar`: agencia y servicio del turno según el catálogo, por ejemplo «Caja · Agencia Mocoa».
 * `confirmado`: el asociado ya confirmó que va (cambia la etiqueta del estado Próximo).
 */
export function TarjetaTurno({ turno, titulo = 'Tu turno', lugar, confirmado = false }: { turno: Turno; titulo?: string; lugar?: string; confirmado?: boolean }) {
  return (
    <section
      className="overflow-hidden rounded-xl border border-dorado/50 bg-superficie shadow-sm"
      aria-labelledby={`turno-${turno.id}`}
    >
      {/* El número del turno se ve como el logo: placa verde con letras doradas (5,4:1). */}
      <div className="sobre-verde bg-primario px-5 py-6 text-center sm:px-6">
        <p className="text-sm font-medium text-white/85" id={`turno-${turno.id}`}>
          {titulo}
        </p>
        <p className="mt-1 text-5xl font-bold tracking-tight text-dorado-claro tabular-nums">{turno.codigo ?? '—'}</p>
        {lugar && (
          <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-white/85">
            <LuMapPin aria-hidden className="size-4" />
            {lugar}
          </p>
        )}
      </div>
      <div aria-hidden className="franja-dorada h-1" />
      <div className="flex flex-col items-center gap-3 px-5 py-4 sm:px-6">
        <div className="flex flex-wrap justify-center gap-2">
          <ChipEstado estado={turno.estado} confirmado={confirmado} />
          {turno.tipoAtencion === 'PREFERENCIAL' && <Etiqueta tono="preferencial">Atención preferencial</Etiqueta>}
        </div>
        {/* Región viva: el lector de pantalla anuncia los cambios de posición sin interrumpir */}
        <p aria-live="polite" className="inline-flex items-center gap-2 font-medium text-texto">
          <LuUsersRound aria-hidden className="size-4 text-texto-secundario" />
          {textoPosicion(turno)}
        </p>
      </div>
    </section>
  );
}
