import { useCallback, useEffect, useMemo, useState } from 'react';
import { LuGlobe, LuMapPin, LuMoon, LuPower, LuRotateCcw, LuSave, LuSettings2, LuStore } from 'react-icons/lu';
import { agenciasAdminApi, resumenCierre, type ServicioAgencia, type VistaAgencia, type VistaParametro } from '../api/agenciasAdmin';
import { mensajeDeError } from '../api/http';
import { olvidarCatalogo, useCatalogo } from '../api/useCatalogo';
import { agenciasAdministradas, esSuperadmin } from '../auth/permisos';
import { useSesion } from '../auth/sesion';
import { Aviso } from '../componentes/Aviso';
import { Boton } from '../componentes/Boton';
import { Selector } from '../componentes/Campo';
import { useConfirmacion } from '../componentes/Confirmacion';
import { Etiqueta } from '../componentes/Etiqueta';
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
  const { usuario } = useSesion();
  const roles = usuario?.roles ?? [];
  const superadmin = esSuperadmin(roles);
  const propias = useMemo(() => agenciasAdministradas(roles), [roles]);
  const { agencias: catalogo } = useCatalogo();
  const opciones = superadmin ? catalogo : catalogo.filter((a) => propias.includes(a.id));

  const [agenciaId, setAgenciaId] = useState(propias[0] ?? '');
  const [vista, setVista] = useState<VistaAgencia | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [accion, setAccion] = useState<'jornada' | 'agencia' | null>(null);
  const [recarga, setRecarga] = useState(0);
  const [dialogo, confirmar] = useConfirmacion();

  useEffect(() => {
    if (!agenciaId && opciones.length > 0) setAgenciaId(opciones[0].id);
  }, [agenciaId, opciones]);

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

  /** Aplica la respuesta del backend (la vista ya trae los valores efectivos) y avisa qué cambió. */
  const aplicar = useCallback((nueva: VistaAgencia | null, texto: string) => {
    if (!nueva) return;
    setVista(nueva);
    setAviso(texto);
    olvidarCatalogo(); // el catálogo de esta pestaña ya no está al día
  }, []);

  /** Envuelve una acción de la cabecera: un clic a la vez, y el error a la vista. */
  async function ejecutar(nombre: 'jornada' | 'agencia', operacion: () => Promise<void>) {
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
      setRecarga((n) => n + 1);
      if (r) setAviso(resumenCierre(r));
    });
  }

  /** Deshace un cierre anticipado; los turnos ya cancelados no vuelven. */
  function reabrirJornada(v: VistaAgencia) {
    return ejecutar('jornada', async () => {
      await agenciasAdminApi.reabrirJornada(v.id);
      setRecarga((n) => n + 1);
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
      {error && <Aviso tipo="error">{error}</Aviso>}
      {aviso && <Aviso tipo="exito">{aviso}</Aviso>}

      {vista && (
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
                {vista.jornadaCerrada ? (
                  vista.activa && (
                    <Boton variante="secundario" icono={LuRotateCcw} cargando={accion === 'jornada'} disabled={accion !== null} onClick={() => void reabrirJornada(vista)}>
                      Reabrir la jornada
                    </Boton>
                  )
                ) : (
                  <Boton variante="peligro" icono={LuMoon} cargando={accion === 'jornada'} disabled={accion !== null} onClick={() => void cerrarJornada(vista)}>
                    Cerrar la jornada
                  </Boton>
                )}
                {superadmin && (
                  <Boton
                    variante={vista.activa ? 'peligro' : 'secundario'}
                    icono={LuPower}
                    cargando={accion === 'agencia'}
                    disabled={accion !== null}
                    onClick={() => void cambiarAgencia(vista)}
                  >
                    {vista.activa ? 'Cerrar agencia' : 'Abrir agencia'}
                  </Boton>
                )}
              </>
            }
          >
            <div className="flex flex-col gap-3">
              <div>
                {!vista.activa ? (
                  <Etiqueta tono="error">Cerrada</Etiqueta>
                ) : vista.jornadaCerrada ? (
                  <Etiqueta tono="aviso">Jornada cerrada</Etiqueta>
                ) : (
                  <Etiqueta tono="exito">Atendiendo</Etiqueta>
                )}
              </div>
              {vista.activa && (
                <p className="text-sm text-texto-secundario">
                  {vista.jornadaCerrada
                    ? 'Hoy la agencia ya no recibe turnos. Si la cerraste por error, reábrela: los turnos ya cancelados no vuelven.'
                    : 'La jornada se cierra sola a la hora de cierre. Ciérrala antes si la agencia deja de atender hoy: los turnos en espera se cancelan y los ya llamados se terminan de atender.'}
                </p>
              )}
            </div>
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
      )}

      {superadmin && <ParametrosGlobales alCambiar={(texto) => setAviso(texto)} />}
      {dialogo}
    </Pagina>
  );
}

function FilaServicio({ servicio: s, agenciaId, alCambiar }: { servicio: ServicioAgencia; agenciaId: string; alCambiar: (v: VistaAgencia | null, texto: string) => void }) {
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
  const valido = Number.isInteger(n) && n >= 1 && n <= 20;
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
        {(error || !valido) && <div className="mt-1 text-error">{error ?? 'De 1 a 20 ventanillas'}</div>}
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
