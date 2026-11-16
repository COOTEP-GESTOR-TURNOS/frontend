import { type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, useId, useState } from 'react';

interface Base {
  etiqueta: string;
  /** Texto de ayuda debajo del campo (por ejemplo, el mínimo de la contraseña). */
  ayuda?: ReactNode;
  error?: string | null;
}

/** Campo de texto con etiqueta, ayuda y error asociados para el lector de pantalla (WCAG 2.2). */
export function Campo({ etiqueta, ayuda, error, id, ...entrada }: Base & InputHTMLAttributes<HTMLInputElement>) {
  const generado = useId();
  const idCampo = id ?? generado;
  return (
    <div className="campo">
      <label htmlFor={idCampo}>{etiqueta}</label>
      <input
        id={idCampo}
        aria-invalid={error ? true : undefined}
        aria-describedby={ayuda || error ? `${idCampo}-ayuda` : undefined}
        {...entrada}
      />
      {(ayuda || error) && (
        <span id={`${idCampo}-ayuda`} className={error ? 'campo__error' : 'campo__ayuda'}>
          {error ?? ayuda}
        </span>
      )}
    </div>
  );
}

/** Contraseña con botón para mostrarla: ayuda a escribir frases largas sin errores (NIST). */
export function CampoClave(props: Base & Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="campo-clave">
      <Campo {...props} type={visible ? 'text' : 'password'} />
      <button type="button" className="enlace-boton" onClick={() => setVisible((v) => !v)} aria-pressed={visible}>
        {visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
      </button>
    </div>
  );
}

export function Selector({
  etiqueta,
  ayuda,
  error,
  id,
  children,
  ...select
}: Base & SelectHTMLAttributes<HTMLSelectElement>) {
  const generado = useId();
  const idCampo = id ?? generado;
  return (
    <div className="campo">
      <label htmlFor={idCampo}>{etiqueta}</label>
      <select id={idCampo} aria-describedby={ayuda ? `${idCampo}-ayuda` : undefined} {...select}>
        {children}
      </select>
      {(ayuda || error) && (
        <span id={`${idCampo}-ayuda`} className={error ? 'campo__error' : 'campo__ayuda'}>
          {error ?? ayuda}
        </span>
      )}
    </div>
  );
}
