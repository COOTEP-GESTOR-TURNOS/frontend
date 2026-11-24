import { FormEvent, useEffect, useRef, useState } from 'react';
import { LuArrowLeft, LuBadgeCheck, LuKeyRound, LuMail, LuMailCheck, LuSend } from 'react-icons/lu';
import { Link, useSearchParams } from 'react-router';
import { authApi } from '../api/auth';
import { mensajeDeError } from '../api/http';
import { Aviso } from '../componentes/Aviso';
import { Boton } from '../componentes/Boton';
import { Campo, CampoClave } from '../componentes/Campo';
import { Cargando, PantallaAcceso } from '../componentes/Pagina';

function VolverAIngresar({ texto = 'Volver a ingresar' }: { texto?: string }) {
  return (
    <Link to="/ingresar" className="enlace inline-flex items-center justify-center gap-1.5 text-sm">
      <LuArrowLeft aria-hidden className="size-4" />
      {texto}
    </Link>
  );
}

/** RF-04 (1/2): pide el enlace. La respuesta es la misma exista o no la cuenta. */
export function Recuperar() {
  const [correo, setCorreo] = useState('');
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setError(null);
    setCargando(true);
    try {
      const r = await authApi.recuperar(correo);
      setMensaje(r?.mensaje ?? 'Revisa tu correo.');
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setCargando(false);
    }
  }

  return (
    <PantallaAcceso titulo="Recuperar contraseña" descripcion="Te enviaremos un enlace para elegir una contraseña nueva." icono={LuKeyRound}>
      {mensaje ? (
        <div className="flex flex-col gap-5">
          <Aviso tipo="exito">{mensaje} El enlace vence en 15 minutos y sirve una sola vez.</Aviso>
          <VolverAIngresar />
        </div>
      ) : (
        <form onSubmit={enviar} noValidate className="flex flex-col gap-4">
          <Campo etiqueta="Correo" type="email" icono={LuMail} autoComplete="email" required value={correo} onChange={(e) => setCorreo(e.target.value)} />
          {error && <Aviso tipo="error">{error}</Aviso>}
          <Boton type="submit" icono={LuSend} cargando={cargando} className="w-full">
            Enviar enlace
          </Boton>
          <VolverAIngresar texto="Volver" />
        </form>
      )}
    </PantallaAcceso>
  );
}

/** RF-04 (2/2) y activación de cuentas creadas por un administrador: fija la contraseña. */
export function Restablecer() {
  const [parametros] = useSearchParams();
  const token = parametros.get('token') ?? '';
  const activar = parametros.get('tipo') === 'activar';
  const [clave, setClave] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState(false);
  const [cargando, setCargando] = useState(false);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setError(null);
    if (clave !== confirmacion) {
      setError('Las contraseñas no coinciden');
      return;
    }
    setCargando(true);
    try {
      await authApi.restablecer(token, clave);
      setListo(true);
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setCargando(false);
    }
  }

  const encabezado = activar ? { titulo: 'Activa tu cuenta', icono: LuBadgeCheck } : { titulo: 'Elige una contraseña nueva', icono: LuKeyRound };
  if (listo) {
    return (
      <PantallaAcceso {...encabezado}>
        <ClaveLista activar={activar} />
      </PantallaAcceso>
    );
  }
  return (
    <PantallaAcceso {...encabezado}>
      {!token ? (
        <Aviso tipo="error">El enlace está incompleto. Pide uno nuevo desde «¿Olvidaste tu contraseña?».</Aviso>
      ) : (
        <form onSubmit={enviar} noValidate className="flex flex-col gap-4">
          <CampoClave
            etiqueta="Contraseña nueva"
            autoComplete="new-password"
            ayuda="Mínimo 15 caracteres (8 si tu cuenta usa verificación en dos pasos). Puedes usar una frase."
            value={clave}
            onChange={(e) => setClave(e.target.value)}
          />
          <Campo etiqueta="Repite la contraseña" type="password" autoComplete="new-password" value={confirmacion} onChange={(e) => setConfirmacion(e.target.value)} />
          {error && <Aviso tipo="error">{error}</Aviso>}
          <Boton type="submit" cargando={cargando} className="w-full">
            Guardar contraseña
          </Boton>
        </form>
      )}
    </PantallaAcceso>
  );
}

function ClaveLista({ activar }: { activar: boolean }) {
  return (
    <div className="flex flex-col gap-5">
      <Aviso tipo="exito">
        {activar ? 'Tu cuenta quedó activa.' : 'Tu contraseña cambió y cerramos las sesiones abiertas.'} Ya puedes ingresar.
      </Aviso>
      <VolverAIngresar texto="Ir a ingresar" />
    </div>
  );
}

/** Confirma el correo con el enlace del registro. */
export function VerificarCorreo() {
  const [parametros] = useSearchParams();
  const [estado, setEstado] = useState<'cargando' | 'ok' | 'error'>('cargando');
  const [error, setError] = useState<string | null>(null);
  const enviado = useRef(false);

  useEffect(() => {
    // El enlace es de un solo uso: StrictMode monta dos veces en desarrollo y no debe gastarlo dos veces.
    if (enviado.current) return;
    enviado.current = true;
    authApi
      .verificarCorreo(parametros.get('token') ?? '')
      .then(() => setEstado('ok'))
      .catch((err) => {
        setError(mensajeDeError(err));
        setEstado('error');
      });
  }, [parametros]);

  return (
    <PantallaAcceso titulo="Confirmación de correo" icono={LuMailCheck}>
      <div className="flex flex-col gap-5">
        {estado === 'cargando' && <Cargando texto="Confirmando…" />}
        {estado === 'ok' && <Aviso tipo="exito">Tu correo quedó confirmado. Ya puedes ingresar.</Aviso>}
        {estado === 'error' && <Aviso tipo="error">{error} Ingresa con tu correo y contraseña para recibir otro enlace.</Aviso>}
        {estado !== 'cargando' && <VolverAIngresar texto="Ir a ingresar" />}
      </div>
    </PantallaAcceso>
  );
}
