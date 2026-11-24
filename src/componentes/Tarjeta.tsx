import { type HTMLAttributes, type ReactNode, useId } from 'react';
import type { IconType } from 'react-icons';

interface Props extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  titulo?: ReactNode;
  descripcion?: ReactNode;
  icono?: IconType;
  /** Botones o controles a la derecha del título. */
  acciones?: ReactNode;
  /** Nivel del título: 3 dentro de una página (por defecto), 2 si la tarjeta es el contenido principal. */
  nivel?: 2 | 3;
}

/**
 * Bloque de contenido. Con título, la sección queda nombrada para el lector de pantalla.
 * El título sigue la identidad del logo: icono en placa verde con borde dorado, texto en negrita
 * y un filete dorado debajo (el mismo de los títulos de página).
 */
export function Tarjeta({ titulo, descripcion, icono: Icono, acciones, nivel = 3, className = '', children, ...resto }: Props) {
  const id = useId();
  const Titulo = nivel === 2 ? 'h2' : 'h3';
  return (
    <section
      aria-labelledby={titulo ? `${id}-titulo` : undefined}
      className={`rounded-xl border border-borde bg-superficie p-5 shadow-xs sm:p-6 ${className}`}
      {...resto}
    >
      {(titulo || acciones) && (
        <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            {Icono && (
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primario text-dorado-claro shadow-sm ring-2 ring-dorado/40">
                <Icono aria-hidden className="size-6" />
              </span>
            )}
            <div className="min-w-0">
              {titulo && (
                <>
                  <Titulo id={`${id}-titulo`} className="text-xl font-bold tracking-tight">
                    {titulo}
                  </Titulo>
                  <span aria-hidden className="franja-dorada mt-1.5 block h-1 w-12 rounded-full" />
                </>
              )}
              {descripcion && <p className="mt-1.5 text-sm text-texto-secundario">{descripcion}</p>}
            </div>
          </div>
          {acciones && <div className="flex flex-wrap items-center gap-2">{acciones}</div>}
        </header>
      )}
      {children}
    </section>
  );
}
