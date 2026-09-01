import "server-only";

import { getRoutine } from "@/lib/data/wods";
import { addDaysIso, mondayOfWeek, weekdayIndex, type RoutineDay } from "@/lib/data/routine-types";
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
      const idx = weekdayIndex(day.weekday);
      const dateIso = addDaysIso(monday, idx === 0 ? 6 : idx - 1);
      if (dateIso >= monthStart && dateIso <= monthEnd) {
        result.push({ dateIso, day, routineName: routine.name });
      }
    }
  }

  return result.sort((a, b) => a.dateIso.localeCompare(b.dateIso));
}
