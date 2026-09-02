// Diagnóstico: corre la MISMA query que `listRoutineWeeks()` en
// `src/lib/data/wods.ts` (orderBy documentId desc) contra `crossfit-routines`,
// fuera de Next. Si acá salen las 3 filas pero `/admin` no, el problema es
// env/cache del dev server, no la data.
//
//   npm run list:routines
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore, FieldPath } from "firebase-admin/firestore";

const COLLECTION = "crossfit-routines";

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

if (!projectId || !clientEmail || !privateKey) {
  console.error("Faltan credenciales admin en .env.local (FIREBASE_ADMIN_*).");
  process.exit(1);
}

console.log(`Proyecto: ${projectId}\n`);

initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
const db = getFirestore();

try {
  const snap = await db
    .collection(COLLECTION)
    .orderBy(FieldPath.documentId(), "desc")
    .get();

  console.log(`listRoutineWeeks() devolvería ${snap.size} fila(s):`);
  snap.docs.forEach((doc) => {
    const data = doc.data();
    const days = Array.isArray(data.days) ? data.days.length : 0;
    console.log(`  - ${doc.id}  ${data.name ?? "(sin nombre)"}  ·  ${days} día(s)`);
  });
} catch (err) {
  console.error("La query FALLÓ (esto es lo que ves como lista vacía en /admin):");
  console.error(err?.message ?? err);
  process.exit(1);
}
