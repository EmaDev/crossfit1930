// Quita el custom claim de admin a un usuario, buscándolo por email.
//
//   npm run admin:revoke -- persona@ejemplo.com
//
// Corre fuera de Next: lee las credenciales de `.env.local` vía `--env-file`
// (ya incluido en el script de package.json).
import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const email = process.argv[2];
if (!email) {
  console.error("Falta el email.\nUso: npm run admin:revoke -- persona@ejemplo.com");
  process.exit(1);
}

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

if (!projectId || !clientEmail || !privateKey) {
  console.error(
    "Faltan credenciales admin (FIREBASE_ADMIN_PROJECT_ID / _CLIENT_EMAIL / _PRIVATE_KEY).\n" +
      "Si las tenés en .env.local, corré:\n" +
      "  node --env-file=.env.local scripts/admin-revoke.mjs " + email,
  );
  process.exit(1);
}

initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });

try {
  const auth = getAuth();
  const user = await auth.getUserByEmail(email);
  await auth.setCustomUserClaims(user.uid, {});
  console.log(`OK — ${email} (uid ${user.uid}) ya no es admin.`);
  console.log("El cambio aplica en su próximo login.");
} catch (err) {
  console.error(`No se pudo quitar el claim a ${email}:`, err?.message ?? err);
  process.exit(1);
}
