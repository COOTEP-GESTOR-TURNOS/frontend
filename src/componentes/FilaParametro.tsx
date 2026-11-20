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

/** Una regla de la agencia (horario, K, N_PROXIMO, tiempos) con su valor, su origen y guardar. */
export function FilaParametro({ parametro: p, editable, alGuardar, alRestablecer }: Props) {
  const [valor, setValor] = useState(p.valor);
  const [error, setError] = useState<string | null>(null);
  const [accion, setAccion] = useState<'guardar' | 'restablecer' | null>(null);
  useEffect(() => setValor(p.valor), [p.valor]);

  const local = valor !== p.valor ? errorDeValor(p, valor) : null;

  async function ejecutar(nombre: 'guardar' | 'restablecer', operacion: () => Promise<unknown>) {
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
            className={`entrada ${p.tipo === 'hora' ? 'w-38' : 'w-26'}`}
            type={p.tipo === 'hora' ? 'time' : 'number'}
            step={p.tipo === 'hora' ? 1800 : 1}
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
        <div id={`${id}-nota`} className={`mt-1 ${local || error ? 'text-error' : 'text-texto-secundario'}`}>
          {local ?? error ?? (editable ? TEXTO_ORIGEN[p.origen] : 'Lo define el superadministrador para todas las agencias')}
        </div>
      </td>
      <td>
        {editable && (
          <div className="flex flex-wrap items-center gap-3">
            <Boton
              variante="secundario"
              icono={LuSave}
              cargando={accion === 'guardar'}
              disabled={valor === p.valor || Boolean(local)}
              onClick={() => void ejecutar('guardar', () => alGuardar(valor))}
            >
              Guardar
            </Boton>
            {alRestablecer && p.origen === 'AGENCIA' && (
              <BotonEnlace className="inline-flex items-center gap-1.5 text-sm" disabled={accion !== null} onClick={() => void ejecutar('restablecer', alRestablecer)}>
                <LuRotateCcw aria-hidden className="size-4" />
                Usar el valor global
              </BotonEnlace>
            )}
          </div>
        )}
      </td>
    </tr>
  );
}
