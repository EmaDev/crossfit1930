"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { Button } from "lib-kit-components";
import { deleteSession } from "@/lib/auth/session-client";
import { firebaseAuth, isClientConfigured } from "@/lib/firebase/client";

/**
 * Fila de "Cerrar sesión" en Perfil › Ajustes. Sólo se renderiza si hay
 * sesión (lo decide el Server Component de la página).
 *
 * Borra la cookie del servidor y también cierra la sesión del SDK web, para
 * que un `signInWithPopup` posterior no reactive la cuenta anterior en silencio.
 */
export function SessionSetting({ email }: { email: string | null }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const logout = async () => {
    setLoading(true);
    await deleteSession();
    try {
      if (isClientConfigured()) await signOut(firebaseAuth());
    } catch {
      /* no bloquea el logout del servidor */
    }
    router.replace("/");
    router.refresh();
  };

  return (
    <div className="flex items-center justify-between gap-4 px-4 py-5">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">Sesión</p>
        <p className="mt-1 truncate text-xs text-muted">
          {email ?? "Cuenta activa"}
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        loading={loading}
        onClick={logout}
      >
        Cerrar sesión
      </Button>
    </div>
  );
}
