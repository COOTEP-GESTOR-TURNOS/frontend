import { afterEach, describe, expect, it, vi } from 'vitest';
import { type DiaDemanda, demandaApi, huecosDelMes, marcasDia, mesDesplazado, resumenDia } from './demanda';
import { filtrosAnaliticaApi, rangoDelMes } from './filtrosAnalitica';
import { indicadoresApi } from './indicadores';

const DIA: DiaDemanda = {
  fecha: '2026-11-05', diaHabil: true, finDeSemana: false, festivoNacional: null, festivosPutumayo: [],
  vencimientoCredito: true, eventos: [], turnosRegistrados: null, turnosEstimados: null, nivelDemanda: null,
};

afterEach(() => { vi.unstubAllGlobals(); });

describe('Calendario de demanda', () => {
  it('conserva las fechas civiles al ordenar las semanas y cambiar de año', () => {
    expect(huecosDelMes('2026-11')).toBe(6);
    expect(mesDesplazado('2026-12', 1)).toBe('2027-01');
    expect(mesDesplazado('2027-01', -1)).toBe('2026-12');
  });

  it('distingue el cero observado, la historia ausente y la estimación', () => {
    expect(resumenDia({ ...DIA, turnosRegistrados: 0 }, '2026-11-06')).toBe('0 turnos registrados');
    expect(resumenDia(DIA, '2026-11-06')).toBe('Sin historial');
    expect(resumenDia(DIA, DIA.fecha)).toBe('Sin pronóstico');
    expect(resumenDia({ ...DIA, turnosEstimados: 42, nivelDemanda: 'ALTA' }, DIA.fecha)).toBe('42 turnos estimados · Demanda alta');
    expect(resumenDia({ ...DIA, turnosRegistrados: 3, turnosEstimados: 42 }, DIA.fecha)).toBe('3 turnos registrados · 42 turnos estimados');
  });

  it('muestra el cierre sin estimaciones y mantiene el registro histórico', () => {
    expect(resumenDia({ ...DIA, diaHabil: false }, DIA.fecha)).toBe('Día no hábil');
    expect(resumenDia({ ...DIA, diaHabil: false, turnosRegistrados: 8, turnosEstimados: 0, nivelDemanda: 'BAJA' }, '2026-11-06'))
      .toBe('Día no hábil · 8 turnos registrados');
  });

  it('muestra las marcas que coinciden en un mismo día, incluidas las de Putumayo', () => {
    const dia = { ...DIA, finDeSemana: true, festivoNacional: 'Año Nuevo', festivosPutumayo: ['Conmemoración departamental'] };
    expect(marcasDia(dia)).toEqual([
      'Fin de semana', 'Festivo nacional · Año Nuevo', 'Día cívico de Putumayo · Conmemoración departamental', 'Vencimiento de crédito',
    ]);
  });

  it('consulta por mes y envía los cambios de los eventos a la agencia', async () => {
    const fetch = vi.fn(() => Promise.resolve(new Response(null, { status: 204 })));
    vi.stubGlobal('fetch', fetch);
    const evento = { fecha: DIA.fecha, tipo: 'PAGO_NOMINA' as const };
    await demandaApi.consultar('agencia-1', '2026-11');
    await demandaApi.crearEvento('agencia-1', evento);
    await demandaApi.editarEvento('agencia-1', 'evento-1', evento);
    await demandaApi.eliminarEvento('agencia-1', 'evento-1');
    const prefijo = '/api/v1/analitica/agencias/agencia-1';
    expect(fetch).toHaveBeenNthCalledWith(1, `${prefijo}/demanda?mes=2026-11`, expect.objectContaining({ method: 'GET' }));
    expect(fetch).toHaveBeenNthCalledWith(2, `${prefijo}/eventos`, expect.objectContaining({ method: 'POST', body: JSON.stringify(evento) }));
    expect(fetch).toHaveBeenNthCalledWith(3, `${prefijo}/eventos/evento-1`, expect.objectContaining({ method: 'PATCH', body: JSON.stringify(evento) }));
    expect(fetch).toHaveBeenNthCalledWith(4, `${prefijo}/eventos/evento-1`, expect.objectContaining({ method: 'DELETE' }));
  });

  it('usa la misma consulta para el calendario, el resumen y el comparativo por ámbito', async () => {
    const fetch = vi.fn(() => Promise.resolve(new Response(null, { status: 204 })));
    vi.stubGlobal('fetch', fetch);
    await demandaApi.tablero('2026-11', '');
    await demandaApi.tablero('2026-11', 'agencia-1');
    expect(fetch).toHaveBeenNthCalledWith(1, '/api/v1/analitica/tablero?mes=2026-11', expect.objectContaining({ method: 'GET' }));
    expect(fetch).toHaveBeenNthCalledWith(2, '/api/v1/analitica/tablero?mes=2026-11&agenciaId=agencia-1', expect.objectContaining({ method: 'GET' }));
  });

  it('aplica los filtros combinados a los indicadores y pide opciones para el mismo periodo', async () => {
    const fetch = vi.fn(() => Promise.resolve(new Response(null, { status: 204 })));
    vi.stubGlobal('fetch', fetch);
    const rango = rangoDelMes('2028-02');
    const filtros = { servicioId: 'servicio-1', colaboradorId: 'persona-1' };
    await demandaApi.tablero('2028-02', '', filtros);
    await indicadoresApi.consultar({ ...rango, agenciaId: 'agencia-1', ...filtros });
    await filtrosAnaliticaApi.consultar({ ...rango, agenciaId: 'agencia-1', servicioId: filtros.servicioId });
    expect(fetch).toHaveBeenNthCalledWith(1, '/api/v1/analitica/tablero?mes=2028-02&servicioId=servicio-1&colaboradorId=persona-1', expect.objectContaining({ method: 'GET' }));
    expect(fetch).toHaveBeenNthCalledWith(2, '/api/v1/indicadores?desde=2028-02-01&hasta=2028-02-29&agenciaId=agencia-1&servicioId=servicio-1&colaboradorId=persona-1', expect.objectContaining({ method: 'GET' }));
    expect(fetch).toHaveBeenNthCalledWith(3, '/api/v1/analitica/filtros?desde=2028-02-01&hasta=2028-02-29&agenciaId=agencia-1&servicioId=servicio-1', expect.objectContaining({ method: 'GET' }));
  });
});
