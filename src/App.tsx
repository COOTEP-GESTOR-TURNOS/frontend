import { Navigate, Route, Routes } from 'react-router';
import { panelInicial } from './auth/permisos';
import { RutaProtegida } from './auth/RutaProtegida';
import { useSesion } from './auth/sesion';
import { Ingresar } from './paginas/Ingresar';
import { NoAutorizado } from './paginas/NoAutorizado';
import { PanelAdministracion } from './paginas/PanelAdministracion';
import { PanelAsociado } from './paginas/PanelAsociado';
import { PanelFuncionario } from './paginas/PanelFuncionario';

export function App() {
  const { usuario, cerrarSesion } = useSesion();

  return (
    <>
      <a href="#contenido" className="saltar-al-contenido">
        Saltar al contenido
      </a>
      <header className="encabezado">
        <h1>COOTEP Turno</h1>
        {usuario && (
          <button type="button" className="boton boton--secundario" onClick={cerrarSesion}>
            Cerrar sesión
          </button>
        )}
      </header>
      <Routes>
        <Route path="/ingresar" element={<Ingresar />} />
        <Route
          path="/asociado"
          element={
            <RutaProtegida permitidos={['ASOCIADO']}>
              <PanelAsociado />
            </RutaProtegida>
          }
        />
        <Route
          path="/funcionario"
          element={
            <RutaProtegida permitidos={['FUNCIONARIO', 'ADMIN_AGENCIA']}>
              <PanelFuncionario />
            </RutaProtegida>
          }
        />
        <Route
          path="/administracion"
          element={
            <RutaProtegida permitidos={['SUPERADMIN', 'ADMIN_AGENCIA']}>
              <PanelAdministracion />
            </RutaProtegida>
          }
        />
        <Route path="/no-autorizado" element={<NoAutorizado />} />
        <Route path="*" element={<Navigate to={usuario ? panelInicial(usuario.roles) : '/ingresar'} replace />} />
      </Routes>
    </>
  );
}
