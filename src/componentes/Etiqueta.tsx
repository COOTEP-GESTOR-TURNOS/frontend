import type { ReactNode } from 'react';
import type { IconType } from 'react-icons';

export type Tono = 'neutro' | 'primario' | 'dorado' | 'info' | 'exito' | 'aviso' | 'error' | 'preferencial';

/** Fondo tenue y texto del mismo color: todos pasan el contraste AA (4,5:1) para texto pequeño. */
const TONOS: Record<Tono, string> = {
  neutro: 'bg-texto/5 text-texto-secundario ring-texto/10',
  primario: 'bg-primario-suave text-primario ring-primario/20',
  /** Solo para destacar (por ejemplo, la franja recomendada), nunca para un estado. */
  dorado: 'bg-dorado-suave text-dorado-oscuro ring-dorado/40',
  info: 'bg-info/10 text-info ring-info/20',
  exito: 'bg-exito/10 text-exito ring-exito/20',
  aviso: 'bg-aviso/10 text-aviso ring-aviso/20',
  error: 'bg-error/10 text-error ring-error/20',
  preferencial: 'bg-preferencial/10 text-preferencial ring-preferencial/20',
};

/** Insignia de estado o rol. El texto siempre dice lo mismo que el color (WCAG 1.4.1). */
export function Etiqueta({ tono = 'neutro', icono: Icono, children }: { tono?: Tono; icono?: IconType; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${TONOS[tono]}`}>
      {Icono && <Icono aria-hidden className="size-3.5 shrink-0" />}
      {children}
    </span>
  );
}
