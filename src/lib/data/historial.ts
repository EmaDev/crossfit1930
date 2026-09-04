import "server-only";

import { attendanceWindowStart } from "@/lib/data/attendance-window";
import { getRoutine } from "@/lib/data/wods";
import {
  addDaysIso,
  dayKind,
  mondayOfWeek,
  weekdayIndex,
  weekdayIndexForIso,
  type RoutineDay,
} from "@/lib/data/routine-types";
import { isAdminConfigured } from "@/lib/firebase/admin";

/**
 * WODs reales (los que efectivamente cargó el coach) que cayeron dentro de un
 * mes — para el calendario de Historial (Fase 5). A diferencia de
 * `getCurrentRoutine()`, acá NO se cae al mock: un mes sin rutinas cargadas
 * simplemente no tiene eventos.
 */

export type HistorialDay = {
  /** `yyyy-mm-dd` real del WOD (el lunes de `crossfit-routines` + el offset del weekday). */
  dateIso: string;
  day: RoutineDay;
  routineName: string;
};

export async function getRoutineDaysInRange(
  monthStart: string,
  monthEnd: string,
): Promise<HistorialDay[]> {
  if (!isAdminConfigured()) return [];

  const mondays = new Set<string>();
  for (let iso = mondayOfWeek(monthStart); iso <= monthEnd; iso = addDaysIso(iso, 7)) {
    mondays.add(iso);
  }

  const routines = await Promise.all(
    [...mondays].map(async (monday) => [monday, await getRoutine(monday)] as const),
  );

  const result: HistorialDay[] = [];
  for (const [monday, routine] of routines) {
    if (!routine) continue;
    for (const day of routine.days) {
      if (dayKind(day) !== "training") continue; // descanso/desconocida no son WODs
      const idx = weekdayIndex(day.weekday);
      const dateIso = addDaysIso(monday, idx === 0 ? 6 : idx - 1);
      if (dateIso >= monthStart && dateIso <= monthEnd) {
        result.push({ dateIso, day, routineName: routine.name });
      }
    }
  }

  return result.sort((a, b) => a.dateIso.localeCompare(b.dateIso));
}

export type ForgottenDay = {
  dateIso: string;
  /**
   * Título del WOD de ese día, o `null` si la rutina de esa semana no se cargó.
   * Un día sin rutina TAMBIÉN se puede marcar: que el coach no la haya subido
   * no significa que no se haya entrenado.
   */
  title: string | null;
};

/**
 * Los días de la ventana de asistencia (ver `ATTENDANCE_BACKFILL_DAYS`) que
 * quedaron SIN marcar — el "historial de olvidados" del tab de Historial.
 *
 * Entran los días de entrenamiento y también los que no tienen rutina cargada
 * (`title: null`). Se descartan sólo los descansos que el coach marcó
 * explícitamente: ahí el box no abrió, así que no hay nada que recuperar.
 *
 * Cuesta una lectura por semana tocada (dos, con una ventana de 7 días), no una
 * por día: las rutinas se agrupan por su lunes.
 */
export async function getForgottenDays(
  attendedDates: string[],
  todayIso: string,
): Promise<ForgottenDay[]> {
  const attended = new Set(attendedDates);

  const dates: string[] = [];
  for (let iso = attendanceWindowStart(todayIso); iso <= todayIso; iso = addDaysIso(iso, 1)) {
    if (!attended.has(iso)) dates.push(iso);
  }
  if (dates.length === 0) return [];

  const mondays = [...new Set(dates.map(mondayOfWeek))];
  const routines = new Map(
    await Promise.all(mondays.map(async (m) => [m, await getRoutine(m)] as const)),
  );

  const forgotten: ForgottenDay[] = [];
  for (const dateIso of dates) {
    const routine = routines.get(mondayOfWeek(dateIso));
    // Semana sin doc → día "desconocida": se ofrece igual, sin título.
    if (!routine) {
      forgotten.push({ dateIso, title: null });
      continue;
    }

    const day = routine.days.find((d) => weekdayIndex(d.weekday) === weekdayIndexForIso(dateIso));
    if (day && dayKind(day) === "descanso") continue; // descanso deliberado
    forgotten.push({ dateIso, title: day && dayKind(day) === "training" ? day.title : null });
  }

  // Más reciente primero: el olvido de ayer es el que más importa.
  return forgotten.sort((a, b) => b.dateIso.localeCompare(a.dateIso));
}
