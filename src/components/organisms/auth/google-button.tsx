"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { Button } from "lib-kit-components";
import { authErrorMessage } from "@/lib/auth/firebase-errors";
import { postSession } from "@/lib/auth/session-client";
import { firebaseAuth } from "@/lib/firebase/client";

/**
 * Acceso con Google vía popup. Al volver, canjea el `idToken` por la session
 * cookie igual que el login con email. Cancelar el popup no se trata como
 * error.
 */
export function GoogleButton({
  label = "Continuar con Google",
  onError,
}: {
  label?: string;
  onError?: (message: string) => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const signIn = async () => {
    onError?.("");
    setLoading(true);
    try {
      const cred = await signInWithPopup(
        firebaseAuth(),
        new GoogleAuthProvider(),
      );
      const res = await postSession(await cred.user.getIdToken());
      if (!res.ok) throw new Error("session");
      router.replace("/");
      router.refresh();
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (
        code === "auth/cancelled-popup-request" ||
        code === "auth/popup-closed-by-user" ||
        code === "auth/user-cancelled"
      ) {
        setLoading(false);
        return;
      }
      onError?.(authErrorMessage(code));
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      fullWidth
      loading={loading}
      onClick={signIn}
    >
      {label}
    </Button>
  );
}
