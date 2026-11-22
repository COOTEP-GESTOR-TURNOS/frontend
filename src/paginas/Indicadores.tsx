import { useEffect, useMemo, useState } from 'react';
import type { IconType } from 'react-icons';
import { LuAccessibility, LuChartColumn, LuCircleCheck, LuCircleX, LuHourglass, LuListChecks, LuTicket, LuTimer, LuUserX } from 'react-icons/lu';
import { horaCorte } from '../api/demanda';
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
import { agenciasAdministradas, esSuperadmin } from '../auth/permisos';
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

/**
 * RF-19, CU-05: tablero de indicadores. El superadministrador compara las agencias; el directivo
 * ve solo la suya. Los datos salen de ClickHouse a través del backend principal.
 */
export function Indicadores() {
  const { usuario } = useSesion();
  const roles = usuario?.roles ?? [];
  const superadmin = esSuperadmin(roles);
  const propias = agenciasAdministradas(roles);
  const { agencias, cargando: cargandoAgencias, error: errorCatalogo, reintentar: recargarCatalogo } = useCatalogo();
  const permitidas = superadmin ? agencias : agencias.filter((agencia) => propias.includes(agencia.id));
  const [dias, setDias] = useState<Periodo>('mes');
  const [agenciaElegida, setAgenciaElegida] = useState('');
  const agencia = permitidas.find((item) => item.id === agenciaElegida) ?? (superadmin ? undefined : permitidas[0]);
  const agenciaId = agencia?.id ?? (superadmin ? '' : null);
  const hoy = fechaColombia();
  const [mes, setMes] = useState(() => hoy.slice(0, 7));
  const { desde, hasta } = dias === 'mes' ? rangoDelMes(mes) : ultimosDias(dias);
  const filtros = useFiltrosAnalitica(agenciaId, { desde, hasta });
  const { servicio, colaborador } = filtros;
  const agenciaConsulta = filtros.listos ? agenciaId : null;
  const servicioId = servicio?.id;
  const colaboradorId = colaborador?.id;
  const { datos: mensual, cargando, error, recargar } = useTableroMensual(
    mes, agenciaConsulta, servicioId, dias === 'mes' ? colaboradorId : undefined,
  );
  const [alterno, setAlterno] = useState<{ clave: string; datos?: TableroIndicadores; error?: string } | null>(null);
  const [revision, setRevision] = useState(0);
  const claveAlterna = JSON.stringify([agenciaConsulta, desde, hasta, servicioId, colaboradorId, revision]);
  const corte = mensual?.actualizadoEn;
  const etiquetaCorte = dias === 'mes' ? 'Último corte' : 'Corte del calendario';

  useEffect(() => {
    if (dias === 'mes' || agenciaConsulta === null) return;
    let vigente = true;
    indicadoresApi
      .consultar({ desde, hasta, agenciaId: agenciaConsulta, servicioId, colaboradorId })
      .then((datos) => {
        if (!datos) throw new Error('Respuesta vacía');
        if (vigente) setAlterno({ clave: claveAlterna, datos });
      })
      .catch((err: unknown) => {
        if (vigente) setAlterno({ clave: claveAlterna, error: mensajeDeError(err, 'No se pudieron cargar los indicadores') });
      });
    return () => {
      vigente = false;
    };
  }, [dias, agenciaConsulta, desde, hasta, servicioId, colaboradorId, claveAlterna, corte]);

  const consultaAlterna = alterno?.clave === claveAlterna ? alterno : null;
  const periodo = dias === 'mes' ? mensual : consultaAlterna?.datos;
  const total = dias === 'mes' ? mensual?.resumen : consultaAlterna?.datos?.total;
  const filas = periodo?.agencias ?? [];
  const titulo = agencia ? `Indicadores de ${agencia.nombre}` : 'Indicadores de todas las agencias';
  const alcanceCalendario = [servicio?.nombre, colaborador && 'Todos los colaboradores'].filter(Boolean).join(' · ');
  const nombresAgencias = new Map(permitidas.map(({ id, nombre }) => [id, nombre]));

  return (
    <Pagina
      ancho
      titulo={agenciaId === null ? 'Indicadores' : titulo}
      acciones={<Segmentado etiqueta="Periodo" opciones={PERIODOS} valor={dias} alCambiar={setDias} />}
    >
      {agenciaId !== null && (
        <div className="grid gap-3 sm:grid-cols-3">
          {(superadmin || permitidas.length > 1) && (
            <Selector etiqueta="Agencia" value={agenciaId} onChange={(e) => setAgenciaElegida(e.target.value)}>
              {superadmin && <option value="">Todas las agencias</option>}
              {permitidas.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
            </Selector>
          )}
          <Selector etiqueta="Servicio" value={servicioId ?? ''} disabled={!filtros.opciones} onChange={(e) => filtros.elegirServicio(e.target.value)}>
            <option value="">Todos los servicios</option>
            {filtros.opciones?.servicios.map(({ id, nombre }) => <option key={id} value={id}>{nombre}</option>)}
          </Selector>
          <Selector etiqueta="Colaborador" value={colaboradorId ?? ''} disabled={!filtros.opciones} onChange={(e) => filtros.elegirColaborador(e.target.value)}>
            <option value="">Todos los colaboradores</option>
            {filtros.opciones?.colaboradores.map(({ id, nombre, agenciaIds }) => (
              <option key={id} value={id}>
                {[nombre, !agenciaId && agenciaIds.map((idAgencia) => nombresAgencias.get(idAgencia)).filter(Boolean).join(', ')].filter(Boolean).join(' · ')}
              </option>
            ))}
          </Selector>
        </div>
      )}
      {errorCatalogo && <Aviso tipo="error">{errorCatalogo} <BotonEnlace onClick={recargarCatalogo}>Reintentar</BotonEnlace></Aviso>}
      {!cargandoAgencias && !errorCatalogo && agenciaId === null && <Aviso>No hay agencias disponibles en tu ámbito.</Aviso>}
      {filtros.error && <Aviso tipo="error">{filtros.error} <BotonEnlace onClick={filtros.reintentar}>Reintentar</BotonEnlace></Aviso>}
      {error && <Aviso tipo="error">{error} <BotonEnlace onClick={recargar}>Reintentar</BotonEnlace></Aviso>}
      {agenciaId !== null && (filtros.cargando || cargando || (agenciaConsulta !== null && dias !== 'mes' && !consultaAlterna)) && <Cargando texto="Cargando indicadores…" />}
      {dias !== 'mes' && consultaAlterna?.error && (
        <Aviso tipo="error">{consultaAlterna.error} <BotonEnlace onClick={() => setRevision((actual) => actual + 1)}>Reintentar</BotonEnlace></Aviso>
      )}
      {mensual?.fuente === 'SIMULADA' && (
        <Aviso>Datos simulados.{corte && ` ${etiquetaCorte} ${horaCorte(corte)} (hora de Colombia).`}</Aviso>
      )}
      {total && (
        <>
          <Resumen valores={total} />
          {filas.length > 1 && <Comparacion agencias={filas} />}
          {filas.some((a) => !a.disponible) && (
            <Aviso tipo="info">
              Faltan datos de {filas.filter((a) => !a.disponible).map((a) => a.nombre).join(', ')} en el total.
            </Aviso>
          )}
        </>
      )}
      {agenciaId !== null && <CalendarioDemanda key={agenciaId} agenciaId={agenciaId} hoy={hoy} mes={mes} cambiarMes={setMes} datos={mensual?.calendario ?? null} recargar={recargar} alcance={alcanceCalendario} />}
    </Pagina>
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
