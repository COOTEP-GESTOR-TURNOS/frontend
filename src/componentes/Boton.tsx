import type { ButtonHTMLAttributes } from 'react';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  cargando?: boolean;
  variante?: 'primario' | 'secundario' | 'peligro';
}

/** Microinteracción: mientras la petición está en curso muestra que procesa y no acepta otro clic. */
export function Boton({ cargando = false, variante = 'primario', type = 'button', disabled, children, ...resto }: Props) {
  return (
    <button
      type={type}
      className={`boton boton--${variante}`}
      disabled={disabled || cargando}
      aria-busy={cargando}
      {...resto}
    >
      {cargando ? 'Procesando…' : children}
    </button>
  );
}
