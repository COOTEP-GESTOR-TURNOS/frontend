import { useCallback, useEffect, useState } from 'react';
import { LuBadgeCheck, LuCircleCheck, LuCircleX, LuHeadset, LuMegaphone, LuPlay, LuUserX } from 'react-icons/lu';
import { describirFila, servicioParaAgencia } from '../api/catalogo';
import { ErrorApi } from '../api/http';
import { Turno, turnosApi } from '../api/turnos';
import { useCatalogo } from '../api/useCatalogo';
import { useSesion } from '../auth/sesion';
import { Aviso } from '../componentes/Aviso';
import { Boton, BotonEnlace } from '../componentes/Boton';
import { Pagina } from '../componentes/Pagina';
import { SelectorFila } from '../componentes/SelectorFila';
import { Tarjeta } from '../componentes/Tarjeta';
import { TarjetaTurno } from '../componentes/TarjetaTurno';

/** CU-04: llamar, atender, verificar la atención preferencial y marcar ausencias. Atajo: tecla N. */
export function PanelFuncionario() {
  const { usuario } = useSesion();
  const ambito = usuario?.roles.find((r) => r.rol === 'FUNCIONARIO' || r.rol === 'ADMIN_AGENCIA');
  const agenciaId = ambito?.agenciaId ?? '';
  const catalogo = useCatalogo();
  const agencia = catalogo.agencias.find((a) => a.id === agenciaId);
  const [servicioId, setServicioId] = useState(ambito?.servicioId ?? '');

  // Sin servicio asignado por su rol, empieza en la primera fila de su agencia.
  useEffect(() => {
    if (!servicioId && agencia) setServicioId(servicioParaAgencia(catalogo.agencias, agencia.id, undefined) ?? '');
  }, [agencia, catalogo.agencias, servicioId]);
  const [actual, setActual] = useState<Turno | null>(null);
  const [accion, setAccion] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const ejecutar = useCallback(async (nombre: string, operacion: () => Promise<Turno | null>) => {
    setAccion(nombre);
    setMensaje(null);
    try {
      const resultado = await operacion();
      if (nombre === 'llamar' && !resultado) setMensaje('No hay turnos en espera.');
      setActual(resultado);
    } catch (err) {
      setMensaje(err instanceof ErrorApi ? err.problema.detail ?? err.message : 'No se pudo completar la acción');
    } finally {
      setAccion(null);
    }
  }, []);

  const llamar = useCallback(
    () => ejecutar('llamar', () => turnosApi.llamarSiguiente(agenciaId, servicioId)),
    [ejecutar, agenciaId, servicioId],
  );

  useEffect(() => {
    function alPresionar(evento: KeyboardEvent) {
      const escribiendo = evento.target instanceof HTMLInputElement || evento.target instanceof HTMLSelectElement;
      if (!escribiendo && evento.key.toLowerCase() === 'n' && !accion && servicioId) void llamar();
    }
    document.addEventListener('keydown', alPresionar);
    return () => document.removeEventListener('keydown', alPresionar);
  }, [llamar, accion, servicioId]);

  return (
    <Pagina titulo="Atención" descripcion={agencia?.nombre ?? (catalogo.cargando ? 'Cargando agencia…' : 'Agencia sin asignar')}>
      <Tarjeta titulo="Fila que atiendo" icono={LuHeadset}>
        <div className="flex flex-col gap-4">
          {catalogo.error && (
            <Aviso tipo="error">
              {catalogo.error}{' '}
              <BotonEnlace onClick={catalogo.reintentar}>Reintentar</BotonEnlace>
            </Aviso>
          )}
          {!catalogo.cargando && !catalogo.error && !agencia && (
            <Aviso tipo="error">Tu rol no tiene una agencia del catálogo. Pide al administrador que revise tu asignación.</Aviso>
          )}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            {agencia && (
              <div className="flex-1">
                <SelectorFila
                  agencias={catalogo.agencias}
                  valor={{ agenciaId, servicioId }}
                  alCambiar={(f) => setServicioId(f.servicioId)}
                  agenciaFija
                  servicioFijo={Boolean(ambito?.servicioId)}
                  etiquetaServicio="Servicio"
                />
              </div>
            )}
            <Boton icono={LuMegaphone} cargando={accion === 'llamar'} disabled={!servicioId} onClick={() => void llamar()} aria-keyshortcuts="N">
              Llamar siguiente
              <kbd className="ml-1 rounded border border-white/40 px-1.5 font-mono text-xs">N</kbd>
            </Boton>
          </div>
          {mensaje && (
            <p role="status" className="text-sm text-texto-secundario">
              {mensaje}
            </p>
          )}
        </div>
      </Tarjeta>

      {actual && (
        <div className="flex flex-col gap-4">
          <TarjetaTurno turno={actual} titulo="Turno en ventanilla" lugar={describirFila(catalogo.agencias, actual.agenciaId, actual.servicioId)} />
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-center">
            {actual.estado === 'LLAMADO' && actual.tipoAtencion === 'PREFERENCIAL' && (
              <>
                <Boton
                  variante="secundario"
                  icono={LuBadgeCheck}
                  cargando={accion === 'verificar-si'}
                  onClick={() => void ejecutar('verificar-si', () => turnosApi.verificarPreferencial(actual.id, true))}
                >
                  Preferencial verificado
                </Boton>
                <Boton
                  variante="peligro"
                  icono={LuCircleX}
                  cargando={accion === 'verificar-no'}
                  onClick={() => void ejecutar('verificar-no', () => turnosApi.verificarPreferencial(actual.id, false))}
                >
                  No aplica: pasa a la fila general
                </Boton>
              </>
            )}
            {actual.estado === 'LLAMADO' && (
              <>
                <Boton icono={LuPlay} cargando={accion === 'iniciar'} onClick={() => void ejecutar('iniciar', () => turnosApi.atender(actual.id, 'iniciar'))}>
                  Iniciar atención
                </Boton>
                <Boton variante="peligro" icono={LuUserX} cargando={accion === 'ausente'} onClick={() => void ejecutar('ausente', () => turnosApi.atender(actual.id, 'ausente'))}>
                  Marcar ausente
                </Boton>
              </>
            )}
            {actual.estado === 'EN_ATENCION' && (
              <Boton icono={LuCircleCheck} cargando={accion === 'finalizar'} onClick={() => void ejecutar('finalizar', () => turnosApi.atender(actual.id, 'finalizar'))}>
                Finalizar atención
              </Boton>
            )}
          </div>
        </div>
      )}
    </Pagina>
  );
}
