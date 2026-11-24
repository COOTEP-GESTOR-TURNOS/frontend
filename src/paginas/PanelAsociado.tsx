import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LuCheck, LuTicket, LuTicketPlus, LuX } from 'react-icons/lu';
import type { Socket } from 'socket.io-client';
import { type AgenciaCatalogo, agenciasAbiertas, describirFila, servicioParaAgencia } from '../api/catalogo';
import { ErrorApi } from '../api/http';
import { avisoDeCambio, mensajeConfirmado, mensajeTurnoActivo, Turno, turnosApi } from '../api/turnos';
import { useCatalogo } from '../api/useCatalogo';
import { useSesion } from '../auth/sesion';
import { Aviso } from '../componentes/Aviso';
import { Boton, BotonEnlace } from '../componentes/Boton';
import { Casilla } from '../componentes/Campo';
import { useConfirmacion } from '../componentes/Confirmacion';
import { MejorHorario } from '../componentes/MejorHorario';
import { Cargando, Pagina } from '../componentes/Pagina';
import { type Fila, SelectorFila } from '../componentes/SelectorFila';
import { Tarjeta } from '../componentes/Tarjeta';
import { TarjetaTurno } from '../componentes/TarjetaTurno';
import { conectarTiempoReal } from '../tiempo-real/socket';

type Catalogo = ReturnType<typeof useCatalogo>;

/** Estados en los que el turno sigue en la fila (se puede confirmar o cancelar). */
const EN_FILA = ['SOLICITADO', 'EN_ESPERA', 'PROXIMO'];

function mensajeDe(error: unknown): string {
  return error instanceof ErrorApi ? error.problema.detail ?? error.message : 'No se pudo completar la acción';
}

/** Confirmado y aún esperando: el mensaje se actualiza con la posición en vivo. */
function estaConfirmado(turno: Turno | null): boolean {
  return turno !== null && Boolean(turno.confirmado) && EN_FILA.includes(turno.estado);
}

/**
 * El turno activo del asociado y los avisos en tiempo real: cualquier cambio de la fila o del
 * turno vuelve a consultar la posición; si el turno cambió solo (vencimiento, llamado), se explica.
 */
function useMiTurno() {
  const { usuario } = useSesion();
  const [turno, setTurno] = useState<Turno | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const socket = useRef<Socket | null>(null);

  /** Vuelve a leer el turno activo; devuelve el que quedó en pantalla (null si no hay). */
  const refrescar = useCallback(async (): Promise<Turno | null> => {
    try {
      const actual = await turnosApi.miTurno();
      setTurno(actual);
      return actual;
    } catch (err) {
      if (err instanceof ErrorApi && err.status === 404) setTurno(null);
      else setError(mensajeDe(err));
      return null;
    }
  }, []);

  useEffect(() => {
    void refrescar();
  }, [refrescar]);

  useEffect(() => {
    if (!usuario) return;
    const conexion = conectarTiempoReal(usuario.token);
    conexion.on('turno:estado', (cambio: Turno) => {
      setAviso(avisoDeCambio(cambio));
      void refrescar();
    });
    conexion.on('fila:actualizada', () => void refrescar());
    socket.current = conexion;
    return () => {
      conexion.disconnect();
    };
  }, [usuario, refrescar]);

  useEffect(() => {
    if (turno) socket.current?.emit('fila:suscribir', { agenciaId: turno.agenciaId, servicioId: turno.servicioId });
  }, [turno?.agenciaId, turno?.servicioId]); // eslint-disable-line react-hooks/exhaustive-deps

  return { turno, error, setError, aviso, setAviso, refrescar };
}

/** Al llegar el catálogo se elige la primera agencia abierta y su primer servicio. */
function useFilaInicial(abiertas: AgenciaCatalogo[]) {
  const [fila, setFila] = useState<Fila>({ agenciaId: '', servicioId: '' });
  useEffect(() => {
    if (fila.agenciaId || abiertas.length === 0) return;
    const agenciaId = abiertas[0].id;
    setFila({ agenciaId, servicioId: servicioParaAgencia(abiertas, agenciaId, undefined) ?? '' });
  }, [abiertas, fila.agenciaId]);
  return [fila, setFila] as const;
}

/** CU-02 y CU-03: pedir, seguir, confirmar y cancelar el turno. */
export function PanelAsociado() {
  const { turno, error, setError, aviso, setAviso, refrescar } = useMiTurno();
  const catalogo = useCatalogo();
  const abiertas = useMemo(() => agenciasAbiertas(catalogo.agencias), [catalogo.agencias]);
  const [fila, setFila] = useFilaInicial(abiertas);
  const [preferencial, setPreferencial] = useState(false);
  const [accion, setAccion] = useState<string | null>(null);
  const claveIdempotencia = useRef(crypto.randomUUID());
  const [dialogo, pedirConfirmacion] = useConfirmacion();

  async function ejecutar(nombre: string, operacion: () => Promise<unknown>) {
    setAccion(nombre);
    setError(null);
    try {
      await operacion();
      await refrescar();
    } catch (err) {
      // Ya había otro turno activo: se muestra ese turno (con «Cancelar turno») en vez del formulario.
      const activo = err instanceof ErrorApi && err.codigo === 'TURNO_ACTIVO' ? await refrescar() : null;
      if (activo) setAviso(mensajeTurnoActivo(activo, describirFila(catalogo.agencias, activo.agenciaId, activo.servicioId)));
      else setError(mensajeDe(err));
    } finally {
      setAccion(null);
    }
  }

  function pedirTurno(evento: FormEvent) {
    evento.preventDefault();
    setAviso(null);
    // La misma clave se reutiliza si hay que reintentar; se renueva solo después de un éxito.
    void ejecutar('pedir', async () => {
      await turnosApi.solicitar(fila.agenciaId, fila.servicioId, preferencial, claveIdempotencia.current);
      claveIdempotencia.current = crypto.randomUUID();
    });
  }

  function confirmar(id: string) {
    void ejecutar('confirmar', async () => {
      await turnosApi.confirmar(id);
      setAviso(null); // el aviso de «confirma que vas» ya no aplica
    });
  }

  async function cancelar(actual: Turno) {
    const { id, codigo } = actual; // el turno puede cambiar en tiempo real mientras el diálogo está abierto
    const ok = await pedirConfirmacion({
      titulo: '¿Cancelar tu turno?',
      mensaje: `Perderás tu lugar en la fila${codigo ? ` con el turno ${codigo}` : ''}. Si luego lo necesitas, tendrás que pedir uno nuevo.`,
      confirmar: 'Sí, cancelar turno',
      cancelar: 'No, conservarlo',
      peligro: true,
    });
    if (!ok) return;
    setAviso(null); // el aviso del turno (por ejemplo, «Ya tienes el turno…») deja de aplicar
    void ejecutar('cancelar', () => turnosApi.cancelar(id));
  }

  const confirmado = estaConfirmado(turno);

  return (
    <Pagina titulo="Mi turno" descripcion={turno ? 'Te avisamos aquí cuando cambie tu posición.' : 'Elige la agencia y el servicio, y te avisamos cuando sea tu turno.'}>
      <AvisosTurno aviso={aviso} error={error} turno={turno} confirmado={confirmado} />
      {turno ? (
        <TurnoActual
          turno={turno}
          confirmado={confirmado}
          agencias={catalogo.agencias}
          accion={accion}
          confirmar={() => confirmar(turno.id)}
          cancelar={() => void cancelar(turno)}
        />
      ) : (
        <FormularioPedirTurno
          catalogo={catalogo}
          abiertas={abiertas}
          fila={fila}
          setFila={setFila}
          preferencial={preferencial}
          setPreferencial={setPreferencial}
          pidiendo={accion === 'pedir'}
          pedirTurno={pedirTurno}
        />
      )}
      {dialogo}
    </Pagina>
  );
}

function AvisosTurno({ aviso, error, turno, confirmado }: { aviso: string | null; error: string | null; turno: Turno | null; confirmado: boolean }) {
  return (
    <>
      {aviso && <Aviso tipo={aviso.includes('ausente') ? 'error' : 'info'}>{aviso}</Aviso>}
      {error && <Aviso tipo="error">{error}</Aviso>}
      {confirmado && turno && (
        <Aviso tipo="exito" estilo="marcado">
          {mensajeConfirmado(turno)}
        </Aviso>
      )}
    </>
  );
}

function TurnoActual({ turno, confirmado, agencias, accion, confirmar, cancelar }: {
  turno: Turno;
  confirmado: boolean;
  agencias: AgenciaCatalogo[];
  accion: string | null;
  confirmar: () => void;
  cancelar: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <TarjetaTurno turno={turno} confirmado={confirmado} lugar={describirFila(agencias, turno.agenciaId, turno.servicioId)} />
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
        {turno.estado === 'PROXIMO' && !confirmado && (
          <Boton icono={LuCheck} cargando={accion === 'confirmar'} onClick={confirmar}>
            Confirmo que voy
          </Boton>
        )}
        {EN_FILA.includes(turno.estado) && (
          <Boton variante="peligro" icono={LuX} cargando={accion === 'cancelar'} onClick={cancelar}>
            Cancelar turno
          </Boton>
        )}
      </div>
    </div>
  );
}

function FormularioPedirTurno({ catalogo, abiertas, fila, setFila, preferencial, setPreferencial, pidiendo, pedirTurno }: {
  catalogo: Catalogo;
  abiertas: AgenciaCatalogo[];
  fila: Fila;
  setFila: (fila: Fila) => void;
  preferencial: boolean;
  setPreferencial: (valor: boolean) => void;
  pidiendo: boolean;
  pedirTurno: (evento: FormEvent) => void;
}) {
  const filaCompleta = Boolean(fila.agenciaId && fila.servicioId);
  return (
    <Tarjeta titulo="Pedir turno" icono={LuTicket}>
      <form onSubmit={pedirTurno} className="flex flex-col gap-5">
        <AvisosCatalogo catalogo={catalogo} sinAbiertas={abiertas.length === 0} />
        {abiertas.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectorFila agencias={abiertas} valor={fila} alCambiar={setFila} />
          </div>
        )}
        {filaCompleta && <MejorHorario agenciaId={fila.agenciaId} servicioId={fila.servicioId} />}
        <Casilla
          etiqueta="Necesito atención preferencial (gestante o persona con discapacidad)"
          ayuda="Los adultos mayores se detectan solos. El funcionario lo verificará al llamarte."
          checked={preferencial}
          onChange={(e) => setPreferencial(e.target.checked)}
        />
        <Boton type="submit" icono={LuTicketPlus} cargando={pidiendo} disabled={!filaCompleta} className="w-full sm:w-auto sm:self-end">
          Pedir turno
        </Boton>
      </form>
    </Tarjeta>
  );
}

function AvisosCatalogo({ catalogo, sinAbiertas }: { catalogo: Catalogo; sinAbiertas: boolean }) {
  const ningunaAtiende = !catalogo.cargando && !catalogo.error && sinAbiertas;
  return (
    <>
      {catalogo.cargando && <Cargando texto="Cargando agencias…" />}
      {catalogo.error && (
        <Aviso tipo="error">
          {catalogo.error}{' '}
          <BotonEnlace onClick={catalogo.reintentar}>Reintentar</BotonEnlace>
        </Aviso>
      )}
      {ningunaAtiende && <Aviso tipo="info">Ninguna agencia está atendiendo en este momento.</Aviso>}
    </>
  );
}
