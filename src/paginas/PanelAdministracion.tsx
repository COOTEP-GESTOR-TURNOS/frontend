import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { Etiqueta } from '../componentes/Etiqueta';
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
  const { usuario } = useSesion();
  const roles = usuario?.roles ?? [];
  const superadmin = esSuperadmin(roles);
  const propias = useMemo(() => agenciasAdministradas(roles), [roles]);
  const rolesAsignables: Rol[] = superadmin ? TODOS_LOS_ROLES : ['FUNCIONARIO'];

  const { agencias, error: errorCatalogo } = useCatalogo();
  const [filtro, setFiltro] = useState<FiltroUsuarios>({ pagina: 1 });
  const [pagina, setPagina] = useState<PaginaUsuarios | null>(null);
  const [seleccionado, setSeleccionado] = useState<FichaUsuario | null>(null);
  const [creando, setCreando] = useState(false);
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

  // En el teléfono la ficha queda debajo de la lista: se lleva a la vista al abrirla.
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!(seleccionado || creando) || !window.matchMedia('(max-width: 1023px)').matches) return;
    const suave = window.matchMedia('(prefers-reduced-motion: no-preference)').matches;
    panel.current?.scrollIntoView({ behavior: suave ? 'smooth' : 'auto', block: 'start' });
  }, [seleccionado?.id, creando]); // eslint-disable-line react-hooks/exhaustive-deps

  const nombreAgencia = (id?: string) => agencias.find((a) => a.id === id)?.nombre ?? 'Agencia';
  const nombreServicio = (agenciaId?: string, servicioId?: string) =>
    agencias.find((a) => a.id === agenciaId)?.servicios.find((s) => s.id === servicioId)?.nombre;
  const describirRol = (r: AsignacionRol) =>
    [NOMBRE_ROL[r.rol], r.agenciaId && nombreAgencia(r.agenciaId), nombreServicio(r.agenciaId, r.servicioId)].filter(Boolean).join(' · ');

  function alActualizar(ficha: FichaUsuario) {
    setSeleccionado(ficha);
    void cargar();
  }

  return (
    <Pagina
      ancho
      titulo={superadmin ? 'Control global' : `Administración de ${propias.map(nombreAgencia).join(', ')}`}
      descripcion={
        superadmin
          ? 'Crea los directivos de cada agencia, asigna roles y desactiva cuentas. Cada cambio queda en la auditoría.'
          : 'Da de alta a los funcionarios de tu agencia y asígnales su servicio. Cada cambio queda en la auditoría.'
      }
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
      {(error ?? errorCatalogo) && <Aviso tipo="error">{error ?? errorCatalogo}</Aviso>}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Tarjeta titulo={pagina ? `Usuarios (${pagina.total})` : 'Usuarios'} icono={LuUsers}>
          <form
            className={`mb-5 grid gap-3 sm:grid-cols-2 ${superadmin ? 'xl:grid-cols-3' : ''}`}
            role="search"
            onSubmit={(e) => e.preventDefault()}
          >
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
              value={filtro.activo === undefined ? '' : String(filtro.activo)}
              onChange={(e) => setFiltro((f) => ({ ...f, activo: e.target.value === '' ? undefined : e.target.value === 'true', pagina: 1 }))}
            >
              <option value="">Todos</option>
              <option value="true">Activos</option>
              <option value="false">Desactivados</option>
            </Selector>
          </form>

          {!pagina ? (
            <Cargando />
          ) : pagina.elementos.length === 0 ? (
            <p className="py-6 text-center text-sm text-texto-secundario">No hay usuarios con esos filtros.</p>
          ) : (
            <ul className="-mx-2 flex flex-col">
              {pagina.elementos.map((u) => {
                const elegido = seleccionado?.id === u.id;
                return (
                  <li key={u.id}>
                    <button
                      type="button"
                      aria-current={elegido ? 'true' : undefined}
                      onClick={() => {
                        setCreando(false);
                        setSeleccionado(u);
                      }}
                      className={`flex w-full items-start gap-3 rounded-lg px-2 py-3 text-left motion-safe:transition-colors ${
                        elegido ? 'bg-primario-suave' : 'hover:bg-fondo'
                      }`}
                    >
                      <span
                        aria-hidden
                        className={`grid size-9 shrink-0 place-items-center rounded-full text-sm font-semibold ${
                          u.activo ? 'bg-primario/10 text-primario' : 'bg-texto/5 text-texto-secundario'
                        }`}
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
                            <Etiqueta key={r.id} tono={r.rol === 'SUPERADMIN' || r.rol === 'ADMIN_AGENCIA' ? 'primario' : 'neutro'}>
                              {describirRol(r)}
                            </Etiqueta>
                          ))}
                        </span>
                      </span>
                      <LuChevronRight aria-hidden className="mt-2 size-4 shrink-0 text-texto-secundario" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {pagina && pagina.total > pagina.tamano && (
            <div className="mt-4 flex items-center justify-between gap-3 border-t border-borde pt-4">
              <Boton variante="secundario" icono={LuChevronLeft} disabled={pagina.pagina <= 1} onClick={() => setFiltro((f) => ({ ...f, pagina: (f.pagina ?? 1) - 1 }))}>
                Anterior
              </Boton>
              <span className="text-sm text-texto-secundario">
                Página {pagina.pagina} de {Math.ceil(pagina.total / pagina.tamano)}
              </span>
              <Boton
                variante="secundario"
                disabled={pagina.pagina * pagina.tamano >= pagina.total}
                onClick={() => setFiltro((f) => ({ ...f, pagina: (f.pagina ?? 1) + 1 }))}
              >
                Siguiente
                <LuChevronRight aria-hidden className="size-4" />
              </Boton>
            </div>
          )}
        </Tarjeta>

        <div ref={panel} className="scroll-mt-20">
          {creando && (
            <NuevoUsuario
              agencias={agencias}
              roles={rolesAsignables}
              agenciasPermitidas={superadmin ? undefined : propias}
              alCrear={(ficha) => {
                setCreando(false);
                alActualizar(ficha);
              }}
              alCancelar={() => setCreando(false)}
            />
          )}
          {seleccionado && !creando && (
            <Ficha
              key={seleccionado.id}
              ficha={seleccionado}
              actor={roles}
              actorId={usuario?.id ?? ''}
              agencias={agencias}
              roles={rolesAsignables}
              agenciasPermitidas={superadmin ? undefined : propias}
              describirRol={describirRol}
              alActualizar={alActualizar}
              alCerrar={() => setSeleccionado(null)}
            />
          )}
          {!creando && !seleccionado && (
            <div className="hidden flex-col items-center gap-3 rounded-xl border border-dashed border-borde px-6 py-12 text-center lg:flex">
              <LuUserCog aria-hidden className="size-8 text-texto-secundario" />
              <p className="text-sm text-texto-secundario">Elige una persona de la lista para ver su ficha, o crea un usuario nuevo.</p>
            </div>
          )}
        </div>
      </div>
    </Pagina>
  );
}

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
  const [mensaje, setMensaje] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);
  const [accion, setAccion] = useState<string | null>(null);
  const superadmin = esSuperadmin(actor);
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

  const subtitulo = 'mb-2 text-xs font-medium tracking-wide text-texto-secundario uppercase';

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
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-1.5">
            <Etiqueta tono={ficha.activo ? 'exito' : 'error'} icono={ficha.activo ? LuCircleCheck : LuCircleSlash}>
              {ficha.activo ? 'Activo' : 'Desactivado'}
            </Etiqueta>
            <Etiqueta tono={ficha.tienePassword ? 'neutro' : 'aviso'} icono={LuKeyRound}>
              {ficha.tienePassword ? 'Contraseña definida' : 'Activación pendiente'}
            </Etiqueta>
            <Etiqueta tono={ficha.mfaActivo ? 'neutro' : 'aviso'} icono={LuShieldCheck}>
              {ficha.mfaActivo ? 'MFA activo' : 'Sin MFA'}
            </Etiqueta>
            <Etiqueta tono={ficha.emailVerificado ? 'neutro' : 'aviso'} icono={LuMailCheck}>
              {ficha.emailVerificado ? 'Correo verificado' : 'Correo sin verificar'}
            </Etiqueta>
          </div>
          <p className="text-sm text-texto-secundario">
            Último ingreso: {ficha.ultimoIngresoEn ? new Date(ficha.ultimoIngresoEn).toLocaleString('es-CO') : 'nunca'}
          </p>
        </div>

        <div>
          <h4 className={subtitulo}>Roles</h4>
          <ul className="flex flex-col divide-y divide-borde rounded-lg border border-borde">
            {ficha.roles.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 px-3 py-1.5 text-sm">
                <span className="py-2">{describirRol(r)}</span>
                {puedeAsignarRol(actor, r) && ficha.roles.length > 1 && !(esYo && r.rol === 'SUPERADMIN') && (
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

        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!ambito) return;
            void ejecutar('asignar', () => administracionApi.asignarRol(ficha.id, ambito), 'Rol asignado.').then((ok) => ok && setAmbito(null));
          }}
        >
          <h4 className={`${subtitulo} mb-0`}>Asignar otro rol</h4>
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

        <div className="flex flex-col gap-3 border-t border-borde pt-5">
          <h4 className={`${subtitulo} mb-0`}>Acciones</h4>
          {mensaje && <Aviso tipo={mensaje.tipo}>{mensaje.texto}</Aviso>}
          <div className="flex flex-wrap gap-2">
            {ficha.activo && !ficha.tienePassword && (
              <Boton
                variante="secundario"
                icono={LuSend}
                cargando={accion === 'activacion'}
                onClick={() => void ejecutar('activacion', () => administracionApi.reenviarActivacion(ficha.id), 'Enviamos de nuevo el enlace de activación.')}
              >
                Reenviar activación
              </Boton>
            )}
            {superadmin && ficha.mfaActivo && !esYo && (
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
            {!esYo && (
              <Boton
                variante={ficha.activo ? 'peligro' : 'secundario'}
                icono={ficha.activo ? LuUserX : LuUserCheck}
                cargando={accion === 'estado'}
                onClick={() =>
                  void ejecutar(
                    'estado',
                    () => administracionApi.actualizar(ficha.id, { activo: !ficha.activo }),
                    ficha.activo ? 'Cuenta desactivada y sesiones cerradas.' : 'Cuenta activada.',
                  )
                }
              >
                {ficha.activo ? 'Desactivar cuenta' : 'Activar cuenta'}
              </Boton>
            )}
          </div>
        </div>
      </div>
    </Tarjeta>
  );
}
