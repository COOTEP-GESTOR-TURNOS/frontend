import { useCallback, useEffect, useState } from 'react';
import {
  ACCIONES_ALERTA,
  auditoriaApi,
  describirDetalle,
  type EntradaAuditoria,
  fechaHoraColombia,
  horaColombia,
  NOMBRE_ACCION,
} from '../api/auditoria';
import { type AgenciaCatalogo, describirFila } from '../api/catalogo';
import { mensajeDeError } from '../api/http';
import { fechaColombia } from '../api/recomendaciones';
import { useCatalogo } from '../api/useCatalogo';
import { Aviso } from '../componentes/Aviso';
import { Boton } from '../componentes/Boton';
import { Campo, Selector } from '../componentes/Campo';

interface Persona {
  id: string;
  nombre: string;
}

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const FILA = new RegExp(`^(${UUID}):(${UUID})$`, 'i');

/** Traduce ids a nombres cuando el catálogo los conoce: «Caja · Agencia Mocoa» en vez de dos UUID. */
function describirObjetivo(e: EntradaAuditoria, agencias: AgenciaCatalogo[]): string {
  const fila = FILA.exec(e.objetivoId);
  if (fila) return describirFila(agencias, fila[1], fila[2]) ?? e.objetivoId;
  // La tabla por persona no guarda el tipo de objeto: cualquier id de agencia se muestra con su nombre.
  return agencias.find((a) => a.id === e.objetivoId)?.nombre ?? e.objetivoId;
}

/**
 * RF-20, CU-06: auditoría para el superadministrador. Por ámbito (global o agencia) y día, del
 * registro más reciente al más antiguo; un clic en una persona muestra lo que hizo en el mes.
 */
export function Auditoria() {
  const { agencias } = useCatalogo();
  const hoy = fechaColombia(0);
  const [ambito, setAmbito] = useState('GLOBAL');
  const [dia, setDia] = useState(hoy);
  const [accion, setAccion] = useState('');
  const [persona, setPersona] = useState<Persona | null>(null);
  const [entradas, setEntradas] = useState<EntradaAuditoria[]>([]);
  const [siguiente, setSiguiente] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const consultar = useCallback(
    (pagina?: string) =>
      persona ? auditoriaApi.porActorMes(persona.id, dia.slice(0, 7), pagina) : auditoriaApi.porAmbitoDia({ ambito, dia, accion: accion || undefined, siguiente: pagina }),
    [persona, ambito, dia, accion],
  );

  useEffect(() => {
    let vigente = true;
    setCargando(true);
    setError(null);
    consultar()
      .then((r) => {
        if (!vigente || !r) return;
        setEntradas(r.entradas);
        setSiguiente(r.siguiente);
      })
      .catch((err: unknown) => vigente && setError(mensajeDeError(err)))
      .finally(() => vigente && setCargando(false));
    return () => {
      vigente = false;
    };
  }, [consultar]);

  async function cargarMas() {
    if (!siguiente) return;
    setCargando(true);
    try {
      const r = await consultar(siguiente);
      if (r) {
        setEntradas((actuales) => [...actuales, ...r.entradas]);
        setSiguiente(r.siguiente);
      }
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setCargando(false);
    }
  }

  const nombreAmbito = (id: string) => (id === 'GLOBAL' ? 'Global' : agencias.find((a) => a.id === id)?.nombre ?? id);

  return (
    <main id="contenido" className="ancho">
      <section className="tarjeta">
        <h2>{persona ? `Actividad de ${persona.nombre}` : 'Auditoría'}</h2>
        <p className="texto-secundario">
          {persona
            ? `Todo lo que registró en ${dia.slice(0, 7)}, en cualquier agencia.`
            : 'Registros de solo lectura guardados en Cassandra. Nadie puede editarlos ni borrarlos.'}
        </p>
        {persona ? (
          <Boton variante="secundario" onClick={() => setPersona(null)}>
            Volver al día
          </Boton>
        ) : (
          <div className="filtros">
            <Selector etiqueta="Ámbito" value={ambito} onChange={(e) => setAmbito(e.target.value)}>
              <option value="GLOBAL">Global (cuentas, parámetros globales)</option>
              {agencias.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre}
                </option>
              ))}
            </Selector>
            <Campo etiqueta="Día" type="date" max={hoy} value={dia} onChange={(e) => e.target.value && setDia(e.target.value)} />
            <Selector etiqueta="Acción" value={accion} onChange={(e) => setAccion(e.target.value)}>
              <option value="">Todas</option>
              {Object.entries(NOMBRE_ACCION).map(([clave, texto]) => (
                <option key={clave} value={clave}>
                  {texto}
                </option>
              ))}
            </Selector>
          </div>
        )}
        {error && <Aviso tipo="error">{error}</Aviso>}
      </section>

      <section className="tarjeta" aria-labelledby="titulo-registros" aria-busy={cargando}>
        <h3 id="titulo-registros">
          {entradas.length} {entradas.length === 1 ? 'registro' : 'registros'}
          {siguiente ? ' (hay más)' : ''}
        </h3>
        {!cargando && entradas.length === 0 && !error && <p className="texto-secundario">No hay registros con esos filtros.</p>}
        {entradas.length > 0 && (
          <table className="tabla">
            <thead>
              <tr>
                <th scope="col">{persona ? 'Fecha' : 'Hora'}</th>
                <th scope="col">Acción</th>
                <th scope="col">{persona ? 'Ámbito' : 'Quién'}</th>
                <th scope="col">Sobre qué</th>
                {!persona && <th scope="col">Detalle</th>}
              </tr>
            </thead>
            <tbody>
              {entradas.map((e) => (
                <tr key={`${e.ocurridoEn}-${e.accion}-${e.objetivoId}`}>
                  <td>{persona ? fechaHoraColombia(e.ocurridoEn) : horaColombia(e.ocurridoEn)}</td>
                  <td>
                    <span className={`etiqueta ${ACCIONES_ALERTA.has(e.accion) ? 'etiqueta--inactivo' : ''}`}>{NOMBRE_ACCION[e.accion] ?? e.accion}</span>
                  </td>
                  <td>
                    {persona ? (
                      nombreAmbito(e.ambito)
                    ) : e.actor.nombre ? (
                      <>
                        <button
                          type="button"
                          className="enlace-boton"
                          onClick={() => {
                            setPersona({ id: e.actor.id, nombre: e.actor.nombre! });
                            window.scrollTo({ top: 0 });
                          }}
                        >
                          {e.actor.nombre}
                        </button>
                        <div className="texto-secundario">{e.actor.rol}</div>
                      </>
                    ) : (
                      <span className="texto-secundario">Correo desconocido</span>
                    )}
                  </td>
                  <td>
                    {e.objetivoTipo && <div className="texto-secundario">{e.objetivoTipo}</div>}
                    <span className="texto-largo">{describirObjetivo(e, agencias)}</span>
                  </td>
                  {!persona && (
                    <td>
                      <span className="texto-largo">{describirDetalle(e.detalle)}</span>
                      {e.ip && <div className="texto-secundario">IP {e.ip}</div>}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {cargando && <p role="status">Cargando…</p>}
        {siguiente && !cargando && (
          <div style={{ marginTop: 'var(--espacio-4)' }}>
            <Boton variante="secundario" onClick={() => void cargarMas()}>
              Cargar más
            </Boton>
          </div>
        )}
      </section>
    </main>
  );
}
