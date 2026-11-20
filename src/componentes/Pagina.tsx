import type { ReactNode } from 'react';
import type { IconType } from 'react-icons';
import { LuLoaderCircle, LuSunrise } from 'react-icons/lu';

interface PropsPagina {
  titulo?: ReactNode;
  descripcion?: ReactNode;
  /** Botones a la derecha del título. */
  acciones?: ReactNode;
  /** Paneles con tablas (administración, indicadores, auditoría). */
  ancho?: boolean;
  children: ReactNode;
}

/** Contenedor de cada panel: título de la página y bloques separados de forma uniforme. */
export function Pagina({ titulo, descripcion, acciones, ancho = false, children }: PropsPagina) {
  return (
    <main id="contenido" className={`mx-auto w-full ${ancho ? 'max-w-6xl' : 'max-w-3xl'} px-4 py-8 sm:px-6`}>
      {(titulo || acciones) && (
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            {titulo && (
              <>
                <h2 className="text-2xl">{titulo}</h2>
                {/* Filete dorado bajo el título, como la línea del horizonte del logo */}
                <span aria-hidden className="franja-dorada mt-2 block h-1 w-12 rounded-full" />
              </>
            )}
            {descripcion && <p className="mt-2 max-w-2xl text-texto-secundario">{descripcion}</p>}
          </div>
          {acciones && <div className="flex flex-wrap items-center gap-2">{acciones}</div>}
        </div>
      )}
      <div className="flex flex-col gap-6">{children}</div>
    </main>
  );
}

interface PropsAcceso {
  titulo: ReactNode;
  descripcion?: ReactNode;
  icono?: IconType;
  /** Formularios largos, como el registro. */
  ancha?: boolean;
  children: ReactNode;
}

/**
 * Pantallas sin sesión (ingresar, registro, recuperación): una tarjeta centrada con el filete
 * dorado del logo arriba y el lema de la cooperativa debajo.
 */
export function PantallaAcceso({ titulo, descripcion, icono: Icono = LuSunrise, ancha = false, children }: PropsAcceso) {
  return (
    <main id="contenido" className={`mx-auto w-full ${ancha ? 'max-w-lg' : 'max-w-md'} px-4 py-10 sm:py-16`}>
      <div className="overflow-hidden rounded-2xl border border-borde bg-superficie shadow-sm">
        <div aria-hidden className="franja-dorada h-1.5" />
        <div className="p-6 sm:p-8">
          <div className="mb-6 flex flex-col items-center text-center">
            <span className="mb-4 grid size-12 place-items-center rounded-xl bg-primario text-dorado-claro shadow-sm ring-2 ring-dorado/40">
              <Icono aria-hidden className="size-6" />
            </span>
            <h2 className="text-xl">{titulo}</h2>
            {descripcion && <p className="mt-1.5 text-sm text-texto-secundario">{descripcion}</p>}
          </div>
          {children}
        </div>
      </div>
      <p className="mt-6 text-center text-sm text-dorado-oscuro italic">«Crecemos sólidos para servir»</p>
    </main>
  );
}

/** Indicador de carga con texto (el lector de pantalla lo anuncia). */
export function Cargando({ texto = 'Cargando…', centrado = false }: { texto?: string; centrado?: boolean }) {
  return (
    <p role="status" className={`flex items-center gap-2 text-sm text-texto-secundario ${centrado ? 'justify-center py-16' : ''}`}>
      <LuLoaderCircle aria-hidden className="size-4 motion-safe:animate-spin" />
      {texto}
    </p>
  );
}
