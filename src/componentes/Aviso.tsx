import type { ReactNode } from 'react';

/**
 * Mensaje de estado. Los errores usan role="alert" (se anuncian de inmediato); los demás
 * role="status" (se anuncian sin interrumpir).
 */
export function Aviso({ tipo = 'info', children }: { tipo?: 'info' | 'exito' | 'error'; children: ReactNode }) {
  return (
    <div className={`aviso aviso--${tipo}`} role={tipo === 'error' ? 'alert' : 'status'}>
      {children}
    </div>
  );
}
