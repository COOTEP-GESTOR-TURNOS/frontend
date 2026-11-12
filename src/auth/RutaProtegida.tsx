import type { ReactNode } from 'react';
import { Navigate } from 'react-router';
import { puedeAcceder, Rol } from './permisos';
import { useSesion } from './sesion';

/** Protege una ruta en la interfaz. El backend repite la verificación: un enlace directo no basta. */
export function RutaProtegida({ permitidos, children }: { permitidos: Rol[]; children: ReactNode }) {
  const { usuario } = useSesion();
  if (!usuario) return <Navigate to="/ingresar" replace />;
  if (!puedeAcceder(usuario.roles, permitidos)) return <Navigate to="/no-autorizado" replace />;
  return <>{children}</>;
}
