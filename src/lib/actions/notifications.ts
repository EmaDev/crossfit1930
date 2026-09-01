"use server";

import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { adminDb, isAdminConfigured } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";

/**
 * Mutaciones del centro de notificaciones. La UI actualiza optimista y estas
 * acciones persisten; si fallan (o hay un invitado) no pasa nada visible, el
 * feed vuelve a su estado real en el próximo render del servidor.
 */

/** Mueve el watermark: todo lo anterior a este instante queda leído. */
export async function markAllNotificationsRead(): Promise<void> {
  const session = await getSession();
  if (!session || !isAdminConfigured()) return;

  await adminDb()
    .collection(COLLECTIONS.users)
    .doc(session.uid)
    .set({ lastReadAt: Timestamp.now() }, { merge: true });

  revalidatePath("/", "layout");
}

/** Descarte por ítem: se guarda el id suelto, no mueve el watermark. */
export async function dismissNotification(id: string): Promise<void> {
  const session = await getSession();
  if (!session || !isAdminConfigured()) return;

  await adminDb()
    .collection(COLLECTIONS.users)
    .doc(session.uid)
    .set({ dismissedNotifications: FieldValue.arrayUnion(id) }, { merge: true });

  revalidatePath("/", "layout");
}
