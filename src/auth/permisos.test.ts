import { describe, expect, it } from 'vitest';
import { panelInicial, puedeAcceder } from './permisos';

describe('PR-13: rutas por rol', () => {
  it('un asociado no puede entrar al panel de administración', () => {
    expect(puedeAcceder([{ rol: 'ASOCIADO' }], ['SUPERADMIN', 'ADMIN_AGENCIA'])).toBe(false);
  });

  it('un funcionario puede entrar a su panel', () => {
    expect(puedeAcceder([{ rol: 'FUNCIONARIO', agenciaId: 'a1' }], ['FUNCIONARIO', 'ADMIN_AGENCIA'])).toBe(true);
  });

  it('cada rol abre su panel inicial', () => {
    expect(panelInicial([{ rol: 'ASOCIADO' }])).toBe('/asociado');
    expect(panelInicial([{ rol: 'FUNCIONARIO', agenciaId: 'a1' }])).toBe('/funcionario');
    expect(panelInicial([{ rol: 'SUPERADMIN' }])).toBe('/administracion');
    expect(panelInicial([])).toBe('/no-autorizado');
  });
});
