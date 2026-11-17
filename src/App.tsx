import { Navigate, NavLink, Route, Routes, useNavigate } from 'react-router';
import { menuPara, panelInicial } from './auth/permisos';
import { RutaProtegida } from './auth/RutaProtegida';
import { useSesion } from './auth/sesion';
import { Auditoria } from './paginas/Auditoria';
import { GestionAgencia } from './paginas/GestionAgencia';
import { Indicadores } from './paginas/Indicadores';
import { Ingresar } from './paginas/Ingresar';
import { MiCuenta } from './paginas/MiCuenta';
import { NoAutorizado } from './paginas/NoAutorizado';
import { PanelAdministracion } from './paginas/PanelAdministracion';
import { PanelAsociado } from './paginas/PanelAsociado';
import { PanelFuncionario } from './paginas/PanelFuncionario';
import { Recuperar, Restablecer, VerificarCorreo } from './paginas/Recuperacion';
import { Registro } from './paginas/Registro';

export function App() {
  const { usuario, cargando, cerrarSesion } = useSesion();
  const navegar = useNavigate();

  return (
    <>
      <a href="#contenido" className="saltar-al-contenido">
        Saltar al contenido
      </a>
      <header className="encabezado">
        <h1>COOTEP Turno</h1>
        {usuario && (
          <nav aria-label="Principal">
            {menuPara(usuario.roles).map((m) => (
              <NavLink key={m.ruta} to={m.ruta}>
                {m.texto}
              </NavLink>
            ))}
            <button
              type="button"
              className="boton boton--secundario"
              onClick={() => void cerrarSesion().then(() => navegar('/ingresar'))}
            >
              Cerrar sesión
            </button>
          </nav>
        )}
      </header>
      <Routes>
        <Route path="/ingresar" element={<Ingresar />} />
        <Route path="/registro" element={<Registro />} />
        <Route path="/recuperar" element={<Recuperar />} />
        <Route path="/restablecer" element={<Restablecer />} />
        <Route path="/verificar-correo" element={<VerificarCorreo />} />
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
        <Route
          path="/gestion-agencia"
          element={
            <RutaProtegida permitidos={['SUPERADMIN', 'ADMIN_AGENCIA']}>
              <GestionAgencia />
            </RutaProtegida>
          }
        />
        <Route
          path="/auditoria"
          element={
            <RutaProtegida permitidos={['SUPERADMIN']}>
              <Auditoria />
            </RutaProtegida>
          }
        />
        <Route
          path="/indicadores"
          element={
            <RutaProtegida permitidos={['SUPERADMIN', 'ADMIN_AGENCIA']}>
              <Indicadores />
            </RutaProtegida>
          }
        />
        <Route
          path="/mi-cuenta"
          element={
            <RutaProtegida>
              <MiCuenta />
            </RutaProtegida>
          }
        />
        <Route path="/no-autorizado" element={<NoAutorizado />} />
        <Route
          path="*"
          element={cargando ? null : <Navigate to={usuario ? panelInicial(usuario.roles) : '/ingresar'} replace />}
        />
      </Routes>
    </>
  );
}
