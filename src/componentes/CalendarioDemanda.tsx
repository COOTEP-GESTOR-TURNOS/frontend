import { type FormEvent, useEffect, useRef, useState } from 'react';
import { LuCalendarDays, LuChevronLeft, LuChevronRight } from 'react-icons/lu';
import {
  type CalendarioDemanda as DatosCalendario,
  type DatosEvento,
  type DiaDemanda,
  type EventoAgencia,
  type NivelDemanda,
  type TipoEvento,
  demandaApi,
  huecosDelMes,
  marcasDia,
  mesDesplazado,
  nombreFecha,
  nombreMes,
  nombreNivel,
  resumenDia,
  TIPOS_EVENTO,
} from '../api/demanda';
import { mensajeDeError } from '../api/http';
import { Aviso } from './Aviso';
import { Boton } from './Boton';
import { Campo, Selector } from './Campo';
import { Tarjeta } from './Tarjeta';

const SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const NIVEL: Record<NivelDemanda, string> = {
  BAJA: 'bg-exito/10 text-exito',
  MEDIA: 'bg-aviso/10 text-aviso',
  ALTA: 'bg-error/10 text-error',
};

type FormularioEvento = DatosEvento & { id?: string };
interface Props {
  agenciaId: string;
  hoy: string;
  mes: string;
  datos: DatosCalendario | null;
  cambiarMes: (mes: string) => void;
  recargar: () => void;
  alcance?: string;
}

export function CalendarioDemanda({ agenciaId, hoy, mes, datos, cambiarMes, recargar, alcance }: Props) {
  const [fechaElegida, setFechaElegida] = useState('');
  const [formulario, setFormulario] = useState<FormularioEvento | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);
  const montado = useRef(false);

  useEffect(() => {
    montado.current = true;
    return () => { montado.current = false; };
  }, []);

  const fechaInicial = hoy.startsWith(mes) ? hoy : `${mes}-01`;
  const dia = datos?.dias.find((d) => d.fecha === (fechaElegida.startsWith(mes) ? fechaElegida : fechaInicial));

  function irAMes(nuevoMes: string) {
    setFechaElegida('');
    setFormulario(null);
    setMensaje(null);
    cambiarMes(nuevoMes);
  }

  function elegirDia(fecha: string) {
    setFechaElegida(fecha);
    setFormulario(null);
    setMensaje(null);
  }

  async function cambiarEvento(operacion: () => Promise<unknown>, fecha: string, exito: string) {
    setGuardando(true);
    setMensaje(null);
    try {
      await operacion();
      if (!montado.current) return;
      setFormulario(null);
      setFechaElegida(fecha);
      cambiarMes(fecha.slice(0, 7));
      recargar();
      setMensaje({ tipo: 'exito', texto: exito });
    } catch (error) {
      if (montado.current) setMensaje({ tipo: 'error', texto: mensajeDeError(error, 'No se pudo guardar el cambio del evento') });
    } finally {
      if (montado.current) setGuardando(false);
    }
  }

  function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!formulario || guardando || !agenciaId) return;
    const { id, fecha, tipo } = formulario;
    const operacion = id
      ? () => demandaApi.editarEvento(agenciaId, id, { fecha, tipo })
      : () => demandaApi.crearEvento(agenciaId, { fecha, tipo });
    void cambiarEvento(operacion, fecha, id ? 'Evento actualizado.' : 'Evento registrado.');
  }

  function eliminar(evento: EventoAgencia) {
    if (!agenciaId || guardando) return;
    if (!window.confirm(`¿Eliminar ${TIPOS_EVENTO[evento.tipo].toLowerCase()} del ${evento.fecha}?`)) return;
    void cambiarEvento(() => demandaApi.eliminarEvento(agenciaId, evento.id), evento.fecha, 'Evento eliminado.');
  }

  return (
    <Tarjeta titulo="Demanda de turnos" descripcion={alcance || undefined} icono={LuCalendarDays}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="capitalize" aria-live="polite">{nombreMes(mes)}</h4>
        <div className="flex gap-2">
          <Boton variante="secundario" icono={LuChevronLeft} className="px-3" aria-label="Mes anterior" disabled={guardando} onClick={() => irAMes(mesDesplazado(mes, -1))} />
          <Boton variante="secundario" disabled={guardando} onClick={() => irAMes(hoy.slice(0, 7))}>Hoy</Boton>
          <Boton variante="secundario" icono={LuChevronRight} className="px-3" aria-label="Mes siguiente" disabled={guardando} onClick={() => irAMes(mesDesplazado(mes, 1))} />
        </div>
      </div>
      {mensaje && <Aviso tipo={mensaje.tipo}>{mensaje.texto}</Aviso>}
      {datos?.estadoPronostico === 'HISTORIAL_INSUFICIENTE' && <Aviso>Historial insuficiente para estimar la demanda.</Aviso>}
      {datos?.estadoPronostico === 'INCOMPLETO' && <Aviso>Pronóstico incompleto. Faltan estimaciones de agencias hábiles.</Aviso>}
      {datos && (
        <div className="overflow-x-auto p-1">
          <div className="grid min-w-[22rem] grid-cols-7 gap-1 sm:gap-2" role="group" aria-label={`Calendario de ${nombreMes(mes)}`}>
            {SEMANA.map((nombre) => <span key={nombre} className="text-center text-xs font-medium text-texto-secundario">{nombre}</span>)}
            {Array.from({ length: huecosDelMes(mes) }, (_, i) => <div key={`hueco-${i}`} aria-hidden />)}
            {datos.dias.map((item) => (
              <DiaCalendario key={item.fecha} dia={item} hoy={hoy} seleccionado={item.fecha === dia?.fecha} deshabilitado={guardando} seleccionar={() => elegirDia(item.fecha)} />
            ))}
          </div>
          <p className="mt-3 text-xs text-texto-secundario">Reg. indica turnos registrados y Est. indica turnos estimados. El punto señala días con festivos, vencimientos o eventos.</p>
        </div>
      )}
      {dia && (
        <div className="flex flex-col gap-3 rounded-lg border border-borde bg-fondo p-4">
          <div>
            <h4 className="capitalize">{nombreFecha(dia.fecha)}</h4>
            <p className="mt-1 text-sm text-texto-secundario">{resumenDia(dia, hoy)}</p>
          </div>
          {marcasDia(dia).map((marca) => <span key={marca} className="text-sm text-texto">{marca}</span>)}
          {dia.eventos.length > 0 && (
            <ul className="divide-y divide-borde border-y border-borde" aria-label="Eventos registrados">
              {dia.eventos.map((evento) => (
                <li key={`${evento.agenciaId ?? agenciaId}/${evento.id}`} className="flex flex-wrap items-center justify-between gap-x-3 py-1 text-sm">
                  <span>{TIPOS_EVENTO[evento.tipo]}{evento.agenciaNombre && ` · ${evento.agenciaNombre}`}</span>
                  {agenciaId && <div className="flex gap-1">
                    <Boton variante="fantasma" aria-label={`Editar ${TIPOS_EVENTO[evento.tipo].toLowerCase()}`} disabled={guardando} onClick={() => { setFormulario(evento); setMensaje(null); }}>Editar</Boton>
                    <Boton variante="fantasma" aria-label={`Eliminar ${TIPOS_EVENTO[evento.tipo].toLowerCase()}`} disabled={guardando} onClick={() => eliminar(evento)}>Eliminar</Boton>
                  </div>}
                </li>
              ))}
            </ul>
          )}
          {formulario ? (
            <form onSubmit={guardar} className="flex flex-col gap-3" aria-label={formulario.id ? 'Editar evento' : 'Nuevo evento'}>
              <div className="grid gap-3 sm:grid-cols-2">
                <Campo etiqueta="Fecha del evento" type="date" required value={formulario.fecha} disabled={guardando} onChange={(e) => setFormulario({ ...formulario, fecha: e.target.value })} />
                <Selector etiqueta="Tipo de evento" value={formulario.tipo} disabled={guardando} onChange={(e) => setFormulario({ ...formulario, tipo: e.target.value as TipoEvento })}>
                  {Object.entries(TIPOS_EVENTO).map(([valor, texto]) => <option key={valor} value={valor}>{texto}</option>)}
                </Selector>
              </div>
              <div className="flex flex-wrap gap-2">
                <Boton type="submit" cargando={guardando}>Guardar evento</Boton>
                <Boton variante="fantasma" disabled={guardando} onClick={() => setFormulario(null)}>Cancelar</Boton>
              </div>
            </form>
          ) : agenciaId && (
            <Boton variante="secundario" className="self-start" disabled={guardando} onClick={() => { setFormulario({ fecha: dia.fecha, tipo: 'FESTIVO_LOCAL' }); setMensaje(null); }}>
              Registrar evento
            </Boton>
          )}
        </div>
      )}
    </Tarjeta>
  );
}

function DiaCalendario({ dia, hoy, seleccionado, deshabilitado, seleccionar }: {
  dia: DiaDemanda;
  hoy: string;
  seleccionado: boolean;
  deshabilitado: boolean;
  seleccionar: () => void;
}) {
  const marcas = marcasDia(dia);
  const eventos = dia.eventos.map((evento) => [TIPOS_EVENTO[evento.tipo], evento.agenciaNombre].filter(Boolean).join(' · '));
  const hayMarca = dia.festivoNacional || dia.festivosPutumayo.length > 0 || dia.vencimientoCredito || eventos.length > 0;
  const noHabil = dia.diaHabil === false;
  const etiqueta = [nombreFecha(dia.fecha), resumenDia(dia, hoy), ...marcas, ...eventos].join(', ');
  return (
    <button
      type="button"
      aria-label={etiqueta}
      aria-pressed={seleccionado}
      aria-current={dia.fecha === hoy ? 'date' : undefined}
      disabled={deshabilitado}
      onClick={seleccionar}
      className={`flex min-h-18 min-w-0 flex-col items-start gap-1 rounded-md border p-1.5 text-left hover:border-primario sm:p-2 ${
        seleccionado ? 'border-primario bg-primario-suave' : `border-borde ${noHabil ? 'bg-fondo' : 'bg-superficie'}`
      }`}
    >
      <span className="flex w-full items-center justify-between gap-1 text-xs font-semibold">
        {Number(dia.fecha.slice(-2))}
        {hayMarca && <span aria-hidden className="size-1.5 rounded-full bg-info" />}
      </span>
      {dia.turnosRegistrados !== null && <span className="text-xs text-texto-secundario"><strong className="text-texto">{dia.turnosRegistrados}</strong> reg.</span>}
      {noHabil && <span className="text-xs text-texto-secundario">Día no hábil</span>}
      {!noHabil && dia.turnosEstimados !== null && <span className="text-xs font-semibold">{dia.turnosEstimados} <span className="font-normal">est.</span></span>}
      {!noHabil && dia.nivelDemanda && <span className={`rounded px-1 text-xs ${NIVEL[dia.nivelDemanda]}`}>{nombreNivel(dia.nivelDemanda)}</span>}
    </button>
  );
}
