import { describe, expect, it } from 'vitest';
import { porcentaje, totalTurnos, ultimosDias } from './indicadores';

describe('RF-19: tablero de indicadores', () => {
  it('los últimos 30 días incluyen hoy y usan la fecha de Colombia', () => {
    expect(ultimosDias(30, new Date('2026-11-17T04:30:00Z'))).toEqual({ desde: '2026-10-18', hasta: '2026-11-16' });
    expect(ultimosDias(1, new Date('2026-11-16T15:00:00Z'))).toEqual({ desde: '2026-11-16', hasta: '2026-11-16' });
  });

  it('porcentajes y totales sin dividir por cero', () => {
    const v = { atendidos: 80, cancelados: 5, ausentes: 15, esperaPromedioMin: 8, atencionPromedioMin: 5, proporcionPreferencial: 0.18 };
    expect(totalTurnos(v)).toBe(100);
    expect(porcentaje(v.ausentes, totalTurnos(v))).toBe('15 %');
    expect(porcentaje(v.proporcionPreferencial, 1)).toBe('18 %');
    expect(porcentaje(3, 0)).toBe('0 %');
  });
});
