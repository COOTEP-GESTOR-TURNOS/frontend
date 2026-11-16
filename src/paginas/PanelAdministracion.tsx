import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  type AgenciaCatalogo,
  administracionApi,
  type FichaUsuario,
  type FiltroUsuarios,
  NOMBRE_ROL,
  type PaginaUsuarios,
} from '../api/administracion';
import { TIPOS_DOCUMENTO, type TipoDocumento } from '../api/auth';
import { mensajeDeError } from '../api/http';
import { agenciasAdministradas, type AsignacionRol, esSuperadmin, puedeAsignarRol, type Rol } from '../auth/permisos';
import { useSesion } from '../auth/sesion';
import { Aviso } from '../componentes/Aviso';
import { Boton } from '../componentes/Boton';
import { Campo, Selector } from '../componentes/Campo';
import { SelectorAmbito } from '../componentes/SelectorAmbito';

const TODOS_LOS_ROLES: Rol[] = ['SUPERADMIN', 'ADMIN_AGENCIA', 'FUNCIONARIO', 'ASOCIADO'];

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

  const [agencias, setAgencias] = useState<AgenciaCatalogo[]>([]);
  const [filtro, setFiltro] = useState<FiltroUsuarios>({ pagina: 1 });
  const [pagina, setPagina] = useState<PaginaUsuarios | null>(null);
  const [seleccionado, setSeleccionado] = useState<FichaUsuario | null>(null);
  const [creando, setCreando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    administracionApi
      .agencias()
      .then((a) => setAgencias(a ?? []))
      .catch((err) => setError(mensajeDeError(err)));
  }, []);

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
    <main id="contenido" className="ancho">
      <section className="tarjeta">
        <h2>{superadmin ? 'Control global' : `Administración de ${propias.map(nombreAgencia).join(', ')}`}</h2>
        <p className="texto-secundario">
          {superadmin
            ? 'Crea los directivos de cada agencia, asigna roles y desactiva cuentas. Cada cambio queda en la auditoría.'
            : 'Da de alta a los funcionarios de tu agencia y asígnales su servicio. Cada cambio queda en la auditoría.'}
        </p>
        {error && <Aviso tipo="error">{error}</Aviso>}
      </section>

      <div className="rejilla-admin">
        <section className="tarjeta" aria-labelledby="titulo-usuarios">
          <div className="acciones" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 id="titulo-usuarios" style={{ margin: 0 }}>
              Usuarios {pagina && <span className="texto-secundario">({pagina.total})</span>}
            </h3>
            <Boton
              onClick={() => {
                setSeleccionado(null);
                setCreando(true);
              }}
            >
              Nuevo usuario
            </Boton>
          </div>

          <form className="filtros" role="search" onSubmit={(e) => e.preventDefault()} style={{ marginTop: 'var(--espacio-4)' }}>
            <Campo
              etiqueta="Buscar"
              placeholder="Nombre, correo o documento"
              value={filtro.texto ?? ''}
              onChange={(e) => setFiltro((f) => ({ ...f, texto: e.target.value, pagina: 1 }))}
            />
            <Selector
              etiqueta="Rol"
              value={filtro.rol ?? ''}
              onChange={(e) => setFiltro((f) => ({ ...f, rol: (e.target.value || undefined) as Rol | undefined, pagina: 1 }))}
            >
              <option value="">Todos</option>
              {TODOS_LOS_ROLES.map((r) => (
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
            <p role="status">Cargando…</p>
          ) : pagina.elementos.length === 0 ? (
            <p className="texto-secundario">No hay usuarios con esos filtros.</p>
          ) : (
            <table className="tabla">
              <thead>
                <tr>
                  <th scope="col">Persona</th>
                  <th scope="col">Roles</th>
                </tr>
              </thead>
              <tbody>
                {pagina.elementos.map((u) => (
                  <tr key={u.id} aria-selected={seleccionado?.id === u.id}>
                    <td>
                      <button
                        type="button"
                        className="enlace-boton"
                        onClick={() => {
                          setCreando(false);
                          setSeleccionado(u);
                        }}
                      >
                        {u.nombre}
                      </button>
                      <div className="texto-secundario">{u.email}</div>
                      {!u.activo && <span className="etiqueta etiqueta--inactivo">Desactivado</span>}
                    </td>
                    <td>
                      {u.roles.map((r) => (
                        <span key={r.id} className="etiqueta">
                          {describirRol(r)}
                        </span>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {pagina && pagina.total > pagina.tamano && (
            <div className="paginacion">
              <Boton variante="secundario" disabled={pagina.pagina <= 1} onClick={() => setFiltro((f) => ({ ...f, pagina: (f.pagina ?? 1) - 1 }))}>
                Anterior
              </Boton>
              <span>
                Página {pagina.pagina} de {Math.ceil(pagina.total / pagina.tamano)}
              </span>
              <Boton
                variante="secundario"
                disabled={pagina.pagina * pagina.tamano >= pagina.total}
                onClick={() => setFiltro((f) => ({ ...f, pagina: (f.pagina ?? 1) + 1 }))}
              >
                Siguiente
              </Boton>
            </div>
          )}
        </section>

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
          />
        )}
      </div>
    </main>
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
    <section className="tarjeta" aria-labelledby="titulo-nuevo">
      <h3 id="titulo-nuevo">Nuevo usuario</h3>
      <p className="texto-secundario">La persona recibe un correo para definir su contraseña. Los administradores deben activar MFA.</p>
      <form onSubmit={crear} noValidate>
        <Campo etiqueta="Nombre completo" required value={datos.nombre} onChange={(e) => setDatos({ ...datos, nombre: e.target.value })} />
        <Campo etiqueta="Correo" type="email" required value={datos.email} onChange={(e) => setDatos({ ...datos, email: e.target.value })} />
        <Selector etiqueta="Tipo de documento" value={datos.tipoDocumento} onChange={(e) => setDatos({ ...datos, tipoDocumento: e.target.value as TipoDocumento })}>
          {TIPOS_DOCUMENTO.map((t) => (
            <option key={t.valor} value={t.valor}>
              {t.texto}
            </option>
          ))}
        </Selector>
        <Campo etiqueta="Número de documento (opcional)" value={datos.numeroDocumento} onChange={(e) => setDatos({ ...datos, numeroDocumento: e.target.value })} />
        <SelectorAmbito agencias={agencias} roles={roles} agenciasPermitidas={agenciasPermitidas} valor={ambito} alCambiar={setAmbito} />
        {error && <Aviso tipo="error">{error}</Aviso>}
        {resultado && <Aviso tipo="exito">{resultado}</Aviso>}
        <div className="acciones">
          <Boton type="submit" cargando={cargando}>
            Crear y enviar activación
          </Boton>
          <Boton variante="secundario" onClick={alCancelar}>
            Cancelar
          </Boton>
        </div>
      </form>
    </section>
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
}: PropsAmbito & {
  ficha: FichaUsuario;
  actor: AsignacionRol[];
  actorId: string;
  describirRol: (r: AsignacionRol) => string;
  alActualizar: (f: FichaUsuario) => void;
}) {
  const [ambito, setAmbito] = useState<AsignacionRol>(() => ambitoInicial(roles, agenciasPermitidas, agencias));
  const [mensaje, setMensaje] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);
  const [accion, setAccion] = useState<string | null>(null);
  const superadmin = esSuperadmin(actor);
  const esYo = ficha.id === actorId;

  async function ejecutar(nombre: string, operacion: () => Promise<FichaUsuario | null | void>, exito: string) {
    setAccion(nombre);
    setMensaje(null);
    try {
      const r = await operacion();
      if (r) alActualizar(r);
      setMensaje({ tipo: 'exito', texto: exito });
    } catch (err) {
      setMensaje({ tipo: 'error', texto: mensajeDeError(err) });
    } finally {
      setAccion(null);
    }
  }

  return (
    <section className="tarjeta" aria-labelledby="titulo-ficha">
      <h3 id="titulo-ficha">{ficha.nombre}</h3>
      <p className="texto-secundario" style={{ marginTop: 0 }}>
        {ficha.email}
        {ficha.numeroDocumento && ` · ${ficha.tipoDocumento} ${ficha.numeroDocumento}`}
      </p>
      <p>
        <span className={`etiqueta ${ficha.activo ? '' : 'etiqueta--inactivo'}`}>{ficha.activo ? 'Activo' : 'Desactivado'}</span>
        <span className="etiqueta">{ficha.tienePassword ? 'Contraseña definida' : 'Activación pendiente'}</span>
        <span className="etiqueta">{ficha.mfaActivo ? 'MFA activo' : 'Sin MFA'}</span>
        <span className="etiqueta">{ficha.emailVerificado ? 'Correo verificado' : 'Correo sin verificar'}</span>
      </p>
      <p className="texto-secundario">
        Último ingreso: {ficha.ultimoIngresoEn ? new Date(ficha.ultimoIngresoEn).toLocaleString('es-CO') : 'nunca'}
      </p>

      <h4>Roles</h4>
      <ul className="lista-roles">
        {ficha.roles.map((r) => (
          <li key={r.id}>
            <span>{describirRol(r)}</span>
            {puedeAsignarRol(actor, r) && ficha.roles.length > 1 && !(esYo && r.rol === 'SUPERADMIN') && (
              <Boton
                variante="peligro"
                cargando={accion === `quitar-${r.id}`}
                onClick={() => void ejecutar(`quitar-${r.id}`, () => administracionApi.revocarRol(ficha.id, r.id), 'Rol retirado; sus sesiones se cerraron.')}
              >
                Quitar
              </Boton>
            )}
          </li>
        ))}
      </ul>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void ejecutar('asignar', () => administracionApi.asignarRol(ficha.id, ambito), 'Rol asignado.');
        }}
      >
        <h4>Asignar otro rol</h4>
        <SelectorAmbito agencias={agencias} roles={roles} agenciasPermitidas={agenciasPermitidas} valor={ambito} alCambiar={setAmbito} />
        <Boton type="submit" variante="secundario" cargando={accion === 'asignar'}>
          Asignar rol
        </Boton>
      </form>

      <h4>Acciones</h4>
      {mensaje && <Aviso tipo={mensaje.tipo}>{mensaje.texto}</Aviso>}
      <div className="acciones">
        {!esYo && (
          <Boton
            variante={ficha.activo ? 'peligro' : 'secundario'}
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
        {ficha.activo && !ficha.tienePassword && (
          <Boton
            variante="secundario"
            cargando={accion === 'activacion'}
            onClick={() => void ejecutar('activacion', () => administracionApi.reenviarActivacion(ficha.id), 'Enviamos de nuevo el enlace de activación.')}
          >
            Reenviar activación
          </Boton>
        )}
        {superadmin && ficha.mfaActivo && !esYo && (
          <Boton
            variante="secundario"
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
      </div>
    </section>
  );
}
