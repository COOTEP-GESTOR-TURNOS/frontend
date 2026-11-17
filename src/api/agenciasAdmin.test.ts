import { describe, expect, it } from 'vitest';
import { errorDeValor, resumenCierre } from './agenciasAdmin';

describe('RN-13: resultado del cierre de la jornada', () => {
  it('cuenta los cancelados y los que siguen en atención', () => {
    expect(resumenCierre({ cancelados: 3, siguenEnAtencion: 1 })).toBe(
      'Jornada cerrada. 3 turnos en espera se cancelaron y cada asociado recibió el aviso. 1 turno ya llamado sigue en atención.',
    );
    expect(resumenCierre({ cancelados: 1, siguenEnAtencion: 0 })).toBe('Jornada cerrada. 1 turno en espera se canceló y cada asociado recibió el aviso.');
    expect(resumenCierre({ cancelados: 0, siguenEnAtencion: 0 })).toBe('Jornada cerrada. No había turnos en espera.');
  });
});

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
