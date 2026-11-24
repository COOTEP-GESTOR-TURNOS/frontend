import type { ButtonHTMLAttributes } from 'react';
import type { IconType } from 'react-icons';
import { LuLoaderCircle } from 'react-icons/lu';

export type Variante = 'primario' | 'secundario' | 'peligro' | 'destructivo' | 'fantasma';

const BASE =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-center text-sm font-semibold ' +
  'motion-safe:transition-colors disabled:cursor-not-allowed disabled:opacity-60';

const VARIANTES: Record<Variante, string> = {
  primario: 'bg-primario text-white shadow-xs hover:bg-primario-oscuro',
  secundario: 'border border-borde bg-superficie text-texto shadow-xs hover:bg-fondo',
  peligro: 'border border-error/30 bg-superficie text-error hover:bg-error/5',
  /** Confirmar una acción que no se deshace (dentro de un diálogo): rojo sólido, 5,6:1 con texto blanco. */
  destructivo: 'bg-error text-white shadow-xs hover:bg-error/90',
  fantasma: 'text-texto-secundario hover:bg-texto/5 hover:text-texto',
};

/** Clases de un botón, también para enlaces que se ven como botón (por ejemplo, «Continuar con Google»). */
export function claseBoton(variante: Variante = 'primario', extra = ''): string {
  return `${BASE} ${VARIANTES[variante]} ${extra}`.trim();
}

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  cargando?: boolean;
  variante?: Variante;
  /** Icono de react-icons a la izquierda del texto (decorativo: el texto ya dice qué hace). */
  icono?: IconType;
}

/** Microinteracción: mientras la petición está en curso muestra que procesa y no acepta otro clic. */
export function Boton({ cargando = false, variante = 'primario', icono: Icono, type = 'button', disabled, className = '', children, ...resto }: Props) {
  return (
    <button type={type} className={claseBoton(variante, className)} disabled={disabled || cargando} aria-busy={cargando} {...resto}>
      {cargando ? (
        <>
          <LuLoaderCircle aria-hidden className="size-4 shrink-0 motion-safe:animate-spin" />
          Procesando…
        </>
      ) : (
        <>
          {Icono && <Icono aria-hidden className="size-4 shrink-0" />}
          {children}
        </>
      )}
    </button>
  );
}

/** Acción secundaria con aspecto de enlace (reintentar, mostrar más, abrir una ficha). */
export function BotonEnlace({ className = '', type = 'button', ...resto }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type={type} className={`enlace text-left ${className}`} {...resto} />;
}
