import { useCallback, useEffect, useState } from 'react';
import { type AgenciaCatalogo, catalogoApi } from './catalogo';
import { mensajeDeError } from './http';

/**
 * Una sola consulta del catálogo por pestaña: los paneles que lo usan comparten la misma
 * promesa. El backend ya lo guarda 10 min en Redis; si la consulta falla, se puede reintentar.
 */
let enCurso: Promise<AgenciaCatalogo[]> | null = null;

function cargarCatalogo(): Promise<AgenciaCatalogo[]> {
  enCurso ??= catalogoApi
    .agencias()
    .then((a) => a ?? [])
    .catch((error: unknown) => {
      enCurso = null;
      throw error;
    });
  return enCurso;
}

/** Después de cambiar una agencia, la siguiente pantalla que use el catálogo lo vuelve a pedir. */
export function olvidarCatalogo(): void {
  enCurso = null;
}

export function useCatalogo() {
  const [agencias, setAgencias] = useState<AgenciaCatalogo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(() => {
    setCargando(true);
    setError(null);
    cargarCatalogo()
      .then(setAgencias)
      .catch((err: unknown) => setError(mensajeDeError(err, 'No se pudo cargar el catálogo de agencias')))
      .finally(() => setCargando(false));
  }, []);

  useEffect(cargar, [cargar]);

  return { agencias, cargando, error, reintentar: cargar };
}
