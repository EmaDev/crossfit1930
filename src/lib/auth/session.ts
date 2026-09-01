import "server-only";

import { cookies } from "next/headers";
import { adminAuth, isAdminConfigured } from "@/lib/firebase/admin";

/**
 * Session cookie de Firebase Auth, verificada del lado del servidor.
 *
 * El flujo completo (fase 1): el cliente se loguea con el SDK web, manda el
 * `idToken` a una route handler, ésta llama a `createSessionCookie()` y setea
 * la cookie httpOnly. De ahí en más cada Server Component pide `getSession()`.
 *
 * La app es guest-first: `getSession()` devolviendo `null` es el caso normal,
 * no un error. Nunca tira — si Firebase no está configurado o la cookie está
 * vencida, es un invitado.
 */

export const SESSION_COOKIE = "crossfit_session";

/** 14 días, el máximo que admite `createSessionCookie` es 14. */
export const SESSION_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

export type Session = {
  uid: string;
  email: string | null;
  name: string | null;
  picture: string | null;
  /** Custom claim `{ admin: true }`, otorgado sólo por `npm run admin:grant`. */
  admin: boolean;
};

export async function getSession(): Promise<Session | null> {
  if (!isAdminConfigured()) return null;

  const cookie = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!cookie) return null;

  try {
    // `true` = chequear también que la sesión no haya sido revocada.
    const decoded = await adminAuth().verifySessionCookie(cookie, true);
    return {
      uid: decoded.uid,
      email: decoded.email ?? null,
      name: (decoded.name as string | undefined) ?? null,
      picture: (decoded.picture as string | undefined) ?? null,
      admin: decoded.admin === true,
    };
  } catch {
    // Cookie vencida, revocada o manipulada: invitado.
    return null;
  }
}

/** Atajo para los guards del segmento `admin/`. */
export async function requireAdmin(): Promise<Session | null> {
  const session = await getSession();
  return session?.admin ? session : null;
}

/** Canjea un `idToken` del SDK web por una session cookie. Lo usa el login (fase 1). */
export async function createSessionCookie(idToken: string): Promise<string> {
  return adminAuth().createSessionCookie(idToken, { expiresIn: SESSION_MAX_AGE_MS });
}

/** Opciones compartidas por el `set` del login y el `delete` del logout. */
export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  maxAge: SESSION_MAX_AGE_MS / 1000,
} as const;
