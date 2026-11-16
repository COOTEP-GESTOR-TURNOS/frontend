import { useEffect, useState } from 'react';
import { mensajeDeError } from '../api/http';
import { fechaColombia, type RecomendacionHorario, recomendacionesApi, textoEspera } from '../api/recomendaciones';

const DIAS = [
  { valor: 0, texto: 'Hoy' },
  { valor: 1, texto: 'Mañana' },
];

/**
 * RF-10: las tres franjas de 30 minutos con menor espera histórica para la fila elegida.
 * Es una ayuda: si la analítica no responde, el asociado igual puede pedir su turno.
 */
export function MejorHorario({ agenciaId, servicioId }: { agenciaId: string; servicioId: string }) {
  const [dia, setDia] = useState(0);
  const [datos, setDatos] = useState<RecomendacionHorario | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (!agenciaId || !servicioId) return;
    let vigente = true; // ignora respuestas de una fila o un día que ya no está elegido
    setCargando(true);
    setError(null);
    recomendacionesApi
      .consultar(agenciaId, servicioId, fechaColombia(dia))
      .then((r) => vigente && setDatos(r))
      .catch((err: unknown) => vigente && setError(mensajeDeError(err, 'No se pudo consultar la recomendación')))
      .finally(() => vigente && setCargando(false));
    return () => {
      vigente = false;
    };
  }, [agenciaId, servicioId, dia]);

  return (
    <section className="mejor-horario" aria-labelledby="titulo-mejor-horario">
      <div className="mejor-horario__cabecera">
        <h3 id="titulo-mejor-horario">Mejor hora para ir</h3>
        <div className="segmentado" role="group" aria-label="Día">
          {DIAS.map((d) => (
            <button key={d.valor} type="button" aria-pressed={dia === d.valor} onClick={() => setDia(d.valor)}>
              {d.texto}
            </button>
          ))}
        </div>
      </div>

      {cargando && <p role="status" className="texto-secundario">Buscando las franjas con menos espera…</p>}
      {!cargando && error && <p className="texto-secundario">{error}</p>}
      {!cargando && datos && !datos.disponible && (
        <p className="texto-secundario">La recomendación no está disponible ahora. Puedes pedir tu turno igual.</p>
      )}
      {!cargando && datos?.disponible && datos.franjas.length === 0 && (
        <p className="texto-secundario">
          {dia === 0 ? 'Hoy ya no quedan franjas con datos suficientes. Mira las de mañana.' : 'Aún no hay historial suficiente para ese día.'}
        </p>
      )}
      {!cargando && datos?.disponible && datos.franjas.length > 0 && (
        <ol className="lista-franjas">
          {datos.franjas.map((f) => (
            <li key={f.desde}>
              <strong>
                {f.desde} a {f.hasta}
              </strong>
              <span>{textoEspera(f.esperaMedianaMin)}</span>
              <span className="texto-secundario">según {f.turnos} turnos anteriores</span>
            </li>
          ))}
        </ol>
      )}
      {datos && (
        <p className="texto-secundario mejor-horario__pie">
          Horario de atención: {datos.horario.apertura} a {datos.horario.cierre}. Es la espera mediana de días parecidos, no una promesa.
        </p>
      )}
    </section>
  );
}
