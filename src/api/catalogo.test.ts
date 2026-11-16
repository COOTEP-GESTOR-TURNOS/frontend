import { describe, expect, it } from 'vitest';
import { type AgenciaCatalogo, agenciasAbiertas, describirFila, etiquetaAgencia, servicioParaAgencia, serviciosDe } from './catalogo';

const servicio = (id: string, nombre: string) => ({ id, codigo: id.toUpperCase(), nombre, prefijo: id[0].toUpperCase(), ventanillas: 1 });

const AGENCIAS: AgenciaCatalogo[] = [
  { id: 'mocoa', codigo: 'AG01', nombre: 'Agencia Mocoa', municipio: 'Mocoa', activa: true, servicios: [servicio('caja', 'Caja'), servicio('cred', 'Créditos')] },
  { id: 'orito', codigo: 'AG03', nombre: 'Agencia Orito', municipio: 'Orito', activa: true, servicios: [servicio('cred', 'Créditos')] },
  { id: 'cerrada', codigo: 'AG09', nombre: 'Agencia Cerrada', municipio: 'Mocoa', activa: false, servicios: [servicio('caja', 'Caja')] },
  { id: 'vacia', codigo: 'AG10', nombre: 'Agencia Vacía', municipio: 'Mocoa', activa: true, servicios: [] },
];

describe('RF-06: catálogo real de agencias y servicios', () => {
  it('solo ofrece agencias activas que tienen algún servicio', () => {
    expect(agenciasAbiertas(AGENCIAS).map((a) => a.id)).toEqual(['mocoa', 'orito']);
  });

  it('los servicios salen de la agencia elegida', () => {
    expect(serviciosDe(AGENCIAS, 'orito').map((s) => s.id)).toEqual(['cred']);
    expect(serviciosDe(AGENCIAS, 'no-existe')).toEqual([]);
  });

  it('al cambiar de agencia conserva el servicio si lo ofrece; si no, toma el primero', () => {
    expect(servicioParaAgencia(AGENCIAS, 'orito', 'cred')).toBe('cred');
    expect(servicioParaAgencia(AGENCIAS, 'orito', 'caja')).toBe('cred');
    expect(servicioParaAgencia(AGENCIAS, 'mocoa', undefined)).toBe('caja');
    expect(servicioParaAgencia(AGENCIAS, 'vacia', 'caja')).toBeUndefined();
  });

  it('no repite el municipio cuando ya está en el nombre', () => {
    expect(etiquetaAgencia({ nombre: 'Agencia Mocoa', municipio: 'Mocoa' })).toBe('Agencia Mocoa');
    expect(etiquetaAgencia({ nombre: 'Agencia La Hormiga', municipio: 'Valle del Guamuez' })).toBe('Agencia La Hormiga (Valle del Guamuez)');
  });

  it('describe dónde está un turno', () => {
    expect(describirFila(AGENCIAS, 'mocoa', 'cred')).toBe('Créditos · Agencia Mocoa');
    expect(describirFila(AGENCIAS, 'orito', 'caja')).toBeUndefined();
  });
});
