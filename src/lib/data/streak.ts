import "server-only";

/**
 * Regla de racha, pura y sin acceso a datos: la usa la Server Action de
 * asistencia para decidir si marcar hoy continúa la racha o la reinicia.
 *
 * Se aísla acá para poder razonarla (y testearla) sin Firebase de por medio.
 */

const DAY_MS = 86_400_000;

/**
 * ¿La racha sigue viva entre la última asistencia (`lastIso`) y hoy
 * (`todayIso`)?
 *
 * Recorre los días ESTRICTAMENTE entre ambos. Si alguno era día de
 * entrenamiento (su weekday está en `trainingWeekdays`) y no se asistió, la
 * racha se cortó → `false`. Si todos los del medio eran de descanso (domingo, o
 * un weekday que la rutina no entrena), la racha continúa → `true`.
 *
 * Cubre la regla del plan §4.3: domingos y días sin WOD no reinician la racha.
 * El set de días de entrenamiento se arma desde `getCurrentRoutine()`.
 *
 * // TODO (Fase 2): descontar además los feriados marcados como Rest Day por el
 * // panel de admin, que hoy no existen.
 */
export function streakContinues(
  lastIso: string,
  todayIso: string,
  trainingWeekdays: Set<number>,
): boolean {
  const [ly, lm, ld] = lastIso.split("-").map(Number);
  const [ty, tm, td] = todayIso.split("-").map(Number);

  let cursor = Date.UTC(ly, lm - 1, ld) + DAY_MS;
  const end = Date.UTC(ty, tm - 1, td);

  for (; cursor < end; cursor += DAY_MS) {
    if (trainingWeekdays.has(new Date(cursor).getUTCDay())) return false;
  }
  return true;
}

export type StreakCounters = {
  current: number;
  max: number;
  total: number;
  /** `yyyy-mm-dd` de la última asistencia, o `null` si no hay ninguna. */
  last: string | null;
};

/**
 * Recalcula los contadores desde CERO a partir de todas las fechas asistidas.
 *
 * Hace falta porque marcar un día olvidado (uno anterior a hoy) no se puede
 * resolver sumando 1 al `current_streak`: una marca en el medio puede unir dos
 * tramos que estaban cortados, y una al principio no toca la racha actual. El
 * único resultado correcto sale de recorrer el historial completo — que es
 * corto (un puñado de días por semana), así que se lee entero en la
 * transacción de la marca.
 *
 * Aplica la misma regla que el camino incremental (`streakContinues` entre dos
 * asistencias consecutivas), así que marcar HOY da exactamente lo mismo que
 * antes. `trainingWeekdays` sale de la rutina vigente: es la misma aproximación
 * que ya hacía la action —se asume que el box entrena los mismos weekdays toda
 * la temporada—, porque releer la rutina de cada semana del historial sería una
 * query por semana.
 */
export function recomputeStreak(
  dates: string[],
  todayIso: string,
  trainingWeekdays: Set<number>,
): StreakCounters {
  const unique = [...new Set(dates)].sort();
  if (unique.length === 0) return { current: 0, max: 0, total: 0, last: null };

  let run = 1;
  let max = 1;
  for (let i = 1; i < unique.length; i += 1) {
    run = streakContinues(unique[i - 1], unique[i], trainingWeekdays) ? run + 1 : 1;
    if (run > max) max = run;
  }

  // El tramo que termina en la última asistencia sólo sigue siendo la racha
  // ACTUAL si desde ahí hasta hoy no se perdió ningún día de entrenamiento.
  const last = unique[unique.length - 1];
  const alive = streakContinues(last, todayIso, trainingWeekdays);

  return { current: alive ? run : 0, max, total: unique.length, last };
}
