# Crossfit team — Plan de desarrollo

> Documento vivo. Se actualiza a medida que avanzan las fases.
> Última actualización: 2026-09-01 — **Fases 0, 1, 2, 4, 5, 6 y 7 cerradas**, Fase 3 en curso; queda Fase 8 (Pulido).

---

## 1. Stack y arquitectura

- **Next.js 16** (App Router, versión con breaking changes — leer `node_modules/next/dist/docs/` antes de codear).
- **React 19**, **Tailwind v4**, **next-themes**, **framer-motion**.
- **lib-kit-components** (`github:EmaDev/kit-componentes`) — kit de átomos/moléculas del proyecto. **Siempre buscar la pieza en el kit antes de escribir UI.** Si no existe, se pide OK antes de crearla.
- **Firebase** (Firestore + Firebase Auth) — DB **compartida con otro proyecto**.
- **Puerto dev**: 3002.

### Capas (`src/`)

| Capa | Rol |
|---|---|
| `components/atoms/` | primitivos propios que el kit no cubre |
| `components/molecules/` | combinación de átomos con un propósito |
| `components/organisms/` | bloques con estado; `"use client"` sólo si usan hook/componente cliente; reciben datos por props, **no hacen fetch** |
| `components/templates/` | composición de organisms para una pantalla completa (Server Component si no usa hooks) |
| `lib/data/` | acceso a datos (lecturas). Se importa **sólo** desde Server Components |
| `lib/firebase/` | init `firebase-admin` (server) + client SDK + `collections.ts` |

Reglas: `layout.tsx` y cada `page.tsx` son Server Components. El único límite `"use client"` de arriba es `app/(app)/AppShell.tsx`. Todo `await fetch` / query vive en `page.tsx` o `lib/data/`. Mutaciones vía **Server Actions** (`firebase-admin`).

---

## 2. Decisiones tomadas

| Tema | Decisión |
|---|---|
| Navegación inferior | **4 tabs**: Inicio · Ranking · Timer · Perfil. **Historial anidado** (ruta `/historial`, acceso desde Inicio y Perfil). |
| Cabecera de pantalla | `AppHeaderCardSlot` (variante hero de `AppHeader`): degradado rojo, saludo según la hora y **card flotante con la racha**. Pantallas de detalle: `AppHeader` + volver. |
| Tabs | `TabsGlow` (pastilla animada con glow) en todas las pantallas, raíz y detalle. **Reemplaza** a `HeroTabs`/`AppHeaderTabs`. |
| FAB | **Eliminado.** La asistencia se marca desde el propio bloque del WOD (fase 3), no desde un botón flotante. |
| WOD Timer | **OK para crear componentes nuevos** (`WodTimer`, `TimerDisplay`, `RoundTapCounter`). |
| Backend | **Firebase** (Firestore + Firebase Auth). Lecturas con `firebase-admin` en `lib/data/`; mutaciones con Server Actions. |
| Colecciones | Prefijo **`crossfit-`** + módulo (DB compartida). Nombres centralizados en `src/lib/firebase/collections.ts`. |
| Notificaciones | Feed **broadcast** a todos los usuarios. **Fase 1 = solo campanita**; push después. |
| Rol admin | **Custom claim** de Firebase Auth. Se otorga sólo por terminal: `npm run admin:grant -- <email>`. |

---

## 3. Navegación

```
BottomNav (4)
├── Inicio     → WOD del día + semana        (HeroTabs, root)
│   └── Historial  → /historial              (CalendarGrid)   [anidado]
├── Ranking    → leaderboard asistencia/rachas (HeroTabs, root)
├── Timer      → herramientas de reloj        (HeroTabs / full-screen)
└── Perfil     → datos, PRs, sesión           (HeroTabs, root)
    └── Historial  (acceso alternativo)

FloatingButton global → "Marcar asistencia" al WOD de hoy

Fuera del shell:
(auth)/  → /login · /registro · /recuperar   (layout mínimo, sin BottomNav)
admin/   → /admin · /admin/rutina/[fecha]      (guardado por claim admin)
```

---

## 4. Modelo de datos (Firestore)

Todas las colecciones con prefijo `crossfit-`. IDs y contenido tentativos:

> ⚠️ **Revisado con la rutina real** (`Jaldin Semana 124`). Ver "Forma real de la rutina" abajo: la unidad que carga el coach es una **semana**, no un WOD por fecha.

| Colección | Doc ID | Contenido |
|---|---|---|
| `crossfit-routines` | `{yyyy-mm-dd}` (lunes de esa semana) | `name`, `type`, `description`, `days[]` — la rutina tal como la escribe el coach |
| `crossfit-attendance` | `{uid}_{yyyy-mm-dd}` | marca de asistencia, `createdAt` |
| `crossfit-users` | `{uid}` | perfil, foto, `registeredAt`, PRs (1RM + tiempos Hero WOD), `current_streak`, `max_streak`, `total_attended_days`, `lastReadAt` (watermark de notificaciones) |
| `crossfit-ratings` | auto | `{uid}` + `{wodDate}` + estrellas 1–5 |
| `crossfit-comments` | auto | `{wodDate}`, `{uid}`, texto, `likes[]`, `createdAt` |
| `crossfit-timer-results` | auto | `{uid}`, modo (AMRAP/EMOM/TABATA/FOR TIME), config, resultado, `createdAt` |
| `crossfit-leaderboard` | `{uid}` / agregados | ranking pre-calculado (histórico / año / mes) |
| `crossfit-notifications` | auto | feed broadcast: `type`, `title`, `description`, `link`, `tone`, `createdAt`, `actorUid` |

### Forma real de la rutina

La rutina de ejemplo (mock en `lib/data/wods.ts`) contradice cuatro supuestos del plan original:

| Se asumía | En realidad |
|---|---|
| Un WOD por fecha (`crossfit-wods/{yyyy-mm-dd}`) | Una **semana** con `days[]`; cada día trae `weekday` (nombre, no fecha) |
| Semana fija Lun–Sáb | **N días variables** (la real trae martes a viernes). Los días que no están, no se entrenan |
| Bloques fijos Warm-up · Skill/Strength · WOD · Cool-down | Lista **plana** de `exercises[{name, detail}]`. El bloque se deduce del nombre ("Movilidad General", "Metcon / WOD", "Finisher") |
| Rx / Scaled / Beginner como campos o tabs | Escalado **escrito dentro del `detail`**: `"15 T2B / 30 K2E"`, `"Scaled: … \| ADV: …"`. No se puede separar automático sin romper los casos donde la `/` es una lista |

Además, el formato del ejercicio viaja entre paréntesis en el `name` — `"Movilidad General (AMRAP 5')"`, `"Metcon / WOD (4 Rounds - TC: 18')"` — y la UI lo extrae como badge.

El campo `type: "crossfit"` sugiere que puede haber otros tipos de rutina.

El mock agrega un **lunes inventado** ("Shoulder Press & Engine") que no está en la rutina original, para poder ver el estado "hoy hay WOD" sin depender del día. Sábado y domingo siguen vacíos, así que el `RestDayCard` se prueba el fin de semana. Va marcado como tal en `lib/data/wods.ts`.

**Zona horaria**: "hoy" se resuelve en `America/Argentina/Buenos_Aires` (`BOX_TIMEZONE`), no en la del servidor, y `/` es `force-dynamic` para no quedar clavada en el día del build.

### Reglas de negocio — asistencia y rachas

1. Marcar asistencia un día → `total_attended_days += 1` y `current_streak += 1`.
2. Si `current_streak > max_streak` → actualizar `max_streak` de inmediato.
3. Domingos y feriados marcados como **Rest Day** no reinician `current_streak`.

---

## 5. Sistema de notificaciones (broadcast)

- **Feed global** `crossfit-notifications`; lo leen todos. Sin fan-out por usuario.
- **No leídas** = `createdAt > crossfit-users/{uid}.lastReadAt`. "Marcar todas" mueve el watermark. Descarte por ítem = lista de ids.
- **Nunca** se notifica al autor de su propia acción.

| Disparador | Nota |
|---|---|
| Nuevo WOD cargado | link al WOD del día |
| Nuevo comentario | preview del texto + link al WOD |
| Like en un comentario | **debounce** like/unlike → sólo notifica el primer like; agrupable |

Los docs los escribe la misma Server Action que crea el WOD / comentario / like. Upgrade correcto para push: **Cloud Functions** con trigger de Firestore.

**Push (fase 8)**: `NotificationOptIn` + `usePushSubscription` + VAPID + Cloud Function que envía al crearse cada doc.

---

## 6. Autenticación

Route group `src/app/(auth)/` con layout mínimo (sin shell). Compuesto de átomos del kit.

| Ruta | Contenido |
|---|---|
| `/login` | email + password · Google · links a recuperar y registro |
| `/registro` | email + password + confirmación · Google · `OnboardingWizard` opcional para datos de perfil |
| `/recuperar` | email → `sendPasswordResetEmail` → pantalla de confirmación |

- Firebase Auth (email/password + Google) en cliente → **session cookie** verificada server-side con `next/headers`.
- La app pública es **guest-first**: todo lo de lectura funciona sin login. El `Modal` del guest gate (`useGuestGate()`) lleva su CTA a `/registro`.

---

## 7. Rol admin

- **Custom claim** `{ admin: true }` de Firebase Auth (no un campo de Firestore).
- Scripts en `scripts/`: `admin-grant.mjs` / `admin-revoke.mjs` con `firebase-admin` (busca por email → `setCustomUserClaims`).
- `package.json`:
  ```json
  "admin:grant": "node scripts/admin-grant.mjs",
  "admin:revoke": "node scripts/admin-revoke.mjs"
  ```
  Uso: `npm run admin:grant -- emanuel00developer@gmail.com`
- Chequeo server-side: `verifySessionCookie(cookie, true)` → `decoded.admin`. El `layout.tsx` del segmento `admin/` guarda y redirige a los no-admin.
- Las reglas de Firestore espejan el claim para escrituras admin-only (`crossfit-routines`) — aunque en la práctica esa colección la escribe únicamente el Admin SDK desde `saveRoutine()`, que ignora las reglas; ver nota de `firestore.rules`.

---

## 8. Panel de admin ✅

Segmento real `src/app/admin/` (URL `/admin`), guardado por el claim. Alineado al modelo real de §4 (una **semana** con `days[]`, no bloques Warm-up/Skill/WOD/Cool-down ni categorías Rx/Scaled/Beginner — eso vive escrito dentro del `detail` de cada ejercicio).

| Ruta | Pantalla | Componentes kit |
|---|---|---|
| `/admin` | Lista de semanas cargadas (lunes, nombre, días) | `DataTable`, `Button` |
| `/admin/rutina/[fecha]` | Alta / edición de la semana: nombre/tipo/descripción + una sección colapsable por día (lunes a domingo) con `Switch` "hay entrenamiento" y editor de ejercicios (`name` + `detail`) | `DatePicker` (sólo semana nueva), `CollapsibleFormSections`, `Switch`, `Textarea`, `Input` |

Guardar una semana → escribe `crossfit-routines/{lunes}` **+ emite** doc en `crossfit-notifications`, pero sólo la primera vez que esa semana se crea (ver Fase 2 más abajo) — no en cada edición posterior.

---

## 9. Mapeo UI por módulo (kit primero)

### Módulo 2 — Home / Planificación semanal *(core)*

| Necesidad | Componente |
|---|---|
| Selector de día | `ChipCarousel` con **sólo los días que trae la rutina** (punto en el de hoy) |
| Ejercicios del día | stack de `Card`; el WOD va `elevated`, el resto `outline` |
| Formato del ejercicio | badge con lo que viene entre paréntesis (`AMRAP 5'`, `For Time`, `TC: 18'`) |
| ~~Categorías Rx / Scaled / Beginner~~ | **No aplica**: el escalado viene dentro del texto del `detail` |
| Día sin entrenamiento | `RestDayCard` con el próximo día de la semana |
| Compartir el día | `ShareDayButton` → `BottomSheet` con la imagen generada en canvas + WhatsApp + copiar |

#### Compartir la planificación como imagen

`lib/share/wod-image.ts` dibuja el día en un `<canvas>` (1080px de ancho, alto según contenido) y devuelve un PNG. Va a canvas y no a una captura del DOM: sin dependencia nueva, resolución fija y el resultado no depende del tema ni del ancho de pantalla del usuario.

**Límite de WhatsApp**: un `wa.me/?text=` **sólo lleva texto, no archivos**. La única vía web para mandar una imagen a WhatsApp es `navigator.share({ files })`, que abre la hoja nativa del sistema. Por eso el botón se comporta distinto según el soporte:

| Contexto | Qué pasa |
|---|---|
| Mobile con Web Share nivel 2 | Hoja nativa **con la imagen adjunta**; el usuario elige WhatsApp ahí |
| Sin soporte (desktop) | WhatsApp Web con la rutina **en texto** + snackbar avisando que pegue la imagen copiada |

**Copiar imagen** usa `navigator.clipboard.write` con `ClipboardItem`. Firefox y los contextos no seguros no lo soportan: ahí cae a copiar el texto y lo avisa.

Ninguna de las dos cosas la cubre el kit: `ShareButton` sólo comparte `title`/`text`/`url` y `useClipboard` sólo hace `writeText`.

> ⚠️ La imagen se genera al **abrir** el sheet, no al tocar el botón: `navigator.share` exige activación de usuario vigente y un `await` dentro del handler la consume (iOS la rechaza).
| Asistencia rápida | `Button` `loading` + `Snackbar` con "deshacer"; invitado → guest gate |
| Feedback estrellas 1–5 | `StarRatingWidget` (promedio + distribución) |
| Comentarios de la comunidad | `CommentBox` (hilos 1 nivel + likes) |

### Módulo 3 — Ranking / Leaderboard ✅

| Necesidad | Componente |
|---|---|
| Filtros Histórico / Este año / Este mes | tabs de la propia pantalla (`RootScreen`/`TabsGlow`) |
| Tabla (# · Atleta · Días · Racha actual · Racha máx) | `DataTable` (orden, búsqueda, paginado) |
| Fila del usuario logueado | ~~destacada con fondo~~ — ni `DataTable` ni `AnimatedTable` exponen color de fila completa; se usa negrita + badge "Vos" en la celda de nombre |
| Podio Top-3 | `ProfileCard` (iniciales, sin foto) |
| Racha visual (en Perfil) | `StreakTracker` |

### Módulo 4 — WOD Timer ✅ *(componentes nuevos aprobados)*

| Parte | Base |
|---|---|
| Config (tiempos, rondas, intervalos) | ~~`Select`/`Keypad`+`StepsProgress`~~ (no existe en el kit) → `Input type="number"` |
| Display grande | ~~`CountdownHero`~~ (cuenta a fecha fija, sin pausa ni cuenta ascendente) → `TimerDisplay` propio |
| Contador de rondas AMRAP (tap gigante) | `RoundTapCounter` (nuevo) + `AnimatedCounter` |
| Tabata trabajo/descanso (verde/rojo full-bleed) | componente nuevo con `bg-success` / `bg-danger` |
| Laps (FOR TIME) | lista en `Card` |
| Mantener pantalla encendida | `useImmersive` (wake lock) — ya en el kit |
| Sonidos 3-2-1 / transición | util propio con Web Audio (`lib/timer/beep.ts`) |
| Guardar resultado | `BottomSheet` al terminar → `crossfit-timer-results`; invitado → guest gate |

### Módulo 5 — Historial ✅

| Necesidad | Componente |
|---|---|
| Navegación por mes | `CalendarGrid`, controlado por `?mes=` en la URL |
| Detalle de WOD pasado | reusa `DayView` del Módulo 2 en `BottomSheet` |
| Marcas pasadas del día | lista simple (`HistorialMarcas`) |

### Módulo 1 — Perfil ✅

| Necesidad | Componente |
|---|---|
| Datos (avatar, contacto, bio) | `ProfileEditor` |
| PRs | texto libre (nombre + marca) — sin catálogo fijo de lifts (plan §11), lista de `Card` + `Modal` de edición con `Input` |
| Racha | `StreakTracker` |
| Foto | ~~`useFilePicker`/`CameraCapture`~~ → el propio picker de `ProfileEditor` (data URL, sin Storage — ver Fase 7) |

### Transversal

- **Skeletons** por panel (`Skeleton` + `<Suspense>` en cada `page.tsx`).
- **Vacío / error**: `PageStatusScreen`.
- **Guest gate**: `useGuestGate()` + `Modal` compartido — *"¡Registrate gratis para marcar tu asistencia y guardar tus progresos!"*.
- **Tokens** rojo-sobre-negro ya definidos en `src/app/globals.css` (claro + `.dark`). Nunca colores hardcodeados.

---

## 10. Plan por fases

| Fase | Alcance | Entregable |
|---|---|---|
| **0 · Fundaciones** ✅ | `BottomNav` 4 tabs + ruta `/historial` vacía · FAB → `FloatingButton` "Marcar asistencia" · `useGuestGate()` + `Modal` · `lib/firebase/` (admin + client + `collections.ts`) · helpers de session cookie · cablear `NotificationBell`/`NotificationSidebar` a `crossfit-notifications` + watermark `lastReadAt` (reemplaza `SEED_NOTIFS`) · skeletons por pantalla | Shell navegable con datos reales de notificaciones |
| **1 · Auth** ✅ | `(auth)` group: `/login` · `/registro` · `/recuperar` · Google · session cookie · scripts `admin:grant` / `admin:revoke` + verificación de claim | Login/registro/recuperación funcionando |
| **2 · Admin panel** ✅ | `/admin` lista (`DataTable`) + `/admin/rutina/[fecha]` alta-edición (`CollapsibleFormSections` por día, `DatePicker` para elegir el lunes) · guarda en `crossfit-routines/{lunes}` · emite notificación **sólo en el alta**, no en cada edición | Los coaches pueden cargar rutinas semanales |
| **3 · Home / Planificación** 🚧 | `ChipCarousel` semana · bloques en `Card` · ~~tabs Rx/Scaled/Beginner~~ (no aplica, ver §9) · asistencia (Server Action + `Snackbar` undo + guest gate) · `StarRatingWidget` · `CommentBox` · notificación en comentario/like | Pantalla core usable |
| **4 · Ranking** ✅ | `DataTable` + filtros por tabs de la pantalla · fila usuario destacada (badge, no fondo — ver nota) · podio con `ProfileCard` · `lib/data/leaderboard.ts` (histórico/año/mes) | Leaderboard funcional |
| **5 · Historial** ✅ | `CalendarGrid` navegado por `?mes=` · detalle de WOD pasado en `BottomSheet` · "Mis marcas" del mes | Navegación histórica |
| **6 · WOD Timer** ✅ | `useStopwatch` + `useIntervalTimer` + `TimerDisplay` + `RoundTapCounter` · AMRAP/EMOM/TABATA/FOR TIME · `useImmersive` (wake lock) · beeps con Web Audio · guardar en `crossfit-timer-results` + guest gate | Panel de relojes |
| **7 · Perfil** ✅ | `ProfileEditor` (foto como data URL, sin Storage) · CRUD de PRs texto libre · `StreakTracker` · ajustes ya existían de Fase 0 | Perfil completo |
| **8 · Pulido** | Push (`NotificationOptIn` + `usePushSubscription` + VAPID + Cloud Function) · cola offline para asistencia · vacíos/errores · a11y · testeo manual en navegador de lo construido sin browser (Fase 6) · `npm run typecheck` + `npm run build` | Release candidate |

**Racional del orden**: la app se diseña guest-first; auth se adelanta porque el panel de admin la necesita, y el Home depende de que el admin pueda cargar WODs. El Timer va tarde por ser el que más código propio requiere.

### Fase 0 — qué quedó construido

| Archivo | Rol |
|---|---|
| `lib/firebase/collections.ts` | nombres `crossfit-*` centralizados + `attendanceId()` |
| `lib/firebase/admin.ts` | init `firebase-admin` con `isAdminConfigured()` — sin credenciales la app corre igual |
| `lib/firebase/client.ts` | SDK web, sólo para el login (las lecturas van por admin) |
| `lib/auth/session.ts` | `getSession()` · `requireAdmin()` · `createSessionCookie()` · cookie `crossfit_session` |
| `lib/data/notifications.ts` | feed broadcast + watermark `lastReadAt` + descarte por id |
| `lib/actions/notifications.ts` | Server Actions `markAllNotificationsRead` / `dismissNotification` |
| `lib/data/user-stats.ts` | racha actual / máxima / días totales desde `crossfit-users/{uid}` |
| `components/molecules/guest-gate/` | `GuestGateProvider` + `useGuestGate().requireAuth()` + `GuestGateModal` |
| `components/molecules/streak-card.tsx` | contenido de la card flotante; para invitado, CTA a registrarse |
| `components/organisms/root-screen.tsx` | marco de las 4 raíces: `AppHeaderCardSlot` + `TabsGlow` |
| `components/organisms/detail-screen.tsx` | marco de las anidadas: `AppHeader` con volver + `TabsGlow` |
| `components/molecules/screen-skeleton.tsx` | skeletons por pantalla, usados en cada `loading.tsx` |

**Header**: la campana y el toggle de tema son `HeaderAction[]` de la barra superior; el botón izquierdo lleva la inicial del usuario y va a `/perfil`. `InstallButton` se movió a Perfil › Ajustes (se auto-oculta y en el header dejaba un hueco intermitente). Tokens `--color-hero-from` / `--color-hero-to` en `globals.css` pisan el degradado violeta del kit.

**Modo degradado**: sin `.env.local`, `getSession()` devuelve `null` y `getNotifications()` devuelve `[]`. El shell es navegable igual; todo entra en modo invitado. Ver `.env.example`.

**Se borró** el scaffold demo del kit (`/actividad`, `quick-actions`, `home-panels`, `lib/data/home.ts`): modelaba "reservar clases con cupos", que no es el modelo de este plan.

### Fase 1 — qué quedó construido

| Archivo | Rol |
|---|---|
| `app/(auth)/layout.tsx` + `login` / `registro` / `recuperar` | shell mínimo (sin `BottomNav`) + las 3 pantallas, todas Server Components que redirigen a `/` si ya hay sesión |
| `components/organisms/auth/` | `LoginForm` / `RegisterForm` / `RecoverForm` (cliente) + `AuthCard` / `GoogleButton` compartidos |
| `lib/auth/firebase-errors.ts` | traducción de los códigos de Firebase Auth a mensajes en español |
| `lib/auth/session-client.ts` | `postSession` / `deleteSession`, hablan con el route handler |
| `app/api/session/route.ts` | canjea el `idToken` del SDK web por la session cookie httpOnly; en el primer login crea `crossfit-users/{uid}` con los contadores de racha en 0 |
| `scripts/admin-grant.mjs` / `admin-revoke.mjs` | ya existían de la Fase 0, sin cambios |

### Fase 2 — qué quedó construido

El pivot de modelo de datos (§4: una **semana** con `days[]`, no un WOD por fecha) obligó a resolver primero una inconsistencia: `lib/firebase/collections.ts` todavía tenía `wods` con el comentario del modelo viejo (bloques Rx/Scaled/Beginner). Se renombró a `routines` para que coincida con lo que ya consumía el resto de la app.

| Archivo | Rol |
|---|---|
| `lib/data/routine-types.ts` | `Weekday` / `Exercise` / `RoutineDay` / `Routine` / `ORDERED_WEEKDAYS`, sin `firebase-admin`. Separado de `wods.ts` a propósito: el formulario de admin es cliente y si importara estos tipos desde `wods.ts` arrastraría el SDK de admin (Firestore/gRPC) al bundle del browser y rompería el build — pasó una vez, quedó de lección |
| `lib/data/wods.ts` | `getRoutine(weekStart)` lee `crossfit-routines/{lunes}`; `getCurrentRoutine()` la pide para el lunes de hoy y cae al mock si no está cargada; `listRoutineWeeks()` para la lista del panel; re-exporta los tipos de `routine-types.ts` para no romper imports existentes |
| `lib/actions/routines.ts` | Server Action `saveRoutine(weekStart, input)`, guardada por `requireAdmin()`. Notifica **sólo cuando el doc se crea** (no en cada edición): el plan dice "guardar emite notificación", pero avisarle al box cada corrección de coma sería ruido |
| `app/admin/layout.tsx` + `admin-header.tsx` | guard de `requireAdmin()` (redirect a `/` si no hay claim) + header propio, sin `TabsGlow` ni campanita (ese contexto vive en `(app)`, que este segmento no usa) |
| `app/admin/page.tsx` + `routines-table.tsx` | lista de semanas cargadas. `DataTable` es cliente y sus `columns`/`onRowClick` llevan funciones: viven en `routines-table.tsx` (cliente), no en el `page.tsx` (Server Component) |
| `app/admin/rutina/[fecha]/page.tsx` + `routine-form.tsx` | alta/edición: `CollapsibleFormSections` con una sección por día de la semana (`Switch` para marcarlo como día de descanso) + editor de ejercicios dinámico. El `DatePicker` para elegir el lunes sólo se muestra si la semana todavía no existe — cambiar la fecha de una semana ya cargada crearía un doc huérfano |

### Fase 4 — qué quedó construido

Se resolvió una de las preguntas abiertas del §11: **sin `crossfit-leaderboard` pre-calculado por ahora**. Con un solo box (decenas/centenas de atletas), leer `crossfit-users` completo por request es barato y evita sumarle una escritura más a `markAttendance`. Si el box crece, ahí sí migra a la colección agregada que el modelo de datos ya prevé.

| Archivo | Rol |
|---|---|
| `lib/data/leaderboard.ts` | `getLeaderboard()` arma los 3 recortes (histórico/año/mes) en una sola pasada: un `get()` de `crossfit-users` + una query por rango sobre `crossfit-attendance` desde el 1° de enero (el mes es un subconjunto del año, no hace falta una segunda query) |
| `components/molecules/leaderboard-podium.tsx` | Top-3 con `ProfileCard` (iniciales del kit, sin foto) — sin `"use client"`: no usa hooks, se renderiza directo desde el Server Component |
| `components/organisms/leaderboard-table.tsx` | `DataTable` con el resto del ranking. **Nota importante**: ni `DataTable` ni `AnimatedTable` (el fallback que preveía el plan) exponen forma de colorear una fila completa — se descubrió recién al implementar. Al usuario logueado se lo destaca con negrita + una etiqueta "Vos" en su celda de nombre, no con el fondo `--color-surface-alt` que describía el plan original |
| `app/(app)/ranking/page.tsx` | reemplaza los 3 `PhasePlaceholder` por podio + tabla por pestaña; `force-dynamic` porque el orden cambia con cada asistencia marcada |

### Fase 5 — qué quedó construido

| Archivo | Rol |
|---|---|
| `lib/data/routine-types.ts` | ganó `mondayOfWeek(iso)` y `addDaysIso(iso, n)`, pura aritmética de calendario sin `firebase-admin` — `currentWeekMondayIso()` de `wods.ts` ahora se apoya en la primera para no duplicar el cálculo |
| `lib/data/historial.ts` | `getRoutineDaysInRange(monthStart, monthEnd)`: junta los lunes distintos que pisa el mes, pide cada `crossfit-routines/{lunes}` (sin caer al mock — un mes sin rutina cargada no tiene eventos) y ubica cada día real por su offset desde el lunes |
| `app/(app)/historial/page.tsx` | el mes navega por **URL** (`?mes=yyyy-mm`), no con estado de cliente: cada cambio de mes es un request nuevo, coherente con el resto de la app SSR-first |
| `components/organisms/historial-calendar.tsx` | `CalendarGrid` controlado + `BottomSheet` con `DayView` (reusa el Módulo 2, sin el bloque de comunidad — ese es sólo para el WOD de HOY) |
| `components/molecules/historial-marcas.tsx` | lista de asistencias del mes con el título del WOD si se conoce, o "WOD sin registrar" si la marca es de antes de tener el admin panel |

### Fase 6 — qué quedó construido

`CountdownHero` del kit no sirve de base acá: cuenta a una fecha fija (`until`) sin pausa ni cuenta ascendente, y FOR TIME necesita justamente un cronómetro que sube. Tampoco hay un `Stepper` numérico genérico en el kit (`StepsProgress` del mapeo original no existe) — la config usa `Input type="number"` simple, que ya estaba listado como alternativa válida.

| Archivo | Rol |
|---|---|
| `lib/timer/use-stopwatch.ts` | cronómetro base: sube desde que arranca, con pausa. Sin drift — no acumula por tick, relee `Date.now()` contra `startedAt` en cada render |
| `lib/timer/use-interval-timer.ts` | envuelve el stopwatch en fases que se repiten `rounds` veces. Cubre los 3 modos de duración fija: AMRAP = 1 fase × 1 ronda, EMOM = 1 fase × N rondas, TABATA = 2 fases (trabajo/descanso) × N rondas — una sola implementación, no cuatro |
| `lib/timer/beep.ts` | 3 tonos con Web Audio puro (cuenta 3-2-1, cambio de intervalo, fin) — sin archivos de audio, funciona offline |
| `lib/timer/use-timer-sound.ts` | conecta cualquier `useIntervalTimer` a `beep.ts`: un solo hook de sonido para AMRAP/EMOM/TABATA |
| `components/atoms/timer-display.tsx` | número gigante monoespaciado (`formatClock`), el primitivo que reemplaza a `CountdownHero` acá |
| `components/organisms/timer/round-tap-counter.tsx` | tap gigante de rondas de AMRAP, con `AnimatedCounter` del kit para el efecto odómetro — es manual, el reloj no puede saber cuántas rondas hizo el atleta |
| `components/organisms/timer/{amrap,emom,tabata,fortime}-timer.tsx` | un organism por modo: config → corrida → `BottomSheet` de guardado. TABATA es el único con fondo full-bleed (`bg-success`/`bg-danger`, ya registrados como colores de `@theme` en `globals.css`) |
| `lib/actions/timer-results.ts` | `saveTimerResult()`, guardada por sesión (invitado → `useGuestGate().requireAuth()`), escribe en `crossfit-timer-results` |

Ninguno de los 4 modos tiene pausa: un timer de box no se pausa a mitad de WOD, así que la UI es sólo Empezar → (corrida) → Guardar/Reiniciar. **No probado en navegador real** (esta sesión no tiene acceso a uno): `typecheck` y `build` pasan y la ruta responde 200 con el markup esperado, pero el tick del reloj, los beeps y el wake lock necesitan una pasada manual en un dispositivo antes de dar el módulo por verificado end-to-end.

### Fase 7 — qué quedó construido

Se resolvió parcialmente una pregunta del §11: **PRs como texto libre** (nombre + marca, sin catálogo fijo de lifts) — más simple para el MVP y no le cierra la puerta a un catálogo estructurado después si hiciera falta.

| Archivo | Rol |
|---|---|
| `lib/data/profile.ts` | `getProfile(uid)`: teléfono, bio, foto y PRs — lo que `Session` no trae porque no sale del token |
| `lib/actions/profile.ts` | `saveProfile()` y `savePr()`/`deletePr()` (transaccional sobre el array `prs[]`, que es chico y de un solo dueño) |
| `components/organisms/profile-form.tsx` | envuelve `ProfileEditor` del kit. **La foto se guarda como data URL directo en Firestore**, no en Firebase Storage: no hay bucket ni reglas de Storage configuradas, y para un avatar chico el límite de 1 MiB del doc alcanza. Si más adelante hace falta subir fotos más pesadas, ahí sí hay que sumar Storage — acá se cortó a propósito |
| `components/organisms/pr-list.tsx` | lista + `Modal` de alta/edición con `Input` |
| `app/(app)/perfil/page.tsx` | reemplaza los `PhasePlaceholder` de "datos" y "PRs"; suma `StreakTracker` con `attendedDates` — su racha interna (cuenta hacia atrás desde hoy, sin la regla de "días sin WOD no cortan") puede no coincidir con el número de `StreakCard`, que sigue siendo la fuente autoritativa; es el comportamiento documentado del componente, no un bug |

---

## 11. Pendientes por definir

- ¿Quién carga los WODs? (¿un solo admin, varios coaches?) — afecta granularidad de roles.
- ¿Feriados: lista manual en el panel de admin o colección aparte `crossfit-holidays`?
- ¿Idioma único (es) o i18n desde el arranque?
- ¿Cuándo suma Firebase Storage? Quedó afuera a propósito en Fase 7 (la foto de perfil va como data URL en Firestore); si se necesitan imágenes más pesadas (galería, portadas) hay que sumar bucket + reglas.
