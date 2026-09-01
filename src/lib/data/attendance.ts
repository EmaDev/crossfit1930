import "server-only";

import { adminDb, isAdminConfigured } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";

/**
 * Días en los que el usuario marcó asistencia, para el calendario del detalle
 * de racha (el BottomSheet que se abre desde la card del header).
 *
 * Devuelve las fechas como `yyyy-mm-dd` (la misma clave que usa el doc de
 * asistencia: `crossfit-attendance/{uid}_{yyyy-mm-dd}`). Se traen todas de una:
 * la asistencia de una persona es acotada (un puñado por semana) y así el
 * calendario navega entre meses sin una query por mes.
 *
 * Igual que `getUserStats`: si Firebase no está configurado o el usuario es
 * invitado, devuelve una lista vacía en vez de romper el render. Quien crea
 * estas marcas es la Server Action de asistencia (fase 3).
 */
export async function getAttendedDates(uid: string | null): Promise<string[]> {
  if (!uid || !isAdminConfigured()) return [];

  try {
    const snap = await adminDb()
      .collection(COLLECTIONS.attendance)
      .where("uid", "==", uid)
      .get();

    const dates = snap.docs.map((doc) => {
      // El campo `date` es la fuente; si faltara, se saca del doc ID
      // (`{uid}_{yyyy-mm-dd}`) — el UID de Firebase no lleva guiones bajos.
      const data = doc.data();
      return (data.date as string | undefined) ?? doc.id.slice(uid.length + 1);
    });

    return dates.filter(Boolean).sort();
  } catch (err) {
    console.error("[attendance] no se pudieron leer las marcas de asistencia:", err);
    return [];
  }
}
