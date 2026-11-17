import { useCallback, useEffect, useMemo, useState } from 'react';
import { agenciasAdminApi, resumenCierre, type ServicioAgencia, type VistaAgencia, type VistaParametro } from '../api/agenciasAdmin';
import { mensajeDeError } from '../api/http';
import { olvidarCatalogo, useCatalogo } from '../api/useCatalogo';
import { agenciasAdministradas, esSuperadmin } from '../auth/permisos';
import { useSesion } from '../auth/sesion';
import { Aviso } from '../componentes/Aviso';
import { Boton } from '../componentes/Boton';
import { Selector } from '../componentes/Campo';
import { FilaParametro } from '../componentes/FilaParametro';

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
  function cerrarJornada(v: VistaAgencia) {
    if (!window.confirm(`¿Cerrar la jornada de ${v.nombre}? Hoy no recibirá más turnos, los que están en espera se cancelan y cada asociado recibe el aviso.`)) return;
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

  function cambiarAgencia(v: VistaAgencia) {
    if (v.activa && !window.confirm(`¿Cerrar ${v.nombre}? Deja de recibir turnos y los que están en espera hoy se cancelan.`)) return;
    return ejecutar('agencia', async () => {
      const nueva = await agenciasAdminApi.actualizarAgencia(v.id, !v.activa);
      aplicar(nueva, v.activa ? 'Agencia cerrada: ya no recibe turnos y los de hoy en espera se cancelaron.' : 'Agencia abierta.');
    });
  }

  return (
    <main id="contenido" className="ancho">
      <section className="tarjeta">
        <h2>{superadmin ? 'Agencias' : 'Mi agencia'}</h2>
        {opciones.length > 1 && (
          <div style={{ maxWidth: 360 }}>
            <Selector etiqueta="Agencia" value={agenciaId} onChange={(e) => setAgenciaId(e.target.value)}>
              {opciones.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre}
                </option>
              ))}
            </Selector>
          </div>
        )}
        {vista && (
          <div className="acciones" style={{ alignItems: 'center' }}>
            <p style={{ margin: 0 }}>
              <strong>{vista.nombre}</strong> · {vista.municipio}{' '}
              <span className={`etiqueta ${vista.activa && !vista.jornadaCerrada ? '' : 'etiqueta--inactivo'}`}>
                {!vista.activa ? 'Cerrada' : vista.jornadaCerrada ? 'Jornada cerrada' : 'Atendiendo'}
              </span>
            </p>
            {vista.jornadaCerrada ? (
              vista.activa && (
                <Boton variante="secundario" cargando={accion === 'jornada'} disabled={accion !== null} onClick={() => void reabrirJornada(vista)}>
                  Reabrir la jornada
                </Boton>
              )
            ) : (
              <Boton variante="peligro" cargando={accion === 'jornada'} disabled={accion !== null} onClick={() => void cerrarJornada(vista)}>
                Cerrar la jornada
              </Boton>
            )}
            {superadmin && (
              <Boton
                variante={vista.activa ? 'peligro' : 'secundario'}
                cargando={accion === 'agencia'}
                disabled={accion !== null}
                onClick={() => void cambiarAgencia(vista)}
              >
                {vista.activa ? 'Cerrar agencia' : 'Abrir agencia'}
              </Boton>
            )}
          </div>
        )}
        {vista?.activa && (
          <p className="texto-secundario">
            {vista.jornadaCerrada
              ? 'Hoy la agencia ya no recibe turnos. Si la cerraste por error, reábrela: los turnos ya cancelados no vuelven.'
              : 'La jornada se cierra sola a la hora de cierre. Ciérrala antes si la agencia deja de atender hoy: los turnos en espera se cancelan y los ya llamados se terminan de atender.'}
          </p>
        )}
        {error && <Aviso tipo="error">{error}</Aviso>}
        {aviso && <Aviso tipo="exito">{aviso}</Aviso>}
      </section>

      {vista && (
        <>
          <section className="tarjeta" aria-labelledby="titulo-servicios">
            <h3 id="titulo-servicios">Servicios y ventanillas</h3>
            <p className="texto-secundario">Las ventanillas abiertas cambian la espera estimada que ven los asociados.</p>
            <table className="tabla">
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
          </section>

          <section className="tarjeta" aria-labelledby="titulo-reglas">
            <h3 id="titulo-reglas">Horario y reglas de la fila</h3>
            <TablaParametros
              parametros={vista.parametros}
              editable={(p) => p.editableEnAgencia}
              alGuardar={(p, valor) => agenciasAdminApi.fijarParametro(vista.id, p.clave, valor).then((v) => aplicar(v, `${p.nombre}: ${valor}.`))}
              alRestablecer={(p) => agenciasAdminApi.restablecerParametro(vista.id, p.clave).then((v) => aplicar(v, `${p.nombre} vuelve al valor global.`))}
            />
          </section>
        </>
      )}

      {superadmin && <ParametrosGlobales alCambiar={(texto) => setAviso(texto)} />}
    </main>
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
        {s.nombre} <span className="texto-secundario">({s.prefijo})</span>
      </th>
      <td>
        <div className="acciones" style={{ alignItems: 'center' }}>
          <input
            className="entrada-corta"
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
            cargando={accion === 'ventanillas'}
            disabled={!valido || n === s.ventanillas}
            onClick={() => void guardar({ ventanillas: n }, `${s.nombre}: ${n} ${n === 1 ? 'ventanilla' : 'ventanillas'}.`, 'ventanillas')}
          >
            Guardar
          </Boton>
        </div>
        {(error || !valido) && <div className="campo__error">{error ?? 'De 1 a 20 ventanillas'}</div>}
      </td>
      <td>
        <label>
          <input
            type="checkbox"
            checked={s.activo}
            disabled={accion !== null}
            onChange={(e) =>
              void guardar(
                { activo: e.target.checked },
                e.target.checked ? `${s.nombre} vuelve a ofrecerse.` : `${s.nombre} ya no se ofrece en esta agencia.`,
                'activo',
              )
            }
          />{' '}
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
    <table className="tabla">
      <thead>
        <tr>
          <th scope="col">Regla</th>
          <th scope="col">Valor</th>
          <th scope="col">
            <span className="visualmente-oculto">Acciones</span>
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
    <section className="tarjeta" aria-labelledby="titulo-globales">
      <h3 id="titulo-globales">Parámetros globales</h3>
      <p className="texto-secundario">Aplican a todas las agencias que no tienen un valor propio.</p>
      {error && <Aviso tipo="error">{error}</Aviso>}
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
    </section>
  );
}
