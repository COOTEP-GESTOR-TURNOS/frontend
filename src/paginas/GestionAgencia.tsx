import { useCallback, useEffect, useMemo, useState } from 'react';
import { LuGlobe, LuMapPin, LuMoon, LuPower, LuRotateCcw, LuSave, LuSettings2, LuStore } from 'react-icons/lu';
import { agenciasAdminApi, resumenCierre, type ServicioAgencia, type VistaAgencia, type VistaParametro } from '../api/agenciasAdmin';
import type { AgenciaCatalogo } from '../api/catalogo';
import { mensajeDeError } from '../api/http';
import { olvidarCatalogo, useCatalogo } from '../api/useCatalogo';
import { agenciasAdministradas, esSuperadmin } from '../auth/permisos';
import { useSesion } from '../auth/sesion';
import { Aviso } from '../componentes/Aviso';
import { Boton } from '../componentes/Boton';
import { Selector } from '../componentes/Campo';
import { useConfirmacion } from '../componentes/Confirmacion';
import { Etiqueta, type Tono } from '../componentes/Etiqueta';
import { FilaParametro } from '../componentes/FilaParametro';
import { Pagina } from '../componentes/Pagina';
import { Tarjeta } from '../componentes/Tarjeta';

/** Las tablas ocupan todo el ancho de la tarjeta y se desplazan solas en el teléfono. */
const CONTENEDOR_TABLA = '-mx-5 overflow-x-auto sm:-mx-6';
const TABLA_ANCHA =
  'tabla min-w-[36rem] [&_td:last-child]:pr-5 [&_th:first-child]:pl-5 sm:[&_td:last-child]:pr-6 sm:[&_th:first-child]:pl-6';

/**
 * RF-17, CU-05 y CU-06: servicios, ventanillas, horario y reglas de la agencia. El directivo ve la
 * suya; el superadministrador elige cualquiera, la abre o la cierra y ajusta los parámetros globales.
 * Cada cambio se nota en la siguiente solicitud de turno y queda en la auditoría.
 */
export function GestionAgencia() {
  const { superadmin, opciones, agenciaId, setAgenciaId } = useAmbitoGestion();
  const { vista, setVista, error, setError, recargar } = useVistaAgencia(agenciaId);
  const [aviso, setAviso] = useState<string | null>(null);
  const [accion, setAccion] = useState<Accion | null>(null);
  const [dialogo, confirmar] = useConfirmacion();

  /** Aplica la respuesta del backend (la vista ya trae los valores efectivos) y avisa qué cambió. */
  const aplicar = useCallback((nueva: VistaAgencia | null, texto: string) => {
    if (!nueva) return;
    setVista(nueva);
    setAviso(texto);
    olvidarCatalogo(); // el catálogo de esta pestaña ya no está al día
  }, [setVista]);

  /** Envuelve una acción de la cabecera: un clic a la vez, y el error a la vista. */
  async function ejecutar(nombre: Accion, operacion: () => Promise<void>) {
    setAccion(nombre);
    setError(null);
    setAviso(null);
    try {
      await operacion();
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setAccion(null);
    }
  }

  /** RN-13: cierra la jornada antes de la hora; cancela los turnos en espera y avisa a cada asociado. */
  async function cerrarJornada(v: VistaAgencia) {
    const ok = await confirmar({
      titulo: `¿Cerrar la jornada de ${v.nombre}?`,
      mensaje: 'Hoy no recibirá más turnos. Los que están en espera se cancelan y cada asociado recibe el aviso. Los que ya fueron llamados siguen hasta terminar.',
      confirmar: 'Sí, cerrar la jornada',
      peligro: true,
    });
    if (!ok) return;
    return ejecutar('jornada', async () => {
      const r = await agenciasAdminApi.cerrarJornada(v.id);
      recargar();
      if (r) setAviso(resumenCierre(r));
    });
  }

  /** Deshace un cierre anticipado; los turnos ya cancelados no vuelven. */
  function reabrirJornada(v: VistaAgencia) {
    return ejecutar('jornada', async () => {
      await agenciasAdminApi.reabrirJornada(v.id);
      recargar();
      setAviso('Jornada reabierta: la agencia vuelve a recibir turnos en su horario.');
    });
  }

  async function cambiarAgencia(v: VistaAgencia) {
    // Abrir no pide confirmación; cerrar sí, porque cancela los turnos en espera de hoy.
    if (v.activa) {
      const ok = await confirmar({
        titulo: `¿Cerrar ${v.nombre}?`,
        mensaje: 'La agencia deja de recibir turnos y los que están en espera hoy se cancelan. Puedes volver a abrirla después.',
        confirmar: 'Sí, cerrar la agencia',
        peligro: true,
      });
      if (!ok) return;
    }
    return ejecutar('agencia', async () => {
      const nueva = await agenciasAdminApi.actualizarAgencia(v.id, !v.activa);
      aplicar(nueva, v.activa ? 'Agencia cerrada: ya no recibe turnos y los de hoy en espera se cancelaron.' : 'Agencia abierta.');
    });
  }

  return (
    <Pagina
      ancho
      titulo={superadmin ? 'Agencias' : 'Mi agencia'}
      descripcion="Servicios, ventanillas, horario y reglas de la fila. Cada cambio queda en la auditoría."
    >
      {opciones.length > 1 && (
        <div className="max-w-xs">
          <Selector etiqueta="Agencia" value={agenciaId} onChange={(e) => setAgenciaId(e.target.value)}>
            {opciones.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nombre}
              </option>
            ))}
          </Selector>
        </div>
      )}
      <AvisosGestion error={error} aviso={aviso} />

      {vista && (
        <DetalleAgencia
          vista={vista}
          superadmin={superadmin}
          accion={accion}
          aplicar={aplicar}
          cerrarJornada={() => void cerrarJornada(vista)}
          reabrirJornada={() => void reabrirJornada(vista)}
          cambiarAgencia={() => void cambiarAgencia(vista)}
        />
      )}

      {superadmin && <ParametrosGlobales alCambiar={(texto) => setAviso(texto)} />}
      {dialogo}
    </Pagina>
  );
}

type Accion = 'jornada' | 'agencia';
type Aplicar = (nueva: VistaAgencia | null, texto: string) => void;

/** El directivo ve la suya; el superadministrador, cualquiera. Empieza en la primera disponible. */
function useAmbitoGestion() {
  const { usuario } = useSesion();
  const roles = useMemo(() => usuario?.roles ?? [], [usuario]);
  const superadmin = esSuperadmin(roles);
  const propias = useMemo(() => agenciasAdministradas(roles), [roles]);
  const { agencias: catalogo } = useCatalogo();
  const opciones = agenciasDeGestion(catalogo, propias, superadmin);
  const [agenciaId, setAgenciaId] = useState(propias[0] ?? '');

  useEffect(() => {
    if (!agenciaId && opciones.length > 0) setAgenciaId(opciones[0].id);
  }, [agenciaId, opciones]);

  return { superadmin, opciones, agenciaId, setAgenciaId };
}

function agenciasDeGestion(catalogo: AgenciaCatalogo[], propias: string[], superadmin: boolean): AgenciaCatalogo[] {
  return superadmin ? catalogo : catalogo.filter((a) => propias.includes(a.id));
}

/** La vista de administración de la agencia; `recargar` la vuelve a pedir (después de cerrar o reabrir la jornada). */
function useVistaAgencia(agenciaId: string) {
  const [vista, setVista] = useState<VistaAgencia | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recarga, setRecarga] = useState(0);

  useEffect(() => {
    if (!agenciaId) return;
    let vigente = true;
    setError(null);
    agenciasAdminApi
      .obtener(agenciaId)
      .then((v) => vigente && setVista(v))
      .catch((err: unknown) => vigente && setError(mensajeDeError(err)));
    return () => {
      vigente = false;
    };
  }, [agenciaId, recarga]);

  return { vista, setVista, error, setError, recargar: () => setRecarga((n) => n + 1) };
}

function AvisosGestion({ error, aviso }: { error: string | null; aviso: string | null }) {
  return (
    <>
      {error && <Aviso tipo="error">{error}</Aviso>}
      {aviso && <Aviso tipo="exito">{aviso}</Aviso>}
    </>
  );
}

function DetalleAgencia({ vista, superadmin, accion, aplicar, cerrarJornada, reabrirJornada, cambiarAgencia }: {
  vista: VistaAgencia;
  superadmin: boolean;
  accion: Accion | null;
  aplicar: Aplicar;
  cerrarJornada: () => void;
  reabrirJornada: () => void;
  cambiarAgencia: () => void;
}) {
  return (
    <>
      <Tarjeta
        titulo={vista.nombre}
        descripcion={
          <span className="inline-flex items-center gap-1">
            <LuMapPin aria-hidden className="size-3.5" />
            {vista.municipio}
          </span>
        }
        icono={LuStore}
        acciones={
          <>
            <BotonJornada vista={vista} accion={accion} cerrar={cerrarJornada} reabrir={reabrirJornada} />
            {superadmin && <BotonAgencia vista={vista} accion={accion} cambiar={cambiarAgencia} />}
          </>
        }
      >
        <EstadoAgencia vista={vista} />
      </Tarjeta>

      <Tarjeta titulo="Servicios y ventanillas" descripcion="Las ventanillas abiertas cambian la espera estimada que ven los asociados." icono={LuStore}>
        <div className={CONTENEDOR_TABLA}>
          <table className={TABLA_ANCHA}>
            <thead>
              <tr>
                <th scope="col">Servicio</th>
                <th scope="col">Ventanillas</th>
                <th scope="col">Se ofrece</th>
              </tr>
            </thead>
            <tbody>
              {vista.servicios.map((s) => (
                <FilaServicio key={s.servicioId} servicio={s} agenciaId={vista.id} alCambiar={aplicar} />
              ))}
            </tbody>
          </table>
        </div>
      </Tarjeta>

      <Tarjeta titulo="Horario y reglas de la fila" icono={LuSettings2}>
        <TablaParametros
          parametros={vista.parametros}
          editable={(p) => p.editableEnAgencia}
          alGuardar={(p, valor) => agenciasAdminApi.fijarParametro(vista.id, p.clave, valor).then((v) => aplicar(v, `${p.nombre}: ${valor}.`))}
          alRestablecer={(p) => agenciasAdminApi.restablecerParametro(vista.id, p.clave).then((v) => aplicar(v, `${p.nombre} vuelve al valor global.`))}
        />
      </Tarjeta>
    </>
  );
}

/** Con la jornada abierta se puede cerrar; cerrada, reabrir (si la agencia está activa). */
function BotonJornada({ vista, accion, cerrar, reabrir }: { vista: VistaAgencia; accion: Accion | null; cerrar: () => void; reabrir: () => void }) {
  if (!vista.jornadaCerrada) {
    return (
      <Boton variante="peligro" icono={LuMoon} cargando={accion === 'jornada'} disabled={accion !== null} onClick={cerrar}>
        Cerrar la jornada
      </Boton>
    );
  }
  if (!vista.activa) return null;
  return (
    <Boton variante="secundario" icono={LuRotateCcw} cargando={accion === 'jornada'} disabled={accion !== null} onClick={reabrir}>
      Reabrir la jornada
    </Boton>
  );
}

function BotonAgencia({ vista, accion, cambiar }: { vista: VistaAgencia; accion: Accion | null; cambiar: () => void }) {
  return (
    <Boton variante={vista.activa ? 'peligro' : 'secundario'} icono={LuPower} cargando={accion === 'agencia'} disabled={accion !== null} onClick={cambiar}>
      {vista.activa ? 'Cerrar agencia' : 'Abrir agencia'}
    </Boton>
  );
}

function etiquetaEstado(vista: VistaAgencia): { tono: Tono; texto: string } {
  if (!vista.activa) return { tono: 'error', texto: 'Cerrada' };
  return vista.jornadaCerrada ? { tono: 'aviso', texto: 'Jornada cerrada' } : { tono: 'exito', texto: 'Atendiendo' };
}

function EstadoAgencia({ vista }: { vista: VistaAgencia }) {
  const { tono, texto } = etiquetaEstado(vista);
  return (
    <div className="flex flex-col gap-3">
      <div>
        <Etiqueta tono={tono}>{texto}</Etiqueta>
      </div>
      {vista.activa && (
        <p className="text-sm text-texto-secundario">
          {vista.jornadaCerrada
            ? 'Hoy la agencia ya no recibe turnos. Si la cerraste por error, reábrela: los turnos ya cancelados no vuelven.'
            : 'La jornada se cierra sola a la hora de cierre. Ciérrala antes si la agencia deja de atender hoy: los turnos en espera se cancelan y los ya llamados se terminan de atender.'}
        </p>
      )}
    </div>
  );
}

/** De 1 a 20 ventanillas por servicio. */
const ventanillasValidas = (n: number) => Number.isInteger(n) && n >= 1 && n <= 20;

function NotaVentanillas({ error, valido }: { error: string | null; valido: boolean }) {
  if (!error && valido) return null;
  return <div className="mt-1 text-error">{error ?? 'De 1 a 20 ventanillas'}</div>;
}

function FilaServicio({ servicio: s, agenciaId, alCambiar }: { servicio: ServicioAgencia; agenciaId: string; alCambiar: Aplicar }) {
  const [ventanillas, setVentanillas] = useState(String(s.ventanillas));
  const [error, setError] = useState<string | null>(null);
  const [accion, setAccion] = useState<string | null>(null);
  useEffect(() => setVentanillas(String(s.ventanillas)), [s.ventanillas]);

  async function guardar(cambios: { ventanillas?: number; activo?: boolean }, texto: string, nombre: string) {
    setAccion(nombre);
    setError(null);
    try {
      alCambiar(await agenciasAdminApi.actualizarServicio(agenciaId, s.servicioId, cambios), texto);
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setAccion(null);
    }
  }

  const n = Number(ventanillas);
  const valido = ventanillasValidas(n);
  return (
    <tr>
      <th scope="row">
        {s.nombre} <span className="font-normal text-texto-secundario">({s.prefijo})</span>
      </th>
      <td>
        <div className="flex items-center gap-2">
          <input
            className="entrada w-24"
            type="number"
            min={1}
            max={20}
            aria-label={`Ventanillas de ${s.nombre}`}
            aria-invalid={!valido || undefined}
            value={ventanillas}
            onChange={(e) => setVentanillas(e.target.value)}
          />
          <Boton
            variante="secundario"
            icono={LuSave}
            cargando={accion === 'ventanillas'}
            disabled={!valido || n === s.ventanillas}
            onClick={() => void guardar({ ventanillas: n }, `${s.nombre}: ${n} ${n === 1 ? 'ventanilla' : 'ventanillas'}.`, 'ventanillas')}
          >
            Guardar
          </Boton>
        </div>
        <NotaVentanillas error={error} valido={valido} />
      </td>
      <td>
        <label className="inline-flex min-h-11 cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            className="size-5 accent-primario"
            checked={s.activo}
            disabled={accion !== null}
            onChange={(e) =>
              void guardar(
                { activo: e.target.checked },
                e.target.checked ? `${s.nombre} vuelve a ofrecerse.` : `${s.nombre} ya no se ofrece en esta agencia.`,
                'activo',
              )
            }
          />
          {s.activo ? 'Sí' : 'No'}
        </label>
      </td>
    </tr>
  );
}

function TablaParametros({
  parametros,
  editable,
  alGuardar,
  alRestablecer,
}: {
  parametros: VistaParametro[];
  editable: (p: VistaParametro) => boolean;
  alGuardar: (p: VistaParametro, valor: string) => Promise<unknown>;
  alRestablecer?: (p: VistaParametro) => Promise<unknown>;
}) {
  return (
    <div className={CONTENEDOR_TABLA}>
      <table className={TABLA_ANCHA}>
        <thead>
          <tr>
            <th scope="col">Regla</th>
            <th scope="col">Valor</th>
            <th scope="col">
              <span className="sr-only">Acciones</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {parametros.map((p) => (
            <FilaParametro
              key={p.clave}
              parametro={p}
              editable={editable(p)}
              alGuardar={(valor) => alGuardar(p, valor)}
              alRestablecer={alRestablecer ? () => alRestablecer(p) : undefined}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** CU-06: valores globales; cada agencia los usa salvo que tenga uno propio. */
function ParametrosGlobales({ alCambiar }: { alCambiar: (texto: string) => void }) {
  const [parametros, setParametros] = useState<VistaParametro[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    agenciasAdminApi
      .parametrosGlobales()
      .then((p) => setParametros(p ?? []))
      .catch((err: unknown) => setError(mensajeDeError(err)));
  }, []);

  return (
    <Tarjeta titulo="Parámetros globales" descripcion="Aplican a todas las agencias que no tienen un valor propio." icono={LuGlobe}>
      {error && (
        <div className="mb-4">
          <Aviso tipo="error">{error}</Aviso>
        </div>
      )}
      <TablaParametros
        parametros={parametros}
        editable={() => true}
        alGuardar={(p, valor) =>
          agenciasAdminApi.fijarParametroGlobal(p.clave, valor).then((nuevos) => {
            if (nuevos) setParametros(nuevos);
            olvidarCatalogo();
            alCambiar(`${p.nombre} global: ${valor}.`);
          })
        }
      />
    </Tarjeta>
  );
}
