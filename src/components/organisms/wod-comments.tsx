"use client";

import { useTransition } from "react";
import { CommentBox, type Comment } from "lib-kit-components";
import { addComment, toggleCommentLike } from "@/lib/actions/comments";
import { useGuestGate } from "@/components/molecules/guest-gate";

/**
 * Comentarios de la comunidad para el WOD de hoy.
 *
 * El `CommentBox` del kit no actualiza la lista solo (no es optimista): las
 * Server Actions revalidan la home y la lista vuelve ya con el cambio. Toda
 * escritura pasa por el guest gate.
 */
export function WodComments({
  wodDate,
  comments,
  currentUser,
}: {
  wodDate: string;
  comments: Comment[];
  currentUser?: { name: string; avatar?: string };
}) {
  const { requireAuth } = useGuestGate();
  const [, startTransition] = useTransition();

  return (
    <CommentBox
      title="Comentarios de la comunidad"
      comments={comments}
      currentUser={currentUser}
      placeholder="Contá cómo te fue el WOD…"
      onSubmit={(text, parentId) =>
        requireAuth(
          () => startTransition(() => void addComment(wodDate, text, parentId)),
          "Registrate para dejar un comentario.",
        )
      }
      onLike={(id, liked) =>
        requireAuth(
          () => startTransition(() => void toggleCommentLike(id, liked)),
          "Registrate para reaccionar a los comentarios.",
        )
      }
    />
  );
}
