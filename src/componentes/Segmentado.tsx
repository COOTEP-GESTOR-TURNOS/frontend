interface Props<T extends string | number> {
  /** Nombre del grupo para el lector de pantalla (por ejemplo, «Día» o «Periodo»). */
  etiqueta: string;
  opciones: { valor: T; texto: string }[];
  valor: T;
  alCambiar: (valor: T) => void;
}

/** Control segmentado: botones con aria-pressed, el elegido resaltado. */
export function Segmentado<T extends string | number>({ etiqueta, opciones, valor, alCambiar }: Props<T>) {
  return (
    <div role="group" aria-label={etiqueta} className="inline-flex rounded-lg bg-texto/5 p-0.5">
      {opciones.map((o) => (
        <button
          key={o.valor}
          type="button"
          aria-pressed={valor === o.valor}
          onClick={() => alCambiar(o.valor)}
          className="min-h-10 rounded-md px-3.5 text-sm font-medium text-texto-secundario motion-safe:transition-colors hover:text-texto aria-pressed:bg-superficie aria-pressed:text-primario aria-pressed:shadow-xs"
        >
          {o.texto}
        </button>
      ))}
    </div>
  );
}
