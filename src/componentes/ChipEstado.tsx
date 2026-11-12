import type { EstadoTurno } from '../api/turnos';

/** Cada estado lleva texto además del color: el color nunca es la única señal (WCAG). */
const ESTADOS: Record<EstadoTurno, { texto: string; color: string }> = {
  SOLICITADO: { texto: 'Solicitado', color: 'var(--color-info)' },
  EN_ESPERA: { texto: 'En espera', color: 'var(--color-info)' },
  PROXIMO: { texto: 'Ya casi: confirma que vienes', color: 'var(--color-aviso)' },
  LLAMADO: { texto: 'Te llamaron', color: 'var(--color-primario)' },
  EN_ATENCION: { texto: 'En atención', color: 'var(--color-primario)' },
  ATENDIDO: { texto: 'Atendido', color: 'var(--color-exito)' },
  CANCELADO: { texto: 'Cancelado', color: 'var(--color-error)' },
  AUSENTE: { texto: 'No se presentó', color: 'var(--color-error)' },
};

export function ChipEstado({ estado }: { estado: EstadoTurno }) {
  const { texto, color } = ESTADOS[estado];
  return (
    <span className="chip" style={{ background: color }}>
      <span aria-hidden="true">●</span>
      {texto}
    </span>
  );
}
