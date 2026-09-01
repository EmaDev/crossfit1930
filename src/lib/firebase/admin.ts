import "server-only";

import { cert, getApp, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

/**
 * Init de `firebase-admin` (sólo servidor). Es el único camino para LEER en
 * `lib/data/` y para ESCRIBIR desde Server Actions.
 *
 * Mientras no existan las credenciales, `isAdminConfigured()` devuelve false y
 * la app sigue corriendo en modo degradado (lecturas vacías) en vez de romper
 * el render. Ver `.env.example`.
 */

const APP_NAME = "crossfit-admin";

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
// En .env la clave viaja con los saltos de línea escapados como \n literales.
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

export function isAdminConfigured(): boolean {
  return Boolean(projectId && clientEmail && privateKey);
}

function getAdminApp(): App {
  if (!isAdminConfigured()) {
    throw new Error(
      "Firebase admin sin configurar: faltan FIREBASE_ADMIN_PROJECT_ID / FIREBASE_ADMIN_CLIENT_EMAIL / FIREBASE_ADMIN_PRIVATE_KEY. Ver .env.example.",
    );
  }

  // Next.js recarga los módulos en dev: reusar la app ya inicializada.
  const existing = getApps().find((a) => a.name === APP_NAME);
  if (existing) return getApp(APP_NAME);

  return initializeApp(
    { credential: cert({ projectId, clientEmail, privateKey }) },
    APP_NAME,
  );
}

export function adminAuth(): Auth {
  return getAuth(getAdminApp());
}

export function adminDb(): Firestore {
  return getFirestore(getAdminApp());
}
