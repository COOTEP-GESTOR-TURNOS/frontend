import { describe, expect, it } from 'vitest';
import { avisoDeCambio } from './turnos';

describe('S1-06: aviso al asociado cuando su turno cambia solo', () => {
  it('explica por qué quedó ausente', () => {
    expect(avisoDeCambio({ estado: 'AUSENTE', codigo: 'C-014', motivo: 'SIN_CONFIRMAR' })).toMatch(/C-014 quedó ausente porque no confirmaste a tiempo/);
    expect(avisoDeCambio({ estado: 'AUSENTE', codigo: 'C-014', motivo: 'NO_SE_PRESENTO' })).toMatch(/no te presentaste/);
  });

  it('avisa cuando queda próximo o lo llaman, y calla en los demás estados', () => {
    expect(avisoDeCambio({ estado: 'PROXIMO', codigo: 'C-014' })).toMatch(/Confirma que vas/);
    expect(avisoDeCambio({ estado: 'LLAMADO', codigo: 'C-014' })).toMatch(/ventanilla/);
    expect(avisoDeCambio({ estado: 'EN_ESPERA', codigo: 'C-014' })).toBeNull();
  });
});
