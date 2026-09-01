"use client";

import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

/**
 * Firebase client SDK. Su ÚNICO trabajo es la autenticación en el browser
 * (email/password + Google): el usuario se loguea acá, mandamos el idToken al
 * servidor y desde ahí se crea la session cookie (ver `lib/auth/session.ts`).
 *
 * Las lecturas de Firestore NO pasan por acá — van por `firebase-admin` en
 * `lib/data/`, para que la pantalla llegue renderizada desde el servidor.
 */

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export function isClientConfigured(): boolean {
  return Boolean(config.apiKey && config.authDomain && config.projectId && config.appId);
}

export function firebaseApp(): FirebaseApp {
  if (!isClientConfigured()) {
    throw new Error(
      "Firebase client sin configurar: faltan las NEXT_PUBLIC_FIREBASE_*. Ver .env.example.",
    );
  }
  return getApps().length ? getApp() : initializeApp(config as Required<typeof config>);
}

export function firebaseAuth(): Auth {
  return getAuth(firebaseApp());
}
