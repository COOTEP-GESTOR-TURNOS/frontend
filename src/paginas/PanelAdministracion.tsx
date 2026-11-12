import { useSesion } from '../auth/sesion';

/** CU-05 y CU-06. Pendiente: conectar con los endpoints /api/v1/admin/* e /api/v1/indicadores. */
export function PanelAdministracion() {
  const { usuario } = useSesion();
  const esSuperadmin = usuario?.roles.some((r) => r.rol === 'SUPERADMIN');

  return (
    <main id="contenido">
      <section className="tarjeta">
        <h2>{esSuperadmin ? 'Control global' : 'Administración de la agencia'}</h2>
        <p className="texto-secundario">Secciones pendientes de implementar:</p>
        <ul>
          {esSuperadmin && <li>Administradores de agencia y sus ámbitos</li>}
          {esSuperadmin && <li>Parámetros globales</li>}
          <li>Servicios, ventanillas, horario y parámetros de la agencia</li>
          <li>Funcionarios</li>
          <li>Indicadores de turnos</li>
          <li>Auditoría</li>
        </ul>
      </section>
    </main>
  );
}
