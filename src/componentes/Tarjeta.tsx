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

/** Bloque de contenido. Con título, la sección queda nombrada para el lector de pantalla. */
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
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primario-suave text-primario">
                <Icono aria-hidden className="size-5" />
              </span>
            )}
            <div className="min-w-0">
              {titulo && (
                <Titulo id={`${id}-titulo`} className="text-base leading-9">
                  {titulo}
                </Titulo>
              )}
              {descripcion && <p className="text-sm text-texto-secundario">{descripcion}</p>}
            </div>
          </div>
          {acciones && <div className="flex flex-wrap items-center gap-2">{acciones}</div>}
        </header>
      )}
      {children}
    </section>
  );
}
