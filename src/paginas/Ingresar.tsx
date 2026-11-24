import { FormEvent, useEffect, useState } from 'react';
import { FcGoogle } from 'react-icons/fc';
import { LuCode, LuKeyRound, LuLock, LuLogIn, LuMail, LuShieldCheck, LuSmartphone } from 'react-icons/lu';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { authApi, type Paso, type ResultadoIngreso } from '../api/auth';
import { ErrorApi, mensajeDeError } from '../api/http';
import { panelInicial } from '../auth/permisos';
import { useSesion } from '../auth/sesion';
import { Aviso } from '../componentes/Aviso';
import { Boton, BotonEnlace, claseBoton } from '../componentes/Boton';
import { Campo, CampoClave } from '../componentes/Campo';
import { Cargando, PantallaAcceso } from '../componentes/Pagina';

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
  if (cargando) return <Cargando centrado />;

  return reto ? (
    <PasoPendiente reto={reto} alTerminar={continuar} alVencer={() => setReto(null)} />
  ) : (
    <Credenciales alIngresar={continuar} errorInicial={errorGoogle ? ERRORES_GOOGLE[errorGoogle] ?? 'No se pudo iniciar sesión con Google.' : null} />
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
    <PantallaAcceso titulo="Ingresar" descripcion="Pide y sigue tu turno sin esperar en la sala.">
      <form onSubmit={ingresar} noValidate className="flex flex-col gap-4">
        <Campo etiqueta="Correo" type="email" icono={LuMail} autoComplete="username" required value={correo} onChange={(e) => setCorreo(e.target.value)} />
        <CampoClave etiqueta="Contraseña" icono={LuLock} autoComplete="current-password" required value={clave} onChange={(e) => setClave(e.target.value)} />
        <div className="-mt-1 flex justify-end">
          <Link to="/recuperar" className="enlace text-sm">
            ¿Olvidaste tu contraseña?
          </Link>
        </div>
        {error && <Aviso tipo="error">{error}</Aviso>}
        {sinVerificar && (
          <BotonEnlace className="text-sm" onClick={() => void reenviar()}>
            Enviar de nuevo el enlace de confirmación
          </BotonEnlace>
        )}
        {aviso && <Aviso tipo="exito">{aviso}</Aviso>}
        <Boton type="submit" icono={LuLogIn} cargando={cargando} className="w-full">
          Ingresar
        </Boton>
      </form>

      <p className="my-5 flex items-center gap-3 text-xs text-texto-secundario uppercase before:h-px before:flex-1 before:bg-borde after:h-px after:flex-1 after:bg-borde">
        o
      </p>
      <a className={claseBoton('secundario', 'w-full')} href="/api/v1/auth/oidc/google/inicio?cliente=web">
        <FcGoogle aria-hidden className="size-5" />
        Continuar con Google
      </a>

      <p className="mt-6 text-center text-sm text-texto-secundario">
        ¿Eres asociado y no tienes cuenta?{' '}
        <Link to="/registro" className="enlace">
          Crea tu cuenta
        </Link>
      </p>
      <TokenDesarrollo />
    </PantallaAcceso>
  );
}

const ENCABEZADOS = {
  CAMBIAR_CLAVE: {
    titulo: 'Cambia tu contraseña temporal',
    descripcion: 'Es tu primer ingreso. Elige una contraseña que solo tú conozcas.',
    icono: LuKeyRound,
  },
  CONFIGURAR_MFA: {
    titulo: 'Activa la verificación en dos pasos',
    descripcion: 'Tu rol administra datos de la cooperativa, así que además de la contraseña pedimos un código de tu teléfono.',
    icono: LuSmartphone,
  },
  VERIFICAR_MFA: {
    titulo: 'Verificación en dos pasos',
    descripcion: 'Escribe el código de 6 dígitos que muestra tu app autenticadora.',
    icono: LuShieldCheck,
  },
} as const;

/** El paso venció (o se bloqueó por intentos): hay que volver a ingresar desde el principio. */
function retoVencido(err: unknown): boolean {
  return err instanceof ErrorApi && (err.codigo === 'RETO_VENCIDO' || err.status === 429);
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
      if (retoVencido(err)) setTimeout(alVencer, 2500);
    } finally {
      setCargando(false);
    }
  }

  return (
    <PantallaAcceso {...ENCABEZADOS[reto.paso]}>
      {reto.paso === 'CONFIGURAR_MFA' && (
        <div className="mb-5 flex flex-col items-center gap-3 text-center">
          <p className="text-sm">Escanea el código QR con Google Authenticator, Microsoft Authenticator u otra app compatible.</p>
          {mfa ? (
            <>
              <img className="size-48 rounded-lg border border-borde p-2" src={mfa.qr} alt="Código QR para la app autenticadora" />
              <p className="text-sm text-texto-secundario">Si no puedes escanearlo, escribe esta clave en la app:</p>
              <p className="w-full rounded-lg bg-fondo px-3 py-2 font-mono text-sm break-all">{mfa.secreto}</p>
            </>
          ) : (
            !error && <Cargando texto="Generando el código QR…" />
          )}
        </div>
      )}

      <form onSubmit={enviar} noValidate className="flex flex-col gap-4">
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
          <Campo
            etiqueta="Código de 6 dígitos"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={7}
            className="text-center font-mono text-xl tracking-[0.3em]"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.replace(/[^\d ]/g, ''))}
          />
        )}
        {error && <Aviso tipo="error">{error}</Aviso>}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Boton variante="fantasma" onClick={alVencer}>
            Cancelar
          </Boton>
          <Boton type="submit" cargando={cargando}>
            {reto.paso === 'CAMBIAR_CLAVE' ? 'Guardar y continuar' : 'Verificar'}
          </Boton>
        </div>
      </form>
    </PantallaAcceso>
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
    <details className="mt-6 rounded-lg border border-dashed border-borde px-4 py-3 text-sm">
      <summary className="flex cursor-pointer items-center gap-2 text-texto-secundario">
        <LuCode aria-hidden className="size-4" />
        Modo desarrollo: usar un token de prueba
      </summary>
      <div className="mt-3 flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="token" className="font-medium">
            Token (npm run token:dev en el backend)
          </label>
          <textarea id="token" rows={3} className="entrada font-mono text-xs" value={token} onChange={(e) => setToken(e.target.value)} />
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
      </div>
    </details>
  );
}
