import { useEffect, useState } from 'react';
import { LuClock, LuSparkles } from 'react-icons/lu';
import { mensajeDeError } from '../api/http';
import { fechaColombia, type FranjaRecomendada, type RecomendacionHorario, recomendacionesApi, textoEspera } from '../api/recomendaciones';
import { Etiqueta } from './Etiqueta';
import { Cargando } from './Pagina';
import { Segmentado } from './Segmentado';

const DIAS = [
  { valor: 0, texto: 'Hoy' },
  { valor: 1, texto: 'Mañana' },
];

/** Consulta la recomendación de la fila y el día; ignora respuestas de una fila o un día que ya no está elegido. */
function useRecomendacion(agenciaId: string, servicioId: string, dia: number) {
  const [datos, setDatos] = useState<RecomendacionHorario | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (!agenciaId || !servicioId) return;
    let vigente = true;
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

  return { datos, error, cargando };
}

/**
 * RF-10: las tres franjas de 30 minutos con menor espera histórica para la fila elegida.
 * Es una ayuda: si la analítica no responde, el asociado igual puede pedir su turno.
 */
export function MejorHorario({ agenciaId, servicioId }: { agenciaId: string; servicioId: string }) {
  const [dia, setDia] = useState(0);
  const { datos, error, cargando } = useRecomendacion(agenciaId, servicioId, dia);

  return (
    <section className="rounded-xl border border-borde bg-fondo p-4" aria-labelledby="titulo-mejor-horario">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h3 id="titulo-mejor-horario" className="inline-flex items-center gap-2 text-sm">
          <LuSparkles aria-hidden className="size-4 text-dorado-oscuro" />
          Mejor hora para ir
        </h3>
        <Segmentado etiqueta="Día" opciones={DIAS} valor={dia} alCambiar={setDia} />
      </div>

      {cargando ? <Cargando texto="Buscando las franjas con menos espera…" /> : <Resultado datos={datos} error={error} dia={dia} />}
      {datos && (
        <p className="mt-3 text-xs text-texto-secundario">
          Horario de atención: {datos.horario.apertura} a {datos.horario.cierre}. Es la espera mediana de días parecidos, no una promesa.
        </p>
      )}
    </section>
  );
}

/** Sin franjas que mostrar aunque la recomendación esté disponible. */
function mensajeSinFranjas(datos: RecomendacionHorario | null, dia: number): string | null {
  if (!datos?.disponible || datos.franjas.length > 0) return null;
  return dia === 0 ? 'Hoy ya no quedan franjas con datos suficientes. Mira las de mañana.' : 'Aún no hay historial suficiente para ese día.';
}

/** Los mensajes que explican por qué no hay franjas (o el error de la consulta). */
function mensajesVacios(datos: RecomendacionHorario | null, error: string | null, dia: number): string[] {
  const sinFranjas = mensajeSinFranjas(datos, dia);
  return [
    ...(error ? [error] : []),
    ...(datos && !datos.disponible ? ['La recomendación no está disponible ahora. Puedes pedir tu turno igual.'] : []),
    ...(sinFranjas ? [sinFranjas] : []),
  ];
}

function Resultado({ datos, error, dia }: { datos: RecomendacionHorario | null; error: string | null; dia: number }) {
  const franjas = datos?.disponible ? datos.franjas : [];
  return (
    <>
      {mensajesVacios(datos, error, dia).map((texto) => (
        <p key={texto} className="text-sm text-texto-secundario">
          {texto}
        </p>
      ))}
      {franjas.length > 0 && (
        <ol className="flex flex-col gap-2">
          {franjas.map((f, i) => (
            <Franja key={f.desde} franja={f} recomendada={i === 0} />
          ))}
        </ol>
      )}
    </>
  );
}

/** La primera franja es la recomendada: se destaca en dorado. */
function Franja({ franja: f, recomendada }: { franja: FranjaRecomendada; recomendada: boolean }) {
  return (
    <li
      className={`flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border px-3 py-2.5 text-sm ${
        recomendada ? 'border-dorado/60 bg-dorado-suave' : 'border-borde bg-superficie'
      }`}
    >
      <LuClock aria-hidden className={`size-4 shrink-0 ${recomendada ? 'text-dorado-oscuro' : 'text-texto-secundario'}`} />
      <strong className="font-semibold tabular-nums">
        {f.desde} a {f.hasta}
      </strong>
      {recomendada && <Etiqueta tono="dorado">Recomendada</Etiqueta>}
      <span>{textoEspera(f.esperaMedianaMin)}</span>
      <span className="text-texto-secundario sm:ml-auto">según {f.turnos} turnos anteriores</span>
    </li>
  );
}
