import { NOMBRE_ROL } from '../api/administracion';
import type { AgenciaCatalogo } from '../api/catalogo';
import type { AsignacionRol, Rol } from '../auth/permisos';
import { Selector } from './Campo';

interface Props {
  agencias: AgenciaCatalogo[];
  /** Roles que el administrador puede asignar. */
  roles: Rol[];
  /** Agencias en las que puede asignar; undefined = todas (superadministrador). */
  agenciasPermitidas?: string[];
  /** null: todavía no se eligió rol (al asignar otro rol a un usuario existente). */
  valor: AsignacionRol | null;
  alCambiar: (valor: AsignacionRol) => void;
}

/** Los administradores de agencia y los funcionarios trabajan en una agencia. */
const requiereAgencia = (rol?: Rol) => rol === 'ADMIN_AGENCIA' || rol === 'FUNCIONARIO';

/** Agencias donde el administrador puede asignar; sin lista, todas (superadministrador). */
function agenciasDisponibles(agencias: AgenciaCatalogo[], permitidas?: string[]): AgenciaCatalogo[] {
  return permitidas ? agencias.filter((a) => permitidas.includes(a.id)) : agencias;
}

/**
 * Rol con su ámbito: agencia para administradores y funcionarios, y servicio opcional para el
 * funcionario. Se usa al crear un usuario y al asignarle otro rol.
 */
export function SelectorAmbito({ agencias, roles, agenciasPermitidas, valor, alCambiar }: Props) {
  const opcionesAgencia = agenciasDisponibles(agencias, agenciasPermitidas);
  const agencia = agencias.find((a) => a.id === valor?.agenciaId);
  const conServicio = valor?.rol === 'FUNCIONARIO';

  function cambiarRol(rol: Rol) {
    alCambiar({ rol, ...(requiereAgencia(rol) ? { agenciaId: valor?.agenciaId ?? opcionesAgencia[0]?.id } : {}) });
  }

  return (
    <>
      <SelectorRol roles={roles} valor={valor} alElegir={cambiarRol} />
      {valor && requiereAgencia(valor.rol) && <SelectorAgencia opciones={opcionesAgencia} valor={valor} alCambiar={alCambiar} />}
      {valor && conServicio && agencia && <SelectorServicio agencia={agencia} valor={valor} alCambiar={alCambiar} />}
    </>
  );
}

function SelectorRol({ roles, valor, alElegir }: { roles: Rol[]; valor: AsignacionRol | null; alElegir: (rol: Rol) => void }) {
  return (
    <Selector etiqueta="Rol" value={valor?.rol ?? ''} onChange={(e) => alElegir(e.target.value as Rol)}>
      {!valor && (
        <option value="" disabled>
          Elige un rol
        </option>
      )}
      {roles.map((r) => (
        <option key={r} value={r}>
          {NOMBRE_ROL[r]}
        </option>
      ))}
    </Selector>
  );
}

function SelectorAgencia({ opciones, valor, alCambiar }: { opciones: AgenciaCatalogo[]; valor: AsignacionRol; alCambiar: (valor: AsignacionRol) => void }) {
  return (
    <Selector
      etiqueta="Agencia"
      value={valor.agenciaId ?? ''}
      disabled={opciones.length === 1}
      onChange={(e) => alCambiar({ rol: valor.rol, agenciaId: e.target.value })}
    >
      {opciones.map((a) => (
        <option key={a.id} value={a.id}>
          {a.nombre}
        </option>
      ))}
    </Selector>
  );
}

function SelectorServicio({ agencia, valor, alCambiar }: { agencia: AgenciaCatalogo; valor: AsignacionRol; alCambiar: (valor: AsignacionRol) => void }) {
  return (
    <Selector
      etiqueta="Servicio"
      ayuda="Sin servicio, atiende todas las filas de la agencia."
      value={valor.servicioId ?? ''}
      onChange={(e) => alCambiar({ ...valor, servicioId: e.target.value || undefined })}
    >
      <option value="">Todos los servicios</option>
      {agencia.servicios.map((s) => (
        <option key={s.id} value={s.id}>
          {s.nombre}
        </option>
      ))}
    </Selector>
  );
}
