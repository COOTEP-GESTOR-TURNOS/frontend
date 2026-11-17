import { describe, expect, it } from 'vitest';
import { errorDeValor } from './agenciasAdmin';

describe('RF-17: validación de reglas antes de enviar', () => {
  it('horas en punto o y media', () => {
    const hora = { tipo: 'hora' as const, nombre: 'Cierre' };
    expect(errorDeValor(hora, '16:30')).toBeNull();
    expect(errorDeValor(hora, '16:15')).toMatch(/en punto o y media/);
  });

  it('enteros dentro del rango del parámetro', () => {
    const k = { tipo: 'entero' as const, nombre: 'K', min: 1, max: 10 };
    expect(errorDeValor(k, '3')).toBeNull();
    expect(errorDeValor(k, '0')).toMatch(/entre 1 y 10/);
    expect(errorDeValor(k, '2.5')).toMatch(/entero/);
  });
});
