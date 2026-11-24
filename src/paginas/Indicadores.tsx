import { useEffect, useMemo, useState } from 'react';
import type { IconType } from 'react-icons';
import { LuAccessibility, LuChartColumn, LuCircleCheck, LuCircleX, LuHourglass, LuListChecks, LuTicket, LuTimer, LuUserX } from 'react-icons/lu';
import type { AgenciaCatalogo } from '../api/catalogo';
import { horaCorte, type TableroMensual } from '../api/demanda';
import { rangoDelMes } from '../api/filtrosAnalitica';
import { mensajeDeError } from '../api/http';
import {
  entero,
  indicadoresApi,
  minutos,
  porcentaje,
  type IndicadoresAgencia,
  type TableroIndicadores,
  totalTurnos,
  ultimosDias,
  type ValoresIndicadores,
} from '../api/indicadores';
import { useCatalogo } from '../api/useCatalogo';
import { fechaColombia } from '../api/recomendaciones';
import { useFiltrosAnalitica } from '../api/useFiltrosAnalitica';
import { useTableroMensual } from '../api/useTableroMensual';
import { agenciasAdministradas, type AsignacionRol, esSuperadmin } from '../auth/permisos';
import { useSesion } from '../auth/sesion';
import { Aviso } from '../componentes/Aviso';
import { BotonEnlace } from '../componentes/Boton';
import { CalendarioDemanda } from '../componentes/CalendarioDemanda';
import { Selector } from '../componentes/Campo';
import { Cargando, Pagina } from '../componentes/Pagina';
import { Segmentado } from '../componentes/Segmentado';
import { Tarjeta } from '../componentes/Tarjeta';

type Periodo = 'mes' | number;
const PERIODOS: { valor: Periodo; texto: string }[] = [
  { valor: 'mes', texto: 'Mes del calendario' },
  ...[7, 30, 90].map((valor) => ({ valor, texto: `${valor} días` })),
];

type Ambito = ReturnType<typeof useAmbitoIndicadores>;
type Filtros = ReturnType<typeof useFiltrosAnalitica>;
type Tablero = ReturnType<typeof useTableroMensual>;
type Alterno = ReturnType<typeof useIndicadoresAlternos>;

/**
 * RF-19, CU-05: tablero de indicadores. El superadministrador compara las agencias; el directivo
 * ve solo la suya. Los datos salen de ClickHouse a través del backend principal.
 */
export function Indicadores() {
  const ambito = useAmbitoIndicadores();
  const hoy = fechaColombia();
  const [dias, setDias] = useState<Periodo>('mes');
  const [mes, setMes] = useState(() => hoy.slice(0, 7));
  const { esMes, filtros, agenciaConsulta, tablero, alterno } = useDatosIndicadores(ambito.agenciaId, dias, mes);
  const { total, filas } = esMes ? periodoMensual(tablero.datos) : periodoAlterno(alterno.consulta?.datos);

  return (
    <Pagina
      ancho
      titulo={tituloIndicadores(ambito.agenciaId, ambito.agencia)}
      acciones={<Segmentado etiqueta="Periodo" opciones={PERIODOS} valor={dias} alCambiar={setDias} />}
    >
      {ambito.agenciaId !== null && <FiltrosIndicadores ambito={ambito} agenciaId={ambito.agenciaId} filtros={filtros} />}
      <AvisosIndicadores ambito={ambito} filtros={filtros} tablero={tablero} alterno={alterno} esMes={esMes} agenciaConsulta={agenciaConsulta} />
      <ResultadosIndicadores total={total} filas={filas} esMes={esMes} actualizando={tablero.actualizando} />
      <CalendarioIndicadores agenciaId={ambito.agenciaId} hoy={hoy} mes={mes} cambiarMes={setMes} tablero={tablero} filtros={filtros} />
    </Pagina>
  );
}

// ---------- Ámbito: qué agencias puede ver la persona y cuál está elegida ----------

function useAmbitoIndicadores() {
  const { usuario } = useSesion();
  const roles = usuario?.roles ?? [];
  const superadmin = esSuperadmin(roles);
  const { agencias, cargando: cargandoAgencias, error: errorCatalogo, reintentar: recargarCatalogo } = useCatalogo();
  const permitidas = agenciasPermitidas(agencias, roles, superadmin);
  const [agenciaElegida, setAgenciaElegida] = useState('');
  const { agencia, agenciaId } = agenciaActual(permitidas, agenciaElegida, superadmin);
  return { superadmin, permitidas, agencia, agenciaId, setAgenciaElegida, cargandoAgencias, errorCatalogo, recargarCatalogo };
}

function agenciasPermitidas(agencias: AgenciaCatalogo[], roles: AsignacionRol[], superadmin: boolean): AgenciaCatalogo[] {
  if (superadmin) return agencias;
  const propias = agenciasAdministradas(roles);
  return agencias.filter((agencia) => propias.includes(agencia.id));
}

/**
 * El superadministrador empieza en «Todas las agencias» (agenciaId ''); el directivo, en la suya.
 * agenciaId null: no hay ninguna agencia en su ámbito.
 */
function agenciaActual(permitidas: AgenciaCatalogo[], elegida: string, superadmin: boolean) {
  const agencia = permitidas.find((item) => item.id === elegida) ?? (superadmin ? undefined : permitidas[0]);
  const agenciaId: string | null = agencia?.id ?? (superadmin ? '' : null);
  return { agencia, agenciaId };
}

function tituloIndicadores(agenciaId: string | null, agencia?: AgenciaCatalogo): string {
  if (agenciaId === null) return 'Indicadores';
  return agencia ? `Indicadores de ${agencia.nombre}` : 'Indicadores de todas las agencias';
}

// ---------- Datos: filtros, tablero del mes y la consulta de los otros periodos ----------

function useDatosIndicadores(agenciaId: string | null, dias: Periodo, mes: string) {
  const esMes = dias === 'mes';
  const { desde, hasta } = dias === 'mes' ? rangoDelMes(mes) : ultimosDias(dias);
  const filtros = useFiltrosAnalitica(agenciaId, { desde, hasta });
  const agenciaConsulta = filtros.listos ? agenciaId : null;
  const servicioId = filtros.servicio?.id;
  const colaboradorId = filtros.colaborador?.id;
  const tablero = useTableroMensual(mes, agenciaConsulta, servicioId, esMes ? colaboradorId : undefined);
  const alterno = useIndicadoresAlternos({ activo: !esMes, agenciaId: agenciaConsulta, desde, hasta, servicioId, colaboradorId, corte: tablero.datos?.actualizadoEn });
  return { esMes, filtros, agenciaConsulta, tablero, alterno };
}

interface ConsultaAlterna {
  activo: boolean;
  agenciaId: string | null;
  desde: string;
  hasta: string;
  servicioId?: string;
  colaboradorId?: string;
  /** Cuando cambia el corte de la analítica se vuelve a consultar. */
  corte?: string | null;
}

/** Indicadores de los últimos 7, 30 o 90 días (el mes del calendario sale del tablero mensual). */
function useIndicadoresAlternos({ activo, agenciaId, desde, hasta, servicioId, colaboradorId, corte }: ConsultaAlterna) {
  const [resultado, setResultado] = useState<{ clave: string; datos?: TableroIndicadores; error?: string } | null>(null);
  const [revision, setRevision] = useState(0);
  const clave = JSON.stringify([agenciaId, desde, hasta, servicioId, colaboradorId, revision]);

  useEffect(() => {
    if (!activo || agenciaId === null) return;
    let vigente = true;
    indicadoresApi
      .consultar({ desde, hasta, agenciaId, servicioId, colaboradorId })
      .then((datos) => {
        if (!datos) throw new Error('Respuesta vacía');
        if (vigente) setResultado({ clave, datos });
      })
      .catch((err: unknown) => {
        if (vigente) setResultado({ clave, error: mensajeDeError(err, 'No se pudieron cargar los indicadores') });
      });
    return () => {
      vigente = false;
    };
  }, [activo, agenciaId, desde, hasta, servicioId, colaboradorId, clave, corte]);

  const consulta = resultado?.clave === clave ? resultado : null;
  return { consulta, reintentar: () => setRevision((actual) => actual + 1) };
}

function periodoMensual(datos: TableroMensual | null) {
  return { total: datos?.resumen, filas: datos?.agencias ?? [] };
}

function periodoAlterno(datos?: TableroIndicadores) {
  return { total: datos?.total, filas: datos?.agencias ?? [] };
}

// ---------- Filtros ----------

function FiltrosIndicadores({ ambito, agenciaId, filtros }: { ambito: Ambito; agenciaId: string; filtros: Filtros }) {
  const variasAgencias = ambito.superadmin || ambito.permitidas.length > 1;
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {variasAgencias && <SelectorAgencia ambito={ambito} agenciaId={agenciaId} />}
      <SelectorServicio filtros={filtros} />
      <SelectorColaborador filtros={filtros} agenciaId={agenciaId} permitidas={ambito.permitidas} />
    </div>
  );
}

function SelectorAgencia({ ambito, agenciaId }: { ambito: Ambito; agenciaId: string }) {
  return (
    <Selector etiqueta="Agencia" value={agenciaId} onChange={(e) => ambito.setAgenciaElegida(e.target.value)}>
      {ambito.superadmin && <option value="">Todas las agencias</option>}
      {ambito.permitidas.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
    </Selector>
  );
}

function SelectorServicio({ filtros }: { filtros: Filtros }) {
  return (
    <Selector etiqueta="Servicio" value={filtros.servicio?.id ?? ''} disabled={!filtros.opciones} onChange={(e) => filtros.elegirServicio(e.target.value)}>
      <option value="">Todos los servicios</option>
      {filtros.opciones?.servicios.map(({ id, nombre }) => <option key={id} value={id}>{nombre}</option>)}
    </Selector>
  );
}

/** Con «Todas las agencias», cada colaborador lleva entre paréntesis las agencias donde trabaja. */
function SelectorColaborador({ filtros, agenciaId, permitidas }: { filtros: Filtros; agenciaId: string; permitidas: AgenciaCatalogo[] }) {
  const nombresAgencias = new Map(permitidas.map(({ id, nombre }) => [id, nombre]));
  return (
    <Selector etiqueta="Colaborador" value={filtros.colaborador?.id ?? ''} disabled={!filtros.opciones} onChange={(e) => filtros.elegirColaborador(e.target.value)}>
      <option value="">Todos los colaboradores</option>
      {filtros.opciones?.colaboradores.map(({ id, nombre, agenciaIds }) => (
        <option key={id} value={id}>
          {[nombre, !agenciaId && agenciaIds.map((idAgencia) => nombresAgencias.get(idAgencia)).filter(Boolean).join(', ')].filter(Boolean).join(' · ')}
        </option>
      ))}
    </Selector>
  );
}

// ---------- Avisos (errores, carga, datos simulados) ----------

function AvisoReintentar({ error, reintentar }: { error?: string | null; reintentar: () => void }) {
  if (!error) return null;
  return (
    <Aviso tipo="error">
      {error} <BotonEnlace onClick={reintentar}>Reintentar</BotonEnlace>
    </Aviso>
  );
}

const sinAgencias = (ambito: Ambito) => !ambito.cargandoAgencias && !ambito.errorCatalogo && ambito.agenciaId === null;

/** La consulta de otro periodo ya salió y todavía no responde. */
const cargandoAlterno = (agenciaConsulta: string | null, esMes: boolean, alterno: Alterno) =>
  agenciaConsulta !== null && !esMes && !alterno.consulta;

/** El aviso de carga solo aparece si aún no hay nada que mostrar (si no, empuja la página). */
function cargandoIndicadores(ambito: Ambito, filtros: Filtros, tablero: Tablero, enEspera: boolean): boolean {
  return ambito.agenciaId !== null && (filtros.cargando || (tablero.cargando && !tablero.datos) || enEspera);
}

function AvisosIndicadores({ ambito, filtros, tablero, alterno, esMes, agenciaConsulta }: {
  ambito: Ambito;
  filtros: Filtros;
  tablero: Tablero;
  alterno: Alterno;
  esMes: boolean;
  agenciaConsulta: string | null;
}) {
  const enEspera = cargandoAlterno(agenciaConsulta, esMes, alterno);
  return (
    <>
      <AvisoReintentar error={ambito.errorCatalogo} reintentar={ambito.recargarCatalogo} />
      {sinAgencias(ambito) && <Aviso>No hay agencias disponibles en tu ámbito.</Aviso>}
      <AvisoReintentar error={filtros.error} reintentar={filtros.reintentar} />
      <AvisoReintentar error={tablero.error} reintentar={tablero.recargar} />
      {cargandoIndicadores(ambito, filtros, tablero, enEspera) && <Cargando texto="Cargando indicadores…" />}
      <AvisoReintentar error={esMes ? null : alterno.consulta?.error} reintentar={alterno.reintentar} />
      <AvisoSimulados datos={tablero.datos} esMes={esMes} />
    </>
  );
}

function AvisoSimulados({ datos, esMes }: { datos: TableroMensual | null; esMes: boolean }) {
  if (datos?.fuente !== 'SIMULADA') return null;
  const corte = datos.actualizadoEn;
  const etiqueta = esMes ? 'Último corte' : 'Corte del calendario';
  return <Aviso>Datos simulados.{corte && ` ${etiqueta} ${horaCorte(corte)} (hora de Colombia).`}</Aviso>;
}

// ---------- Resultados y calendario ----------

function ResultadosIndicadores({ total, filas, esMes, actualizando }: {
  total?: ValoresIndicadores;
  filas: IndicadoresAgencia[];
  esMes: boolean;
  actualizando: boolean;
}) {
  if (!total) return null;
  // Al cambiar de mes se ven las cifras anteriores atenuadas hasta que llegan las nuevas.
  const atenuado = esMes && actualizando;
  const faltantes = filas.filter((a) => !a.disponible);
  return (
    <div className={`flex flex-col gap-6 motion-safe:transition-opacity ${atenuado ? 'opacity-50' : ''}`} aria-busy={atenuado}>
      <Resumen valores={total} />
      {filas.length > 1 && <Comparacion agencias={filas} />}
      {faltantes.length > 0 && (
        <Aviso tipo="info">
          Faltan datos de {faltantes.map((a) => a.nombre).join(', ')} en el total.
        </Aviso>
      )}
    </div>
  );
}

const alcanceCalendario = (filtros: Filtros) =>
  [filtros.servicio?.nombre, filtros.colaborador && 'Todos los colaboradores'].filter(Boolean).join(' · ');

function CalendarioIndicadores({ agenciaId, hoy, mes, cambiarMes, tablero, filtros }: {
  agenciaId: string | null;
  hoy: string;
  mes: string;
  cambiarMes: (mes: string) => void;
  tablero: Tablero;
  filtros: Filtros;
}) {
  if (agenciaId === null) return null;
  return (
    <CalendarioDemanda
      key={agenciaId}
      agenciaId={agenciaId}
      hoy={hoy}
      mes={mes}
      cambiarMes={cambiarMes}
      datos={tablero.datos?.calendario ?? null}
      recargar={tablero.recargar}
      alcance={alcanceCalendario(filtros)}
      actualizando={tablero.actualizando}
    />
  );
}

function Resumen({ valores }: { valores: ValoresIndicadores }) {
  const turnos = totalTurnos(valores);
  const cifras: { nombre: string; valor: string; nota: string; icono: IconType }[] = [
    ...(valores.solicitados == null ? [] : [{ nombre: 'Solicitados', valor: entero(valores.solicitados), nota: 'incluye turnos pendientes', icono: LuTicket }]),
    ...(valores.pendientes == null ? [] : [{ nombre: 'Pendientes', valor: entero(valores.pendientes), nota: 'turnos sin finalizar', icono: LuListChecks }]),
    { nombre: 'Turnos atendidos', valor: entero(valores.atendidos), nota: `de ${entero(turnos)} finalizados`, icono: LuCircleCheck },
    { nombre: 'Ausentes', valor: porcentaje(valores.ausentes, turnos), nota: `${entero(valores.ausentes)} turnos`, icono: LuUserX },
    { nombre: 'Cancelados', valor: porcentaje(valores.cancelados, turnos), nota: `${entero(valores.cancelados)} turnos`, icono: LuCircleX },
    { nombre: 'Espera promedio', valor: minutos(valores.esperaPromedioMin), nota: 'desde que pide hasta que lo llaman', icono: LuHourglass },
    { nombre: 'Atención promedio', valor: minutos(valores.atencionPromedioMin), nota: 'en la ventanilla', icono: LuTimer },
    { nombre: 'Atención preferencial', valor: porcentaje(valores.proporcionPreferencial, 1), nota: 'de los turnos', icono: LuAccessibility },
  ];
  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Resumen del periodo">
      {cifras.map(({ nombre, valor, nota, icono: Icono }) => (
        <div key={nombre} className="flex flex-col gap-1 rounded-xl border border-borde bg-superficie p-5 shadow-xs">
          <span className="flex items-center gap-2 text-sm text-texto-secundario">
            <Icono aria-hidden className="size-4 text-primario" />
            {nombre}
          </span>
          <strong className="text-3xl font-semibold tracking-tight tabular-nums">{valor}</strong>
          <span className="text-sm text-texto-secundario">{nota}</span>
        </div>
      ))}
    </section>
  );
}

/** Tabla por agencia, ordenada por espera; la barra compara la espera promedio entre agencias. */
function Comparacion({ agencias }: { agencias: IndicadoresAgencia[] }) {
  const filas = useMemo(() => [...agencias].sort((a, b) => b.esperaPromedioMin - a.esperaPromedioMin), [agencias]);
  const maxima = Math.max(...filas.map((a) => a.esperaPromedioMin), 1);
  const muestraSolicitudes = filas.some((a) => a.solicitados != null);
  const muestraPendientes = filas.some((a) => a.pendientes != null);
  return (
    <Tarjeta titulo="Comparación por agencia" descripcion="De mayor a menor espera promedio." icono={LuChartColumn}>
      <div className="-mx-5 overflow-x-auto sm:-mx-6">
        <table className="tabla min-w-[40rem] [&_tbody_th:first-child]:pl-5 [&_td:last-child]:pr-5 [&_thead_th:first-child]:pl-5 sm:[&_tbody_th:first-child]:pl-6 sm:[&_thead_th:first-child]:pl-6">
          <thead>
            <tr>
              <th scope="col">Agencia</th>
              <th scope="col">Espera promedio</th>
              {muestraSolicitudes && <th scope="col">Solicitados</th>}
              {muestraPendientes && <th scope="col">Pendientes</th>}
              <th scope="col">Atendidos</th>
              <th scope="col">Ausentes</th>
              <th scope="col">Cancelados</th>
              <th scope="col">Preferencial</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((a) => (
              <tr key={a.agenciaId}>
                <th scope="row">{a.nombre}</th>
                <td className="w-1/3">
                  {a.disponible ? (
                    <div className="flex items-center gap-3">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-texto/5" aria-hidden>
                        <div className="h-full rounded-full bg-primario" style={{ width: `${(a.esperaPromedioMin / maxima) * 100}%` }} />
                      </div>
                      <span className="w-16 text-right tabular-nums">{minutos(a.esperaPromedioMin)}</span>
                    </div>
                  ) : (
                    <span className="text-texto-secundario">Sin datos</span>
                  )}
                </td>
                {muestraSolicitudes && <td className="tabular-nums">{a.solicitados == null ? '—' : entero(a.solicitados)}</td>}
                {muestraPendientes && <td className="tabular-nums">{a.pendientes == null ? '—' : entero(a.pendientes)}</td>}
                <td className="tabular-nums">{entero(a.atendidos)}</td>
                <td className="tabular-nums">{entero(a.ausentes)} <span className="text-texto-secundario">({porcentaje(a.ausentes, totalTurnos(a))})</span></td>
                <td className="tabular-nums">{entero(a.cancelados)}</td>
                <td className="tabular-nums">{porcentaje(a.proporcionPreferencial, 1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Tarjeta>
  );
}
