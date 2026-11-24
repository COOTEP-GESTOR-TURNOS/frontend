import { useEffect, useState } from 'react';
import type { IconType } from 'react-icons';
import {
  LuBuilding2,
  LuChartColumn,
  LuCircleUser,
  LuHeadset,
  LuLogOut,
  LuMenu,
  LuShieldCheck,
  LuSunrise,
  LuTicket,
  LuUsers,
  LuX,
} from 'react-icons/lu';
import { Navigate, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router';
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

/** Icono de cada sección del menú (los textos y permisos salen de permisos.ts). */
const ICONOS: Record<string, IconType> = {
  '/administracion': LuUsers,
  '/gestion-agencia': LuBuilding2,
  '/indicadores': LuChartColumn,
  '/auditoria': LuShieldCheck,
  '/funcionario': LuHeadset,
  '/asociado': LuTicket,
  '/mi-cuenta': LuCircleUser,
};

/** Enlaces del menú sobre el encabezado verde: la sección actual se marca en dorado, como el logo. */
const claseEnlace = ({ isActive }: { isActive: boolean }) =>
  `inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium motion-safe:transition-colors ${
    isActive ? 'bg-primario-oscuro text-dorado-claro ring-1 ring-inset ring-dorado/40' : 'text-white/85 hover:bg-white/10 hover:text-white'
  }`;

export function App() {
  const { usuario, cargando, cerrarSesion } = useSesion();
  const navegar = useNavigate();
  const { pathname } = useLocation();
  const [menuAbierto, setMenuAbierto] = useState(false);

  // En el teléfono, el menú se cierra al cambiar de página.
  useEffect(() => setMenuAbierto(false), [pathname]);

  const menu = usuario ? menuPara(usuario.roles) : [];
  const salir = () => void cerrarSesion().then(() => navegar('/ingresar'));

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#contenido"
        className="sr-only z-50 rounded-lg bg-superficie px-4 py-2 font-medium text-primario shadow-md focus:not-sr-only focus:fixed focus:top-4 focus:left-4"
      >
        Saltar al contenido
      </a>
      <header className="sobre-verde sticky top-0 z-40 bg-primario text-white shadow-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
          <h1 className="flex shrink-0 items-center gap-2.5 text-base font-semibold tracking-tight text-white">
            <span className="grid size-8 place-items-center rounded-lg bg-primario-oscuro text-dorado-claro ring-1 ring-dorado/50 ring-inset">
              <LuSunrise aria-hidden className="size-4.5" />
            </span>
            <span>
              <span className="text-dorado-claro">COOTEP</span> Turno
            </span>
          </h1>

          {usuario && (
            <BarraUsuario menu={menu} nombre={usuario.nombre} email={usuario.email} salir={salir} menuAbierto={menuAbierto} alternarMenu={() => setMenuAbierto((v) => !v)} />
          )}
        </div>

        {usuario && menuAbierto && <MenuMovil menu={menu} nombre={usuario.nombre} salir={salir} />}
        <div aria-hidden className="franja-dorada h-1" />
      </header>

      <div className="flex-1">
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
            element={<RutaInicial cargando={cargando} usuario={usuario} />}
          />
        </Routes>
      </div>
    </div>
  );
}

type Menu = ReturnType<typeof menuPara>;

/** Cualquier otra ruta lleva al panel del rol (o a ingresar), cuando ya se sabe si hay sesión. */
function RutaInicial({ cargando, usuario }: { cargando: boolean; usuario: ReturnType<typeof useSesion>['usuario'] }) {
  if (cargando) return null;
  return <Navigate to={usuario ? panelInicial(usuario.roles) : '/ingresar'} replace />;
}

function EnlacesMenu({ menu }: { menu: Menu }) {
  return (
    <>
      {menu.map((m) => {
        const Icono = ICONOS[m.ruta];
        return (
          <NavLink key={m.ruta} to={m.ruta} className={claseEnlace}>
            {Icono && <Icono aria-hidden className="size-4" />}
            {m.texto}
          </NavLink>
        );
      })}
    </>
  );
}

/** Con sesión: el menú (en pantallas anchas), el nombre, cerrar sesión y el botón del menú del teléfono. */
function BarraUsuario({ menu, nombre, email, salir, menuAbierto, alternarMenu }: {
  menu: Menu;
  nombre: string;
  email: string;
  salir: () => void;
  menuAbierto: boolean;
  alternarMenu: () => void;
}) {
  return (
    <>
      <nav aria-label="Principal" className="hidden flex-1 items-center gap-1 lg:flex">
        <EnlacesMenu menu={menu} />
      </nav>
      <div className="ml-auto flex items-center gap-2">
        <span className="hidden max-w-48 truncate text-sm text-white/75 xl:inline" title={email}>
          {nombre}
        </span>
        <button
          type="button"
          onClick={salir}
          className="hidden min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium text-white/85 hover:bg-white/10 hover:text-white lg:inline-flex"
        >
          <LuLogOut aria-hidden className="size-4" />
          Cerrar sesión
        </button>
        <button
          type="button"
          className="grid size-11 place-items-center rounded-lg text-white hover:bg-white/10 lg:hidden"
          aria-expanded={menuAbierto}
          aria-controls="menu-movil"
          aria-label={menuAbierto ? 'Cerrar menú' : 'Abrir menú'}
          onClick={alternarMenu}
        >
          {menuAbierto ? <LuX aria-hidden className="size-5" /> : <LuMenu aria-hidden className="size-5" />}
        </button>
      </div>
    </>
  );
}

function MenuMovil({ menu, nombre, salir }: { menu: Menu; nombre: string; salir: () => void }) {
  return (
    <nav id="menu-movil" aria-label="Principal" className="border-t border-white/10 px-4 py-3 lg:hidden">
      <p className="px-3 pb-2 text-sm text-white/75">{nombre}</p>
      <div className="flex flex-col gap-1">
        <EnlacesMenu menu={menu} />
        <button
          type="button"
          onClick={salir}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium text-white/85 hover:bg-white/10 hover:text-white"
        >
          <LuLogOut aria-hidden className="size-4" />
          Cerrar sesión
        </button>
      </div>
    </nav>
  );
}
