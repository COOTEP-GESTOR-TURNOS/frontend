import { useCallback, useEffect, useState } from 'react';
import { LuArrowLeft, LuChevronDown, LuScrollText, LuShieldAlert } from 'react-icons/lu';
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
import { Boton, BotonEnlace } from '../componentes/Boton';
import { Campo, Selector } from '../componentes/Campo';
import { Etiqueta } from '../componentes/Etiqueta';
import { Cargando, Pagina } from '../componentes/Pagina';
import { Tarjeta } from '../componentes/Tarjeta';

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

/** Registros de un ámbito y día (o de una persona en el mes), con «cargar más» por páginas. */
function useRegistrosAuditoria({ persona, ambito, dia, accion }: { persona: Persona | null; ambito: string; dia: string; accion: string }) {
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

  return { entradas, siguiente, cargando, error, cargarMas };
}

type Registros = ReturnType<typeof useRegistrosAuditoria>;

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
  const registros = useRegistrosAuditoria({ persona, ambito, dia, accion });

  return (
    <Pagina
      ancho
      titulo={persona ? `Actividad de ${persona.nombre}` : 'Auditoría'}
      acciones={
        persona && (
          <Boton variante="secundario" icono={LuArrowLeft} onClick={() => setPersona(null)}>
            Volver al día
          </Boton>
        )
      }
    >
      {!persona && (
        <FiltrosAuditoria agencias={agencias} hoy={hoy} ambito={ambito} setAmbito={setAmbito} dia={dia} setDia={setDia} accion={accion} setAccion={setAccion} />
      )}
      {registros.error && <Aviso tipo="error">{registros.error}</Aviso>}
      <TarjetaRegistros
        registros={registros}
        persona={persona}
        agencias={agencias}
        verPersona={(p) => {
          setPersona(p);
          window.scrollTo({ top: 0 });
        }}
      />
    </Pagina>
  );
}

function FiltrosAuditoria({ agencias, hoy, ambito, setAmbito, dia, setDia, accion, setAccion }: {
  agencias: AgenciaCatalogo[];
  hoy: string;
  ambito: string;
  setAmbito: (ambito: string) => void;
  dia: string;
  setDia: (dia: string) => void;
  accion: string;
  setAccion: (accion: string) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
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
  );
}

function tituloRegistros(cantidad: number, hayMas: boolean): string {
  return `${cantidad} ${cantidad === 1 ? 'registro' : 'registros'}${hayMas ? ' (hay más)' : ''}`;
}

function TarjetaRegistros({ registros, persona, agencias, verPersona }: {
  registros: Registros;
  persona: Persona | null;
  agencias: AgenciaCatalogo[];
  verPersona: (persona: Persona) => void;
}) {
  const { entradas, siguiente, cargando, error, cargarMas } = registros;
  const sinRegistros = !cargando && entradas.length === 0 && !error;
  return (
    <Tarjeta titulo={tituloRegistros(entradas.length, Boolean(siguiente))} icono={LuScrollText} aria-busy={cargando}>
      {sinRegistros && <p className="text-sm text-texto-secundario">No hay registros con esos filtros.</p>}
      {entradas.length > 0 && <TablaRegistros entradas={entradas} persona={persona} agencias={agencias} verPersona={verPersona} />}
      <PieRegistros cargando={cargando} hayMas={Boolean(siguiente)} cargarMas={() => void cargarMas()} />
    </Tarjeta>
  );
}

function PieRegistros({ cargando, hayMas, cargarMas }: { cargando: boolean; hayMas: boolean; cargarMas: () => void }) {
  if (cargando) {
    return (
      <div className="mt-4">
        <Cargando />
      </div>
    );
  }
  if (!hayMas) return null;
  return (
    <div className="mt-4 flex justify-center">
      <Boton variante="secundario" icono={LuChevronDown} onClick={cargarMas}>
        Cargar más
      </Boton>
    </div>
  );
}

function TablaRegistros({ entradas, persona, agencias, verPersona }: {
  entradas: EntradaAuditoria[];
  persona: Persona | null;
  agencias: AgenciaCatalogo[];
  verPersona: (persona: Persona) => void;
}) {
  return (
    <div className="-mx-5 overflow-x-auto sm:-mx-6">
      <table className="tabla min-w-[48rem] [&_td:first-child]:pl-5 [&_td:last-child]:pr-5 [&_th:first-child]:pl-5 sm:[&_td:first-child]:pl-6 sm:[&_th:first-child]:pl-6">
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
            <FilaRegistro key={`${e.ocurridoEn}-${e.accion}-${e.objetivoId}`} entrada={e} porPersona={Boolean(persona)} agencias={agencias} verPersona={verPersona} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FilaRegistro({ entrada: e, porPersona, agencias, verPersona }: {
  entrada: EntradaAuditoria;
  porPersona: boolean;
  agencias: AgenciaCatalogo[];
  verPersona: (persona: Persona) => void;
}) {
  return (
    <tr>
      <td className="whitespace-nowrap tabular-nums">{porPersona ? fechaHoraColombia(e.ocurridoEn) : horaColombia(e.ocurridoEn)}</td>
      <td>
        <EtiquetaAccion accion={e.accion} />
      </td>
      <td>{porPersona ? nombreAmbito(agencias, e.ambito) : <Quien entrada={e} verPersona={verPersona} />}</td>
      <td>
        {e.objetivoTipo && <div className="text-xs text-texto-secundario">{e.objetivoTipo}</div>}
        <span className="[overflow-wrap:anywhere]">{describirObjetivo(e, agencias)}</span>
      </td>
      {!porPersona && (
        <td>
          <span className="[overflow-wrap:anywhere]">{describirDetalle(e.detalle)}</span>
          {e.ip && <div className="text-xs text-texto-secundario">IP {e.ip}</div>}
        </td>
      )}
    </tr>
  );
}

/** Las acciones que merecen atención (accesos denegados, bloqueos) van en rojo. */
function EtiquetaAccion({ accion }: { accion: string }) {
  const nombre = NOMBRE_ACCION[accion] ?? accion;
  if (ACCIONES_ALERTA.has(accion)) {
    return (
      <Etiqueta tono="error" icono={LuShieldAlert}>
        {nombre}
      </Etiqueta>
    );
  }
  return <Etiqueta>{nombre}</Etiqueta>;
}

/** Quién lo hizo: la persona (con enlace a su actividad), el sistema o un correo que no existe. */
function Quien({ entrada: e, verPersona }: { entrada: EntradaAuditoria; verPersona: (persona: Persona) => void }) {
  const nombre = e.actor.nombre;
  if (nombre) {
    return (
      <>
        <BotonEnlace onClick={() => verPersona({ id: e.actor.id, nombre })}>{nombre}</BotonEnlace>
        <div className="text-xs text-texto-secundario">{e.actor.rol}</div>
      </>
    );
  }
  return <span className="text-texto-secundario">{e.actor.rol === 'SISTEMA' ? 'Sistema (automático)' : 'Correo desconocido'}</span>;
}

function nombreAmbito(agencias: AgenciaCatalogo[], id: string): string {
  if (id === 'GLOBAL') return 'Global';
  return agencias.find((a) => a.id === id)?.nombre ?? id;
}
