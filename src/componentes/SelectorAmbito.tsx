import type { AgenciaCatalogo } from '../api/administracion';
import { NOMBRE_ROL } from '../api/administracion';
import type { AsignacionRol, Rol } from '../auth/permisos';
import { Selector } from './Campo';

interface Props {
  agencias: AgenciaCatalogo[];
  /** Roles que el administrador puede asignar. */
  roles: Rol[];
  /** Agencias en las que puede asignar; undefined = todas (superadministrador). */
  agenciasPermitidas?: string[];
  valor: AsignacionRol;
  alCambiar: (valor: AsignacionRol) => void;
}

/**
 * Rol con su ámbito: agencia para administradores y funcionarios, y servicio opcional para el
 * funcionario. Se usa al crear un usuario y al asignarle otro rol.
 */
export function SelectorAmbito({ agencias, roles, agenciasPermitidas, valor, alCambiar }: Props) {
  const conAgencia = valor.rol === 'ADMIN_AGENCIA' || valor.rol === 'FUNCIONARIO';
  const opcionesAgencia = agenciasPermitidas ? agencias.filter((a) => agenciasPermitidas.includes(a.id)) : agencias;
  const agencia = agencias.find((a) => a.id === valor.agenciaId);

  function cambiarRol(rol: Rol) {
    const requiereAgencia = rol === 'ADMIN_AGENCIA' || rol === 'FUNCIONARIO';
    alCambiar({ rol, ...(requiereAgencia ? { agenciaId: valor.agenciaId ?? opcionesAgencia[0]?.id } : {}) });
  }

  return (
    <>
      <Selector etiqueta="Rol" value={valor.rol} onChange={(e) => cambiarRol(e.target.value as Rol)}>
        {roles.map((r) => (
          <option key={r} value={r}>
            {NOMBRE_ROL[r]}
          </option>
        ))}
      </Selector>
      {conAgencia && (
        <Selector
          etiqueta="Agencia"
          value={valor.agenciaId ?? ''}
          disabled={opcionesAgencia.length === 1}
          onChange={(e) => alCambiar({ rol: valor.rol, agenciaId: e.target.value })}
        >
          {opcionesAgencia.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nombre}
            </option>
          ))}
        </Selector>
      )}
      {valor.rol === 'FUNCIONARIO' && agencia && (
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
      )}
    </>
  );
}
