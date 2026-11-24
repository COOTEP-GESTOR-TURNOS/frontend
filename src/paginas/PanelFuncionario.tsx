import { useCallback, useEffect, useState } from 'react';
import { LuBadgeCheck, LuCircleCheck, LuCircleX, LuHeadset, LuMegaphone, LuPlay, LuUserX } from 'react-icons/lu';
import { type AgenciaCatalogo, describirFila, servicioParaAgencia } from '../api/catalogo';
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

type Catalogo = ReturnType<typeof useCatalogo>;
type Ejecutar = (nombre: string, operacion: () => Promise<Turno | null>) => Promise<void>;

/**
 * La fila que atiende el funcionario: su agencia sale del rol; el servicio también, si el rol lo
 * fija. Sin servicio asignado, empieza en la primera fila de su agencia.
 */
function useFilaFuncionario() {
  const { usuario } = useSesion();
  const ambito = usuario?.roles.find((r) => r.rol === 'FUNCIONARIO' || r.rol === 'ADMIN_AGENCIA');
  const agenciaId = ambito?.agenciaId ?? '';
  const catalogo = useCatalogo();
  const agencia = catalogo.agencias.find((a) => a.id === agenciaId);
  const [servicioId, setServicioId] = useState(ambito?.servicioId ?? '');

  useEffect(() => {
    if (!servicioId && agencia) setServicioId(servicioParaAgencia(catalogo.agencias, agencia.id, undefined) ?? '');
  }, [agencia, catalogo.agencias, servicioId]);

  return { catalogo, agencia, agenciaId, servicioId, setServicioId, servicioFijo: Boolean(ambito?.servicioId) };
}

/** Atajo de teclado: N llama al siguiente (salvo mientras se escribe en un campo). */
function useAtajoLlamar(llamar: () => void, disponible: boolean) {
  useEffect(() => {
    function alPresionar(evento: KeyboardEvent) {
      const escribiendo = evento.target instanceof HTMLInputElement || evento.target instanceof HTMLSelectElement;
      if (!escribiendo && evento.key.toLowerCase() === 'n' && disponible) llamar();
    }
    document.addEventListener('keydown', alPresionar);
    return () => document.removeEventListener('keydown', alPresionar);
  }, [llamar, disponible]);
}

function descripcionAtencion(agencia: AgenciaCatalogo | undefined, cargando: boolean): string {
  if (agencia) return agencia.nombre;
  return cargando ? 'Cargando agencia…' : 'Agencia sin asignar';
}

/** CU-04: llamar, atender, verificar la atención preferencial y marcar ausencias. Atajo: tecla N. */
export function PanelFuncionario() {
  const { catalogo, agencia, agenciaId, servicioId, setServicioId, servicioFijo } = useFilaFuncionario();
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

  const llamar = useCallback(() => void ejecutar('llamar', () => turnosApi.llamarSiguiente(agenciaId, servicioId)), [ejecutar, agenciaId, servicioId]);
  useAtajoLlamar(llamar, !accion && Boolean(servicioId));

  return (
    <Pagina titulo="Atención" descripcion={descripcionAtencion(agencia, catalogo.cargando)}>
      <Tarjeta titulo="Fila que atiendo" icono={LuHeadset}>
        <div className="flex flex-col gap-4">
          <AvisosFuncionario catalogo={catalogo} sinAgencia={!agencia} />
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            {agencia && (
              <div className="flex-1">
                <SelectorFila
                  agencias={catalogo.agencias}
                  valor={{ agenciaId, servicioId }}
                  alCambiar={(f) => setServicioId(f.servicioId)}
                  agenciaFija
                  servicioFijo={servicioFijo}
                  etiquetaServicio="Servicio"
                />
              </div>
            )}
            <Boton icono={LuMegaphone} cargando={accion === 'llamar'} disabled={!servicioId} onClick={llamar} aria-keyshortcuts="N">
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

      {actual && <TurnoEnVentanilla actual={actual} agencias={catalogo.agencias} accion={accion} ejecutar={ejecutar} />}
    </Pagina>
  );
}

function AvisosFuncionario({ catalogo, sinAgencia }: { catalogo: Catalogo; sinAgencia: boolean }) {
  const agenciaFaltante = !catalogo.cargando && !catalogo.error && sinAgencia;
  return (
    <>
      {catalogo.error && (
        <Aviso tipo="error">
          {catalogo.error}{' '}
          <BotonEnlace onClick={catalogo.reintentar}>Reintentar</BotonEnlace>
        </Aviso>
      )}
      {agenciaFaltante && <Aviso tipo="error">Tu rol no tiene una agencia del catálogo. Pide al administrador que revise tu asignación.</Aviso>}
    </>
  );
}

function TurnoEnVentanilla({ actual, agencias, accion, ejecutar }: { actual: Turno; agencias: AgenciaCatalogo[]; accion: string | null; ejecutar: Ejecutar }) {
  const llamado = actual.estado === 'LLAMADO';
  return (
    <div className="flex flex-col gap-4">
      <TarjetaTurno turno={actual} titulo="Turno en ventanilla" lugar={describirFila(agencias, actual.agenciaId, actual.servicioId)} />
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-center">
        {llamado && actual.tipoAtencion === 'PREFERENCIAL' && (
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
        {llamado && (
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
  );
}
