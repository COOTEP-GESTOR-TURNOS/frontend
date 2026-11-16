import type { Turno } from '../api/turnos';
import { ChipEstado } from './ChipEstado';

function textoPosicion(turno: Turno): string {
  if (turno.estado === 'LLAMADO') return 'Acércate a la ventanilla';
  if (turno.estado === 'EN_ATENCION') return 'Te están atendiendo';
  if (['ATENDIDO', 'CANCELADO', 'AUSENTE'].includes(turno.estado)) return 'Este turno ya terminó';
  if (turno.personasDelante === null) return 'Calculando tu posición…';
  if (turno.personasDelante === 0) return 'Eres el siguiente';
  const espera = typeof turno.esperaEstimadaMin === 'number' ? ` · unos ${Math.max(1, Math.ceil(turno.esperaEstimadaMin))} min` : '';
  return `${turno.personasDelante} ${turno.personasDelante === 1 ? 'persona' : 'personas'} delante${espera}`;
}

export function TarjetaTurno({ turno, titulo = 'Tu turno' }: { turno: Turno; titulo?: string }) {
  return (
    <section className="tarjeta tarjeta--activa" aria-labelledby={`turno-${turno.id}`}>
      <p className="texto-secundario" id={`turno-${turno.id}`}>
        {titulo}
      </p>
      <p className="codigo-turno">{turno.codigo ?? '—'}</p>
      <div className="acciones">
        <ChipEstado estado={turno.estado} />
        {turno.tipoAtencion === 'PREFERENCIAL' && <span className="chip insignia-preferencial">Atención preferencial</span>}
      </div>
      {/* Región viva: el lector de pantalla anuncia los cambios de posición sin interrumpir */}
      <p aria-live="polite">{textoPosicion(turno)}</p>
    </section>
  );
}
