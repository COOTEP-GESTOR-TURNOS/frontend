import type { IconType } from 'react-icons';
import { LuCircleCheck, LuCircleDot, LuCircleX, LuHeadset, LuHourglass, LuMegaphone, LuTimer, LuUserX } from 'react-icons/lu';
import type { EstadoTurno } from '../api/turnos';
import { Etiqueta, type Tono } from './Etiqueta';

/** Cada estado lleva texto e icono además del color: el color nunca es la única señal (WCAG). */
const ESTADOS: Record<EstadoTurno, { texto: string; tono: Tono; icono: IconType }> = {
  SOLICITADO: { texto: 'Solicitado', tono: 'info', icono: LuCircleDot },
  EN_ESPERA: { texto: 'En espera', tono: 'info', icono: LuHourglass },
  PROXIMO: { texto: 'Ya casi: confirma que vienes', tono: 'aviso', icono: LuTimer },
  LLAMADO: { texto: 'Te llamaron', tono: 'primario', icono: LuMegaphone },
  EN_ATENCION: { texto: 'En atención', tono: 'primario', icono: LuHeadset },
  ATENDIDO: { texto: 'Atendido', tono: 'exito', icono: LuCircleCheck },
  CANCELADO: { texto: 'Cancelado', tono: 'error', icono: LuCircleX },
  AUSENTE: { texto: 'No se presentó', tono: 'error', icono: LuUserX },
};

/** Próximo y ya confirmado: deja de pedir la confirmación y lo dice en verde, como el mensaje de arriba. */
const PROXIMO_CONFIRMADO = { texto: 'Ya casi: confirmaste que vas', tono: 'exito' as Tono, icono: LuCircleCheck };

export function ChipEstado({ estado, confirmado = false }: { estado: EstadoTurno; confirmado?: boolean }) {
  const { texto, tono, icono } = estado === 'PROXIMO' && confirmado ? PROXIMO_CONFIRMADO : ESTADOS[estado];
  return (
    <Etiqueta tono={tono} icono={icono}>
      {texto}
    </Etiqueta>
  );
}
