import type { ReactNode } from 'react';
import { LuCircleAlert, LuCircleCheck, LuInfo } from 'react-icons/lu';

const TIPOS = {
  info: { clase: 'border-info/20 bg-info/5', icono: LuInfo, color: 'text-info' },
  exito: { clase: 'border-exito/20 bg-exito/5', icono: LuCircleCheck, color: 'text-exito' },
  error: { clase: 'border-error/20 bg-error/5', icono: LuCircleAlert, color: 'text-error' },
};

/**
 * Mensaje de estado. Los errores usan role="alert" (se anuncian de inmediato); los demás
 * role="status" (se anuncian sin interrumpir). El icono acompaña al texto, nunca lo reemplaza.
 */
export function Aviso({ tipo = 'info', children }: { tipo?: 'info' | 'exito' | 'error'; children: ReactNode }) {
  const { clase, icono: Icono, color } = TIPOS[tipo];
  return (
    <div className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm text-texto ${clase}`} role={tipo === 'error' ? 'alert' : 'status'}>
      <Icono aria-hidden className={`mt-0.5 size-4 shrink-0 ${color}`} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
