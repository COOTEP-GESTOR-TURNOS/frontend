import { Link } from 'react-router';

export function NoAutorizado() {
  return (
    <main id="contenido">
      <section className="tarjeta">
        <h2>No tienes permiso para ver esta página</h2>
        <p>Tu rol no incluye esta sección. Si crees que es un error, consulta con el administrador de tu agencia.</p>
        <Link to="/ingresar">Volver a ingresar</Link>
      </section>
    </main>
  );
}
