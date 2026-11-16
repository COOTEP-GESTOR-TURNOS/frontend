import { describe, expect, it } from 'vitest';
import { menuPara, panelInicial, puedeAcceder, puedeAsignarRol } from './permisos';

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
    expect(panelInicial([{ rol: 'ADMIN_AGENCIA', agenciaId: 'a1' }])).toBe('/administracion');
    expect(panelInicial([])).toBe('/no-autorizado');
  });

  it('el menú solo muestra lo que el rol puede usar', () => {
    const rutas = (roles: Parameters<typeof menuPara>[0]) => menuPara(roles).map((m) => m.ruta);
    expect(rutas([{ rol: 'ASOCIADO' }])).toEqual(['/asociado', '/mi-cuenta']);
    expect(rutas([{ rol: 'ADMIN_AGENCIA', agenciaId: 'a1' }])).toEqual(['/administracion', '/funcionario', '/mi-cuenta']);
  });
});

describe('Política de administración en la interfaz (RN-15)', () => {
  const directivo = [{ rol: 'ADMIN_AGENCIA' as const, agenciaId: 'mocoa' }];
  it('el directivo de agencia solo asigna funcionarios de su agencia', () => {
    expect(puedeAsignarRol(directivo, { rol: 'FUNCIONARIO', agenciaId: 'mocoa' })).toBe(true);
    expect(puedeAsignarRol(directivo, { rol: 'FUNCIONARIO', agenciaId: 'orito' })).toBe(false);
    expect(puedeAsignarRol(directivo, { rol: 'SUPERADMIN' })).toBe(false);
    expect(puedeAsignarRol([{ rol: 'SUPERADMIN' }], { rol: 'ADMIN_AGENCIA', agenciaId: 'orito' })).toBe(true);
  });
});
