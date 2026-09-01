"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { Button, Input } from "lib-kit-components";
import { authErrorMessage } from "@/lib/auth/firebase-errors";
import { postSession } from "@/lib/auth/session-client";
import { firebaseAuth } from "@/lib/firebase/client";
import { AuthCard, AuthDivider, AuthError } from "./auth-card";
import { GoogleButton } from "./google-button";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(
        firebaseAuth(),
        email.trim(),
        password,
      );
      const res = await postSession(await cred.user.getIdToken());
      if (!res.ok) throw new Error("session");
      router.replace("/");
      router.refresh();
    } catch (err) {
      setError(authErrorMessage((err as { code?: string })?.code));
      setLoading(false);
    }
  };

  return (
    <AuthCard
      title="Ingresá a tu cuenta"
      subtitle="Marcá asistencia, sumá racha y seguí tu progreso."
      footer={
        <>
          ¿No tenés cuenta?{" "}
          <Link href="/registro" className="font-semibold text-primary">
            Registrate
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="flex flex-col gap-4">
        <AuthError message={error} />
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          label="Contraseña"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Link
          href="/recuperar"
          className="-mt-1 self-end text-xs font-medium text-muted hover:text-foreground"
        >
          Olvidé mi contraseña
        </Link>
        <Button type="submit" fullWidth loading={loading}>
          Ingresar
        </Button>
      </form>

      <AuthDivider />
      <GoogleButton onError={setError} />
    </AuthCard>
  );
}
