"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Dock de asistencia: la acción principal de la pantalla "Hoy", anclada sobre
 * el BottomNav.
 *
 * Se muestra extendido un instante para que se lea qué hace y después se
 * pliega a un botón circular, así no le come pantalla al WOD. Vuelve a
 * extenderse cada vez que cambia de estado (marcando / cumplido) y se pliega
 * de nuevo solo.
 *
 * Es puro presentacional —no sabe de Firebase ni de sesión—: recibe el estado
 * y avisa el toque. La lógica vive en <MarkDayDock>.
 *
 * Por qué no `FloatingButton` del kit: el FAB es un círculo genérico para
 * "crear algo", tapa el contenido y no tiene estados. Acá la acción es una
 * sola, binaria y con feedback (marcar / marcando / cumplido), así que el
 * botón cambia de forma y de color con el estado en vez de quedarse fijo.
 *
 * Rendimiento: todas las animaciones mueven `transform`/`opacity` (más el
 * trazo del check), el listener de scroll es pasivo y se agrupa en un
 * requestAnimationFrame, y los adornos (halo, brillo) sólo se montan en el
 * estado que los usa.
 */

export type AttendanceStatus = "idle" | "pending" | "done";

/** Alto real del BottomNav (lo publica el kit en :root) + un respiro. */
const DOCK_BOTTOM = "calc(var(--bottom-nav, 4rem) + 0.75rem)";

/** Extendido / plegado. Plegado = el alto del pill, o sea un círculo justo. */
const WIDTH = { open: "24rem", folded: "3.5rem" } as const;

/** Cuánto queda extendido antes de plegarse solo. */
const UNFOLD_MS = 2400;

export function AttendanceDock({
  status,
  onPress,
  title,
  hint,
}: {
  status: AttendanceStatus;
  onPress: () => void;
  /** Texto principal del estado actual. */
  title: string;
  /** Renglón chico de abajo. */
  hint: string;
}) {
  const hidden = useHideOnScroll();
  const celebrate = useCelebration(status);
  // Cada cambio de estado lo vuelve a abrir: el usuario tiene que ver el
  // "Marcando…" y el "¡Día cumplido!", no un círculo que cambia de color.
  const folded = useAutoFold(status);
  const done = status === "done";

  return (
    <div
      // `pointer-events-none` en el contenedor: ocupa todo el ancho y no debe
      // robarle los toques al contenido que queda debajo.
      className={`pointer-events-none fixed inset-x-0 z-30 px-4 transition-[transform,opacity] duration-300 ease-out ${
        hidden ? "translate-y-[150%] opacity-0" : "translate-y-0 opacity-100"
      }`}
      style={{ bottom: DOCK_BOTTOM }}
      inert={hidden || undefined}
    >
      {/* `justify-end`: al plegarse se recoge hacia la derecha, que es donde
          está el pulgar, en vez de encogerse desde el centro. */}
      <div className="mx-auto flex w-full max-w-md animate-dock-in justify-end motion-reduce:animate-none">
        {/* El ancho lo maneja este envoltorio y no el botón: el halo vive acá
            afuera porque el pill recorta su contenido (`overflow-hidden`). */}
        <div
          className="relative w-full transition-[max-width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ maxWidth: folded ? WIDTH.folded : WIDTH.open }}
        >
          {/* Halo que respira detrás del pill: sólo mientras hay algo por hacer. */}
          {status === "idle" && (
            <span
              aria-hidden
              className="absolute inset-0 -z-10 animate-dock-halo rounded-full bg-primary blur-md motion-reduce:animate-none"
            />
          )}

          <button
            type="button"
            // Ancla del paso "Marcá el día cumplido" del tour (ver <AppTour>).
            data-tour="marcar-dia"
            onClick={() => {
              haptic(12);
              onPress();
            }}
            disabled={status === "pending"}
            aria-busy={status === "pending"}
            // `key`: al confirmarse, el nodo se remonta y la animación de
            // celebración arranca sola, sin timers ni clases que limpiar después.
            key={celebrate}
            className={[
              // p-1.5 + disco de 44px = los 56px justos del círculo plegado.
              "pointer-events-auto relative isolate flex h-14 w-full items-center gap-2.5 overflow-hidden p-1.5",
              "rounded-full border text-left duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
              "transition-[background-color,border-color,box-shadow,transform]",
              "active:scale-[0.94] disabled:cursor-wait",
              celebrate ? "animate-dock-pop motion-reduce:animate-none" : "",
              done
                ? // Cumplido: el CTA se apaga y queda como confirmación tranquila.
                  "border-success/40 bg-surface text-foreground shadow-[0_8px_24px_-14px_var(--color-success)]"
                : "border-transparent bg-primary text-white shadow-[0_14px_34px_-16px_var(--color-primary)]",
            ].join(" ")}
          >
            {/* Brillo que barre el pill cada 5s. Sólo extendido: en el círculo
                no se llega a leer y serían frames tirados a la basura. */}
            {status === "idle" && !folded && (
              <span
                aria-hidden
                className="pointer-events-none absolute inset-y-0 -left-1/4 w-1/4 animate-dock-sheen bg-white/25 blur-[3px] motion-reduce:hidden"
              />
            )}

            <span
              aria-hidden
              className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors duration-500 ${
                done ? "bg-success/15 text-success" : "bg-white/15 text-white"
              }`}
            >
              {status === "pending" ? <Spinner /> : <DrawnCheck drawing={done} />}

              {/* Ondas de confirmación: se montan con el estado "cumplido". */}
              {celebrate > 0 && done && (
                <>
                  <Ring />
                  <Ring delay="140ms" />
                </>
              )}
            </span>

            {/* Plegado el texto se desvanece pero sigue en el DOM: es el nombre
                accesible del botón. `key`: cada estado entra animado. */}
            <span
              key={status}
              className={`min-w-0 flex-1 animate-dock-swap pr-2 transition-opacity duration-200 motion-reduce:animate-none ${
                folded ? "opacity-0" : "opacity-100"
              }`}
            >
              <span className="block truncate whitespace-nowrap text-[15px] font-extrabold leading-tight">
                {title}
              </span>
              <span
                className={`mt-0.5 block truncate whitespace-nowrap text-[11px] font-semibold uppercase tracking-wide ${
                  done ? "text-muted" : "text-white/75"
                }`}
              >
                {hint}
              </span>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

/** El `CheckIcon` de los atoms es estático: este dibuja el trazo al aparecer. */
function DrawnCheck({ drawing }: { drawing: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={24}
      height={24}
      fill="none"
      stroke="currentColor"
      strokeWidth={2.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path
        d="m5 12.5 4.5 4.5L19 7"
        // El trazo mide ~22 unidades del viewBox: con 24 el guion lo cubre entero.
        strokeDasharray={drawing ? 24 : undefined}
        className={drawing ? "animate-dock-check motion-reduce:animate-none" : ""}
      />
    </svg>
  );
}

function Ring({ delay }: { delay?: string }) {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-0 animate-dock-ring rounded-full border-2 border-success motion-reduce:hidden"
      style={{ animationDelay: delay }}
    />
  );
}

function Spinner() {
  return (
    <span
      aria-hidden
      className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white"
    />
  );
}

/**
 * Se extiende al montarse y cada vez que cambia `trigger`, y se pliega solo
 * después de `UNFOLD_MS`. El timer se limpia en cada cambio, así dos estados
 * seguidos (marcando → cumplido) no dejan uno viejo pendiente.
 */
function useAutoFold(trigger: AttendanceStatus): boolean {
  const [folded, setFolded] = useState(false);

  useEffect(() => {
    setFolded(false);
    const timer = setTimeout(() => setFolded(true), UNFOLD_MS);
    return () => clearTimeout(timer);
  }, [trigger]);

  return folded;
}

/**
 * Contador que sube cada vez que el estado PASA a "cumplido". Sirve de `key`
 * para remontar el pill y disparar la celebración; en el primer render no se
 * dispara, así un día ya marcado no festeja de nuevo al abrir la pantalla.
 */
function useCelebration(status: AttendanceStatus): number {
  const prev = useRef(status);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (status === "done" && prev.current !== "done") {
      setCount((n) => n + 1);
      haptic([14, 55, 26]);
    }
    prev.current = status;
  }, [status]);

  return count;
}

/**
 * Esconde el dock al scrollear hacia abajo y lo devuelve al subir, para no
 * tapar los comentarios del WOD. Listener pasivo + rAF: un solo cálculo por
 * frame pintado, sin layout thrashing.
 */
function useHideOnScroll(): boolean {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let last = window.scrollY;
    let frame = 0;

    const read = () => {
      frame = 0;
      const y = window.scrollY;
      const delta = y - last;
      // Los deltas chicos no cuentan ni mueven la referencia: evitan que el
      // dock parpadee con el rebote del scroll o con el dedo apoyado.
      if (Math.abs(delta) < 8) return;
      last = y;
      // Cerca del tope siempre visible: ahí es donde se decide marcar el día.
      setHidden(delta > 0 && y > 120);
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(read);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return hidden;
}

/** Vibración corta donde el dispositivo la soporte (Android / PWA instalada). */
function haptic(pattern: number | number[]) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(pattern);
  }
}
