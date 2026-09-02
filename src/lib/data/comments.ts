import "server-only";

import type { Comment } from "lib-kit-components";
import { adminDb, isAdminConfigured } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { getAdminUids } from "@/lib/data/admins";

/**
 * Comentarios de la comunidad para el WOD de una fecha, en el formato plano que
 * consume el `CommentBox` del kit (él arma el hilo de un nivel a partir de
 * `parentId`). El autor viaja desnormalizado en el doc
 * (`authorName` / `authorPhoto`) para no leer `crossfit-users` por comentario.
 *
 * Se ordena en memoria (no en la query) para no obligar a un índice compuesto
 * `wodDate + createdAt`; los comentarios de un WOD son un puñado.
 *
 * Modo degradado / invitado → lista vacía.
 */
export async function getComments(
  wodDate: string,
  uid: string | null,
): Promise<Comment[]> {
  if (!isAdminConfigured()) return [];

  try {
    const [snap, adminUids] = await Promise.all([
      adminDb()
        .collection(COLLECTIONS.comments)
        .where("wodDate", "==", wodDate)
        .get(),
      getAdminUids(),
    ]);

    return snap.docs
      .filter((doc) => !adminUids.has(doc.data().uid)) // los admin no se ven en el cliente
      .map((doc) => {
        const d = doc.data();
        const likedBy: string[] = Array.isArray(d.likedBy) ? d.likedBy : [];

        return {
          id: doc.id,
          author: (d.authorName as string | undefined) ?? "Atleta",
          avatar: (d.authorPhoto as string | undefined) ?? undefined,
          text: (d.text as string | undefined) ?? "",
          at: d.createdAt?.toMillis?.() ?? 0,
          likes: likedBy.length,
          liked: uid ? likedBy.includes(uid) : false,
          parentId: (d.parentId as string | undefined) ?? null,
        } satisfies Comment;
      })
      .sort((a, b) => a.at - b.at);
  } catch (err) {
    console.error("[comments] no se pudieron leer los comentarios:", err);
    return [];
  }
}
