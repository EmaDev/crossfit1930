import "server-only";

import { FieldPath, type DocumentData } from "firebase-admin/firestore";
import { adminDb, isAdminConfigured } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import {
  WEEKDAY_INDEX,
  mondayOfWeek,
  type Exercise,
  type Routine,
  type RoutineDay,
  type Weekday,
} from "@/lib/data/routine-types";

/**
 * Rutinas semanales. La unidad que carga el coach es una SEMANA con N días,
 * no un WOD suelto por fecha (ver la rutina real de ejemplo más abajo).
 *
 * `getRoutine()` lee `crossfit-routines/{lunes}`; si Firebase no está
 * configurado o la semana todavía no se cargó, se cae al mock, así el shell
 * sigue siendo navegable en modo invitado/degradado (ver plan §10).
 *
 * Los tipos y `ORDERED_WEEKDAYS` viven en `./routine-types` (sin
 * `firebase-admin`) y se re-exportan acá para no romper los imports
 * existentes — el formulario del panel de admin, que es cliente, importa esa
 * ruta directo para no arrastrar este módulo (y `firebase-admin`) al bundle
 * del browser.
 */
export type { Exercise, Routine, RoutineDay, Weekday } from "@/lib/data/routine-types";
export { ORDERED_WEEKDAYS, weekdayIndex } from "@/lib/data/routine-types";

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

/**
 * Rutina de ejemplo, basada en una real (Jaldin Semana 124). Sirve de
 * contrato: lista plana de ejercicios, el formato entre paréntesis en el
 * `name` y el escalado escrito dentro del `detail` ("15 T2B / 30 K2E",
 * "Scaled: … | ADV: …"), no en campos aparte.
 *
 * El lunes ("Shoulder Press & Engine") NO viene de la rutina original — lo
 * agregamos para poder ver el estado "hoy hay WOD" sin esperar al martes.
 * Sábado y domingo siguen sin entrenamiento, así que el `RestDayCard` se
 * sigue pudiendo probar el fin de semana.
 */
const MOCK_ROUTINE: Routine = {
  name: "Jaldin Semana 124",
  type: "crossfit",
  description:
    "Planificación semanal de 5 días (Lunes a Viernes): Movilidad, Skill/Fuerza y Metcon/WOD",
  days: [
    {
      weekday: "lunes",
      title: "Shoulder Press & Engine",
      exercises: [
        {
          name: "Movilidad General (AMRAP 5')",
          detail:
            "6 Strict press + 6 Push press + 6 Around the world + 20 Band pull apart + 20 Shoulder taps",
        },
        {
          name: "Push Press Complex",
          detail:
            "4 sets: 1 Strict press + 2 Push press + 1 Push jerk | 4 sets: 3 Push press",
        },
        {
          name: "Metcon / WOD (AMRAP 15')",
          detail: "12 Cal row, 9 Push press, 6 HSPU / 9 Pike push ups, 15 Wall balls",
        },
        { name: "Finisher", detail: "Tabata Hollow hold" },
      ],
    },
    {
      weekday: "martes",
      title: "Power Snatch & Conditioning",
      exercises: [
        {
          name: "Movilidad General (AMRAP 5')",
          detail:
            "6 DL snatch + 6 Hang muscle snatch + 6 Good morning + 20 Russian twists + 20 Jumping jacks",
        },
        {
          name: "Power Snatch Complex",
          detail:
            "4 sets: 1 Low hang snatch + 1 Hang snatch + 1 High snatch | 4 sets: 2 Hang snatch",
        },
        {
          name: "Metcon / WOD (For Time)",
          detail:
            "18 Shuttle run, 40 DB snatch alt, 12 Burpees OTDB, 18 Shuttle run, 30 OHS, 12 Burpees OTB, 18 Shuttle run, 20 Power snatch, 12 Burpees OTB doble salto",
        },
        { name: "Finisher", detail: "Tabata Zona media" },
      ],
    },
    {
      weekday: "miércoles",
      title: "Back Squat & Gymnastics / Quads",
      exercises: [
        {
          name: "Movilidad General (Tabata)",
          detail: "Back squat, Back lunges, Push ups, CF swing",
        },
        { name: "Back Squat (Fuerza)", detail: "6-5-4 Reps activación + 5x3" },
        {
          name: "Metcon / WOD (For Time)",
          detail:
            "3 rondas: (15 T2B / 30 K2E + 12 Burpees box jump overs + Front squats [9 / 15 / 21 reps])",
        },
      ],
    },
    {
      weekday: "jueves",
      title: "Skill Gimnástico & Doble WOD",
      exercises: [
        {
          name: "Movilidad General (6/5/4/3/2)",
          detail: "Hollow rocks, Barbell row, Superman, Kipping",
        },
        {
          name: "Skill C2B / D.U / BMU",
          detail: "Scaled: 4 sets (1' DU + 8 C2B) | ADV: 4 sets (60 DU + 8/6 BMU)",
        },
        {
          name: "WOD 1 (AMRAP 10')",
          detail: "35 D.U / 70 S.S + 7 BMU / 14 Pull ups + 5 Wall walk / 8 Walk out (2' Rest)",
        },
        {
          name: "WOD 2 (30/20/10 - TC: 6')",
          detail: "Sit ups, Kettlebell swing, Walking lunges",
        },
      ],
    },
    {
      weekday: "viernes",
      title: "Power Clean Complex & Metcon",
      exercises: [
        {
          name: "Movilidad General (AMRAP 5')",
          detail:
            "6 DL clean + 6 Hang muscle clean + 6 Front squat + 20 Flutter kicks + 20 Mountain climbers",
        },
        {
          name: "Power Clean Complex",
          detail:
            "4 sets: 1 Low clean + 1 Hang clean + 1 High clean | 4 sets: 2 Hang clean",
        },
        {
          name: "Metcon / WOD (4 Rounds - TC: 18')",
          detail:
            "12 Hang power clean + 5 Devil press arm left + 12 HSPU / 16 Pike push ups + 5 Devil press arm right + 12 Goblet squat",
        },
      ],
    },
  ],
};

function toRoutine(data: DocumentData): Routine {
  return {
    name: data.name ?? "",
    type: data.type ?? "crossfit",
    description: data.description ?? "",
    days: Array.isArray(data.days) ? data.days : [],
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
 * todavía no cargó la semana, se cae al mock para que el shell siga siendo
 * navegable (modo invitado/degradado, ver plan §10).
 */
export async function getCurrentRoutine(): Promise<Routine> {
  const routine = await getRoutine(currentWeekMondayIso());
  return routine ?? MOCK_ROUTINE;
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
 * El día de hoy dentro de la rutina, o `null` si hoy no se entrena (la rutina
 * de ejemplo va de lunes a viernes: sábado y domingo no tienen WOD).
 */
export function dayForToday(routine: Routine, dayIdx = todayIndex()): RoutineDay | null {
  return routine.days.find((d) => WEEKDAY_INDEX[d.weekday] === dayIdx) ?? null;
}
