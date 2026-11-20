import { LuArrowLeft, LuShieldAlert } from 'react-icons/lu';
import { Link } from 'react-router';
import { PantallaAcceso } from '../componentes/Pagina';

export function NoAutorizado() {
  return (
    <PantallaAcceso
      titulo="No tienes permiso para ver esta página"
      descripcion="Tu rol no incluye esta sección. Si crees que es un error, consulta con el administrador de tu agencia."
      icono={LuShieldAlert}
    >
      <Link to="/ingresar" className="enlace flex items-center justify-center gap-1.5 text-sm">
        <LuArrowLeft aria-hidden className="size-4" />
        Volver a ingresar
      </Link>
    </PantallaAcceso>
  );
}
