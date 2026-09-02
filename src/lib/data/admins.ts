import "server-only";

import { cache } from "react";
import { adminDb, isAdminConfigured } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";

/**
 * UIDs con rol admin — espejo del custom claim en `crossfit-users/{uid}.admin`
 * (lo escriben `/api/session` en cada login y los scripts `admin:grant|revoke`).
 *
 * Los admin son staff, no atletas: NO aparecen en ninguna vista de la app de
 * cliente (ranking, comentarios, promedio de calificaciones). `cache()` deja
 * esto en una sola query por request aunque lo pidan varios `lib/data/*`.
 *
 * Modo degradado / sin credenciales → set vacío.
 */
export const getAdminUids = cache(async (): Promise<Set<string>> => {
  if (!isAdminConfigured()) return new Set<string>();

  try {
    const snap = await adminDb()
      .collection(COLLECTIONS.users)
      .where("admin", "==", true)
      .get();
    return new Set(snap.docs.map((doc) => doc.id));
  } catch (err) {
    console.error("[admins] no se pudo leer la lista de admins:", err);
    return new Set<string>();
  }
});
