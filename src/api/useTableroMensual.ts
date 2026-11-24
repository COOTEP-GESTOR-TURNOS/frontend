import { useCallback, useEffect, useState } from 'react';
import { demandaApi, type TableroMensual } from './demanda';
import { mensajeDeError } from './http';

type Consulta = { clave: string; datos: TableroMensual | null; error: string | null };

/**
 * Tablero del mes (indicadores y calendario de demanda). Al cambiar de mes o de filtro, los datos
 * anteriores siguen en pantalla hasta que llegan los nuevos (`actualizando`): si se vaciaran, la
 * página se encogería un momento y el navegador llevaría al usuario a la parte superior.
 */
export function useTableroMensual(mes: string, agenciaId: string | null, servicioId?: string, colaboradorId?: string) {
  const [resultado, setResultado] = useState<Consulta | null>(null);
  const [revision, setRevision] = useState(0);
  const recargar = useCallback(() => setRevision((version) => version + 1), []);
  const clave = JSON.stringify([agenciaId, mes, servicioId, colaboradorId]);

  useEffect(() => {
    if (agenciaId === null) return;
    let vigente = true;

    async function cargar(agencia: string) {
      try {
        const datos = await demandaApi.tablero(mes, agencia, { servicioId, colaboradorId });
        if (!datos) throw new Error('Respuesta vacía');
        if (vigente) setResultado({ clave, datos, error: null });
      } catch (err) {
        if (vigente) {
          const error = mensajeDeError(err, 'No se pudo cargar el tablero mensual');
          setResultado((previo) => ({ clave, datos: previo?.clave === clave ? previo.datos : null, error }));
        }
      }
    }

    void cargar(agenciaId);
    return () => {
      vigente = false;
    };
  }, [agenciaId, clave, mes, servicioId, colaboradorId, revision]);

  const consulta = agenciaId !== null && resultado?.clave === clave ? resultado : null;
  const cargando = agenciaId !== null && !consulta;
  // Mientras llega la consulta nueva se conservan los datos de la anterior (si no falló).
  const anteriores = cargando && resultado && !resultado.error ? resultado.datos : null;
  const datos = consulta?.datos ?? anteriores;
  return { datos, error: consulta?.error ?? null, cargando, actualizando: cargando && datos !== null, recargar };
}
