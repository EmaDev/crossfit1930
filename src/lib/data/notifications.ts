import "server-only";

import type { AppNotification, NotificationTone } from "lib-kit-components";
import { adminDb, isAdminConfigured } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";

/**
 * Feed de notificaciones. Es **broadcast**: un solo `crossfit-notifications`
 * que leen todos, sin fan-out por usuario.
 *
 * Lo "no leído" no se guarda por ítem: es un watermark en el perfil
 * (`crossfit-users/{uid}.lastReadAt`). Una notificación está sin leer si su
 * `createdAt` es posterior al watermark. "Marcar todas" mueve el watermark;
 * el descarte por ítem sí guarda ids sueltos (`dismissedNotifications`).
 *
 * Server Component only.
 */

const FEED_LIMIT = 50;

export type NotificationType = "wod" | "comment" | "like";

type NotificationDoc = {
  type?: NotificationType;
  title?: string;
  description?: string;
  link?: string;
  tone?: NotificationTone;
  createdAt?: FirebaseFirestore.Timestamp;
  /** Autor de la acción: nunca se le notifica lo que él mismo hizo. */
  actorUid?: string;
};

type UserNotificationState = {
  lastReadAt: number;
  dismissed: Set<string>;
};

async function getUserState(uid: string | null): Promise<UserNotificationState> {
  if (!uid) return { lastReadAt: 0, dismissed: new Set() };

  const snap = await adminDb().collection(COLLECTIONS.users).doc(uid).get();
  const data = snap.data();

  return {
    lastReadAt: data?.lastReadAt?.toMillis?.() ?? 0,
    dismissed: new Set<string>(data?.dismissedNotifications ?? []),
  };
}

/**
 * El feed tal como lo consume `NotificationSidebar`. Para un invitado (`uid`
 * null) devuelve el feed sin marcas de leído: puede mirarlo, no puede tocarlo.
 */
export async function getNotifications(uid: string | null): Promise<AppNotification[]> {
  // Sin credenciales todavía: la app corre igual, con el centro vacío.
  if (!isAdminConfigured()) return [];

  try {
    const [feed, state] = await Promise.all([
      adminDb()
        .collection(COLLECTIONS.notifications)
        .orderBy("createdAt", "desc")
        .limit(FEED_LIMIT)
        .get(),
      getUserState(uid),
    ]);

    return feed.docs
      .filter((doc) => {
        const { actorUid } = doc.data() as NotificationDoc;
        // Nunca se notifica al autor de su propia acción.
        return !state.dismissed.has(doc.id) && !(uid && actorUid === uid);
      })
      .map((doc) => {
        const d = doc.data() as NotificationDoc;
        const createdAt = d.createdAt?.toMillis?.() ?? 0;

        return {
          id: doc.id,
          title: d.title ?? "",
          description: d.description,
          date: createdAt,
          read: uid ? createdAt <= state.lastReadAt : true,
          tone: d.tone ?? "neutral",
          href: d.link,
        } satisfies AppNotification;
      });
  } catch (err) {
    // Un feed caído no puede tumbar el shell entero.
    console.error("[notifications] no se pudo leer el feed:", err);
    return [];
  }
}
