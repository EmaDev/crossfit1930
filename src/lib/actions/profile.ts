"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { adminDb, isAdminConfigured } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import type { PersonalRecord } from "@/lib/data/profile";

/**
 * Mutaciones de perfil (Fase 7): datos de contacto/bio/foto y la lista de PRs.
 *
 * La foto va como **data URL directo en Firestore**, no a Firebase Storage:
 * no hay bucket ni reglas de Storage configuradas todavía, y para una imagen
 * chica (avatar) el límite de 1 MiB por doc de Firestore alcanza de sobra. Si
 * más adelante hace falta subir fotos más pesadas (galería, portadas), ahí sí
 * hay que sumar Storage — acá se cortó a propósito.
 */

const MAX_PHOTO_BYTES = 350_000; // deja margen bajo el límite de 1 MiB del doc completo

export type SaveProfileResult =
  | { ok: true }
  | { ok: false; reason: "guest" | "not-configured" | "invalid" | "photo-too-large" | "error" };

export async function saveProfile(input: {
  name: string;
  phone: string;
  bio: string;
  /** `null` deja la foto como está; `""` la borra; un data URL nuevo la reemplaza. */
  photo: string | null;
}): Promise<SaveProfileResult> {
  const session = await getSession();
  if (!session) return { ok: false, reason: "guest" };
  if (!isAdminConfigured()) return { ok: false, reason: "not-configured" };

  const name = input.name.trim();
  if (!name) return { ok: false, reason: "invalid" };

  if (input.photo && input.photo.length > MAX_PHOTO_BYTES) {
    return { ok: false, reason: "photo-too-large" };
  }

  try {
    await adminDb()
      .collection(COLLECTIONS.users)
      .doc(session.uid)
      .set(
        {
          name,
          phone: input.phone.trim(),
          bio: input.bio.trim(),
          ...(input.photo !== null ? { photo: input.photo || null } : {}),
        },
        { merge: true },
      );

    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    console.error("[profile] no se pudo guardar el perfil:", err);
    return { ok: false, reason: "error" };
  }
}

export type SavePrResult =
  | { ok: true }
  | { ok: false; reason: "guest" | "not-configured" | "invalid" | "error" };

/** Alta o edición: `id` presente = edita, ausente = crea. */
export async function savePr(input: {
  id?: string;
  name: string;
  value: string;
}): Promise<SavePrResult> {
  const session = await getSession();
  if (!session) return { ok: false, reason: "guest" };
  if (!isAdminConfigured()) return { ok: false, reason: "not-configured" };

  const name = input.name.trim();
  const value = input.value.trim();
  if (!name || !value) return { ok: false, reason: "invalid" };

  try {
    const ref = adminDb().collection(COLLECTIONS.users).doc(session.uid);
    await adminDb().runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const prs: PersonalRecord[] = Array.isArray(snap.data()?.prs) ? snap.data()!.prs : [];
      const entry: PersonalRecord = {
        id: input.id ?? randomUUID(),
        name,
        value,
        updatedAt: Date.now(),
      };
      const next = input.id
        ? prs.map((p) => (p.id === input.id ? entry : p))
        : [...prs, entry];
      tx.set(ref, { prs: next }, { merge: true });
    });

    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    console.error("[profile] no se pudo guardar el PR:", err);
    return { ok: false, reason: "error" };
  }
}

export async function deletePr(id: string): Promise<SavePrResult> {
  const session = await getSession();
  if (!session) return { ok: false, reason: "guest" };
  if (!isAdminConfigured()) return { ok: false, reason: "not-configured" };

  try {
    const ref = adminDb().collection(COLLECTIONS.users).doc(session.uid);
    await adminDb().runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const prs: PersonalRecord[] = Array.isArray(snap.data()?.prs) ? snap.data()!.prs : [];
      tx.set(ref, { prs: prs.filter((p) => p.id !== id) }, { merge: true });
    });

    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    console.error("[profile] no se pudo borrar el PR:", err);
    return { ok: false, reason: "error" };
  }
}
