import { type ReactNode, useCallback, useEffect, useId, useRef, useState } from 'react';
import { LuCircleHelp, LuTriangleAlert } from 'react-icons/lu';
import { Boton } from './Boton';

export interface OpcionesConfirmacion {
  titulo: string;
  mensaje: ReactNode;
  /** Texto del botón que confirma, por ejemplo «Sí, cancelar turno». */
  confirmar: string;
  /** Texto del botón que no hace nada; por defecto «Volver». */
  cancelar?: string;
  /** Acción que no se puede deshacer: el botón de confirmar va en rojo. */
  peligro?: boolean;
}

/**
 * Reemplazo de window.confirm con el estilo de la página. Uso:
 *   const [dialogo, confirmar] = useConfirmacion();
 *   if (!(await confirmar({ titulo, mensaje, confirmar: 'Sí, eliminar', peligro: true }))) return;
 *   ...y renderizar {dialogo} en la página.
 */
export function useConfirmacion(): [ReactNode, (opciones: OpcionesConfirmacion) => Promise<boolean>] {
  const [pedido, setPedido] = useState<(OpcionesConfirmacion & { resolver: (ok: boolean) => void }) | null>(null);

  const confirmar = useCallback(
    (opciones: OpcionesConfirmacion) => new Promise<boolean>((resolver) => setPedido({ ...opciones, resolver })),
    [],
  );

  const dialogo = pedido ? (
    <Confirmacion
      {...pedido}
      alResponder={(ok) => {
        pedido.resolver(ok);
        setPedido(null);
      }}
    />
  ) : null;
  return [dialogo, confirmar];
}

/**
 * Diálogo modal nativo (<dialog> con showModal): bloquea el resto de la página, Esc lo cierra y
 * al cerrar el foco vuelve al botón que lo abrió. El foco empieza en la opción segura (no hacer nada).
 */
function Confirmacion({ titulo, mensaje, confirmar, cancelar = 'Volver', peligro = false, alResponder }: OpcionesConfirmacion & { alResponder: (ok: boolean) => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  /** Elemento que tenía el foco al abrir (el botón que pidió confirmación): lo recupera al cerrar. */
  const origen = useRef<HTMLElement | null>(null);
  const idTitulo = useId();
  const idMensaje = useId();
  const Icono = peligro ? LuTriangleAlert : LuCircleHelp;

  useEffect(() => {
    const dialogo = ref.current;
    if (!dialogo) return;
    origen.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialogo.showModal();
    dialogo.querySelector<HTMLButtonElement>('[data-foco-inicial]')?.focus();
    return () => dialogo.close();
  }, []);

  function responder(ok: boolean) {
    ref.current?.close();
    origen.current?.focus(); // el teclado y el lector de pantalla siguen donde estaban
    alResponder(ok);
  }

  return (
    <dialog
      ref={ref}
      aria-labelledby={idTitulo}
      aria-describedby={idMensaje}
      onCancel={(e) => {
        e.preventDefault(); // Esc: se responde «no» por la misma vía que los botones
        responder(false);
      }}
      onClick={(e) => e.target === e.currentTarget && responder(false)} // clic en el fondo oscuro
      className="m-auto w-[calc(100%-2rem)] max-w-md overflow-hidden rounded-2xl border border-borde bg-superficie p-0 text-texto shadow-xl backdrop:bg-texto/50"
    >
      <div aria-hidden className="franja-dorada h-1.5" />
      <div className="p-6">
        <div className="flex items-start gap-4">
          <span className={`grid size-10 shrink-0 place-items-center rounded-full ${peligro ? 'bg-error/10 text-error' : 'bg-primario-suave text-primario'}`}>
            <Icono aria-hidden className="size-5" />
          </span>
          <div className="min-w-0">
            <h2 id={idTitulo} className="text-lg">
              {titulo}
            </h2>
            <p id={idMensaje} className="mt-1 text-sm text-texto-secundario">
              {mensaje}
            </p>
          </div>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Boton variante="secundario" data-foco-inicial onClick={() => responder(false)}>
            {cancelar}
          </Boton>
          <Boton variante={peligro ? 'destructivo' : 'primario'} onClick={() => responder(true)}>
            {confirmar}
          </Boton>
        </div>
      </div>
    </dialog>
  );
}
