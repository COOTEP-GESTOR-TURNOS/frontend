import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router';
import { ErrorApi, pedir } from '../api/http';
import { panelInicial } from '../auth/permisos';
import { useSesion } from '../auth/sesion';
import { Boton } from '../componentes/Boton';

export function Ingresar() {
  const { iniciarConToken } = useSesion();
  const navegar = useNavigate();
  const [correo, setCorreo] = useState('');
  const [clave, setClave] = useState('');
  const [tokenPrueba, setTokenPrueba] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function ingresar(evento: FormEvent) {
    evento.preventDefault();
    setError(null);
    setCargando(true);
    try {
      const respuesta = await pedir<{ tokenAcceso: string }>('POST', '/auth/login', { cuerpo: { correo, clave } });
      if (respuesta) navegar(panelInicial(iniciarConToken(respuesta.tokenAcceso).roles));
    } catch (err) {
      setError(
        err instanceof ErrorApi && err.status === 501
          ? 'El inicio de sesión local todavía no está implementado en el backend.'
          : (err as Error).message,
      );
    } finally {
      setCargando(false);
    }
  }

  function usarTokenPrueba() {
    try {
      navegar(panelInicial(iniciarConToken(tokenPrueba).roles));
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <main id="contenido">
      <section className="tarjeta">
        <h2>Ingresar</h2>
        <form onSubmit={ingresar} noValidate>
          <div className="campo">
            <label htmlFor="correo">Correo</label>
            <input id="correo" type="email" autoComplete="username" required value={correo} onChange={(e) => setCorreo(e.target.value)} />
          </div>
          <div className="campo">
            <label htmlFor="clave">Contraseña</label>
            <input id="clave" type="password" autoComplete="current-password" required value={clave} onChange={(e) => setClave(e.target.value)} />
          </div>
          {error && (
            <p className="mensaje-error" role="alert">
              {error}
            </p>
          )}
          <Boton type="submit" cargando={cargando}>
            Ingresar
          </Boton>
        </form>
        <div className="acciones" style={{ marginTop: 'var(--espacio-4)' }}>
          <a className="boton boton--secundario" href="/api/v1/auth/oidc/google/inicio">
            Continuar con Google
          </a>
          <a className="boton boton--secundario" href="/api/v1/auth/oidc/microsoft/inicio">
            Continuar con Microsoft
          </a>
        </div>
      </section>

      {import.meta.env.DEV && (
        <section className="tarjeta">
          <h2>Modo desarrollo</h2>
          <p className="texto-secundario">
            Pegue un token generado con <code>npm run token:dev</code> en el backend principal.
          </p>
          <div className="campo">
            <label htmlFor="token">Token de prueba</label>
            <textarea id="token" rows={3} value={tokenPrueba} onChange={(e) => setTokenPrueba(e.target.value)} />
          </div>
          <Boton variante="secundario" onClick={usarTokenPrueba}>
            Usar token
          </Boton>
        </section>
      )}
    </main>
  );
}
