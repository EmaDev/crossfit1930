/**
 * Tipos y helpers puros del modelo de rutina — sin `firebase-admin` ni
 * `"server-only"`. Separado de `wods.ts` a propósito: un componente cliente
 * (el formulario del panel de admin) necesita `ORDERED_WEEKDAYS` y estos
 * tipos, y si los importara desde `wods.ts` arrastraría el SDK de admin
 * (Firestore/gRPC) al bundle del browser y rompería el build.
 */

/** Días tal como vienen en el JSON del coach: minúscula y con acento. */
export type Weekday =
  | "lunes"
  | "martes"
  | "miércoles"
  | "jueves"
  | "viernes"
  | "sábado"
  | "domingo";

export type Exercise = {
  /** Ej. "Movilidad General (AMRAP 5')" — el formato viene entre paréntesis. */
  name: string;
  detail: string;
};

/**
 * Qué es un día sin WOD:
 * - `training`: hay entrenamiento (tiene `exercises`).
 * - `descanso`: descanso deliberado (el coach lo marcó así).
 * - `desconocida`: todavía no se pasó la rutina de ese día.
 *
 * En `days[]` sólo se guardan los `training` y los `descanso`; un día ausente
 * se interpreta como `desconocida` (ver `dayKind`).
 */
export type DayKind = "training" | "descanso" | "desconocida";

export type RoutineDay = {
  weekday: Weekday;
  title: string;
  exercises: Exercise[];
  /** Ausente en docs viejos: se deriva de `exercises` en `dayKind`. */
  kind?: DayKind;
};

export type Routine = {
  name: string;
  type: string;
  description: string;
  days: RoutineDay[];
};

/** `getDay()` de JS: 0 = domingo. */
export const WEEKDAY_INDEX: Record<Weekday, number> = {
  domingo: 0,
  lunes: 1,
  martes: 2,
  miércoles: 3,
  jueves: 4,
  viernes: 5,
  sábado: 6,
};

/** Los 7 días en orden, lunes primero — para recorrer/armar `days[]` en el panel de admin. */
export const ORDERED_WEEKDAYS: Weekday[] = [
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
  "domingo",
];

export const weekdayIndex = (w: Weekday) => WEEKDAY_INDEX[w];

/** El tipo real de un día: usa `kind` si está, si no lo deriva de `exercises`. */
export function dayKind(day: RoutineDay): DayKind {
  if (day.kind) return day.kind;
  return day.exercises.length > 0 ? "training" : "descanso";
}

/**
 * Rutina "todavía no cargada": los 7 días como `desconocida`. Se usa cuando no
 * hay ningún doc para la semana en curso, en vez de mostrar un ejemplo falso.
 */
export function unknownWeekRoutine(): Routine {
  return {
    name: "Rutina no cargada",
    type: "crossfit",
    description: "Todavía no se cargó la planificación de esta semana.",
    days: ORDERED_WEEKDAYS.map((weekday) => ({
      weekday,
      title: "",
      exercises: [],
      kind: "desconocida" as const,
    })),
  };
}

/** `yyyy-mm-dd` del lunes de la semana a la que pertenece `iso` — doc ID de `crossfit-routines`. */
export function mondayOfWeek(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const dow = date.getUTCDay(); // 0 = domingo
  date.setUTCDate(date.getUTCDate() + (dow === 0 ? -6 : 1 - dow));
  return date.toISOString().slice(0, 10);
}

/** `iso` (`yyyy-mm-dd`) + `days` días, sin depender de ninguna zona horaria. */
export function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().slice(0, 10);
}
