// Otorga el custom claim { admin: true } a un usuario, buscándolo por email.
// El claim habilita el panel de carga de WODs (Fase 2).
//
//   npm run admin:grant -- persona@ejemplo.com
//
// Corre fuera de Next: lee las credenciales de `.env.local` vía `--env-file`
// (ya incluido en el script de package.json).
import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const email = process.argv[2];
if (!email) {
  console.error("Falta el email.\nUso: npm run admin:grant -- persona@ejemplo.com");
  process.exit(1);
}

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

if (!projectId || !clientEmail || !privateKey) {
  console.error(
    "Faltan credenciales admin (FIREBASE_ADMIN_PROJECT_ID / _CLIENT_EMAIL / _PRIVATE_KEY).\n" +
      "Si las tenés en .env.local, corré:\n" +
      "  node --env-file=.env.local scripts/admin-grant.mjs " + email,
  );
  process.exit(1);
}

initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });

try {
  const auth = getAuth();
  const user = await auth.getUserByEmail(email);
  await auth.setCustomUserClaims(user.uid, { admin: true });
  console.log(`OK — ${email} (uid ${user.uid}) ahora es admin.`);
  console.log("Tiene que cerrar sesión y volver a entrar para que el claim tome efecto.");
} catch (err) {
  console.error(`No se pudo otorgar el claim a ${email}:`, err?.message ?? err);
  process.exit(1);
}
