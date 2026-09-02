import "server-only";

import { FieldPath, type DocumentData } from "firebase-admin/firestore";
import { adminDb, isAdminConfigured } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import {
  WEEKDAY_INDEX,
  mondayOfWeek,
  unknownWeekRoutine,
  isExerciseSection,
  type DayKind,
  type Exercise,
  type Routine,
  type RoutineDay,
  type Weekday,
} from "@/lib/data/routine-types";

/**
 * Rutinas semanales. La unidad que carga el coach es una SEMANA con N días,
 * no un WOD suelto por fecha.
 *
 * `getRoutine()` lee `crossfit-routines/{lunes}`; si Firebase no está
 * configurado o la semana todavía no se cargó, `getCurrentRoutine()` devuelve
 * una semana con los 7 días en `desconocida` (`unknownWeekRoutine`), así el
 * shell sigue navegable sin inventar un WOD que no existe.
 *
 * Los tipos y `ORDERED_WEEKDAYS` viven en `./routine-types` (sin
 * `firebase-admin`) y se re-exportan acá para no romper los imports
 * existentes — el formulario del panel de admin, que es cliente, importa esa
 * ruta directo para no arrastrar este módulo (y `firebase-admin`) al bundle
 * del browser.
 */
export type {
  DayKind,
  Exercise,
  ExerciseSection,
  Routine,
  RoutineDay,
  Weekday,
} from "@/lib/data/routine-types";
export {
  EXERCISE_SECTIONS,
  ORDERED_WEEKDAYS,
  SECTION_LABEL,
  dayKind,
  sectionOf,
  weekdayIndex,
} from "@/lib/data/routine-types";

/**
 * El box está en un solo lugar: "hoy" es hoy ACÁ, no donde corra el servidor.
 * Sin esto, un deploy en un server UTC/US cambia de día a horas equivocadas.
 */
export const BOX_TIMEZONE = "America/Argentina/Buenos_Aires";

const EN_WEEKDAY: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/** Índice del día de hoy (0 = domingo) en la zona horaria del box. */
export function todayIndex(now = new Date()): number {
  const short = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    timeZone: BOX_TIMEZONE,
  }).format(now);
  return EN_WEEKDAY[short];
}

/**
 * `yyyy-mm-dd` de hoy en la zona del box — la misma clave con la que se
 * guarda una marca de asistencia (`crossfit-attendance/{uid}_{yyyy-mm-dd}`).
 * Con `formatToParts` no depende del orden que el locale le dé a la fecha.
 */
export function boxTodayIso(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BOX_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** `yyyy-mm-dd` del lunes de la semana de hoy, en la zona del box — doc ID de `crossfit-routines`. */
export function currentWeekMondayIso(now = new Date()): string {
  return mondayOfWeek(boxTodayIso(now));
}

/** `true` si `iso` (`yyyy-mm-dd`) cae en lunes — los docs de `crossfit-routines` se guardan con esa clave. */
export function isMondayIso(iso: string): boolean {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return false;
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay() === 1;
}

const VALID_KINDS: DayKind[] = ["training", "descanso", "desconocida"];

function toDay(raw: DocumentData): RoutineDay {
  const exercises: Exercise[] = Array.isArray(raw?.exercises)
    ? raw.exercises.map((e: DocumentData) => ({
        name: typeof e?.name === "string" ? e.name : "",
        detail: typeof e?.detail === "string" ? e.detail : "",
        ...(isExerciseSection(e?.section) ? { section: e.section } : {}),
      }))
    : [];
  const kind: DayKind | undefined = VALID_KINDS.includes(raw?.kind) ? raw.kind : undefined;
  return {
    weekday: raw?.weekday,
    title: typeof raw?.title === "string" ? raw.title : "",
    exercises,
    ...(kind ? { kind } : {}),
  };
}

function toRoutine(data: DocumentData): Routine {
  return {
    name: data.name ?? "",
    type: data.type ?? "crossfit",
    description: data.description ?? "",
    days: Array.isArray(data.days) ? data.days.map(toDay) : [],
  };
}

/** Lee `crossfit-routines/{weekStart}` (lunes `yyyy-mm-dd`). `null` si no está cargada. */
export async function getRoutine(weekStart: string): Promise<Routine | null> {
  if (!isAdminConfigured()) return null;

  try {
    const snap = await adminDb().collection(COLLECTIONS.routines).doc(weekStart).get();
    return snap.exists ? toRoutine(snap.data()!) : null;
  } catch (err) {
    console.error("[wods] no se pudo leer la rutina:", err);
    return null;
  }
}

/**
 * La rutina de la semana en curso. Si Firebase no está configurado o el coach
 * todavía no cargó la semana, devuelve una semana con los 7 días en
 * `desconocida` en vez de inventar un WOD.
 */
export async function getCurrentRoutine(): Promise<Routine> {
  const routine = await getRoutine(currentWeekMondayIso());
  return routine ?? unknownWeekRoutine();
}

export type RoutineWeekSummary = {
  /** `yyyy-mm-dd` del lunes — doc ID. */
  weekStart: string;
  name: string;
  dayCount: number;
};

/** Listado para `/admin`: todas las semanas cargadas, la más reciente primero. */
export async function listRoutineWeeks(): Promise<RoutineWeekSummary[]> {
  if (!isAdminConfigured()) return [];

  try {
    const snap = await adminDb()
      .collection(COLLECTIONS.routines)
      .orderBy(FieldPath.documentId(), "desc")
      .get();

    return snap.docs.map((doc) => {
      const data = doc.data();
      return {
        weekStart: doc.id,
        name: data.name ?? "(sin nombre)",
        dayCount: Array.isArray(data.days) ? data.days.length : 0,
      };
    });
  } catch (err) {
    console.error("[wods] no se pudo listar las rutinas:", err);
    return [];
  }
}

/**
 * El día de hoy dentro de la rutina, o `null` si ese weekday no está en
 * `days[]` (día `desconocida`). Puede devolver un día `descanso`: quien lo usa
 * decide el render según `dayKind`.
 */
export function dayForToday(routine: Routine, dayIdx = todayIndex()): RoutineDay | null {
  return routine.days.find((d) => WEEKDAY_INDEX[d.weekday] === dayIdx) ?? null;
}
