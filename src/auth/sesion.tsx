import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from 'react';
import { fijarToken } from '../api/http';
import type { AsignacionRol } from './permisos';

export interface Usuario {
  id: string;
  roles: AsignacionRol[];
  token: string;
}

interface Sesion {
  usuario: Usuario | null;
  iniciarConToken: (token: string) => Usuario;
  cerrarSesion: () => void;
}

const ContextoSesion = createContext<Sesion | null>(null);

/** Lee el contenido del JWT. No lo valida: eso lo hace el backend en cada petición. */
function leerToken(token: string): Usuario {
  const [, cuerpo] = token.split('.');
  if (!cuerpo) throw new Error('El token no tiene el formato esperado');
  const json = atob(cuerpo.replace(/-/g, '+').replace(/_/g, '/'));
  const datos = JSON.parse(json) as { sub?: string; roles?: AsignacionRol[] };
  if (!datos.sub || !Array.isArray(datos.roles)) throw new Error('El token no trae usuario ni roles');
  return { id: datos.sub, roles: datos.roles, token };
}

export function ProveedorSesion({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);

  const iniciarConToken = useCallback((token: string) => {
    const nuevo = leerToken(token.trim());
    fijarToken(nuevo.token);
    setUsuario(nuevo);
    return nuevo;
  }, []);

  const cerrarSesion = useCallback(() => {
    // Pendiente: POST /auth/cerrar-sesion para revocar la renovación en Redis.
    fijarToken(null);
    setUsuario(null);
  }, []);

  const valor = useMemo(() => ({ usuario, iniciarConToken, cerrarSesion }), [usuario, iniciarConToken, cerrarSesion]);
  return <ContextoSesion.Provider value={valor}>{children}</ContextoSesion.Provider>;
}

export function useSesion(): Sesion {
  const sesion = useContext(ContextoSesion);
  if (!sesion) throw new Error('useSesion debe usarse dentro de ProveedorSesion');
  return sesion;
}
