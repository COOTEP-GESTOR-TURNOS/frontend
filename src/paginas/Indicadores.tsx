import { useEffect, useMemo, useState } from 'react';
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

const PERIODOS = [7, 30, 90];

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
    <main id="contenido" className="ancho">
      <section className="tarjeta">
        <div className="mejor-horario__cabecera">
          <h2 style={{ margin: 0 }}>{tablero ? titulo : 'Indicadores'}</h2>
          <div className="segmentado" role="group" aria-label="Periodo">
            {PERIODOS.map((p) => (
              <button key={p} type="button" aria-pressed={dias === p} onClick={() => setDias(p)}>
                {p} días
              </button>
            ))}
          </div>
        </div>
        {superadmin && (
          <div style={{ maxWidth: 360, marginTop: 'var(--espacio-4)' }}>
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
        {tablero && (
          <p className="texto-secundario">
            Del {tablero.desde} al {tablero.hasta}. Los turnos llegan al tablero cuando corre la carga de la analítica.
          </p>
        )}
        {error && <Aviso tipo="error">{error}</Aviso>}
        {cargando && <p role="status">Cargando indicadores…</p>}
      </section>

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
    </main>
  );
}

/** Seis cifras clave del periodo. */
function Resumen({ valores }: { valores: ValoresIndicadores }) {
  const turnos = totalTurnos(valores);
  const cifras = [
    { nombre: 'Turnos atendidos', valor: entero(valores.atendidos), nota: `de ${entero(turnos)} turnos` },
    { nombre: 'Ausentes', valor: porcentaje(valores.ausentes, turnos), nota: `${entero(valores.ausentes)} turnos` },
    { nombre: 'Cancelados', valor: porcentaje(valores.cancelados, turnos), nota: `${entero(valores.cancelados)} turnos` },
    { nombre: 'Espera promedio', valor: minutos(valores.esperaPromedioMin), nota: 'desde que pide hasta que lo llaman' },
    { nombre: 'Atención promedio', valor: minutos(valores.atencionPromedioMin), nota: 'en la ventanilla' },
    { nombre: 'Atención preferencial', valor: porcentaje(valores.proporcionPreferencial, 1), nota: 'de los turnos' },
  ];
  return (
    <section className="tablero" aria-label="Resumen del periodo">
      {cifras.map((c) => (
        <div key={c.nombre} className="tablero__cifra">
          <span className="texto-secundario">{c.nombre}</span>
          <strong>{c.valor}</strong>
          <span className="texto-secundario">{c.nota}</span>
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
    <section className="tarjeta" aria-labelledby="titulo-comparacion">
      <h3 id="titulo-comparacion">Comparación por agencia, de mayor a menor espera</h3>
      <table className="tabla">
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
              <td>
                {a.disponible ? (
                  <div className="barra">
                    <span className="barra__relleno" style={{ width: `${(a.esperaPromedioMin / maxima) * 100}%` }} />
                    <span>{minutos(a.esperaPromedioMin)}</span>
                  </div>
                ) : (
                  <span className="texto-secundario">Sin datos</span>
                )}
              </td>
              <td>{entero(a.atendidos)}</td>
              <td>{porcentaje(a.ausentes, totalTurnos(a))}</td>
              <td>{porcentaje(a.proporcionPreferencial, 1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
