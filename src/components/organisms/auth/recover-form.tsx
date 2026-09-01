"use client";

import { useState } from "react";
import Link from "next/link";
import { sendPasswordResetEmail } from "firebase/auth";
import { Button, Input } from "lib-kit-components";
import { authErrorMessage } from "@/lib/auth/firebase-errors";
import { firebaseAuth } from "@/lib/firebase/client";
import { AuthCard, AuthError } from "./auth-card";

export function RecoverForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await sendPasswordResetEmail(firebaseAuth(), email.trim());
      setSent(true);
    } catch (err) {
      setError(authErrorMessage((err as { code?: string })?.code));
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <AuthCard
        title="Revisá tu correo"
        subtitle={`Si hay una cuenta con ${email.trim()}, te llega un mail para elegir una contraseña nueva.`}
        footer={
          <Link href="/login" className="font-semibold text-primary">
            Volver a ingresar
          </Link>
        }
      >
        <p className="text-sm text-muted">
          Puede tardar unos minutos. Mirá también la carpeta de spam.
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Recuperar contraseña"
      subtitle="Te enviamos un enlace para elegir una nueva."
      footer={
        <Link href="/login" className="font-semibold text-primary">
          Volver
        </Link>
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
        <Button type="submit" fullWidth loading={loading}>
          Enviarme el enlace
        </Button>
      </form>
    </AuthCard>
  );
}
