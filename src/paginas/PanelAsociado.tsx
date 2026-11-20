import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LuCheck, LuTicket, LuTicketPlus, LuX } from 'react-icons/lu';
import type { Socket } from 'socket.io-client';
import { agenciasAbiertas, describirFila, servicioParaAgencia } from '../api/catalogo';
import { ErrorApi } from '../api/http';
import { avisoDeCambio, Turno, turnosApi } from '../api/turnos';
import { useCatalogo } from '../api/useCatalogo';
import { useSesion } from '../auth/sesion';
import { Aviso } from '../componentes/Aviso';
import { Boton, BotonEnlace } from '../componentes/Boton';
import { Casilla } from '../componentes/Campo';
import { MejorHorario } from '../componentes/MejorHorario';
import { Cargando, Pagina } from '../componentes/Pagina';
import { type Fila, SelectorFila } from '../componentes/SelectorFila';
import { Tarjeta } from '../componentes/Tarjeta';
import { TarjetaTurno } from '../componentes/TarjetaTurno';
import { conectarTiempoReal } from '../tiempo-real/socket';

function mensajeDe(error: unknown): string {
  return error instanceof ErrorApi ? error.problema.detail ?? error.message : 'No se pudo completar la acción';
}

/** CU-02 y CU-03: pedir, seguir, confirmar y cancelar el turno. */
export function PanelAsociado() {
  const { usuario } = useSesion();
  const [turno, setTurno] = useState<Turno | null>(null);
  const catalogo = useCatalogo();
  const abiertas = useMemo(() => agenciasAbiertas(catalogo.agencias), [catalogo.agencias]);
  const [fila, setFila] = useState<Fila>({ agenciaId: '', servicioId: '' });
  const [preferencial, setPreferencial] = useState(false);
  const [accion, setAccion] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const claveIdempotencia = useRef(crypto.randomUUID());
  const socket = useRef<Socket | null>(null);

  // Al llegar el catálogo se elige la primera agencia abierta y su primer servicio.
  useEffect(() => {
    if (fila.agenciaId || abiertas.length === 0) return;
    const agenciaId = abiertas[0].id;
    setFila({ agenciaId, servicioId: servicioParaAgencia(abiertas, agenciaId, undefined) ?? '' });
  }, [abiertas, fila.agenciaId]);

  const refrescar = useCallback(async () => {
    try {
      setTurno(await turnosApi.miTurno());
    } catch (err) {
      if (err instanceof ErrorApi && err.status === 404) setTurno(null);
      else setError(mensajeDe(err));
    }
  }, []);

  useEffect(() => {
    void refrescar();
  }, [refrescar]);

  // Tiempo real: cualquier cambio de la fila o del turno vuelve a consultar la posición.
  useEffect(() => {
    if (!usuario) return;
    const conexion = conectarTiempoReal(usuario.token);
    // El aviso trae el turno: si cambió por un vencimiento o un llamado, se explica en pantalla.
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

  async function ejecutar(nombre: string, operacion: () => Promise<unknown>) {
    setAccion(nombre);
    setError(null);
    try {
      await operacion();
      await refrescar();
    } catch (err) {
      setError(mensajeDe(err));
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

  function cancelar() {
    if (turno && window.confirm('¿Cancelar tu turno? Perderás tu lugar en la fila.')) {
      void ejecutar('cancelar', () => turnosApi.cancelar(turno.id));
    }
  }

  return (
    <Pagina titulo="Mi turno" descripcion={turno ? 'Te avisamos aquí cuando cambie tu posición.' : 'Elige la agencia y el servicio, y te avisamos cuando sea tu turno.'}>
      {aviso && <Aviso tipo={aviso.includes('ausente') ? 'error' : 'info'}>{aviso}</Aviso>}
      {error && <Aviso tipo="error">{error}</Aviso>}

      {turno ? (
        <div className="flex flex-col gap-4">
          <TarjetaTurno turno={turno} lugar={describirFila(catalogo.agencias, turno.agenciaId, turno.servicioId)} />
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            {turno.estado === 'PROXIMO' && (
              <Boton icono={LuCheck} cargando={accion === 'confirmar'} onClick={() => void ejecutar('confirmar', () => turnosApi.confirmar(turno.id))}>
                Confirmo que voy
              </Boton>
            )}
            {['SOLICITADO', 'EN_ESPERA', 'PROXIMO'].includes(turno.estado) && (
              <Boton variante="peligro" icono={LuX} cargando={accion === 'cancelar'} onClick={cancelar}>
                Cancelar turno
              </Boton>
            )}
          </div>
        </div>
      ) : (
        <Tarjeta titulo="Pedir turno" icono={LuTicket}>
          <form onSubmit={pedirTurno} className="flex flex-col gap-5">
            {catalogo.cargando && <Cargando texto="Cargando agencias…" />}
            {catalogo.error && (
              <Aviso tipo="error">
                {catalogo.error}{' '}
                <BotonEnlace onClick={catalogo.reintentar}>Reintentar</BotonEnlace>
              </Aviso>
            )}
            {!catalogo.cargando && !catalogo.error && abiertas.length === 0 && (
              <Aviso tipo="info">Ninguna agencia está atendiendo en este momento.</Aviso>
            )}
            {abiertas.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2">
                <SelectorFila agencias={abiertas} valor={fila} alCambiar={setFila} />
              </div>
            )}
            {fila.agenciaId && fila.servicioId && <MejorHorario agenciaId={fila.agenciaId} servicioId={fila.servicioId} />}
            <Casilla
              etiqueta="Necesito atención preferencial (gestante o persona con discapacidad)"
              ayuda="Los adultos mayores se detectan solos. El funcionario lo verificará al llamarte."
              checked={preferencial}
              onChange={(e) => setPreferencial(e.target.checked)}
            />
            <Boton type="submit" icono={LuTicketPlus} cargando={accion === 'pedir'} disabled={!fila.agenciaId || !fila.servicioId} className="w-full sm:w-auto sm:self-end">
              Pedir turno
            </Boton>
          </form>
        </Tarjeta>
      )}
    </Pagina>
  );
}
