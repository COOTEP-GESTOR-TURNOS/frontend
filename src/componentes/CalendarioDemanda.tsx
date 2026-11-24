import { type FormEvent, type ReactNode, useEffect, useRef, useState } from 'react';
import { LuCalendarCheck, LuCalendarDays, LuChevronLeft, LuChevronRight, LuLoaderCircle } from 'react-icons/lu';
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
import { useConfirmacion } from './Confirmacion';
import { Tarjeta } from './Tarjeta';

const SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const NIVEL: Record<NivelDemanda, string> = {
  BAJA: 'bg-exito/10 text-exito',
  MEDIA: 'bg-aviso/10 text-aviso',
  ALTA: 'bg-error/10 text-error',
};

type FormularioEvento = DatosEvento & { id?: string };
type Mensaje = { tipo: 'exito' | 'error'; texto: string };
interface Props {
  agenciaId: string;
  hoy: string;
  mes: string;
  datos: DatosCalendario | null;
  cambiarMes: (mes: string) => void;
  recargar: () => void;
  alcance?: string;
  /** Llegan los datos de otro mes: se sigue mostrando el anterior, atenuado, para no mover la página. */
  actualizando?: boolean;
}

/** El día que se detalla: el elegido si es de este mes; si no, hoy (en el mes actual) o el día 1. */
function diaVisible(datos: DatosCalendario | null, mes: string, hoy: string, fechaElegida: string): DiaDemanda | undefined {
  const fechaInicial = hoy.startsWith(mes) ? hoy : `${mes}-01`;
  const fecha = fechaElegida.startsWith(mes) ? fechaElegida : fechaInicial;
  return datos?.dias.find((d) => d.fecha === fecha);
}

export function CalendarioDemanda({ agenciaId, hoy, mes, datos, cambiarMes, recargar, alcance, actualizando = false }: Props) {
  const [dialogo, confirmar] = useConfirmacion();
  const [fechaElegida, setFechaElegida] = useState('');
  const [formulario, setFormulario] = useState<FormularioEvento | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<Mensaje | null>(null);
  const montado = useRef(false);

  useEffect(() => {
    montado.current = true;
    return () => { montado.current = false; };
  }, []);

  const dia = diaVisible(datos, mes, hoy, fechaElegida);

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

  function editar(evento: FormularioEvento) {
    setFormulario(evento);
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

  async function eliminar(evento: EventoAgencia) {
    if (!agenciaId || guardando) return;
    const nombre = TIPOS_EVENTO[evento.tipo].toLowerCase();
    const ok = await confirmar({
      titulo: `¿Eliminar ${nombre}?`,
      mensaje: `Se quitará ${nombre} del ${nombreFecha(evento.fecha)} y la estimación de demanda dejará de tenerlo en cuenta.`,
      confirmar: 'Sí, eliminar',
      peligro: true,
    });
    if (!ok) return;
    void cambiarEvento(() => demandaApi.eliminarEvento(agenciaId, evento.id), evento.fecha, 'Evento eliminado.');
  }

  return (
    <Tarjeta titulo="Demanda de turnos" descripcion={alcance || undefined} icono={LuCalendarDays} aria-busy={actualizando}>
      <div className="flex flex-col gap-4">
        <NavegacionMes mes={mes} mesActual={hoy.slice(0, 7)} actualizando={actualizando} guardando={guardando} irAMes={irAMes} />
        <AvisosCalendario mensaje={mensaje} estado={datos?.estadoPronostico} />
        {datos && (
          <CuadriculaMes
            datos={datos}
            mes={mes}
            hoy={hoy}
            seleccionada={dia?.fecha}
            guardando={guardando}
            actualizando={actualizando}
            elegirDia={elegirDia}
          />
        )}
        {dia && (
          <DetalleDia dia={dia} hoy={hoy} agenciaId={agenciaId} guardando={guardando} editar={editar} eliminar={(e) => void eliminar(e)}>
            <AccionDia
              formulario={formulario}
              puedeRegistrar={Boolean(agenciaId)}
              guardando={guardando}
              cambiar={setFormulario}
              guardar={guardar}
              cancelar={() => setFormulario(null)}
              registrar={() => editar({ fecha: dia.fecha, tipo: 'FESTIVO_LOCAL' })}
            />
          </DetalleDia>
        )}
      </div>
      {dialogo}
    </Tarjeta>
  );
}

/** El mes entre sus flechas; volver al mes actual va aparte y solo cuando hace falta. */
function NavegacionMes({ mes, mesActual, actualizando, guardando, irAMes }: {
  mes: string;
  mesActual: string;
  actualizando: boolean;
  guardando: boolean;
  irAMes: (mes: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <Boton variante="secundario" icono={LuChevronLeft} className="px-3" aria-label="Mes anterior" disabled={guardando} onClick={() => irAMes(mesDesplazado(mes, -1))} />
        <h4 className="min-w-40 text-center text-lg first-letter:uppercase" aria-live="polite">
          {nombreMes(mes)}
        </h4>
        <Boton variante="secundario" icono={LuChevronRight} className="px-3" aria-label="Mes siguiente" disabled={guardando} onClick={() => irAMes(mesDesplazado(mes, 1))} />
        {actualizando && <LuLoaderCircle role="status" aria-label="Cargando el mes" className="size-4 text-texto-secundario motion-safe:animate-spin" />}
      </div>
      {mes !== mesActual && (
        <Boton variante="fantasma" icono={LuCalendarCheck} disabled={guardando} onClick={() => irAMes(mesActual)}>
          Volver al mes actual
        </Boton>
      )}
    </div>
  );
}

function AvisosCalendario({ mensaje, estado }: { mensaje: Mensaje | null; estado?: DatosCalendario['estadoPronostico'] }) {
  return (
    <>
      {mensaje && <Aviso tipo={mensaje.tipo}>{mensaje.texto}</Aviso>}
      {estado === 'HISTORIAL_INSUFICIENTE' && <Aviso>Historial insuficiente para estimar la demanda.</Aviso>}
      {estado === 'INCOMPLETO' && <Aviso>Pronóstico incompleto. Faltan estimaciones de agencias hábiles.</Aviso>}
    </>
  );
}

function CuadriculaMes({ datos, mes, hoy, seleccionada, guardando, actualizando, elegirDia }: {
  datos: DatosCalendario;
  mes: string;
  hoy: string;
  seleccionada?: string;
  guardando: boolean;
  actualizando: boolean;
  elegirDia: (fecha: string) => void;
}) {
  return (
    <div className={`overflow-x-auto p-1 motion-safe:transition-opacity ${actualizando ? 'opacity-50' : ''}`}>
      <div className="grid min-w-[22rem] grid-cols-7 gap-1 sm:gap-2" role="group" aria-label={`Calendario de ${nombreMes(mes)}`}>
        {SEMANA.map((nombre) => <span key={nombre} className="text-center text-xs font-medium text-texto-secundario">{nombre}</span>)}
        {Array.from({ length: huecosDelMes(mes) }, (_, i) => <div key={`hueco-${i}`} aria-hidden />)}
        {datos.dias.map((item) => (
          <DiaCalendario key={item.fecha} dia={item} hoy={hoy} seleccionado={item.fecha === seleccionada} deshabilitado={guardando} seleccionar={() => elegirDia(item.fecha)} />
        ))}
      </div>
      <p className="mt-3 text-xs text-texto-secundario">Reg. indica turnos registrados y Est. indica turnos estimados. El punto señala días con festivos, vencimientos o eventos.</p>
    </div>
  );
}

/** Detalle del día elegido: resumen, marcas, eventos y (en `children`) el formulario o el botón de registrar. */
function DetalleDia({ dia, hoy, agenciaId, guardando, editar, eliminar, children }: {
  dia: DiaDemanda;
  hoy: string;
  agenciaId: string;
  guardando: boolean;
  editar: (evento: EventoAgencia) => void;
  eliminar: (evento: EventoAgencia) => void;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-borde bg-fondo p-4">
      <div>
        <h4 className="capitalize">{nombreFecha(dia.fecha)}</h4>
        <p className="mt-1 text-sm text-texto-secundario">{resumenDia(dia, hoy)}</p>
      </div>
      {marcasDia(dia).map((marca) => <span key={marca} className="text-sm text-texto">{marca}</span>)}
      {dia.eventos.length > 0 && (
        <ul className="divide-y divide-borde border-y border-borde" aria-label="Eventos registrados">
          {dia.eventos.map((evento) => (
            <FilaEvento key={`${evento.agenciaId ?? agenciaId}/${evento.id}`} evento={evento} agenciaId={agenciaId} guardando={guardando} editar={editar} eliminar={eliminar} />
          ))}
        </ul>
      )}
      {children}
    </div>
  );
}

function FilaEvento({ evento, agenciaId, guardando, editar, eliminar }: {
  evento: EventoAgencia;
  agenciaId: string;
  guardando: boolean;
  editar: (evento: EventoAgencia) => void;
  eliminar: (evento: EventoAgencia) => void;
}) {
  const nombre = TIPOS_EVENTO[evento.tipo];
  return (
    <li className="flex flex-wrap items-center justify-between gap-x-3 py-1 text-sm">
      <span>{nombre}{evento.agenciaNombre && ` · ${evento.agenciaNombre}`}</span>
      {agenciaId && <div className="flex gap-1">
        <Boton variante="fantasma" aria-label={`Editar ${nombre.toLowerCase()}`} disabled={guardando} onClick={() => editar(evento)}>Editar</Boton>
        <Boton variante="fantasma" aria-label={`Eliminar ${nombre.toLowerCase()}`} disabled={guardando} onClick={() => eliminar(evento)}>Eliminar</Boton>
      </div>}
    </li>
  );
}

/** Bajo el detalle del día: el formulario del evento, o el botón para registrar uno. */
function AccionDia({ formulario, puedeRegistrar, guardando, cambiar, guardar, cancelar, registrar }: {
  formulario: FormularioEvento | null;
  puedeRegistrar: boolean;
  guardando: boolean;
  cambiar: (formulario: FormularioEvento) => void;
  guardar: (evento: FormEvent<HTMLFormElement>) => void;
  cancelar: () => void;
  registrar: () => void;
}) {
  if (formulario) return <FormularioDeEvento formulario={formulario} guardando={guardando} cambiar={cambiar} guardar={guardar} cancelar={cancelar} />;
  if (!puedeRegistrar) return null;
  return (
    <Boton variante="secundario" className="self-start" disabled={guardando} onClick={registrar}>
      Registrar evento
    </Boton>
  );
}

function FormularioDeEvento({ formulario, guardando, cambiar, guardar, cancelar }: {
  formulario: FormularioEvento;
  guardando: boolean;
  cambiar: (formulario: FormularioEvento) => void;
  guardar: (evento: FormEvent<HTMLFormElement>) => void;
  cancelar: () => void;
}) {
  return (
    <form onSubmit={guardar} className="flex flex-col gap-3" aria-label={formulario.id ? 'Editar evento' : 'Nuevo evento'}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo etiqueta="Fecha del evento" type="date" required value={formulario.fecha} disabled={guardando} onChange={(e) => cambiar({ ...formulario, fecha: e.target.value })} />
        <Selector etiqueta="Tipo de evento" value={formulario.tipo} disabled={guardando} onChange={(e) => cambiar({ ...formulario, tipo: e.target.value as TipoEvento })}>
          {Object.entries(TIPOS_EVENTO).map(([valor, texto]) => <option key={valor} value={valor}>{texto}</option>)}
        </Selector>
      </div>
      <div className="flex flex-wrap gap-2">
        <Boton type="submit" cargando={guardando}>Guardar evento</Boton>
        <Boton variante="fantasma" disabled={guardando} onClick={cancelar}>Cancelar</Boton>
      </div>
    </form>
  );
}

/** El punto del día: festivos, vencimientos o eventos. */
function tieneMarca(dia: DiaDemanda): boolean {
  return Boolean(dia.festivoNacional) || dia.festivosPutumayo.length > 0 || dia.vencimientoCredito || dia.eventos.length > 0;
}

function claseDia(seleccionado: boolean, noHabil: boolean): string {
  if (seleccionado) return 'border-primario bg-primario-suave';
  return `border-borde ${noHabil ? 'bg-fondo' : 'bg-superficie'}`;
}

function DiaCalendario({ dia, hoy, seleccionado, deshabilitado, seleccionar }: {
  dia: DiaDemanda;
  hoy: string;
  seleccionado: boolean;
  deshabilitado: boolean;
  seleccionar: () => void;
}) {
  const eventos = dia.eventos.map((evento) => [TIPOS_EVENTO[evento.tipo], evento.agenciaNombre].filter(Boolean).join(' · '));
  const noHabil = dia.diaHabil === false;
  const etiqueta = [nombreFecha(dia.fecha), resumenDia(dia, hoy), ...marcasDia(dia), ...eventos].join(', ');
  return (
    <button
      type="button"
      aria-label={etiqueta}
      aria-pressed={seleccionado}
      aria-current={dia.fecha === hoy ? 'date' : undefined}
      disabled={deshabilitado}
      onClick={seleccionar}
      className={`flex min-h-18 min-w-0 flex-col items-start gap-1 rounded-md border p-1.5 text-left hover:border-primario sm:p-2 ${claseDia(seleccionado, noHabil)}`}
    >
      <span className="flex w-full items-center justify-between gap-1 text-xs font-semibold">
        {Number(dia.fecha.slice(-2))}
        {tieneMarca(dia) && <span aria-hidden className="size-1.5 rounded-full bg-info" />}
      </span>
      {dia.turnosRegistrados !== null && <span className="text-xs text-texto-secundario"><strong className="text-texto">{dia.turnosRegistrados}</strong> reg.</span>}
      {noHabil ? <span className="text-xs text-texto-secundario">Día no hábil</span> : <EstimacionDia dia={dia} />}
    </button>
  );
}

function EstimacionDia({ dia }: { dia: DiaDemanda }) {
  return (
    <>
      {dia.turnosEstimados !== null && <span className="text-xs font-semibold">{dia.turnosEstimados} <span className="font-normal">est.</span></span>}
      {dia.nivelDemanda && <span className={`rounded px-1 text-xs ${NIVEL[dia.nivelDemanda]}`}>{nombreNivel(dia.nivelDemanda)}</span>}
    </>
  );
}
