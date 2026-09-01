@AGENTS.md

# Crossfit team — reglas del proyecto

## Componentes: SIEMPRE el kit primero

- **Usá siempre los componentes y hooks de `lib-kit-components`** (el kit de componentes). Antes de escribir UI,
  buscá la pieza en el kit: `node_modules/lib-kit-components/docs/README.md` (índice + guía "Necesito… → Usá…")
  y `docs/components/<Nombre>.md` / `docs/hooks/<useNombre>.md` para props, ejemplos y gotchas.
- **No reimplementes** algo que el kit ya exporta (`Button`, `Input`, `Card`, `Hero*`, `BottomNav`,
  `FabActionSheets`, `SnackbarProvider`, `NotificationSidebar`, etc.). Eso es la capa de átomos del proyecto.
- **Si el componente no existe en el kit, NO lo crees por tu cuenta: preguntá primero** si hay que crear uno
  nuevo desde cero. Recién con el OK explícito se agrega, y va en `src/components/` respetando la arquitectura
  atómica (no como parche suelto dentro de una pantalla).
- Los tokens de color (`--color-primary`, `--color-surface`, …) se ajustan en `src/app/globals.css`, nunca
  con colores hardcodeados en los componentes. Paleta: roja sobre negro, con tema claro y oscuro (`.dark`).

## Arquitectura: atómica + SSR-first

Capas del consumidor (`src/`):

- `components/atoms/` — primitivos 100% propios que el kit no cubre.
- `components/molecules/` — combinación de átomos con un propósito.
- `components/organisms/` — bloques de pantalla con estado/interacción; llevan `"use client"` sólo cuando
  usan un hook o un componente cliente del kit. Reciben los datos ya resueltos por props, no hacen fetch.
- `components/templates/` — composición de organisms para una pantalla completa; sin `"use client"` si no
  usan hooks (así quedan como Server Components).
- `lib/data/` — acceso a datos (fetch/DB). Se importa SÓLO desde Server Components.

Reglas:

- `app/layout.tsx`, `app/(app)/layout.tsx` y cada `page.tsx` son **Server Components** (sin `"use client"`).
  El único límite cliente "de arriba" es `app/(app)/AppShell.tsx`.
- Todo `await fetch(...)` / query a la base vive en un `page.tsx` o en `lib/data/`, nunca en un organism.
- Pantallas raíz (las del `BottomNav`) usan `HeroTabs`; pantallas de detalle usan `AppHeaderTabs`.
- Seguir la guía del shell: `docs/guides/app-base.md` del repo del kit.

## Comandos

- `npm run dev` → http://localhost:3002
- `npm run tunnel` → expone el dev server con un Quick Tunnel de Cloudflare
  (`*.trycloudflare.com`, URL nueva en cada corrida). Correr en otra terminal con `npm run dev` activo.
- `npm run build` / `npm run start` (puerto 3002)
- `npm run gen-icons` → regenera íconos PWA, favicon y splashes de iOS desde `assets/logo.png`
  (el único original de la marca; los generados no se editan a mano).
- `npm run typecheck` antes de dar por terminado un cambio.
