import type { Turno } from '../api/turnos';
import { ChipEstado } from './ChipEstado';

function textoPosicion(turno: Turno): string {
  if (turno.personasDelante === null) return 'Calculando tu posición…';
  const posicion = turno.personasDelante === 0 ? 'Eres el siguiente' : `${turno.personasDelante} personas delante`;
  const espera = typeof turno.esperaEstimadaMin === 'number' ? ` · unos ${Math.ceil(turno.esperaEstimadaMin)} min` : '';
  return posicion + espera;
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
