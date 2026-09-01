"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { Button, Input } from "lib-kit-components";
import { authErrorMessage } from "@/lib/auth/firebase-errors";
import { postSession } from "@/lib/auth/session-client";
import { firebaseAuth } from "@/lib/firebase/client";
import { AuthCard, AuthDivider, AuthError } from "./auth-card";
import { GoogleButton } from "./google-button";

export function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("La contraseña tiene que tener al menos 6 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(
        firebaseAuth(),
        email.trim(),
        password,
      );
      const displayName = name.trim();
      if (displayName) await updateProfile(cred.user, { displayName });

      // `true` fuerza refrescar el token para que lleve el displayName recién puesto.
      const res = await postSession(await cred.user.getIdToken(true));
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
      title="Creá tu cuenta"
      subtitle="Es gratis. Empezá a sumar días al ranking del box."
      footer={
        <>
          ¿Ya tenés cuenta?{" "}
          <Link href="/login" className="font-semibold text-primary">
            Ingresá
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="flex flex-col gap-4">
        <AuthError message={error} />
        <Input
          label="Nombre"
          type="text"
          autoComplete="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
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
          autoComplete="new-password"
          required
          hint="Mínimo 6 caracteres"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Input
          label="Repetir contraseña"
          type="password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        <Button type="submit" fullWidth loading={loading}>
          Crear cuenta
        </Button>
      </form>

      <AuthDivider />
      <GoogleButton label="Registrarme con Google" onError={setError} />
    </AuthCard>
  );
}
