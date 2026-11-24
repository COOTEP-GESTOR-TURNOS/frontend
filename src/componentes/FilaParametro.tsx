import { useEffect, useId, useState } from 'react';
import { LuRotateCcw, LuSave } from 'react-icons/lu';
import { errorDeValor, TEXTO_ORIGEN, type VistaParametro } from '../api/agenciasAdmin';
import { mensajeDeError } from '../api/http';
import { Boton, BotonEnlace } from './Boton';

interface Props {
  parametro: VistaParametro;
  /** false: se muestra sin poder editar (EDAD_ADULTO_MAYOR dentro de una agencia). */
  editable: boolean;
  alGuardar: (valor: string) => Promise<unknown>;
  /** Solo para los valores propios de una agencia: vuelve al global. */
  alRestablecer?: () => Promise<unknown>;
}

type Accion = 'guardar' | 'restablecer';

/** Cómo se ve la entrada según el tipo de regla. */
const ENTRADA: Record<VistaParametro['tipo'], { clase: string; type: string; step: number }> = {
  hora: { clase: 'w-38', type: 'time', step: 1800 },
  entero: { clase: 'w-26', type: 'number', step: 1 },
};

/** Una regla de la agencia (horario, K, N_PROXIMO, tiempos) con su valor, su origen y guardar. */
export function FilaParametro({ parametro: p, editable, alGuardar, alRestablecer }: Props) {
  const [valor, setValor] = useState(p.valor);
  const [error, setError] = useState<string | null>(null);
  const [accion, setAccion] = useState<Accion | null>(null);
  useEffect(() => setValor(p.valor), [p.valor]);

  const local = valor !== p.valor ? errorDeValor(p, valor) : null;
  const entrada = ENTRADA[p.tipo];

  async function ejecutar(nombre: Accion, operacion: () => Promise<unknown>) {
    setAccion(nombre);
    setError(null);
    try {
      await operacion();
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setAccion(null);
    }
  }

  // useId: la misma regla aparece en la tabla de la agencia y en la de globales.
  const id = `${useId()}-${p.clave}`;
  return (
    <tr>
      <th scope="row" className="min-w-48">
        <label htmlFor={id}>{p.nombre}</label>
        <div className="mt-0.5 font-normal text-texto-secundario">{p.descripcion}</div>
      </th>
      <td className="min-w-56">
        <div className="flex items-center gap-2">
          <input
            id={id}
            className={`entrada ${entrada.clase}`}
            type={entrada.type}
            step={entrada.step}
            min={p.min}
            max={p.max}
            value={valor}
            disabled={!editable}
            aria-invalid={local || error ? true : undefined}
            aria-describedby={`${id}-nota`}
            onChange={(e) => setValor(e.target.value)}
          />
          <span className="text-texto-secundario">{p.unidad}</span>
        </div>
        <NotaParametro id={`${id}-nota`} problema={local ?? error} editable={editable} origen={p.origen} />
      </td>
      <td>
        {editable && (
          <AccionesParametro
            accion={accion}
            sinCambios={valor === p.valor}
            invalido={Boolean(local)}
            restablecible={Boolean(alRestablecer) && p.origen === 'AGENCIA'}
            guardar={() => void ejecutar('guardar', () => alGuardar(valor))}
            restablecer={() => void ejecutar('restablecer', alRestablecer!)}
          />
        )}
      </td>
    </tr>
  );
}

/** Debajo de la entrada: el problema del valor o, si no hay, de dónde sale el valor. */
function NotaParametro({ id, problema, editable, origen }: { id: string; problema: string | null; editable: boolean; origen: VistaParametro['origen'] }) {
  const texto = problema ?? (editable ? TEXTO_ORIGEN[origen] : 'Lo define el superadministrador para todas las agencias');
  return (
    <div id={id} className={`mt-1 ${problema ? 'text-error' : 'text-texto-secundario'}`}>
      {texto}
    </div>
  );
}

function AccionesParametro({ accion, sinCambios, invalido, restablecible, guardar, restablecer }: {
  accion: Accion | null;
  sinCambios: boolean;
  invalido: boolean;
  restablecible: boolean;
  guardar: () => void;
  restablecer: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Boton variante="secundario" icono={LuSave} cargando={accion === 'guardar'} disabled={sinCambios || invalido} onClick={guardar}>
        Guardar
      </Boton>
      {restablecible && (
        <BotonEnlace className="inline-flex items-center gap-1.5 text-sm" disabled={accion !== null} onClick={restablecer}>
          <LuRotateCcw aria-hidden className="size-4" />
          Usar el valor global
        </BotonEnlace>
      )}
    </div>
  );
}
