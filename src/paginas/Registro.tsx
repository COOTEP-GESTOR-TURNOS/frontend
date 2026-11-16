import { FormEvent, useState } from 'react';
import { Link } from 'react-router';
import { authApi, TIPOS_DOCUMENTO, type TipoDocumento } from '../api/auth';
import { mensajeDeError } from '../api/http';
import { Aviso } from '../componentes/Aviso';
import { Boton } from '../componentes/Boton';
import { Campo, CampoClave, Selector } from '../componentes/Campo';

/** Registro público de asociados. Las cuentas con privilegios las crea un administrador. */
export function Registro() {
  const [datos, setDatos] = useState({
    nombre: '',
    email: '',
    tipoDocumento: 'CC' as TipoDocumento,
    numeroDocumento: '',
    fechaNacimiento: '',
    clave: '',
  });
  const [confirmacion, setConfirmacion] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviado, setEnviado] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const cambiar = (campo: keyof typeof datos) => (e: { target: { value: string } }) =>
    setDatos((d) => ({ ...d, [campo]: e.target.value }));

  async function registrar(evento: FormEvent) {
    evento.preventDefault();
    setError(null);
    if (datos.clave !== confirmacion) {
      setError('Las contraseñas no coinciden');
      return;
    }
    setCargando(true);
    try {
      const r = await authApi.registro({ ...datos, fechaNacimiento: datos.fechaNacimiento || undefined });
      setEnviado(r?.email ?? datos.email);
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setCargando(false);
    }
  }

  if (enviado) {
    return (
      <main id="contenido">
        <section className="tarjeta">
          <h2>Revisa tu correo</h2>
          <Aviso tipo="exito">
            Enviamos un enlace a <strong>{enviado}</strong>. Ábrelo para confirmar tu correo; después podrás ingresar.
          </Aviso>
          <Link to="/ingresar">Ir a ingresar</Link>
        </section>
      </main>
    );
  }

  return (
    <main id="contenido">
      <section className="tarjeta">
        <h2>Crear cuenta de asociado</h2>
        <form onSubmit={registrar} noValidate>
          <Campo etiqueta="Nombre completo" autoComplete="name" required value={datos.nombre} onChange={cambiar('nombre')} />
          <Campo etiqueta="Correo" type="email" autoComplete="email" required value={datos.email} onChange={cambiar('email')} />
          <Selector etiqueta="Tipo de documento" value={datos.tipoDocumento} onChange={cambiar('tipoDocumento')}>
            {TIPOS_DOCUMENTO.map((t) => (
              <option key={t.valor} value={t.valor}>
                {t.texto}
              </option>
            ))}
          </Selector>
          <Campo etiqueta="Número de documento" inputMode="numeric" required value={datos.numeroDocumento} onChange={cambiar('numeroDocumento')} />
          <Campo
            etiqueta="Fecha de nacimiento (opcional)"
            type="date"
            ayuda="Permite reconocer la atención preferencial de los adultos mayores."
            value={datos.fechaNacimiento}
            onChange={cambiar('fechaNacimiento')}
          />
          <CampoClave
            etiqueta="Contraseña"
            autoComplete="new-password"
            ayuda="Mínimo 15 caracteres. Una frase fácil de recordar es más segura que una clave corta."
            value={datos.clave}
            onChange={cambiar('clave')}
          />
          <Campo etiqueta="Repite la contraseña" type="password" autoComplete="new-password" value={confirmacion} onChange={(e) => setConfirmacion(e.target.value)} />
          {error && <Aviso tipo="error">{error}</Aviso>}
          <div className="acciones">
            <Boton type="submit" cargando={cargando}>
              Crear cuenta
            </Boton>
            <Link to="/ingresar">Ya tengo cuenta</Link>
          </div>
        </form>
      </section>
    </main>
  );
}
