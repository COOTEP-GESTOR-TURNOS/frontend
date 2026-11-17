import { describe, expect, it } from 'vitest';
import { describirDetalle, horaColombia } from './auditoria';

describe('RF-20: lectura de la auditoría', () => {
  it('muestra la hora de Colombia aunque Cassandra guarde UTC', () => {
    expect(horaColombia('2026-11-17T00:02:26.000Z')).toBe('19:02:26');
  });

  it('resume el detalle: antes y después, o clave y valor', () => {
    expect(describirDetalle({ antes: '15:30', despues: '16:00' })).toBe('15:30 → 16:00');
    expect(describirDetalle({ rol: 'ADMIN_AGENCIA', amr: ['pwd', 'otp'] })).toBe('rol: ADMIN_AGENCIA · amr: ["pwd","otp"]');
    expect(describirDetalle({ rol: { rol: 'FUNCIONARIO', agenciaId: 'a1', servicioId: 's1' } })).toBe('rol: FUNCIONARIO');
    expect(describirDetalle(null)).toBe('');
    expect(
      describirDetalle({ fecha: '2026-11-20', automatico: true, cancelados: 3, retiradosDelMotor: 3, duracionMotorMs: 42, siguenEnAtencion: 1 }),
    ).toBe('3 cancelados · 1 en atención · motor 42 ms · automático');
  });
});
