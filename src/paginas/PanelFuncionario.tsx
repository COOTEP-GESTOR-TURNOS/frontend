import { useCallback, useEffect, useState } from 'react';
import { describirFila, servicioParaAgencia } from '../api/catalogo';
import { ErrorApi } from '../api/http';
import { Turno, turnosApi } from '../api/turnos';
import { useCatalogo } from '../api/useCatalogo';
import { useSesion } from '../auth/sesion';
import { Aviso } from '../componentes/Aviso';
import { Boton } from '../componentes/Boton';
import { SelectorFila } from '../componentes/SelectorFila';
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
    <main id="contenido">
      <section className="tarjeta">
        <h2>{agencia?.nombre ?? (catalogo.cargando ? 'Cargando agencia…' : 'Agencia sin asignar')}</h2>
        {catalogo.error && (
          <Aviso tipo="error">
            {catalogo.error}{' '}
            <button type="button" className="enlace-boton" onClick={catalogo.reintentar}>
              Reintentar
            </button>
          </Aviso>
        )}
        {!catalogo.cargando && !catalogo.error && !agencia && (
          <Aviso tipo="error">Tu rol no tiene una agencia del catálogo. Pide al administrador que revise tu asignación.</Aviso>
        )}
        {agencia && (
          <SelectorFila
            agencias={catalogo.agencias}
            valor={{ agenciaId, servicioId }}
            alCambiar={(f) => setServicioId(f.servicioId)}
            agenciaFija
            servicioFijo={Boolean(ambito?.servicioId)}
            etiquetaServicio="Fila que atiendo"
          />
        )}
        <Boton cargando={accion === 'llamar'} disabled={!servicioId} onClick={() => void llamar()} aria-keyshortcuts="N">
          Llamar siguiente (N)
        </Boton>
        {mensaje && (
          <p role="status" className="texto-secundario">
            {mensaje}
          </p>
        )}
      </section>

      {actual && (
        <>
          <TarjetaTurno turno={actual} titulo="Turno en ventanilla" lugar={describirFila(catalogo.agencias, actual.agenciaId, actual.servicioId)} />
          <div className="acciones">
            {actual.estado === 'LLAMADO' && actual.tipoAtencion === 'PREFERENCIAL' && (
              <>
                <Boton variante="secundario" cargando={accion === 'verificar-si'} onClick={() => void ejecutar('verificar-si', () => turnosApi.verificarPreferencial(actual.id, true))}>
                  Preferencial verificado
                </Boton>
                <Boton variante="peligro" cargando={accion === 'verificar-no'} onClick={() => void ejecutar('verificar-no', () => turnosApi.verificarPreferencial(actual.id, false))}>
                  No aplica: pasa a la fila general
                </Boton>
              </>
            )}
            {actual.estado === 'LLAMADO' && (
              <>
                <Boton cargando={accion === 'iniciar'} onClick={() => void ejecutar('iniciar', () => turnosApi.atender(actual.id, 'iniciar'))}>
                  Iniciar atención
                </Boton>
                <Boton variante="peligro" cargando={accion === 'ausente'} onClick={() => void ejecutar('ausente', () => turnosApi.atender(actual.id, 'ausente'))}>
                  Marcar ausente
                </Boton>
              </>
            )}
            {actual.estado === 'EN_ATENCION' && (
              <Boton cargando={accion === 'finalizar'} onClick={() => void ejecutar('finalizar', () => turnosApi.atender(actual.id, 'finalizar'))}>
                Finalizar atención
              </Boton>
            )}
          </div>
        </>
      )}
    </main>
  );
}
