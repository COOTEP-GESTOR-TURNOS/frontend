import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { authApi, type Paso, type ResultadoIngreso } from '../api/auth';
import { ErrorApi, mensajeDeError } from '../api/http';
import { panelInicial } from '../auth/permisos';
import { useSesion } from '../auth/sesion';
import { Aviso } from '../componentes/Aviso';
import { Boton } from '../componentes/Boton';
import { Campo, CampoClave } from '../componentes/Campo';

const ERRORES_GOOGLE: Record<string, string> = {
  access_denied: 'Cancelaste el inicio con Google.',
  OIDC_CANCELADO: 'No se completó el inicio con Google.',
  ESTADO_OIDC_INVALIDO: 'El inicio con Google venció. Intenta de nuevo.',
  CUENTA_INACTIVA: 'Tu cuenta está desactivada. Comunícate con tu agencia.',
  SERVICIO_NO_DISPONIBLE: 'El inicio con Google no está disponible en este momento.',
};

interface Reto {
  id: string;
  paso: Paso;
}

/** CU-01: correo y contraseña o Google; luego, si aplica, cambio de clave y MFA. */
export function Ingresar() {
  const { usuario, cargando, abrirSesion } = useSesion();
  const navegar = useNavigate();
  const [parametros] = useSearchParams();
  const [reto, setReto] = useState<Reto | null>(() => {
    const id = parametros.get('reto');
    const paso = parametros.get('paso') as Paso | null;
    return id && paso ? { id, paso } : null;
  });

  // Si ya hay sesión (por ejemplo, al volver de Google con ?oidc=ok) se abre el panel del rol.
  useEffect(() => {
    if (usuario) navegar(panelInicial(usuario.roles), { replace: true });
  }, [usuario, navegar]);

  function continuar(resultado: ResultadoIngreso | null) {
    if (!resultado) return;
    if (resultado.estado === 'SESION_INICIADA') abrirSesion(resultado);
    else setReto({ id: resultado.reto, paso: resultado.paso });
  }

  const errorGoogle = parametros.get('error');
  if (cargando) return <p className="texto-secundario" role="status" style={{ textAlign: 'center' }}>Cargando…</p>;

  return (
    <main id="contenido">
      {reto ? (
        <PasoPendiente reto={reto} alTerminar={continuar} alVencer={() => setReto(null)} />
      ) : (
        <Credenciales alIngresar={continuar} errorInicial={errorGoogle ? ERRORES_GOOGLE[errorGoogle] ?? 'No se pudo iniciar sesión con Google.' : null} />
      )}
    </main>
  );
}

function Credenciales({ alIngresar, errorInicial }: { alIngresar: (r: ResultadoIngreso | null) => void; errorInicial: string | null }) {
  const [correo, setCorreo] = useState('');
  const [clave, setClave] = useState('');
  const [error, setError] = useState<string | null>(errorInicial);
  const [sinVerificar, setSinVerificar] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function ingresar(evento: FormEvent) {
    evento.preventDefault();
    setError(null);
    setAviso(null);
    setSinVerificar(false);
    setCargando(true);
    try {
      alIngresar(await authApi.login(correo, clave));
    } catch (err) {
      setSinVerificar(err instanceof ErrorApi && err.codigo === 'CORREO_NO_VERIFICADO');
      setError(mensajeDeError(err));
    } finally {
      setCargando(false);
    }
  }

  async function reenviar() {
    const r = await authApi.reenviarVerificacion(correo).catch(() => null);
    setSinVerificar(false);
    setError(null);
    setAviso(r?.mensaje ?? 'Si la dirección está registrada, te enviamos un nuevo enlace.');
  }

  return (
    <section className="tarjeta">
      <h2>Ingresar</h2>
      <form onSubmit={ingresar} noValidate>
        <Campo etiqueta="Correo" type="email" autoComplete="username" required value={correo} onChange={(e) => setCorreo(e.target.value)} />
        <CampoClave etiqueta="Contraseña" autoComplete="current-password" required value={clave} onChange={(e) => setClave(e.target.value)} />
        {error && <Aviso tipo="error">{error}</Aviso>}
        {sinVerificar && (
          <p>
            <button type="button" className="enlace-boton" onClick={() => void reenviar()}>
              Enviar de nuevo el enlace de confirmación
            </button>
          </p>
        )}
        {aviso && <Aviso tipo="exito">{aviso}</Aviso>}
        <div className="acciones">
          <Boton type="submit" cargando={cargando}>
            Ingresar
          </Boton>
          <Link to="/recuperar">¿Olvidaste tu contraseña?</Link>
        </div>
      </form>
      <p className="separador">o</p>
      <a className="boton boton--secundario" href="/api/v1/auth/oidc/google/inicio?cliente=web">
        Continuar con Google
      </a>
      <p style={{ marginTop: 'var(--espacio-5)' }}>
        ¿Eres asociado y no tienes cuenta? <Link to="/registro">Crea tu cuenta</Link>
      </p>
      <TokenDesarrollo />
    </section>
  );
}

/** Pasos que pide el backend antes de abrir la sesión: clave temporal y MFA (RF-03). */
function PasoPendiente({ reto, alTerminar, alVencer }: { reto: Reto; alTerminar: (r: ResultadoIngreso | null) => void; alVencer: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [claveNueva, setClaveNueva] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [codigo, setCodigo] = useState('');
  const [mfa, setMfa] = useState<{ secreto: string; qr: string } | null>(null);

  useEffect(() => {
    setError(null);
    setCodigo('');
    if (reto.paso !== 'CONFIGURAR_MFA') return;
    authApi
      .configurarMfa(reto.id)
      .then((r) => r && setMfa(r))
      .catch((err) => setError(mensajeDeError(err)));
  }, [reto]);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setError(null);
    if (reto.paso === 'CAMBIAR_CLAVE' && claveNueva !== confirmacion) {
      setError('Las contraseñas no coinciden');
      return;
    }
    setCargando(true);
    try {
      alTerminar(
        reto.paso === 'CAMBIAR_CLAVE' ? await authApi.claveInicial(reto.id, claveNueva) : await authApi.verificarMfa(reto.id, codigo),
      );
    } catch (err) {
      setError(mensajeDeError(err));
      if (err instanceof ErrorApi && (err.codigo === 'RETO_VENCIDO' || err.status === 429)) setTimeout(alVencer, 2500);
    } finally {
      setCargando(false);
    }
  }

  return (
    <section className="tarjeta">
      {reto.paso === 'CAMBIAR_CLAVE' && (
        <>
          <h2>Cambia tu contraseña temporal</h2>
          <p className="texto-secundario">Es tu primer ingreso. Elige una contraseña que solo tú conozcas.</p>
        </>
      )}
      {reto.paso === 'CONFIGURAR_MFA' && (
        <>
          <h2>Activa la verificación en dos pasos</h2>
          <p>
            Tu rol administra datos de la cooperativa, así que además de la contraseña pedimos un código de tu teléfono.
            Escanea el código QR con Google Authenticator, Microsoft Authenticator u otra app compatible.
          </p>
          {mfa ? (
            <>
              <img className="qr-mfa" src={mfa.qr} alt="Código QR para la app autenticadora" />
              <p className="texto-secundario">Si no puedes escanearlo, escribe esta clave en la app:</p>
              <p className="secreto-mfa">{mfa.secreto}</p>
            </>
          ) : (
            !error && <p role="status">Generando el código QR…</p>
          )}
        </>
      )}
      {reto.paso === 'VERIFICAR_MFA' && (
        <>
          <h2>Verificación en dos pasos</h2>
          <p>Escribe el código de 6 dígitos que muestra tu app autenticadora.</p>
        </>
      )}

      <form onSubmit={enviar} noValidate>
        {reto.paso === 'CAMBIAR_CLAVE' ? (
          <>
            <CampoClave
              etiqueta="Contraseña nueva"
              autoComplete="new-password"
              ayuda="Mínimo 8 caracteres (tendrás verificación en dos pasos). Puedes usar una frase."
              value={claveNueva}
              onChange={(e) => setClaveNueva(e.target.value)}
            />
            <Campo etiqueta="Repite la contraseña" type="password" autoComplete="new-password" value={confirmacion} onChange={(e) => setConfirmacion(e.target.value)} />
          </>
        ) : (
          <div className="codigo-mfa">
            <Campo
              etiqueta="Código de 6 dígitos"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={7}
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.replace(/[^\d ]/g, ''))}
            />
          </div>
        )}
        {error && <Aviso tipo="error">{error}</Aviso>}
        <div className="acciones">
          <Boton type="submit" cargando={cargando}>
            {reto.paso === 'CAMBIAR_CLAVE' ? 'Guardar y continuar' : 'Verificar'}
          </Boton>
          <Boton variante="secundario" onClick={alVencer}>
            Cancelar
          </Boton>
        </div>
      </form>
    </section>
  );
}

/** Solo en desarrollo (npm run dev): permite entrar con un token de npm run token:dev. */
function TokenDesarrollo() {
  const { iniciarConToken } = useSesion();
  const navegar = useNavigate();
  const [token, setToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  if (!import.meta.env.DEV) return null;
  return (
    <details style={{ marginTop: 'var(--espacio-5)' }}>
      <summary>Modo desarrollo: usar un token de prueba</summary>
      <div className="campo">
        <label htmlFor="token">Token (npm run token:dev en el backend)</label>
        <textarea id="token" rows={3} value={token} onChange={(e) => setToken(e.target.value)} />
      </div>
      {error && <Aviso tipo="error">{error}</Aviso>}
      <Boton
        variante="secundario"
        onClick={() => {
          try {
            navegar(panelInicial(iniciarConToken(token).roles));
          } catch (err) {
            setError((err as Error).message);
          }
        }}
      >
        Usar token
      </Boton>
    </details>
  );
}
