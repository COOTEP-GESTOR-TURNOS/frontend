# web · COOTEP Turno

Aplicación web en **React 19 con Vite**, estilos con **Tailwind CSS 4** e iconos de **react-icons** (Lucide). Todos los roles la usan: asociado (pedir y seguir el
turno), funcionario (llamar y atender) y administradores (panel pendiente). En Docker la sirve
nginx sin privilegios, que además reenvía `/api` y `/socket.io` al backend principal.

| Carpeta | Contenido |
| --- | --- |
| `src/paginas` | Ingresar, PanelAsociado, PanelFuncionario, PanelAdministracion, NoAutorizado |
| `src/componentes` | Pagina, Tarjeta, Boton, Campo, Aviso, Etiqueta, Segmentado, ChipEstado, TarjetaTurno |
| `src/auth` | Sesión en memoria, rutas protegidas por rol |
| `src/api` | Cliente HTTP (Problem Details) y llamadas de turnos |
| `src/estilos/app.css` | Tailwind CSS 4: tokens de la guía visual (los mismos de la app móvil) y estilos base |

## Desarrollo

```bash
npm ci
npm run dev        # http://localhost:5173 · reenvía /api y /socket.io a http://localhost:3000
npm test           # Vitest
npm run build
```

Mientras el inicio de sesión del backend está pendiente, en modo desarrollo la pantalla de
ingreso acepta un token de `npm run token:dev` (repositorio `backend-principal`).

## Accesibilidad

Enlace para saltar al contenido, foco visible, etiquetas en todos los campos, región `aria-live`
para la posición, botones de 44 px y estados con texto además de color. Atajo `N` para llamar al
siguiente en el panel del funcionario.
