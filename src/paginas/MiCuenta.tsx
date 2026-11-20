import { FormEvent, useEffect, useState } from 'react';
import { LuIdCard, LuKeyRound, LuSave } from 'react-icons/lu';
import { authApi, minimoClave, type Perfil, TIPOS_DOCUMENTO, type TipoDocumento } from '../api/auth';
import { mensajeDeError } from '../api/http';
import { useSesion } from '../auth/sesion';
import { Aviso } from '../componentes/Aviso';
import { Boton } from '../componentes/Boton';
import { Campo, CampoClave, Selector } from '../componentes/Campo';
import { Cargando, Pagina } from '../componentes/Pagina';
import { Tarjeta } from '../componentes/Tarjeta';

/** Datos propios: completar el documento (cuentas de Google) y cambiar la contraseña. */
export function MiCuenta() {
  const { recargarPerfil } = useSesion();
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [datos, setDatos] = useState({ nombre: '', tipoDocumento: 'CC' as TipoDocumento, numeroDocumento: '', fechaNacimiento: '' });
  const [mensajeDatos, setMensajeDatos] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);
  const [claves, setClaves] = useState({ actual: '', nueva: '', confirmacion: '' });
  const [mensajeClave, setMensajeClave] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);
  const [cargando, setCargando] = useState<string | null>(null);

  useEffect(() => {
    authApi
      .yo()
      .then((p) => {
        if (!p) return;
        setPerfil(p);
        setDatos({
          nombre: p.nombre,
          tipoDocumento: p.tipoDocumento ?? 'CC',
          numeroDocumento: p.numeroDocumento ?? '',
          fechaNacimiento: p.fechaNacimiento ?? '',
        });
      })
      .catch((err) => setMensajeDatos({ tipo: 'error', texto: mensajeDeError(err) }));
  }, []);

  async function guardarDatos(evento: FormEvent) {
    evento.preventDefault();
    setCargando('datos');
    setMensajeDatos(null);
    try {
      await authApi.actualizarPerfil({
        nombre: datos.nombre,
        ...(datos.numeroDocumento ? { tipoDocumento: datos.tipoDocumento, numeroDocumento: datos.numeroDocumento } : {}),
        ...(datos.fechaNacimiento ? { fechaNacimiento: datos.fechaNacimiento } : {}),
      });
      await recargarPerfil();
      setPerfil((p) => (p ? { ...p, perfilCompleto: Boolean(datos.numeroDocumento) || p.perfilCompleto } : p));
      setMensajeDatos({ tipo: 'exito', texto: 'Datos guardados.' });
    } catch (err) {
      setMensajeDatos({ tipo: 'error', texto: mensajeDeError(err) });
    } finally {
      setCargando(null);
    }
  }

  async function cambiarClave(evento: FormEvent) {
    evento.preventDefault();
    setMensajeClave(null);
    if (claves.nueva !== claves.confirmacion) {
      setMensajeClave({ tipo: 'error', texto: 'Las contraseñas no coinciden' });
      return;
    }
    setCargando('clave');
    try {
      await authApi.cambiarClave(claves.nueva, perfil?.tienePassword ? claves.actual : undefined);
      setClaves({ actual: '', nueva: '', confirmacion: '' });
      setPerfil((p) => (p ? { ...p, tienePassword: true } : p));
      setMensajeClave({ tipo: 'exito', texto: 'Contraseña actualizada.' });
    } catch (err) {
      setMensajeClave({ tipo: 'error', texto: mensajeDeError(err) });
    } finally {
      setCargando(null);
    }
  }

  if (!perfil) {
    return <Pagina titulo="Mi cuenta">{mensajeDatos ? <Aviso tipo="error">{mensajeDatos.texto}</Aviso> : <Cargando />}</Pagina>;
  }

  return (
    <Pagina titulo="Mi cuenta" descripcion={perfil.email}>
      <Tarjeta titulo="Datos personales" icono={LuIdCard}>
        <form onSubmit={guardarDatos} noValidate className="flex flex-col gap-4">
          {!perfil.perfilCompleto && <Aviso tipo="info">Completa tu documento para que tu agencia pueda identificarte.</Aviso>}
          <Campo etiqueta="Nombre completo" value={datos.nombre} onChange={(e) => setDatos({ ...datos, nombre: e.target.value })} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Selector etiqueta="Tipo de documento" value={datos.tipoDocumento} onChange={(e) => setDatos({ ...datos, tipoDocumento: e.target.value as TipoDocumento })}>
              {TIPOS_DOCUMENTO.map((t) => (
                <option key={t.valor} value={t.valor}>
                  {t.texto}
                </option>
              ))}
            </Selector>
            <Campo etiqueta="Número de documento" value={datos.numeroDocumento} onChange={(e) => setDatos({ ...datos, numeroDocumento: e.target.value })} />
          </div>
          <Campo etiqueta="Fecha de nacimiento" type="date" value={datos.fechaNacimiento} onChange={(e) => setDatos({ ...datos, fechaNacimiento: e.target.value })} />
          {mensajeDatos && <Aviso tipo={mensajeDatos.tipo}>{mensajeDatos.texto}</Aviso>}
          <div className="flex justify-end">
            <Boton type="submit" icono={LuSave} cargando={cargando === 'datos'}>
              Guardar datos
            </Boton>
          </div>
        </form>
      </Tarjeta>

      <Tarjeta
        titulo={perfil.tienePassword ? 'Cambiar contraseña' : 'Crear una contraseña'}
        descripcion={perfil.tienePassword ? undefined : 'Entras con Google. Si creas una contraseña, también podrás entrar con tu correo.'}
        icono={LuKeyRound}
      >
        <form onSubmit={cambiarClave} noValidate className="flex flex-col gap-4">
          {perfil.tienePassword && (
            <CampoClave etiqueta="Contraseña actual" autoComplete="current-password" value={claves.actual} onChange={(e) => setClaves({ ...claves, actual: e.target.value })} />
          )}
          <CampoClave
            etiqueta="Contraseña nueva"
            autoComplete="new-password"
            ayuda={`Mínimo ${minimoClave(perfil.roles)} caracteres. Puedes usar una frase.`}
            value={claves.nueva}
            onChange={(e) => setClaves({ ...claves, nueva: e.target.value })}
          />
          <Campo etiqueta="Repite la contraseña" type="password" autoComplete="new-password" value={claves.confirmacion} onChange={(e) => setClaves({ ...claves, confirmacion: e.target.value })} />
          {mensajeClave && <Aviso tipo={mensajeClave.tipo}>{mensajeClave.texto}</Aviso>}
          <div className="flex justify-end">
            <Boton type="submit" icono={LuSave} cargando={cargando === 'clave'}>
              Guardar contraseña
            </Boton>
          </div>
        </form>
      </Tarjeta>
    </Pagina>
  );
}
