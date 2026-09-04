"use server";

import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { isMarkableDate } from "@/lib/data/attendance-window";
import { recomputeStreak } from "@/lib/data/streak";
import { boxTodayIso, dayKind, getCurrentRoutine, weekdayIndex } from "@/lib/data/wods";
import { adminDb, isAdminConfigured } from "@/lib/firebase/admin";
import { COLLECTIONS, attendanceId } from "@/lib/firebase/collections";

/**
 * Asistencia de un día y su racha.
 *
 * `markAttendance(date?)` crea la marca
 * (`crossfit-attendance/{uid}_{yyyy-mm-dd}`, así un usuario no puede marcar dos
 * veces el mismo día) y, en la misma transacción, mantiene los contadores
 * desnormalizados de `crossfit-users/{uid}` según las reglas del plan §4:
 *
 *   1. Marcar → total_attended_days += 1 y current_streak += 1
 *   2. Si current_streak > max_streak → actualizar max_streak
 *   3. Domingos y días sin WOD no reinician current_streak (ver `streakContinues`)
 *
 * Sin `date` marca HOY; con `date` marca un día OLVIDADO, siempre dentro de la
 * ventana de `isMarkableDate` (nunca el futuro, nunca más viejo que unos días).
 * La ventana es la ÚNICA restricción: un día sin rutina cargada se puede marcar
 * igual, porque que el coach no haya subido el WOD no significa que el box no
 * haya abierto ni que la persona no haya entrenado.
 * En ese caso los contadores no se pueden incrementar —una marca en el medio
 * del historial puede unir dos tramos que estaban cortados—, así que en los dos
 * casos se recalculan con `recomputeStreak` leyendo todas las marcas del
 * usuario dentro de la transacción. Para "hoy" el resultado es idéntico al que
 * daba el camino incremental.
 *
 * `markAttendance` guarda además un snapshot `_attendanceUndo` con los valores
 * previos, para que `unmarkAttendance` pueda revertir la marca de HOY sin
 * recalcular todo el historial. Hoy ninguna pantalla lo llama —el dock de
 * asistencia ya no ofrece "deshacer"—, pero el snapshot se sigue escribiendo:
 * es la vía para desmarcar (panel de admin, soporte) sin releer el historial.
 */

const STREAK_FIELDS = {
  current: "current_streak",
  max: "max_streak",
  total: "total_attended_days",
  last: "last_attendance_date",
} as const;

type AttendanceUndo = {
  current_streak: number;
  max_streak: number;
  total_attended_days: number;
  last_attendance_date: string | null;
  date: string;
};

export type MarkAttendanceResult =
  | { ok: true; alreadyMarked: boolean; date: string }
  | { ok: false; reason: "guest" | "not-configured" | "out-of-range" | "error" };

export async function markAttendance(date?: string): Promise<MarkAttendanceResult> {
  const session = await getSession();
  if (!session) return { ok: false, reason: "guest" };

  const today = boxTodayIso();
  const target = date ?? today;
  // La fecha llega del cliente: se valida acá, nunca en el componente.
  if (!isMarkableDate(target, today)) return { ok: false, reason: "out-of-range" };

  if (!isAdminConfigured()) return { ok: false, reason: "not-configured" };

  const uid = session.uid;
  const db = adminDb();
  const attendanceRef = db
    .collection(COLLECTIONS.attendance)
    .doc(attendanceId(uid, target));
  const userRef = db.collection(COLLECTIONS.users).doc(uid);
  const historyQuery = db.collection(COLLECTIONS.attendance).where("uid", "==", uid);

  try {
    // La rutina define qué weekdays "cuentan": un hueco en un día sin WOD
    // (descanso o desconocida) no corta la racha. La rutina se repite semana a
    // semana, así que su set de días alcanza para la regla de continuidad.
    const routine = await getCurrentRoutine();
    const trainingWeekdays = new Set(
      routine.days
        .filter((d) => dayKind(d) === "training")
        .map((d) => weekdayIndex(d.weekday)),
    );

    const alreadyMarked = await db.runTransaction(async (tx) => {
      const [attendanceSnap, userSnap] = await tx.getAll(attendanceRef, userRef);
      if (attendanceSnap.exists) return true;

      // Todas las marcas del usuario + la que estamos por crear: la racha sale
      // del historial completo, no de sumar 1 (ver `recomputeStreak`). El campo
      // `date` es la fuente; si faltara se saca del doc ID, igual que en
      // `getAttendedDates`.
      const historySnap = await tx.get(historyQuery);
      const dates = historySnap.docs
        .map((doc) => (doc.data().date as string | undefined) ?? doc.id.slice(uid.length + 1))
        .filter(Boolean);
      dates.push(target);

      const u = userSnap.data() ?? {};
      const prevCurrent = (u[STREAK_FIELDS.current] as number | undefined) ?? 0;
      const prevMax = (u[STREAK_FIELDS.max] as number | undefined) ?? 0;
      const prevTotal = (u[STREAK_FIELDS.total] as number | undefined) ?? 0;
      const last = (u[STREAK_FIELDS.last] as string | undefined) ?? null;

      const next = recomputeStreak(dates, today, trainingWeekdays);

      tx.set(attendanceRef, { uid, date: target, createdAt: Timestamp.now() });
      tx.set(
        userRef,
        {
          [STREAK_FIELDS.current]: next.current,
          // El máximo histórico nunca baja: si el doc traía uno más alto que el
          // que sale del historial (otra rutina en su momento), se respeta.
          [STREAK_FIELDS.max]: Math.max(prevMax, next.max),
          [STREAK_FIELDS.total]: next.total,
          [STREAK_FIELDS.last]: next.last ?? target,
          _attendanceUndo: {
            current_streak: prevCurrent,
            max_streak: prevMax,
            total_attended_days: prevTotal,
            last_attendance_date: last,
            date: target,
          } satisfies AttendanceUndo,
        },
        { merge: true },
      );

      return false;
    });

    revalidatePath("/", "layout");
    return { ok: true, alreadyMarked, date: target };
  } catch (err) {
    console.error("[attendance] no se pudo marcar la asistencia:", err);
    return { ok: false, reason: "error" };
  }
}

export type UnmarkAttendanceResult =
  | { ok: true }
  | {
      ok: false;
      reason: "guest" | "not-configured" | "nothing-to-undo" | "error";
    };

/**
 * Deshace la marca de HOY: borra el doc de asistencia y restaura los
 * contadores desde `_attendanceUndo`. No recibe nada del cliente (sólo revierte
 * lo último que este mismo usuario marcó hoy), así que es seguro.
 *
 * Sin uso desde que se sacó el "deshacer" del dock; queda como la única vía
 * para desmarcar (panel de admin, soporte) sin recalcular la racha entera.
 */
export async function unmarkAttendance(): Promise<UnmarkAttendanceResult> {
  const session = await getSession();
  if (!session) return { ok: false, reason: "guest" };
  if (!isAdminConfigured()) return { ok: false, reason: "not-configured" };

  const uid = session.uid;
  const today = boxTodayIso();
  const db = adminDb();
  const attendanceRef = db
    .collection(COLLECTIONS.attendance)
    .doc(attendanceId(uid, today));
  const userRef = db.collection(COLLECTIONS.users).doc(uid);

  try {
    const undone = await db.runTransaction(async (tx) => {
      const userSnap = await tx.get(userRef);
      const undo = userSnap.data()?._attendanceUndo as AttendanceUndo | undefined;

      // Sólo se deshace la marca de hoy, y una sola vez.
      if (!undo || undo.date !== today) return false;

      tx.delete(attendanceRef);
      tx.update(userRef, {
        [STREAK_FIELDS.current]: undo.current_streak,
        [STREAK_FIELDS.max]: undo.max_streak,
        [STREAK_FIELDS.total]: undo.total_attended_days,
        [STREAK_FIELDS.last]: undo.last_attendance_date ?? FieldValue.delete(),
        _attendanceUndo: FieldValue.delete(),
      });
      return true;
    });

    if (!undone) return { ok: false, reason: "nothing-to-undo" };

    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    console.error("[attendance] no se pudo deshacer la asistencia:", err);
    return { ok: false, reason: "error" };
  }
}
