import { FormEvent, type RefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { IconType } from 'react-icons';
import {
  LuChevronLeft,
  LuChevronRight,
  LuCircleCheck,
  LuCircleSlash,
  LuKeyRound,
  LuMailCheck,
  LuPlus,
  LuRotateCcw,
  LuSearch,
  LuSend,
  LuShieldCheck,
  LuTrash2,
  LuUserCheck,
  LuUserCog,
  LuUserPlus,
  LuUsers,
  LuUserX,
  LuX,
} from 'react-icons/lu';
import {
  administracionApi,
  type FichaUsuario,
  type FiltroUsuarios,
  NOMBRE_ROL,
  type PaginaUsuarios,
} from '../api/administracion';
import { TIPOS_DOCUMENTO, type TipoDocumento } from '../api/auth';
import type { AgenciaCatalogo } from '../api/catalogo';
import { mensajeDeError } from '../api/http';
import { useCatalogo } from '../api/useCatalogo';
import { agenciasAdministradas, type AsignacionRol, esSuperadmin, puedeAsignarRol, type Rol } from '../auth/permisos';
import { useSesion } from '../auth/sesion';
import { Aviso } from '../componentes/Aviso';
import { Boton } from '../componentes/Boton';
import { Campo, Selector } from '../componentes/Campo';
import { Etiqueta, type Tono } from '../componentes/Etiqueta';
import { Cargando, Pagina } from '../componentes/Pagina';
import { SelectorAmbito } from '../componentes/SelectorAmbito';
import { Tarjeta } from '../componentes/Tarjeta';

const TODOS_LOS_ROLES: Rol[] = ['SUPERADMIN', 'ADMIN_AGENCIA', 'FUNCIONARIO', 'ASOCIADO'];
/** Roles que el administrador de agencia puede usar en el filtro de la lista. */
const ROLES_DE_AGENCIA: Rol[] = ['ADMIN_AGENCIA', 'FUNCIONARIO'];

/** Inicial del nombre para el avatar de la lista. */
function inicial(nombre: string): string {
  return nombre.trim().charAt(0).toUpperCase() || '?';
}

/**
 * CU-05 y CU-06: gestión de usuarios y roles. El superadministrador ve a todos y nombra a los
 * directivos de cada agencia; el directivo (ADMIN_AGENCIA) da de alta a los funcionarios de su
 * agencia. El backend repite cada verificación y audita los intentos fuera del ámbito.
 */
export function PanelAdministracion() {
  const ambito = useAmbitoAdministracion();
  const { agencias, error: errorCatalogo } = useCatalogo();
  const lista = useListaUsuarios();
  const [seleccionado, setSeleccionado] = useState<FichaUsuario | null>(null);
  const [creando, setCreando] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  useLlevarALaVista(panel, seleccionado, creando);
  const describirRol = (r: AsignacionRol) => describirAsignacion(agencias, r);
  const problema = lista.error ?? errorCatalogo;

  function alActualizar(ficha: FichaUsuario) {
    setSeleccionado(ficha);
    void lista.cargar();
  }

  return (
    <Pagina
      ancho
      titulo={tituloAdministracion(ambito, agencias)}
      descripcion={descripcionAdministracion(ambito.superadmin)}
      acciones={
        <Boton
          icono={LuUserPlus}
          onClick={() => {
            setSeleccionado(null);
            setCreando(true);
          }}
        >
          Nuevo usuario
        </Boton>
      }
    >
      {problema && <Aviso tipo="error">{problema}</Aviso>}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <TarjetaUsuarios
          superadmin={ambito.superadmin}
          agencias={agencias}
          lista={lista}
          seleccionadoId={seleccionado?.id}
          describirRol={describirRol}
          abrir={(u) => {
            setCreando(false);
            setSeleccionado(u);
          }}
        />

        <div ref={panel} className="scroll-mt-20">
          <PanelLateral
            creando={creando}
            seleccionado={seleccionado}
            ambito={ambito}
            agencias={agencias}
            describirRol={describirRol}
            alActualizar={alActualizar}
            cerrarAlta={() => setCreando(false)}
            cerrarFicha={() => setSeleccionado(null)}
          />
        </div>
      </div>
    </Pagina>
  );
}

// ---------- Ámbito del administrador y textos de la página ----------

function useAmbitoAdministracion() {
  const { usuario } = useSesion();
  const roles = useMemo(() => usuario?.roles ?? [], [usuario]);
  const superadmin = esSuperadmin(roles);
  const propias = useMemo(() => agenciasAdministradas(roles), [roles]);
  return {
    roles,
    superadmin,
    propias,
    usuarioId: usuario?.id ?? '',
    rolesAsignables: superadmin ? TODOS_LOS_ROLES : (['FUNCIONARIO'] as Rol[]),
    /** Agencias donde puede asignar; undefined = todas (superadministrador). */
    agenciasPermitidas: superadmin ? undefined : propias,
  };
}

type AmbitoAdministracion = ReturnType<typeof useAmbitoAdministracion>;

const nombreAgencia = (agencias: AgenciaCatalogo[], id?: string) => agencias.find((a) => a.id === id)?.nombre ?? 'Agencia';

const nombreServicio = (agencias: AgenciaCatalogo[], agenciaId?: string, servicioId?: string) =>
  agencias.find((a) => a.id === agenciaId)?.servicios.find((s) => s.id === servicioId)?.nombre;

/** «Funcionario · Agencia Mocoa · Caja». */
function describirAsignacion(agencias: AgenciaCatalogo[], r: AsignacionRol): string {
  return [NOMBRE_ROL[r.rol], r.agenciaId && nombreAgencia(agencias, r.agenciaId), nombreServicio(agencias, r.agenciaId, r.servicioId)].filter(Boolean).join(' · ');
}

function tituloAdministracion(ambito: AmbitoAdministracion, agencias: AgenciaCatalogo[]): string {
  if (ambito.superadmin) return 'Control global';
  return `Administración de ${ambito.propias.map((id) => nombreAgencia(agencias, id)).join(', ')}`;
}

function descripcionAdministracion(superadmin: boolean): string {
  return superadmin
    ? 'Crea los directivos de cada agencia, asigna roles y desactiva cuentas. Cada cambio queda en la auditoría.'
    : 'Da de alta a los funcionarios de tu agencia y asígnales su servicio. Cada cambio queda en la auditoría.';
}

// ---------- Lista de usuarios ----------

function useListaUsuarios() {
  const [filtro, setFiltro] = useState<FiltroUsuarios>({ pagina: 1 });
  const [pagina, setPagina] = useState<PaginaUsuarios | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      setPagina(await administracionApi.listar(filtro));
    } catch (err) {
      setError(mensajeDeError(err));
    }
  }, [filtro]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  return { filtro, setFiltro, pagina, error, cargar };
}

type ListaUsuarios = ReturnType<typeof useListaUsuarios>;
type CambiarFiltro = ListaUsuarios['setFiltro'];

/** En el teléfono la ficha queda debajo de la lista: se lleva a la vista al abrirla. */
function useLlevarALaVista(panel: RefObject<HTMLDivElement | null>, seleccionado: FichaUsuario | null, creando: boolean) {
  const id = seleccionado?.id;
  const abierto = Boolean(seleccionado) || creando;
  useEffect(() => {
    if (!abierto || !window.matchMedia('(max-width: 1023px)').matches) return;
    const suave = window.matchMedia('(prefers-reduced-motion: no-preference)').matches;
    panel.current?.scrollIntoView({ behavior: suave ? 'smooth' : 'auto', block: 'start' });
  }, [id, creando, abierto, panel]);
}

function TarjetaUsuarios({ superadmin, agencias, lista, seleccionadoId, describirRol, abrir }: {
  superadmin: boolean;
  agencias: AgenciaCatalogo[];
  lista: ListaUsuarios;
  seleccionadoId?: string;
  describirRol: (r: AsignacionRol) => string;
  abrir: (usuario: FichaUsuario) => void;
}) {
  const { pagina } = lista;
  return (
    <Tarjeta titulo={pagina ? `Usuarios (${pagina.total})` : 'Usuarios'} icono={LuUsers}>
      <FiltrosUsuarios superadmin={superadmin} agencias={agencias} filtro={lista.filtro} setFiltro={lista.setFiltro} />
      <ResultadosUsuarios pagina={pagina} seleccionadoId={seleccionadoId} describirRol={describirRol} abrir={abrir} />
      <Paginacion pagina={pagina} setFiltro={lista.setFiltro} />
    </Tarjeta>
  );
}

const valorEstado = (activo?: boolean) => (activo === undefined ? '' : String(activo));

function FiltrosUsuarios({ superadmin, agencias, filtro, setFiltro }: { superadmin: boolean; agencias: AgenciaCatalogo[]; filtro: FiltroUsuarios; setFiltro: CambiarFiltro }) {
  return (
    <form className={`mb-5 grid gap-3 sm:grid-cols-2 ${superadmin ? 'xl:grid-cols-3' : ''}`} role="search" onSubmit={(e) => e.preventDefault()}>
      <div className="col-span-full">
        <Campo
          etiqueta="Buscar"
          icono={LuSearch}
          placeholder="Nombre, correo o documento"
          value={filtro.texto ?? ''}
          onChange={(e) => setFiltro((f) => ({ ...f, texto: e.target.value, pagina: 1 }))}
        />
      </div>
      <Selector
        etiqueta="Rol"
        value={filtro.rol ?? ''}
        onChange={(e) => setFiltro((f) => ({ ...f, rol: (e.target.value || undefined) as Rol | undefined, pagina: 1 }))}
      >
        <option value="">Todos</option>
        {(superadmin ? TODOS_LOS_ROLES : ROLES_DE_AGENCIA).map((r) => (
          <option key={r} value={r}>
            {NOMBRE_ROL[r]}
          </option>
        ))}
      </Selector>
      {superadmin && (
        <Selector
          etiqueta="Agencia"
          value={filtro.agenciaId ?? ''}
          onChange={(e) => setFiltro((f) => ({ ...f, agenciaId: e.target.value || undefined, pagina: 1 }))}
        >
          <option value="">Todas</option>
          {agencias.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nombre}
            </option>
          ))}
        </Selector>
      )}
      <Selector
        etiqueta="Estado"
        value={valorEstado(filtro.activo)}
        onChange={(e) => setFiltro((f) => ({ ...f, activo: e.target.value === '' ? undefined : e.target.value === 'true', pagina: 1 }))}
      >
        <option value="">Todos</option>
        <option value="true">Activos</option>
        <option value="false">Desactivados</option>
      </Selector>
    </form>
  );
}

function ResultadosUsuarios({ pagina, seleccionadoId, describirRol, abrir }: {
  pagina: PaginaUsuarios | null;
  seleccionadoId?: string;
  describirRol: (r: AsignacionRol) => string;
  abrir: (usuario: FichaUsuario) => void;
}) {
  if (!pagina) return <Cargando />;
  if (pagina.elementos.length === 0) return <p className="py-6 text-center text-sm text-texto-secundario">No hay usuarios con esos filtros.</p>;
  return (
    <ul className="-mx-2 flex flex-col">
      {pagina.elementos.map((u) => (
        <FilaUsuario key={u.id} usuario={u} elegido={seleccionadoId === u.id} describirRol={describirRol} abrir={() => abrir(u)} />
      ))}
    </ul>
  );
}

const esDirectivo = (r: AsignacionRol) => r.rol === 'SUPERADMIN' || r.rol === 'ADMIN_AGENCIA';

function FilaUsuario({ usuario: u, elegido, describirRol, abrir }: { usuario: FichaUsuario; elegido: boolean; describirRol: (r: AsignacionRol) => string; abrir: () => void }) {
  return (
    <li>
      <button
        type="button"
        aria-current={elegido ? 'true' : undefined}
        onClick={abrir}
        className={`flex w-full items-start gap-3 rounded-lg px-2 py-3 text-left motion-safe:transition-colors ${elegido ? 'bg-primario-suave' : 'hover:bg-fondo'}`}
      >
        <span
          aria-hidden
          className={`grid size-9 shrink-0 place-items-center rounded-full text-sm font-semibold ${u.activo ? 'bg-primario/10 text-primario' : 'bg-texto/5 text-texto-secundario'}`}
        >
          {inicial(u.nombre)}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-texto">{u.nombre}</span>
            {!u.activo && <Etiqueta tono="error">Desactivado</Etiqueta>}
          </span>
          <span className="truncate text-sm text-texto-secundario">{u.email}</span>
          <span className="flex flex-wrap gap-1.5">
            {u.roles.map((r) => (
              <Etiqueta key={r.id} tono={esDirectivo(r) ? 'primario' : 'neutro'}>
                {describirRol(r)}
              </Etiqueta>
            ))}
          </span>
        </span>
        <LuChevronRight aria-hidden className="mt-2 size-4 shrink-0 text-texto-secundario" />
      </button>
    </li>
  );
}

function Paginacion({ pagina, setFiltro }: { pagina: PaginaUsuarios | null; setFiltro: CambiarFiltro }) {
  if (!pagina || pagina.total <= pagina.tamano) return null;
  return (
    <div className="mt-4 flex items-center justify-between gap-3 border-t border-borde pt-4">
      <Boton variante="secundario" icono={LuChevronLeft} disabled={pagina.pagina <= 1} onClick={() => setFiltro((f) => ({ ...f, pagina: (f.pagina ?? 1) - 1 }))}>
        Anterior
      </Boton>
      <span className="text-sm text-texto-secundario">
        Página {pagina.pagina} de {Math.ceil(pagina.total / pagina.tamano)}
      </span>
      <Boton variante="secundario" disabled={pagina.pagina * pagina.tamano >= pagina.total} onClick={() => setFiltro((f) => ({ ...f, pagina: (f.pagina ?? 1) + 1 }))}>
        Siguiente
        <LuChevronRight aria-hidden className="size-4" />
      </Boton>
    </div>
  );
}

/** A la derecha de la lista: el formulario de alta, la ficha elegida o una indicación. */
function PanelLateral({ creando, seleccionado, ambito, agencias, describirRol, alActualizar, cerrarAlta, cerrarFicha }: {
  creando: boolean;
  seleccionado: FichaUsuario | null;
  ambito: AmbitoAdministracion;
  agencias: AgenciaCatalogo[];
  describirRol: (r: AsignacionRol) => string;
  alActualizar: (ficha: FichaUsuario) => void;
  cerrarAlta: () => void;
  cerrarFicha: () => void;
}) {
  if (creando) {
    return (
      <NuevoUsuario
        agencias={agencias}
        roles={ambito.rolesAsignables}
        agenciasPermitidas={ambito.agenciasPermitidas}
        alCrear={(ficha) => {
          cerrarAlta();
          alActualizar(ficha);
        }}
        alCancelar={cerrarAlta}
      />
    );
  }
  if (seleccionado) {
    return (
      <Ficha
        key={seleccionado.id}
        ficha={seleccionado}
        actor={ambito.roles}
        actorId={ambito.usuarioId}
        agencias={agencias}
        roles={ambito.rolesAsignables}
        agenciasPermitidas={ambito.agenciasPermitidas}
        describirRol={describirRol}
        alActualizar={alActualizar}
        alCerrar={cerrarFicha}
      />
    );
  }
  return (
    <div className="hidden flex-col items-center gap-3 rounded-xl border border-dashed border-borde px-6 py-12 text-center lg:flex">
      <LuUserCog aria-hidden className="size-8 text-texto-secundario" />
      <p className="text-sm text-texto-secundario">Elige una persona de la lista para ver su ficha, o crea un usuario nuevo.</p>
    </div>
  );
}

// ---------- Alta de un usuario ----------

interface PropsAmbito {
  agencias: AgenciaCatalogo[];
  roles: Rol[];
  agenciasPermitidas?: string[];
}

function ambitoInicial(roles: Rol[], agenciasPermitidas: string[] | undefined, agencias: AgenciaCatalogo[]): AsignacionRol {
  const rol = roles.includes('ADMIN_AGENCIA') ? 'ADMIN_AGENCIA' : roles[0];
  return { rol, agenciaId: agenciasPermitidas?.[0] ?? agencias[0]?.id };
}

function NuevoUsuario({ agencias, roles, agenciasPermitidas, alCrear, alCancelar }: PropsAmbito & { alCrear: (f: FichaUsuario) => void; alCancelar: () => void }) {
  const [datos, setDatos] = useState({ nombre: '', email: '', tipoDocumento: 'CC' as TipoDocumento, numeroDocumento: '' });
  const [ambito, setAmbito] = useState<AsignacionRol>(() => ambitoInicial(roles, agenciasPermitidas, agencias));
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState<string | null>(null);

  useEffect(() => {
    if (!ambito.agenciaId && agencias.length > 0) setAmbito(ambitoInicial(roles, agenciasPermitidas, agencias));
  }, [agencias]); // eslint-disable-line react-hooks/exhaustive-deps

  async function crear(evento: FormEvent) {
    evento.preventDefault();
    setError(null);
    setCargando(true);
    try {
      const r = await administracionApi.crear({
        ...datos,
        numeroDocumento: datos.numeroDocumento || undefined,
        tipoDocumento: datos.numeroDocumento ? datos.tipoDocumento : undefined,
        ...ambito,
      });
      if (r) {
        setResultado(
          r.activacionEnviada
            ? `Cuenta creada. Enviamos a ${r.usuario.email} el enlace para activarla.`
            : 'Cuenta creada, pero el correo no salió. Usa «Reenviar activación» en su ficha.',
        );
        alCrear(r.usuario);
      }
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setCargando(false);
    }
  }

  return (
    <Tarjeta titulo="Nuevo usuario" descripcion="La persona recibe un correo para definir su contraseña. Los administradores deben activar MFA." icono={LuUserPlus}>
      <form onSubmit={crear} noValidate className="flex flex-col gap-4">
        <Campo etiqueta="Nombre completo" required value={datos.nombre} onChange={(e) => setDatos({ ...datos, nombre: e.target.value })} />
        <Campo etiqueta="Correo" type="email" required value={datos.email} onChange={(e) => setDatos({ ...datos, email: e.target.value })} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Selector etiqueta="Tipo de documento" value={datos.tipoDocumento} onChange={(e) => setDatos({ ...datos, tipoDocumento: e.target.value as TipoDocumento })}>
            {TIPOS_DOCUMENTO.map((t) => (
              <option key={t.valor} value={t.valor}>
                {t.texto}
              </option>
            ))}
          </Selector>
          <Campo etiqueta="Documento (opcional)" value={datos.numeroDocumento} onChange={(e) => setDatos({ ...datos, numeroDocumento: e.target.value })} />
        </div>
        <SelectorAmbito agencias={agencias} roles={roles} agenciasPermitidas={agenciasPermitidas} valor={ambito} alCambiar={setAmbito} />
        {error && <Aviso tipo="error">{error}</Aviso>}
        {resultado && <Aviso tipo="exito">{resultado}</Aviso>}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Boton variante="fantasma" onClick={alCancelar}>
            Cancelar
          </Boton>
          <Boton type="submit" icono={LuSend} cargando={cargando}>
            Crear y enviar activación
          </Boton>
        </div>
      </form>
    </Tarjeta>
  );
}

// ---------- Ficha de un usuario ----------

type Mensaje = { tipo: 'exito' | 'error'; texto: string };
type Ejecutar = (nombre: string, operacion: () => Promise<FichaUsuario | null | void>, exito: string) => Promise<boolean>;
type RolGuardado = FichaUsuario['roles'][number];

const SUBTITULO = 'mb-2 text-xs font-medium tracking-wide text-texto-secundario uppercase';

function Ficha({
  ficha,
  actor,
  actorId,
  agencias,
  roles,
  agenciasPermitidas,
  describirRol,
  alActualizar,
  alCerrar,
}: PropsAmbito & {
  ficha: FichaUsuario;
  actor: AsignacionRol[];
  actorId: string;
  describirRol: (r: AsignacionRol) => string;
  alActualizar: (f: FichaUsuario) => void;
  /** Cierra la ficha sin guardar lo que se estaba eligiendo. */
  alCerrar: () => void;
}) {
  // Sin rol elegido al abrir la ficha: «Asignar rol» solo aparece cuando el administrador elige uno.
  const [ambito, setAmbito] = useState<AsignacionRol | null>(null);
  const [mensaje, setMensaje] = useState<Mensaje | null>(null);
  const [accion, setAccion] = useState<string | null>(null);
  const esYo = ficha.id === actorId;

  /** Devuelve true si la operación terminó bien. */
  async function ejecutar(nombre: string, operacion: () => Promise<FichaUsuario | null | void>, exito: string): Promise<boolean> {
    setAccion(nombre);
    setMensaje(null);
    try {
      const r = await operacion();
      if (r) alActualizar(r);
      setMensaje({ tipo: 'exito', texto: exito });
      return true;
    } catch (err) {
      setMensaje({ tipo: 'error', texto: mensajeDeError(err) });
      return false;
    } finally {
      setAccion(null);
    }
  }

  return (
    <Tarjeta
      titulo={ficha.nombre}
      acciones={
        <Boton variante="fantasma" icono={LuX} onClick={alCerrar} aria-label={`Cerrar la ficha de ${ficha.nombre}`}>
          Cerrar
        </Boton>
      }
      descripcion={
        <>
          {ficha.email}
          {ficha.numeroDocumento && ` · ${ficha.tipoDocumento} ${ficha.numeroDocumento}`}
        </>
      }
    >
      <div className="flex flex-col gap-6">
        <EstadoCuenta ficha={ficha} />
        <RolesFicha ficha={ficha} actor={actor} esYo={esYo} describirRol={describirRol} accion={accion} ejecutar={ejecutar} />
        <AsignarRol
          ficha={ficha}
          ambito={ambito}
          setAmbito={setAmbito}
          accion={accion}
          ejecutar={ejecutar}
          agencias={agencias}
          roles={roles}
          agenciasPermitidas={agenciasPermitidas}
        />
        <AccionesFicha ficha={ficha} superadmin={esSuperadmin(actor)} esYo={esYo} accion={accion} mensaje={mensaje} ejecutar={ejecutar} />
      </div>
    </Tarjeta>
  );
}

/** Cada etiqueta del estado de la cuenta, según el dato de la ficha. */
const ESTADOS_CUENTA: ((f: FichaUsuario) => { tono: Tono; icono: IconType; texto: string })[] = [
  (f) => (f.activo ? { tono: 'exito', icono: LuCircleCheck, texto: 'Activo' } : { tono: 'error', icono: LuCircleSlash, texto: 'Desactivado' }),
  (f) => (f.tienePassword ? { tono: 'neutro', icono: LuKeyRound, texto: 'Contraseña definida' } : { tono: 'aviso', icono: LuKeyRound, texto: 'Activación pendiente' }),
  (f) => (f.mfaActivo ? { tono: 'neutro', icono: LuShieldCheck, texto: 'MFA activo' } : { tono: 'aviso', icono: LuShieldCheck, texto: 'Sin MFA' }),
  (f) => (f.emailVerificado ? { tono: 'neutro', icono: LuMailCheck, texto: 'Correo verificado' } : { tono: 'aviso', icono: LuMailCheck, texto: 'Correo sin verificar' }),
];

function EstadoCuenta({ ficha }: { ficha: FichaUsuario }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1.5">
        {ESTADOS_CUENTA.map((estado) => estado(ficha)).map(({ tono, icono, texto }) => (
          <Etiqueta key={texto} tono={tono} icono={icono}>
            {texto}
          </Etiqueta>
        ))}
      </div>
      <p className="text-sm text-texto-secundario">
        Último ingreso: {ficha.ultimoIngresoEn ? new Date(ficha.ultimoIngresoEn).toLocaleString('es-CO') : 'nunca'}
      </p>
    </div>
  );
}

/** Un rol se puede quitar si el actor puede asignarlo, no es el único y no es el propio rol de superadministrador. */
function puedeQuitar(actor: AsignacionRol[], ficha: FichaUsuario, esYo: boolean, r: RolGuardado): boolean {
  return puedeAsignarRol(actor, r) && ficha.roles.length > 1 && !(esYo && r.rol === 'SUPERADMIN');
}

function RolesFicha({ ficha, actor, esYo, describirRol, accion, ejecutar }: {
  ficha: FichaUsuario;
  actor: AsignacionRol[];
  esYo: boolean;
  describirRol: (r: AsignacionRol) => string;
  accion: string | null;
  ejecutar: Ejecutar;
}) {
  return (
    <div>
      <h4 className={SUBTITULO}>Roles</h4>
      <ul className="flex flex-col divide-y divide-borde rounded-lg border border-borde">
        {ficha.roles.map((r) => (
          <li key={r.id} className="flex items-center justify-between gap-3 px-3 py-1.5 text-sm">
            <span className="py-2">{describirRol(r)}</span>
            {puedeQuitar(actor, ficha, esYo, r) && (
              <Boton
                variante="fantasma"
                icono={LuTrash2}
                className="text-error hover:bg-error/5 hover:text-error"
                cargando={accion === `quitar-${r.id}`}
                onClick={() => void ejecutar(`quitar-${r.id}`, () => administracionApi.revocarRol(ficha.id, r.id), 'Rol retirado; sus sesiones se cerraron.')}
              >
                Quitar
              </Boton>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function AsignarRol({ ficha, ambito, setAmbito, accion, ejecutar, agencias, roles, agenciasPermitidas }: PropsAmbito & {
  ficha: FichaUsuario;
  ambito: AsignacionRol | null;
  setAmbito: (ambito: AsignacionRol | null) => void;
  accion: string | null;
  ejecutar: Ejecutar;
}) {
  function asignar(e: FormEvent) {
    e.preventDefault();
    if (!ambito) return;
    void ejecutar('asignar', () => administracionApi.asignarRol(ficha.id, ambito), 'Rol asignado.').then((ok) => ok && setAmbito(null));
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={asignar}>
      <h4 className={`${SUBTITULO} mb-0`}>Asignar otro rol</h4>
      <SelectorAmbito agencias={agencias} roles={roles} agenciasPermitidas={agenciasPermitidas} valor={ambito} alCambiar={setAmbito} />
      {ambito && (
        <div className="flex flex-wrap gap-2">
          <Boton type="submit" variante="secundario" icono={LuPlus} cargando={accion === 'asignar'}>
            Asignar rol
          </Boton>
          <Boton variante="fantasma" disabled={accion === 'asignar'} onClick={() => setAmbito(null)}>
            Cancelar
          </Boton>
        </div>
      )}
    </form>
  );
}

/** Qué acciones caben sobre la cuenta: nadie se desactiva ni se restablece el MFA a sí mismo. */
function accionesDisponibles(ficha: FichaUsuario, superadmin: boolean, esYo: boolean) {
  return {
    reenviar: ficha.activo && !ficha.tienePassword,
    mfa: superadmin && ficha.mfaActivo && !esYo,
    estado: !esYo,
  };
}

function AccionesFicha({ ficha, superadmin, esYo, accion, mensaje, ejecutar }: {
  ficha: FichaUsuario;
  superadmin: boolean;
  esYo: boolean;
  accion: string | null;
  mensaje: Mensaje | null;
  ejecutar: Ejecutar;
}) {
  const disponibles = accionesDisponibles(ficha, superadmin, esYo);
  return (
    <div className="flex flex-col gap-3 border-t border-borde pt-5">
      <h4 className={`${SUBTITULO} mb-0`}>Acciones</h4>
      {mensaje && <Aviso tipo={mensaje.tipo}>{mensaje.texto}</Aviso>}
      <div className="flex flex-wrap gap-2">
        {disponibles.reenviar && (
          <Boton
            variante="secundario"
            icono={LuSend}
            cargando={accion === 'activacion'}
            onClick={() => void ejecutar('activacion', () => administracionApi.reenviarActivacion(ficha.id), 'Enviamos de nuevo el enlace de activación.')}
          >
            Reenviar activación
          </Boton>
        )}
        {disponibles.mfa && (
          <Boton
            variante="secundario"
            icono={LuRotateCcw}
            cargando={accion === 'mfa'}
            onClick={() =>
              void ejecutar(
                'mfa',
                async () => {
                  await administracionApi.restablecerMfa(ficha.id);
                  return administracionApi.obtener(ficha.id);
                },
                'MFA restablecido: lo configurará de nuevo al ingresar.',
              )
            }
          >
            Restablecer MFA
          </Boton>
        )}
        {disponibles.estado && <BotonEstadoCuenta ficha={ficha} accion={accion} ejecutar={ejecutar} />}
      </div>
    </div>
  );
}

function BotonEstadoCuenta({ ficha, accion, ejecutar }: { ficha: FichaUsuario; accion: string | null; ejecutar: Ejecutar }) {
  const activo = ficha.activo;
  return (
    <Boton
      variante={activo ? 'peligro' : 'secundario'}
      icono={activo ? LuUserX : LuUserCheck}
      cargando={accion === 'estado'}
      onClick={() =>
        void ejecutar(
          'estado',
          () => administracionApi.actualizar(ficha.id, { activo: !activo }),
          activo ? 'Cuenta desactivada y sesiones cerradas.' : 'Cuenta activada.',
        )
      }
    >
      {activo ? 'Desactivar cuenta' : 'Activar cuenta'}
    </Boton>
  );
}
