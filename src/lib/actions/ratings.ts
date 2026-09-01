"use server";

import { Timestamp } from "firebase-admin/firestore";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { adminDb, isAdminConfigured } from "@/lib/firebase/admin";
import { COLLECTIONS, ratingId } from "@/lib/firebase/collections";

/**
 * Calificación 1–5 del WOD de una fecha. Un doc por usuario y por WOD
 * (`crossfit-ratings/{uid}_{yyyy-mm-dd}`), así volver a puntuar pisa el voto
 * anterior en vez de acumular.
 *
 * No dispara notificación: el plan §5 sólo notifica WOD nuevo, comentario y
 * like — no las calificaciones.
 */

export type RateWodResult =
  | { ok: true }
  | { ok: false; reason: "guest" | "not-configured" | "invalid" | "error" };

export async function rateWod(
  wodDate: string,
  stars: number,
): Promise<RateWodResult> {
  const session = await getSession();
  if (!session) return { ok: false, reason: "guest" };
  if (!isAdminConfigured()) return { ok: false, reason: "not-configured" };

  const value = Math.round(stars);
  if (!Number.isInteger(value) || value < 1 || value > 5) {
    return { ok: false, reason: "invalid" };
  }

  try {
    await adminDb()
      .collection(COLLECTIONS.ratings)
      .doc(ratingId(session.uid, wodDate))
      .set(
        { uid: session.uid, wodDate, stars: value, updatedAt: Timestamp.now() },
        { merge: true },
      );

    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    console.error("[ratings] no se pudo guardar la calificación:", err);
    return { ok: false, reason: "error" };
  }
}
