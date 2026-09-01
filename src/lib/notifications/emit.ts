import "server-only";

import { Timestamp } from "firebase-admin/firestore";
import type { NotificationTone } from "lib-kit-components";
import { adminDb, isAdminConfigured } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import type { NotificationType } from "@/lib/data/notifications";

/**
 * Emite un doc en el feed broadcast `crossfit-notifications`. Lo llaman las
 * Server Actions que generan actividad visible para el resto del box
 * (comentario nuevo, primer like) y, en la Fase 2, la que publica un WOD.
 *
 * NO es una Server Action (no lleva `"use server"`): es un helper de servidor
 * que se llama desde ellas.
 *
 * Nunca tira: una notificación que no se pudo escribir no puede hacer fallar la
 * mutación que la originó. Sin credenciales de Firebase es un no-op.
 *
 * `getNotifications` ya filtra por `actorUid` para que al autor de la acción no
 * le aparezca su propia notificación.
 */
export type BroadcastNotification = {
  type: NotificationType;
  title: string;
  description?: string;
  link?: string;
  tone?: NotificationTone;
  actorUid?: string;
};

export async function emitBroadcastNotification(
  n: BroadcastNotification,
): Promise<void> {
  if (!isAdminConfigured()) return;

  try {
    await adminDb()
      .collection(COLLECTIONS.notifications)
      .add({
        type: n.type,
        title: n.title,
        description: n.description ?? null,
        link: n.link ?? null,
        tone: n.tone ?? "neutral",
        actorUid: n.actorUid ?? null,
        createdAt: Timestamp.now(),
      });
  } catch (err) {
    console.error("[notifications] no se pudo emitir la notificación:", err);
  }
}
