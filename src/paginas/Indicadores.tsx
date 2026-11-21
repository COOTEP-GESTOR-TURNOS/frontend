import { useEffect, useMemo, useState } from 'react';
import type { IconType } from 'react-icons';
import { LuAccessibility, LuChartColumn, LuCircleCheck, LuCircleX, LuHourglass, LuTimer, LuUserX } from 'react-icons/lu';
import { mensajeDeError } from '../api/http';
import {
  entero,
  indicadoresApi,
  minutos,
  porcentaje,
  type TableroIndicadores,
  totalTurnos,
  ultimosDias,
  type ValoresIndicadores,
} from '../api/indicadores';
import { useCatalogo } from '../api/useCatalogo';
import { esSuperadmin } from '../auth/permisos';
import { useSesion } from '../auth/sesion';
import { Aviso } from '../componentes/Aviso';
import { Selector } from '../componentes/Campo';
import { Cargando, Pagina } from '../componentes/Pagina';
import { Segmentado } from '../componentes/Segmentado';
import { Tarjeta } from '../componentes/Tarjeta';

const PERIODOS = [7, 30, 90].map((p) => ({ valor: p, texto: `${p} días` }));

/**
 * RF-19, CU-05: tablero de indicadores. El superadministrador compara las agencias; el directivo
 * ve solo la suya. Los datos salen de ClickHouse a través del backend principal.
 */
export function Indicadores() {
  const { usuario } = useSesion();
  const superadmin = esSuperadmin(usuario?.roles ?? []);
  const { agencias } = useCatalogo();
  const [dias, setDias] = useState(30);
  const [agenciaId, setAgenciaId] = useState('');
  const [tablero, setTablero] = useState<TableroIndicadores | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let vigente = true;
    setCargando(true);
    setError(null);
    indicadoresApi
      .consultar({ ...ultimosDias(dias), agenciaId: agenciaId || undefined })
      .then((t) => vigente && setTablero(t))
      .catch((err: unknown) => vigente && setError(mensajeDeError(err, 'No se pudieron cargar los indicadores')))
      .finally(() => vigente && setCargando(false));
    return () => {
      vigente = false;
    };
  }, [dias, agenciaId]);

  const titulo = tablero?.ambito === 'GLOBAL' ? 'Indicadores de las 8 agencias' : `Indicadores de ${tablero?.agencias.map((a) => a.nombre).join(', ') ?? 'tu agencia'}`;

  return (
    <Pagina
      ancho
      titulo={tablero ? titulo : 'Indicadores'}
      acciones={<Segmentado etiqueta="Periodo" opciones={PERIODOS} valor={dias} alCambiar={setDias} />}
    >
      {superadmin && (
        <div className="max-w-xs">
          <Selector etiqueta="Agencia" value={agenciaId} onChange={(e) => setAgenciaId(e.target.value)}>
            <option value="">Todas</option>
            {agencias.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nombre}
              </option>
            ))}
          </Selector>
        </div>
      )}
      {error && <Aviso tipo="error">{error}</Aviso>}
      {cargando && <Cargando texto="Cargando indicadores…" />}

      {tablero && !cargando && (
        <>
          <Resumen valores={tablero.total} />
          {tablero.agencias.length > 1 && <Comparacion tablero={tablero} />}
          {tablero.agencias.some((a) => !a.disponible) && (
            <Aviso tipo="info">
              La analítica no respondió para {tablero.agencias.filter((a) => !a.disponible).map((a) => a.nombre).join(', ')}; no entra al total.
            </Aviso>
          )}
        </>
      )}
    </Pagina>
  );
}

/** Seis cifras clave del periodo. */
function Resumen({ valores }: { valores: ValoresIndicadores }) {
  const turnos = totalTurnos(valores);
  const cifras: { nombre: string; valor: string; nota: string; icono: IconType }[] = [
    { nombre: 'Turnos atendidos', valor: entero(valores.atendidos), nota: `de ${entero(turnos)} turnos`, icono: LuCircleCheck },
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
function Comparacion({ tablero }: { tablero: TableroIndicadores }) {
  const filas = useMemo(() => [...tablero.agencias].sort((a, b) => b.esperaPromedioMin - a.esperaPromedioMin), [tablero]);
  const maxima = Math.max(...filas.map((a) => a.esperaPromedioMin), 1);
  return (
    <Tarjeta titulo="Comparación por agencia" descripcion="De mayor a menor espera promedio." icono={LuChartColumn}>
      <div className="-mx-5 overflow-x-auto sm:-mx-6">
        <table className="tabla min-w-[40rem] [&_tbody_th:first-child]:pl-5 [&_td:last-child]:pr-5 [&_thead_th:first-child]:pl-5 sm:[&_tbody_th:first-child]:pl-6 sm:[&_thead_th:first-child]:pl-6">
          <thead>
            <tr>
              <th scope="col">Agencia</th>
              <th scope="col">Espera promedio</th>
              <th scope="col">Atendidos</th>
              <th scope="col">Ausentes</th>
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
                <td className="tabular-nums">{entero(a.atendidos)}</td>
                <td className="tabular-nums">{porcentaje(a.ausentes, totalTurnos(a))}</td>
                <td className="tabular-nums">{porcentaje(a.proporcionPreferencial, 1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Tarjeta>
  );
}
