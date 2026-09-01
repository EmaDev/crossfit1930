"use client";

import { useRouter } from "next/navigation";
import { ProfileEditor, useToast, type ProfileFields } from "lib-kit-components";
import { saveProfile } from "@/lib/actions/profile";

const REASON_MESSAGE: Record<string, string> = {
  guest: "Iniciá sesión para editar tu perfil.",
  "not-configured": "Firebase no está configurado en este entorno.",
  invalid: "Poné al menos tu nombre.",
  "photo-too-large": "Esa foto pesa demasiado. Probá con una más chica.",
  error: "Algo falló guardando. Probá de nuevo.",
};

export function ProfileForm({ initial }: { initial: ProfileFields }) {
  const router = useRouter();
  const { toast } = useToast();

  const onSave = async (v: ProfileFields) => {
    const res = await saveProfile({
      name: v.name,
      phone: v.phone,
      bio: v.bio,
      // `null` = "no la toques": evita reescribir la foto de Google en cada guardado si no cambió.
      photo: v.avatar === initial.avatar ? null : v.avatar ?? "",
    });

    if (!res.ok) {
      toast({ title: "No se pudo guardar", description: REASON_MESSAGE[res.reason], variant: "error" });
      return;
    }
    toast({ title: "Perfil actualizado", variant: "success" });
    router.refresh();
  };

  return <ProfileEditor key={initial.email} value={initial} onSave={onSave} bioMaxLength={160} />;
}
