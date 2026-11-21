import { LuMapPin, LuUsersRound } from 'react-icons/lu';
import type { Turno } from '../api/turnos';
import { ChipEstado } from './ChipEstado';
import { Etiqueta } from './Etiqueta';

function textoPosicion(turno: Turno): string {
  if (turno.estado === 'LLAMADO') return 'Acércate a la ventanilla';
  if (turno.estado === 'EN_ATENCION') return 'Te están atendiendo';
  if (['ATENDIDO', 'CANCELADO', 'AUSENTE'].includes(turno.estado)) return 'Este turno ya terminó';
  if (turno.personasDelante === null) return 'Calculando tu posición…';
  if (turno.personasDelante === 0) return 'Eres el siguiente';
  const espera = typeof turno.esperaEstimadaMin === 'number' ? ` · unos ${Math.max(1, Math.ceil(turno.esperaEstimadaMin))} min` : '';
  return `${turno.personasDelante} ${turno.personasDelante === 1 ? 'persona' : 'personas'} delante${espera}`;
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
