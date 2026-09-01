import "server-only";

import { adminDb, isAdminConfigured } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";

/**
 * Racha y asistencia del usuario, para la card del header.
 *
 * Los contadores viven desnormalizados en `crossfit-users/{uid}` porque se
 * leen en cada pantalla: recalcularlos recorriendo `crossfit-attendance`
 * sería una query por render. Quien los mantiene es la Server Action de
 * asistencia (fase 3), según las reglas del plan:
 *
 *   1. Marcar asistencia → total_attended_days += 1 y current_streak += 1
 *   2. Si current_streak > max_streak → actualizar max_streak
 *   3. Domingos y Rest Day / feriado no reinician current_streak
 */

export type UserStats = {
  currentStreak: number;
  maxStreak: number;
  totalDays: number;
};

const EMPTY: UserStats = { currentStreak: 0, maxStreak: 0, totalDays: 0 };

/** `null` para un invitado: no hay racha que mostrar, hay que ofrecerle registrarse. */
export async function getUserStats(uid: string | null): Promise<UserStats | null> {
  if (!uid) return null;
  if (!isAdminConfigured()) return EMPTY;

  try {
    const snap = await adminDb().collection(COLLECTIONS.users).doc(uid).get();
    const data = snap.data();
    if (!data) return EMPTY;

    return {
      currentStreak: data.current_streak ?? 0,
      maxStreak: data.max_streak ?? 0,
      totalDays: data.total_attended_days ?? 0,
    };
  } catch (err) {
    console.error("[user-stats] no se pudieron leer los contadores:", err);
    return EMPTY;
  }
}
