import { Timestamp } from "firebase-admin/firestore";
import type { DecodedIdToken } from "firebase-admin/auth";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  createSessionCookie,
  sessionCookieOptions,
} from "@/lib/auth/session";
import { adminAuth, adminDb, isAdminConfigured } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";

/**
 * Puente entre el login del cliente (Firebase SDK web) y la sesión del
 * servidor:
 *
 *   POST   { idToken }  → verifica el token, crea la session cookie httpOnly
 *                         (`crossfit_session`) y asegura el doc de perfil.
 *   DELETE              → borra la cookie (logout).
 *
 * Es un Route Handler, no una Server Action: el form cliente le pega con
 * `fetch` (ver `lib/auth/session-client.ts`).
 */

export async function POST(request: Request): Promise<Response> {
  if (!isAdminConfigured()) {
    return NextResponse.json(
      { ok: false, reason: "not-configured" },
      { status: 503 },
    );
  }

  let idToken: unknown;
  try {
    ({ idToken } = await request.json());
  } catch {
    return NextResponse.json({ ok: false, reason: "bad-request" }, { status: 400 });
  }
  if (typeof idToken !== "string" || !idToken) {
    return NextResponse.json({ ok: false, reason: "bad-request" }, { status: 400 });
  }

  try {
    const decoded = await adminAuth().verifyIdToken(idToken);
    const cookie = await createSessionCookie(idToken);
    (await cookies()).set(SESSION_COOKIE, cookie, sessionCookieOptions);

    await ensureUserDoc(decoded);

    return NextResponse.json({ ok: true, admin: decoded.admin === true });
  } catch (err) {
    console.error("[session] no se pudo crear la sesión:", err);
    return NextResponse.json({ ok: false, reason: "invalid-token" }, { status: 401 });
  }
}

export async function DELETE(): Promise<Response> {
  (await cookies()).delete(SESSION_COOKIE);
  return NextResponse.json({ ok: true });
}

/**
 * Crea `crossfit-users/{uid}` la primera vez (con los contadores de racha en 0,
 * que el resto de la app espera inicializados) y en logins siguientes sólo
 * refresca los datos de perfil.
 */
async function ensureUserDoc(decoded: DecodedIdToken): Promise<void> {
  const ref = adminDb().collection(COLLECTIONS.users).doc(decoded.uid);
  const profile = {
    email: decoded.email ?? null,
    name: decoded.name ?? null,
    photo: decoded.picture ?? null,
  };

  await adminDb().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists) {
      tx.set(ref, { ...profile, lastLoginAt: Timestamp.now() }, { merge: true });
      return;
    }
    tx.set(ref, {
      ...profile,
      registeredAt: Timestamp.now(),
      lastLoginAt: Timestamp.now(),
      current_streak: 0,
      max_streak: 0,
      total_attended_days: 0,
    });
  });
}
