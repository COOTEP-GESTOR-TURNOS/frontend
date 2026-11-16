import { describe, expect, it } from 'vitest';
import { fechaColombia, textoEspera } from './recomendaciones';

describe('RF-10: mejor hora para ir', () => {
  it('hoy y mañana se calculan con la fecha de Colombia, no con la de UTC', () => {
    const noche = new Date('2026-11-17T04:30:00Z'); // 23:30 del 16 de noviembre en Colombia
    expect(fechaColombia(0, noche)).toBe('2026-11-16');
    expect(fechaColombia(1, noche)).toBe('2026-11-17');
  });

  it('la espera se muestra redondeada y sin prometer exactitud', () => {
    expect(textoEspera(0.4)).toBe('menos de 1 min de espera');
    expect(textoEspera(3.1)).toBe('unos 3 min de espera');
  });
});
