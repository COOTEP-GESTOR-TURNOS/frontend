import type { AgenciaCatalogo } from '../api/catalogo';
import { etiquetaAgencia, serviciosDe, servicioParaAgencia } from '../api/catalogo';
import { Selector } from './Campo';

export interface Fila {
  agenciaId: string;
  servicioId: string;
}

interface Props {
  agencias: AgenciaCatalogo[];
  valor: Fila;
  alCambiar: (fila: Fila) => void;
  /** El funcionario no elige agencia: la de su rol se muestra como título del panel. */
  agenciaFija?: boolean;
  /** El funcionario asignado a un servicio no puede cambiar de fila. */
  servicioFijo?: boolean;
  etiquetaServicio?: string;
}

/**
 * Agencia y servicio de una fila, con las opciones del catálogo real. Al cambiar de agencia
 * conserva el servicio si la nueva lo ofrece; si no, toma el primero.
 */
export function SelectorFila({ agencias, valor, alCambiar, agenciaFija = false, servicioFijo = false, etiquetaServicio = 'Servicio' }: Props) {
  const servicios = serviciosDe(agencias, valor.agenciaId);
  return (
    <>
      {!agenciaFija && (
        <Selector
          etiqueta="Agencia"
          value={valor.agenciaId}
          onChange={(e) =>
            alCambiar({ agenciaId: e.target.value, servicioId: servicioParaAgencia(agencias, e.target.value, valor.servicioId) ?? '' })
          }
        >
          {agencias.map((a) => (
            <option key={a.id} value={a.id}>
              {etiquetaAgencia(a)}
            </option>
          ))}
        </Selector>
      )}
      <Selector
        etiqueta={etiquetaServicio}
        value={valor.servicioId}
        disabled={servicioFijo}
        ayuda={servicioFijo ? 'Tu rol te asigna esta fila.' : undefined}
        onChange={(e) => alCambiar({ ...valor, servicioId: e.target.value })}
      >
        {servicios.map((s) => (
          <option key={s.id} value={s.id}>
            {s.nombre} · {s.ventanillas} {s.ventanillas === 1 ? 'ventanilla' : 'ventanillas'}
          </option>
        ))}
      </Selector>
    </>
  );
}
