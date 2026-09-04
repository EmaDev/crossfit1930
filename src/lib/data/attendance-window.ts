import { addDaysIso } from "@/lib/data/routine-types";

/**
 * Hasta cuándo para atrás se puede marcar una asistencia olvidada.
 *
 * Módulo PURO a propósito (sin `"server-only"` ni `firebase-admin`): la regla
 * la necesitan las dos puntas — la Server Action, para validar la fecha que
 * llega del cliente, y el calendario de Historial, para saber qué días ofrecer
 * como marcables. Tampoco puede vivir en el archivo de la action: un módulo
 * `"use server"` sólo puede exportar funciones async.
 */

/** Días hacia atrás, además de hoy, que siguen siendo marcables. */
export const ATTENDANCE_BACKFILL_DAYS = 7;

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

/** El día más viejo que todavía se puede marcar, dado `todayIso`. */
export function attendanceWindowStart(todayIso: string): string {
  return addDaysIso(todayIso, -ATTENDANCE_BACKFILL_DAYS);
}

/**
 * ¿`dateIso` cae dentro de la ventana marcable? Rechaza el futuro y cualquier
 * cosa más vieja que la ventana: la racha se recalcula desde el historial, así
 * que una fecha arbitraria del pasado reescribiría contadores de meses atrás.
 */
export function isMarkableDate(dateIso: string, todayIso: string): boolean {
  if (!ISO_RE.test(dateIso)) return false;
  return dateIso <= todayIso && dateIso >= attendanceWindowStart(todayIso);
}
