"use server";

import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { revalidatePath } from "next/cache";
import { getSession, type Session } from "@/lib/auth/session";
import { adminDb, isAdminConfigured } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { emitBroadcastNotification } from "@/lib/notifications/emit";

/**
 * Comentarios de la comunidad sobre el WOD de una fecha, con likes.
 *
 * Cada escritura emite (aparte) una notificación broadcast según el plan §5:
 *   - `addComment`  → siempre.
 *   - `toggleCommentLike` → SÓLO el primer like de un usuario a un comentario
 *     (se lleva registro en `likeNotifiedUids`), nunca los unlike/relike.
 * Nunca se notifica al autor de su propia acción (lo filtra `getNotifications`)
 * ni el like al dueño del comentario.
 */

const MAX_LENGTH = 500;

const preview = (t: string) => (t.length > 120 ? `${t.slice(0, 117)}…` : t);

const firstName = (s: Session) =>
  s.name?.trim().split(/\s+/)[0] || s.email?.split("@")[0] || "Alguien";

export type CommentResult =
  | { ok: true }
  | { ok: false; reason: "guest" | "not-configured" | "invalid" | "error" };

export async function addComment(
  wodDate: string,
  text: string,
  parentId?: string | null,
): Promise<CommentResult> {
  const session = await getSession();
  if (!session) return { ok: false, reason: "guest" };
  if (!isAdminConfigured()) return { ok: false, reason: "not-configured" };

  const body = text.trim().slice(0, MAX_LENGTH);
  if (!body) return { ok: false, reason: "invalid" };

  try {
    await adminDb()
      .collection(COLLECTIONS.comments)
      .add({
        wodDate,
        uid: session.uid,
        authorName: session.name ?? session.email ?? "Atleta",
        authorPhoto: session.picture ?? null,
        text: body,
        parentId: parentId ?? null,
        likedBy: [],
        likeNotifiedUids: [],
        createdAt: Timestamp.now(),
      });

    await emitBroadcastNotification({
      type: "comment",
      title: `${firstName(session)} comentó el WOD`,
      description: preview(body),
      link: "/",
      tone: "neutral",
      actorUid: session.uid,
    });

    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    console.error("[comments] no se pudo publicar el comentario:", err);
    return { ok: false, reason: "error" };
  }
}

export async function toggleCommentLike(
  commentId: string,
  liked: boolean,
): Promise<CommentResult> {
  const session = await getSession();
  if (!session) return { ok: false, reason: "guest" };
  if (!isAdminConfigured()) return { ok: false, reason: "not-configured" };

  const uid = session.uid;
  const db = adminDb();
  const ref = db.collection(COLLECTIONS.comments).doc(commentId);

  try {
    const notifyText = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) return null;

      const d = snap.data() ?? {};
      const likedBy: string[] = Array.isArray(d.likedBy) ? d.likedBy : [];
      const notified: string[] = Array.isArray(d.likeNotifiedUids)
        ? d.likeNotifiedUids
        : [];

      // Único momento que notifica: el primer like de ESTE usuario a ESTE
      // comentario. Los siguientes unlike/relike no vuelven a avisar.
      const firstLike =
        liked && !likedBy.includes(uid) && !notified.includes(uid);

      tx.update(ref, {
        likedBy: liked
          ? FieldValue.arrayUnion(uid)
          : FieldValue.arrayRemove(uid),
        ...(firstLike ? { likeNotifiedUids: FieldValue.arrayUnion(uid) } : {}),
      });

      // No se le avisa al propio autor del comentario.
      return firstLike && d.uid !== uid
        ? ((d.text as string | undefined) ?? "")
        : null;
    });

    if (notifyText != null) {
      await emitBroadcastNotification({
        type: "like",
        title: `A ${firstName(session)} le gustó un comentario`,
        description: preview(notifyText),
        link: "/",
        tone: "neutral",
        actorUid: uid,
      });
    }

    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    console.error("[comments] no se pudo registrar el like:", err);
    return { ok: false, reason: "error" };
  }
}
