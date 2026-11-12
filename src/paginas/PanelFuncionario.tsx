import { useCallback, useEffect, useState } from 'react';
import { AGENCIAS, SERVICIOS } from '../api/catalogo-demo';
import { ErrorApi } from '../api/http';
import { Turno, turnosApi } from '../api/turnos';
import { useSesion } from '../auth/sesion';
import { Boton } from '../componentes/Boton';
import { TarjetaTurno } from '../componentes/TarjetaTurno';

/** CU-04: llamar, atender, verificar la atención preferencial y marcar ausencias. Atajo: tecla N. */
export function PanelFuncionario() {
  const { usuario } = useSesion();
  const ambito = usuario?.roles.find((r) => r.rol === 'FUNCIONARIO' || r.rol === 'ADMIN_AGENCIA');
  const agenciaId = ambito?.agenciaId ?? '';
  const agencia = AGENCIAS.find((a) => a.id === agenciaId)?.nombre ?? 'Agencia sin asignar';
  const [servicioId, setServicioId] = useState(ambito?.servicioId ?? SERVICIOS[0].id);
  const [actual, setActual] = useState<Turno | null>(null);
  const [accion, setAccion] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const ejecutar = useCallback(async (nombre: string, operacion: () => Promise<Turno | null>) => {
    setAccion(nombre);
    setMensaje(null);
    try {
      const resultado = await operacion();
      if (nombre === 'llamar' && !resultado) setMensaje('No hay turnos en espera.');
      setActual(resultado);
    } catch (err) {
      setMensaje(err instanceof ErrorApi ? err.problema.detail ?? err.message : 'No se pudo completar la acción');
    } finally {
      setAccion(null);
    }
  }, []);

  const llamar = useCallback(
    () => ejecutar('llamar', () => turnosApi.llamarSiguiente(agenciaId, servicioId)),
    [ejecutar, agenciaId, servicioId],
  );

  useEffect(() => {
    function alPresionar(evento: KeyboardEvent) {
      const escribiendo = evento.target instanceof HTMLInputElement || evento.target instanceof HTMLSelectElement;
      if (!escribiendo && evento.key.toLowerCase() === 'n' && !accion) void llamar();
    }
    document.addEventListener('keydown', alPresionar);
    return () => document.removeEventListener('keydown', alPresionar);
  }, [llamar, accion]);

  return (
    <main id="contenido">
      <section className="tarjeta">
        <h2>{agencia}</h2>
        <div className="campo">
          <label htmlFor="servicio">Fila que atiendo</label>
          <select id="servicio" value={servicioId} onChange={(e) => setServicioId(e.target.value)} disabled={Boolean(ambito?.servicioId)}>
            {SERVICIOS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </select>
        </div>
        <Boton cargando={accion === 'llamar'} onClick={() => void llamar()} aria-keyshortcuts="N">
          Llamar siguiente (N)
        </Boton>
        {mensaje && (
          <p role="status" className="texto-secundario">
            {mensaje}
          </p>
        )}
      </section>

      {actual && (
        <>
          <TarjetaTurno turno={actual} titulo="Turno en ventanilla" />
          <div className="acciones">
            {actual.estado === 'LLAMADO' && actual.tipoAtencion === 'PREFERENCIAL' && (
              <>
                <Boton variante="secundario" cargando={accion === 'verificar-si'} onClick={() => void ejecutar('verificar-si', () => turnosApi.verificarPreferencial(actual.id, true))}>
                  Preferencial verificado
                </Boton>
                <Boton variante="peligro" cargando={accion === 'verificar-no'} onClick={() => void ejecutar('verificar-no', () => turnosApi.verificarPreferencial(actual.id, false))}>
                  No aplica: pasa a la fila general
                </Boton>
              </>
            )}
            {actual.estado === 'LLAMADO' && (
              <>
                <Boton cargando={accion === 'iniciar'} onClick={() => void ejecutar('iniciar', () => turnosApi.atender(actual.id, 'iniciar'))}>
                  Iniciar atención
                </Boton>
                <Boton variante="peligro" cargando={accion === 'ausente'} onClick={() => void ejecutar('ausente', () => turnosApi.atender(actual.id, 'ausente'))}>
                  Marcar ausente
                </Boton>
              </>
            )}
            {actual.estado === 'EN_ATENCION' && (
              <Boton cargando={accion === 'finalizar'} onClick={() => void ejecutar('finalizar', () => turnosApi.atender(actual.id, 'finalizar'))}>
                Finalizar atención
              </Boton>
            )}
          </div>
        </>
      )}
    </main>
  );
}
