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

/**
 * El bloque al que pertenece el ejercicio dentro del día. Lo elige el coach en
 * el panel; en docs viejos no existe y se deduce del nombre (ver `sectionOf`).
 *
 * `finisher` no está en el selector del panel —el coach carga Calentamiento,
 * Skill, Fuerza y WOD— pero sigue en el modelo porque las rutinas ya cargadas
 * lo usan y tiene color propio.
 */
export type ExerciseSection = "calentamiento" | "skill" | "fuerza" | "wod" | "finisher";

export type Exercise = {
  /** Ej. "Movilidad General (AMRAP 5')" — el formato viene entre paréntesis. */
  name: string;
  detail: string;
  /** Ausente en docs viejos: se deriva del nombre en `sectionOf`. */
  section?: ExerciseSection;
};

/** Las secciones que ofrece el panel de admin, en el orden en que se cargan. */
export const EXERCISE_SECTIONS: ExerciseSection[] = [
  "calentamiento",
  "skill",
  "fuerza",
  "wod",
];

export const SECTION_LABEL: Record<ExerciseSection, string> = {
  calentamiento: "Calentamiento",
  skill: "Skill",
  fuerza: "Fuerza",
  wod: "WOD",
  finisher: "Finisher",
};

const ALL_SECTIONS: ExerciseSection[] = [...EXERCISE_SECTIONS, "finisher"];

export const isExerciseSection = (v: unknown): v is ExerciseSection =>
  typeof v === "string" && (ALL_SECTIONS as string[]).includes(v);

/** Deducción por nombre, para los ejercicios que no traen `section` (docs viejos). */
function inferSection(name: string): ExerciseSection {
  const n = name.toLowerCase();
  if (n.includes("movilidad") || n.includes("calentamiento") || n.includes("calor"))
    return "calentamiento";
  if (n.includes("finisher")) return "finisher";
  if (n.includes("metcon") || n.includes("wod")) return "wod";
  if (n.includes("skill")) return "skill";
  return "fuerza";
}

/**
 * La sección real de un ejercicio: la que eligió el coach si está, si no la
 * deducida del nombre. Única fuente de verdad para la card, la imagen y el panel.
 */
export function sectionOf(exercise: Exercise): ExerciseSection {
  return exercise.section ?? inferSection(exercise.name);
}

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
