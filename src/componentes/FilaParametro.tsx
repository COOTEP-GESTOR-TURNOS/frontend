import { useEffect, useId, useState } from 'react';
import { errorDeValor, TEXTO_ORIGEN, type VistaParametro } from '../api/agenciasAdmin';
import { mensajeDeError } from '../api/http';
import { Boton } from './Boton';

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
      <th scope="row">
        <label htmlFor={id}>{p.nombre}</label>
        <div className="texto-secundario">{p.descripcion}</div>
      </th>
      <td>
        <input
          id={id}
          className="entrada-corta"
          type={p.tipo === 'hora' ? 'time' : 'number'}
          step={p.tipo === 'hora' ? 1800 : 1}
          min={p.min}
          max={p.max}
          value={valor}
          disabled={!editable}
          aria-invalid={local || error ? true : undefined}
          aria-describedby={`${id}-nota`}
          onChange={(e) => setValor(e.target.value)}
        />{' '}
        {p.unidad}
        <div id={`${id}-nota`} className={local || error ? 'campo__error' : 'campo__ayuda'}>
          {local ?? error ?? (editable ? TEXTO_ORIGEN[p.origen] : 'Lo define el superadministrador para todas las agencias')}
        </div>
      </td>
      <td>
        {editable && (
          <div className="acciones">
            <Boton variante="secundario" cargando={accion === 'guardar'} disabled={valor === p.valor || Boolean(local)} onClick={() => void ejecutar('guardar', () => alGuardar(valor))}>
              Guardar
            </Boton>
            {alRestablecer && p.origen === 'AGENCIA' && (
              <button type="button" className="enlace-boton" disabled={accion !== null} onClick={() => void ejecutar('restablecer', alRestablecer)}>
                Usar el valor global
              </button>
            )}
          </div>
        )}
      </td>
    </tr>
  );
}
