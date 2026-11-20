import { type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, useId, useState } from 'react';
import type { IconType } from 'react-icons';
import { LuChevronDown, LuCircleAlert, LuEye, LuEyeOff } from 'react-icons/lu';

interface Base {
  etiqueta: string;
  /** Texto de ayuda debajo del campo (por ejemplo, el mínimo de la contraseña). */
  ayuda?: ReactNode;
  error?: string | null;
}

/** Ayuda o error debajo del campo, enlazado con aria-describedby. */
function Nota({ id, ayuda, error }: { id: string; ayuda?: ReactNode; error?: string | null }) {
  if (!ayuda && !error) return null;
  return error ? (
    <span id={id} className="flex items-start gap-1.5 text-sm text-error">
      <LuCircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
      {error}
    </span>
  ) : (
    <span id={id} className="text-sm text-texto-secundario">
      {ayuda}
    </span>
  );
}

interface PropsCampo extends Base, InputHTMLAttributes<HTMLInputElement> {
  /** Icono decorativo dentro del campo, a la izquierda. */
  icono?: IconType;
  /** Control dentro del campo, a la derecha (por ejemplo, mostrar la contraseña). */
  accesorio?: ReactNode;
}

/** Campo de texto con etiqueta, ayuda y error asociados para el lector de pantalla (WCAG 2.2). */
export function Campo({ etiqueta, ayuda, error, id, icono: Icono, accesorio, className = '', ...entrada }: PropsCampo) {
  const generado = useId();
  const idCampo = id ?? generado;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={idCampo} className="text-sm font-medium text-texto">
        {etiqueta}
      </label>
      <div className="relative">
        {Icono && <Icono aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-texto-secundario" />}
        <input
          id={idCampo}
          className={`entrada ${Icono ? 'pl-10' : ''} ${accesorio ? 'pr-12' : ''} ${className}`}
          aria-invalid={error ? true : undefined}
          aria-describedby={ayuda || error ? `${idCampo}-ayuda` : undefined}
          {...entrada}
        />
        {accesorio && <div className="absolute inset-y-0 right-0 flex items-center pr-1">{accesorio}</div>}
      </div>
      <Nota id={`${idCampo}-ayuda`} ayuda={ayuda} error={error} />
    </div>
  );
}

/** Contraseña con botón para mostrarla: ayuda a escribir frases largas sin errores (NIST). */
export function CampoClave(props: Base & Omit<PropsCampo, 'type' | 'accesorio'>) {
  const [visible, setVisible] = useState(false);
  const Icono = visible ? LuEyeOff : LuEye;
  return (
    <Campo
      {...props}
      type={visible ? 'text' : 'password'}
      accesorio={
        <button
          type="button"
          className="grid size-10 place-items-center rounded-md text-texto-secundario hover:bg-texto/5 hover:text-texto"
          onClick={() => setVisible((v) => !v)}
          aria-pressed={visible}
          aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          title={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        >
          <Icono aria-hidden className="size-4" />
        </button>
      }
    />
  );
}

export function Selector({
  etiqueta,
  ayuda,
  error,
  id,
  className = '',
  children,
  ...select
}: Base & SelectHTMLAttributes<HTMLSelectElement>) {
  const generado = useId();
  const idCampo = id ?? generado;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={idCampo} className="text-sm font-medium text-texto">
        {etiqueta}
      </label>
      <div className="relative">
        <select
          id={idCampo}
          className={`entrada appearance-none pr-10 ${className}`}
          aria-describedby={ayuda || error ? `${idCampo}-ayuda` : undefined}
          {...select}
        >
          {children}
        </select>
        <LuChevronDown aria-hidden className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-texto-secundario" />
      </div>
      <Nota id={`${idCampo}-ayuda`} ayuda={ayuda} error={error} />
    </div>
  );
}

/** Casilla con su texto y una ayuda opcional debajo. */
export function Casilla({ etiqueta, ayuda, id, ...entrada }: { etiqueta: ReactNode; ayuda?: ReactNode } & Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  const generado = useId();
  const idCampo = id ?? generado;
  return (
    <div className="flex items-start gap-3">
      <input
        id={idCampo}
        type="checkbox"
        className="mt-0.5 size-5 shrink-0 rounded accent-primario"
        aria-describedby={ayuda ? `${idCampo}-ayuda` : undefined}
        {...entrada}
      />
      <div className="flex flex-col gap-0.5">
        <label htmlFor={idCampo} className="text-sm font-medium text-texto">
          {etiqueta}
        </label>
        {ayuda && (
          <span id={`${idCampo}-ayuda`} className="text-sm text-texto-secundario">
            {ayuda}
          </span>
        )}
      </div>
    </div>
  );
}
