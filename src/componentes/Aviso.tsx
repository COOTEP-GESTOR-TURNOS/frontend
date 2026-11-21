import type { ReactNode } from 'react';
import { LuCircleAlert, LuCircleCheck, LuInfo } from 'react-icons/lu';

/**
 * suave: fondo tenue y texto oscuro (avisos de formulario).
 * marcado: texto y borde del color del tipo sobre blanco, igual que los avisos de la app móvil.
 */
const TIPOS = {
  info: { suave: 'border-info/20 bg-info/5 text-texto', marcado: 'border-info bg-superficie text-info font-medium', icono: LuInfo, color: 'text-info' },
  exito: { suave: 'border-exito/20 bg-exito/5 text-texto', marcado: 'border-exito bg-superficie text-exito font-medium', icono: LuCircleCheck, color: 'text-exito' },
  error: { suave: 'border-error/20 bg-error/5 text-texto', marcado: 'border-error bg-superficie text-error font-medium', icono: LuCircleAlert, color: 'text-error' },
};

interface Props {
  tipo?: 'info' | 'exito' | 'error';
  estilo?: 'suave' | 'marcado';
  children: ReactNode;
}

/**
 * Mensaje de estado. Los errores usan role="alert" (se anuncian de inmediato); los demás
 * role="status" (se anuncian sin interrumpir). El icono acompaña al texto, nunca lo reemplaza.
 */
export function Aviso({ tipo = 'info', estilo = 'suave', children }: Props) {
  const { icono: Icono, color, ...clases } = TIPOS[tipo];
  return (
    <div className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${clases[estilo]}`} role={tipo === 'error' ? 'alert' : 'status'}>
      <Icono aria-hidden className={`mt-0.5 size-4 shrink-0 ${color}`} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
