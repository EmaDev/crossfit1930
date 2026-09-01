import "server-only";

/**
 * Regla de racha, pura y sin acceso a datos: la usa la Server Action de
 * asistencia para decidir si marcar hoy continúa la racha o la reinicia.
 *
 * Se aísla acá para poder razonarla (y testearla) sin Firebase de por medio.
 */

const DAY_MS = 86_400_000;

/**
 * Día de la semana (0 = domingo … 6 = sábado) de una fecha `yyyy-mm-dd`.
 * Vía `Date.UTC` para que el resultado no dependa de la zona horaria en la que
 * corra el servidor: una fecha "pelada" tiene el mismo weekday en todos lados.
 */
export function weekdayIndexForIso(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

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
