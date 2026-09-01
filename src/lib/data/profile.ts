import "server-only";

import { adminDb, isAdminConfigured } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";

/**
 * Datos de perfil editables (Fase 7): lo que no cubre `Session` (que sale del
 * token) — teléfono, bio, foto propia y PRs. Vive en `crossfit-users/{uid}`,
 * el mismo doc que ya mantienen `ensureUserDoc` y `markAttendance`.
 */

export type PersonalRecord = {
  id: string;
  /** Texto libre: "Back Squat", "Fran", "Murph" — catálogo fijo queda para más adelante (plan §11). */
  name: string;
  /** Texto libre también: "100 kg", "18:32" — cada PR tiene su propia unidad. */
  value: string;
  updatedAt: number;
};

export type Profile = {
  name: string;
  email: string;
  phone: string;
  bio: string;
  /** Foto como data URL (ver `saveProfile`) o `null` para mostrar iniciales. */
  photo: string | null;
  prs: PersonalRecord[];
};

const EMPTY: Profile = { name: "", email: "", phone: "", bio: "", photo: null, prs: [] };

export async function getProfile(uid: string | null): Promise<Profile | null> {
  if (!uid) return null;
  if (!isAdminConfigured()) return EMPTY;

  try {
    const snap = await adminDb().collection(COLLECTIONS.users).doc(uid).get();
    const d = snap.data();
    if (!d) return EMPTY;

    return {
      name: d.name ?? "",
      email: d.email ?? "",
      phone: d.phone ?? "",
      bio: d.bio ?? "",
      photo: d.photo ?? null,
      prs: Array.isArray(d.prs) ? d.prs : [],
    };
  } catch (err) {
    console.error("[profile] no se pudo leer el perfil:", err);
    return EMPTY;
  }
}
