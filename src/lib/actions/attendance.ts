"use server";

import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { streakContinues } from "@/lib/data/streak";
import { boxTodayIso, dayKind, getCurrentRoutine, weekdayIndex } from "@/lib/data/wods";
import { adminDb, isAdminConfigured } from "@/lib/firebase/admin";
import { COLLECTIONS, attendanceId } from "@/lib/firebase/collections";

/**
 * Asistencia del día de hoy y su racha.
 *
 * `markAttendance` crea la marca (`crossfit-attendance/{uid}_{yyyy-mm-dd}`, así
 * un usuario no puede marcar dos veces el mismo día) y, en la misma
 * transacción, mantiene los contadores desnormalizados de
 * `crossfit-users/{uid}` según las reglas del plan §4:
 *
 *   1. Marcar → total_attended_days += 1 y current_streak += 1
 *   2. Si current_streak > max_streak → actualizar max_streak
 *   3. Domingos y días sin WOD no reinician current_streak (ver `streakContinues`)
 *
 * `markAttendance` guarda además un snapshot `_attendanceUndo` con los valores
 * previos, para que `unmarkAttendance` pueda revertir la marca de HOY sin
 * recalcular todo el historial. Hoy ninguna pantalla lo llama —el dock de
 * asistencia ya no ofrece "deshacer"—, pero el snapshot se sigue escribiendo:
 * es la única forma de desmarcar sin releer el historial completo.
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
  | { ok: true; alreadyMarked: boolean }
  | { ok: false; reason: "guest" | "not-configured" | "error" };

export async function markAttendance(): Promise<MarkAttendanceResult> {
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

      const u = userSnap.data() ?? {};
      const prevCurrent = (u[STREAK_FIELDS.current] as number | undefined) ?? 0;
      const prevMax = (u[STREAK_FIELDS.max] as number | undefined) ?? 0;
      const prevTotal = (u[STREAK_FIELDS.total] as number | undefined) ?? 0;
      const last = (u[STREAK_FIELDS.last] as string | undefined) ?? null;

      const current =
        last == null
          ? 1
          : streakContinues(last, today, trainingWeekdays)
            ? prevCurrent + 1
            : 1;

      tx.set(attendanceRef, { uid, date: today, createdAt: Timestamp.now() });
      tx.set(
        userRef,
        {
          [STREAK_FIELDS.current]: current,
          [STREAK_FIELDS.max]: Math.max(prevMax, current),
          [STREAK_FIELDS.total]: prevTotal + 1,
          [STREAK_FIELDS.last]: today,
          _attendanceUndo: {
            current_streak: prevCurrent,
            max_streak: prevMax,
            total_attended_days: prevTotal,
            last_attendance_date: last,
            date: today,
          } satisfies AttendanceUndo,
        },
        { merge: true },
      );

      return false;
    });

    revalidatePath("/", "layout");
    return { ok: true, alreadyMarked };
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
