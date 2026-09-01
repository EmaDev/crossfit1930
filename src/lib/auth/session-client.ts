/**
 * Cliente del route handler `/api/session`. Lo usan los formularios de auth y
 * el botón de logout. Son funciones sueltas (no un hook): se importan desde
 * componentes cliente pero no necesitan `"use client"`.
 */

export type PostSessionResult = {
  ok: boolean;
  admin?: boolean;
  reason?: string;
};

/** Canjea el `idToken` del SDK web por la session cookie httpOnly del servidor. */
export async function postSession(idToken: string): Promise<PostSessionResult> {
  try {
    const res = await fetch("/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    });
    return (await res.json()) as PostSessionResult;
  } catch {
    return { ok: false, reason: "network" };
  }
}

/** Borra la session cookie (logout). */
export async function deleteSession(): Promise<void> {
  try {
    await fetch("/api/session", { method: "DELETE" });
  } catch {
    /* offline: la cookie caduca sola a los 14 días */
  }
}
