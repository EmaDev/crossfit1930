"use server";

import { Timestamp } from "firebase-admin/firestore";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";
import {
  isMondayIso,
  sectionOf,
  type Exercise,
  type RoutineDay,
  type Weekday,
} from "@/lib/data/wods";
import { adminDb, isAdminConfigured } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { emitBroadcastNotification } from "@/lib/notifications/emit";

/**
 * Alta/edición de una semana de rutina (Fase 2 · panel de admin).
 *
 * Sólo notifica cuando el doc se crea por primera vez, no en cada edición
 * posterior: el plan dice "guardar un WOD emite notificación", pero avisarle
 * al box cada vez que el coach corrige una coma sería ruido, no aviso.
 */

export type RoutineInput = {
  name: string;
  type: string;
  description: string;
  days: RoutineDay[];
};

export type SaveRoutineResult =
  | { ok: true; created: boolean }
  | { ok: false; reason: "forbidden" | "not-configured" | "invalid" | "error" };

/**
 * `section` se guarda SIEMPRE, aunque el coach no la haya tocado: se resuelve
 * con `sectionOf` (elección explícita o deducción por nombre) para que el doc
 * quede autodescriptivo y la card no dependa de adivinar el bloque.
 */
function sanitizeExercises(exercises: Exercise[]): Exercise[] {
  return exercises
    .map((e) => ({ name: e.name.trim(), detail: e.detail.trim(), section: sectionOf(e) }))
    .filter((e) => e.name || e.detail);
}

function sanitizeDays(days: RoutineDay[]): RoutineDay[] {
  return days
    .map((d) => {
      const kind = d.kind === "descanso" ? ("descanso" as const) : ("training" as const);
      return {
        weekday: d.weekday,
        kind,
        title: d.title.trim(),
        exercises: kind === "descanso" ? [] : sanitizeExercises(d.exercises),
      };
    })
    .filter((d) => d.kind === "descanso" || (d.title && d.exercises.length > 0));
}

export async function saveRoutine(
  weekStart: string,
  input: RoutineInput,
): Promise<SaveRoutineResult> {
  const session = await requireAdmin();
  if (!session) return { ok: false, reason: "forbidden" };
  if (!isAdminConfigured()) return { ok: false, reason: "not-configured" };

  if (!isMondayIso(weekStart)) return { ok: false, reason: "invalid" };
  const name = input.name.trim();
  if (!name) return { ok: false, reason: "invalid" };

  const days = sanitizeDays(input.days);
  const seen = new Set<Weekday>();
  for (const d of days) {
    if (seen.has(d.weekday)) return { ok: false, reason: "invalid" };
    seen.add(d.weekday);
  }

  try {
    const ref = adminDb().collection(COLLECTIONS.routines).doc(weekStart);
    const snap = await ref.get();
    const created = !snap.exists;

    await ref.set(
      {
        name,
        type: input.type.trim() || "crossfit",
        description: input.description.trim(),
        days,
        updatedAt: Timestamp.now(),
        ...(created ? { createdAt: Timestamp.now() } : {}),
      },
      { merge: true },
    );

    if (created) {
      await emitBroadcastNotification({
        type: "wod",
        title: `Nueva semana cargada: ${name}`,
        description: input.description.trim() || undefined,
        link: "/",
        tone: "neutral",
        actorUid: session.uid,
      });
    }

    revalidatePath("/", "layout");
    revalidatePath("/admin");
    return { ok: true, created };
  } catch (err) {
    console.error("[routines] no se pudo guardar la rutina:", err);
    return { ok: false, reason: "error" };
  }
}
