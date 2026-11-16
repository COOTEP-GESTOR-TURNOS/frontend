import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { authApi, type Perfil, type SesionAbierta } from '../api/auth';
import { fijarRenovador, fijarToken } from '../api/http';
import type { AsignacionRol } from './permisos';

export interface Usuario extends Omit<Perfil, 'tipoDocumento' | 'numeroDocumento' | 'fechaNacimiento'> {
  token: string;
}

interface Sesion {
  usuario: Usuario | null;
  /** true mientras se intenta recuperar la sesión con la cookie al abrir la página. */
  cargando: boolean;
  abrirSesion: (sesion: SesionAbierta) => Usuario;
  /** Solo desarrollo: token generado con npm run token:dev en el backend. */
  iniciarConToken: (token: string) => Usuario;
  /** Vuelve a leer el perfil (por ejemplo, después de completar el documento). */
  recargarPerfil: () => Promise<void>;
  cerrarSesion: () => Promise<void>;
}

const ContextoSesion = createContext<Sesion | null>(null);

/**
 * Una sola renovación a la vez: la renovación rota el token, así que dos llamadas simultáneas
 * (dos peticiones con 401, o el doble montaje de StrictMode) harían fallar a la segunda.
 */
let renovacionEnCurso: Promise<SesionAbierta | null> | null = null;
function renovarUnaVez(): Promise<SesionAbierta | null> {
  renovacionEnCurso ??= authApi
    .renovar()
    .catch(() => null)
    .finally(() => {
      renovacionEnCurso = null;
    });
  return renovacionEnCurso;
}

/** Lee el contenido del JWT de prueba. No lo valida: eso lo hace el backend en cada petición. */
function leerTokenPrueba(token: string): Usuario {
  const [, cuerpo] = token.split('.');
  if (!cuerpo) throw new Error('El token no tiene el formato esperado');
  const datos = JSON.parse(atob(cuerpo.replace(/-/g, '+').replace(/_/g, '/'))) as { sub?: string; roles?: AsignacionRol[] };
  if (!datos.sub || !Array.isArray(datos.roles)) throw new Error('El token no trae usuario ni roles');
  return {
    id: datos.sub,
    roles: datos.roles,
    token,
    email: '',
    nombre: 'Usuario de prueba',
    mfaActivo: false,
    tienePassword: false,
    perfilCompleto: true,
  };
}

export function ProveedorSesion({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(true);
  const temporizador = useRef<number | undefined>(undefined);

  const limpiar = useCallback(() => {
    window.clearTimeout(temporizador.current);
    fijarToken(null);
    setUsuario(null);
  }, []);

  const abrirSesion = useCallback((sesion: SesionAbierta) => {
    const { tipoDocumento: _t, numeroDocumento: _n, fechaNacimiento: _f, ...perfil } = sesion.usuario;
    const nuevo: Usuario = { ...perfil, token: sesion.tokenAcceso };
    fijarToken(nuevo.token);
    setUsuario(nuevo);
    // Renueva un minuto antes de que venza el token de acceso (dura 10 min).
    window.clearTimeout(temporizador.current);
    temporizador.current = window.setTimeout(
      () => void renovarUnaVez().then((s) => (s ? abrirSesion(s) : limpiar())),
      Math.max(30, sesion.expiraEn - 60) * 1000,
    );
    return nuevo;
  }, [limpiar]);

  // Al abrir la página (o al volver de Google) se recupera la sesión con la cookie HttpOnly.
  useEffect(() => {
    fijarRenovador(async () => {
      const s = await renovarUnaVez();
      if (!s) {
        limpiar();
        return null;
      }
      return abrirSesion(s).token;
    });
    void renovarUnaVez()
      .then((s) => s && abrirSesion(s))
      .finally(() => setCargando(false));
    return () => {
      fijarRenovador(null);
      window.clearTimeout(temporizador.current);
    };
  }, [abrirSesion, limpiar]);

  const iniciarConToken = useCallback((token: string) => {
    const nuevo = leerTokenPrueba(token.trim());
    fijarToken(nuevo.token);
    setUsuario(nuevo);
    return nuevo;
  }, []);

  const recargarPerfil = useCallback(async () => {
    const perfil = await authApi.yo();
    if (perfil) {
      const { tipoDocumento: _t, numeroDocumento: _n, fechaNacimiento: _f, ...resto } = perfil;
      setUsuario((actual) => (actual ? { ...actual, ...resto } : actual));
    }
  }, []);

  const cerrarSesion = useCallback(async () => {
    await authApi.cerrarSesion().catch(() => undefined);
    limpiar();
  }, [limpiar]);

  const valor = useMemo(
    () => ({ usuario, cargando, abrirSesion, iniciarConToken, recargarPerfil, cerrarSesion }),
    [usuario, cargando, abrirSesion, iniciarConToken, recargarPerfil, cerrarSesion],
  );
  return <ContextoSesion.Provider value={valor}>{children}</ContextoSesion.Provider>;
}

export function useSesion(): Sesion {
  const sesion = useContext(ContextoSesion);
  if (!sesion) throw new Error('useSesion debe usarse dentro de ProveedorSesion');
  return sesion;
}
