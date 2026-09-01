# Crossfit team

Base de una PWA mobile-first armada con **Next.js (App Router)** + **[lib-kit-components](https://github.com/EmaDev/kit-componentes)**,
siguiendo la guía [`docs/guides/app-base.md`](https://github.com/EmaDev/kit-componentes/blob/main/docs/guides/app-base.md).

- **Paleta:** roja sobre negro, con tema **claro y oscuro** (`next-themes`, clase `.dark` en `<html>`).
- **Shell:** safe areas, splash, capa PWA (instalador · offline · update), `BottomNav` de 3 rutas,
  `FabActionSheets` con 3 acciones y centro de notificaciones (`SnackbarProvider` + `NotificationSidebar`).

## Correr

```bash
npm run dev      # http://localhost:3000
npm run build    # build de producción
npm run start    # servir el build
```

## Estructura

```
src/
  app/
    layout.tsx                 # Server · <ThemeProvider> + <ToastProvider> + fuentes + metadata/manifest
    globals.css                # Tailwind v4 + estilos del kit + override de tokens (rojo/negro, claro+oscuro)
    (app)/
      layout.tsx               # Server · sólo delega en <AppShell>
      AppShell.tsx             # Client · ÚNICO límite cliente de arriba: splash, PWA, BottomNav, FAB, drawer
      notifications-context.tsx# Client · contexto mínimo del centro de notificaciones
      page.tsx                 # Server · inicio (HeroTabs: Resumen / Clases / Metas)
      actividad/page.tsx       # Server · Historial / PRs
      perfil/page.tsx          # Server · Datos / Ajustes (selector de tema)
  components/
    atoms/
      icons.tsx                # set de íconos SVG (currentColor)
      ThemeToggle.tsx          # Client · botón claro/oscuro
    organisms/
      quick-actions.tsx        # Client · contenido de los 3 BottomSheet del FAB
      home-panels.tsx          # Client · paneles de la pantalla de inicio
      screen-header-actions.tsx# Client · campana + InstallButton + ThemeToggle para los headers
      theme-setting.tsx        # Client · selector Sistema / Claro / Oscuro
  lib/
    data/home.ts               # acceso a datos (se importa sólo desde Server Components)
public/
  manifest.json                # display: standalone, theme_color rojo
  sw.js                        # handler SKIP_WAITING para <UpdatePrompt>
  favicon.ico                  # 16/32/48 en un solo .ico
  logo.png                     # logo recortado, fondo transparente, para la UI
  icons/                       # íconos PWA 192/512 + maskable-512
  apple-touch-icon.png         # 180×180 para iOS
  splash/                      # splash screens de iOS (retrato)
assets/
  logo.png                     # logo original: fuente de todos los assets de marca
scripts/
  gen-icons.mjs                # regenera íconos, favicon y splashes sin dependencias
```

## Marca

El único original es [`assets/logo.png`](assets/logo.png). Todo lo demás sale de ahí con:

```bash
npm run gen-icons
```

El script recorta el margen transparente del logo y escribe los íconos PWA, el maskable,
el `apple-touch-icon`, el `favicon.ico` (16/32/48) y las splash screens de iOS.
Los íconos van **sobre blanco** a propósito: la barra y los discos del logo son negros y
sobre el fondo del tema oscuro desaparecerían. Si cambia el logo, reemplazá el original
y volvé a correr el script — no hay que tocar nada más.

## Tema y paleta

Los colores son CSS variables (`--color-primary`, `--color-surface`, …) que consume todo el kit.
Se redefinen en [`src/app/globals.css`](src/app/globals.css):

| Token             | Claro     | Oscuro    |
| ----------------- | --------- | --------- |
| `primary`         | `#dc2626` | `#ef4444` |
| `surface`         | `#ffffff` | `#0a0a0a` |
| `foreground`      | `#171717` | `#f5f5f5` |
| `border`          | `#e5e5e5` | `#262626` |

Para editarlos en vivo desde la UI, el kit trae `ThemeConfigurator`.

## Notas de la guía aplicadas

- `SnackbarProvider` con `gap={80}` (64 del `BottomNav` + 16 de aire).
- FAB con `className="pb-[4.5rem] md:pb-0"` para no pisar el `BottomNav`; se oculta mientras el drawer está abierto.
- `SafeArea` del shell sólo con `edges={["left","right"]}` (el inset superior lo maneja cada header).
- `NativeShell` con `onlyWhenInstalled` para no bloquear el zoom del navegador normal.
- `layout.tsx` y `page.tsx` sin `"use client"`: el límite vive en `AppShell`.
