import "server-only";

import { adminDb, isAdminConfigured } from "@/lib/firebase/admin";
import { COLLECTIONS, ratingId } from "@/lib/firebase/collections";

/**
 * Resumen de calificaciones de un WOD (identificado por su fecha
 * `yyyy-mm-dd`), para el `StarRatingWidget` en modo resumen más el voto del
 * usuario actual.
 *
 * Igual que el resto de `lib/data/`: modo degradado (sin credenciales) o
 * invitado → resumen vacío, nunca tira.
 */

export type RatingSummary = {
  average: number;
  count: number;
  /** `[cant. de 1★, 2★, 3★, 4★, 5★]` — el orden que espera `StarRatingWidget`. */
  distribution: number[];
  /** El voto del usuario actual (1–5), o `null` si no votó / es invitado. */
  mine: number | null;
};

const EMPTY: RatingSummary = {
  average: 0,
  count: 0,
  distribution: [0, 0, 0, 0, 0],
  mine: null,
};

export async function getRatingSummary(
  wodDate: string,
  uid: string | null,
): Promise<RatingSummary> {
  if (!isAdminConfigured()) return EMPTY;

  try {
    const snap = await adminDb()
      .collection(COLLECTIONS.ratings)
      .where("wodDate", "==", wodDate)
      .get();

    if (snap.empty) return EMPTY;

    const distribution = [0, 0, 0, 0, 0];
    let sum = 0;
    let mine: number | null = null;

    for (const doc of snap.docs) {
      const stars = Number(doc.data().stars);
      if (!Number.isInteger(stars) || stars < 1 || stars > 5) continue;

      distribution[stars - 1] += 1;
      sum += stars;
      if (uid && doc.id === ratingId(uid, wodDate)) mine = stars;
    }

    const count = distribution.reduce((a, b) => a + b, 0);
    return {
      average: count ? sum / count : 0,
      count,
      distribution,
      mine,
    };
  } catch (err) {
    console.error("[ratings] no se pudo leer el resumen de calificaciones:", err);
    return EMPTY;
  }
}
