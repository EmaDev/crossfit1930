// Reset de la colección `crossfit-routines`: BORRA todos los docs existentes y
// luego inserta un set fijo de semanas de rutina (IDs autogenerados).
//
//   npm run seed:routines -- --yes
//
// Corre fuera de Next: lee las credenciales admin de `.env.local` vía
// `--env-file` (ya incluido en el script de package.json). Son las mismas que
// usan `npm run admin:grant|revoke`.
//
// ⚠️  La base es COMPARTIDA con otro proyecto y esto es DESTRUCTIVO: elimina
//     TODA la colección `crossfit-routines`. Sin `--yes` sólo muestra qué haría.
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

// Igual que `src/lib/firebase/collections.ts`: toda colección de esta app lleva
// el prefijo `crossfit-`.
const COLLECTION = "crossfit-routines";

// Semanas a sembrar, adaptadas al modelo del código
// (`src/lib/data/routine-types.ts`): cada día es `{ weekday, title, exercises[] }`.
// Los `dias` originales sólo traen un título por día, así que `exercises` queda
// vacío. El orden de la lista es el orden en que se insertan.
const SOURCE = [
  {
    nombre: "Juli | Semana 125",
    tipo: "crossfit",
    dias: [
      "lunes: Snatch & Dual AMRAP",
      "martes: Clean Complex & 20 Rounds Metcon",
      "miércoles: Push Press & Upper Body AMRAP",
      "jueves: Unilateral Deadlift & EMOM Conditioning",
      "viernes: Overhead Lunges & Hyrox Day",
    ],
  },
  {
    nombre: "Jaldin Semana 124",
    tipo: "crossfit",
    dias: [
      "martes: Power Snatch & Conditioning",
      "miércoles: Back Squat & Gymnastics / Quads",
      "jueves: Skill Gimnástico & Doble WOD",
      "viernes: Power Clean Complex & Metcon",
    ],
  },
  {
    nombre: "CrossFit WOD",
    tipo: "crossfit",
    dias: [
      "lunes: Descanso",
      "martes: Gymnastics & Metcon",
      "miércoles: Descanso",
      "jueves: Descanso",
      "viernes: Descanso",
      "sábado: Descanso",
      "domingo: Descanso",
    ],
  },
];

const VALID_WEEKDAYS = new Set([
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
  "domingo",
]);

/** "lunes: Snatch & Dual AMRAP" → { weekday: "lunes", title: "Snatch & Dual AMRAP", exercises: [] } */
function parseDay(raw) {
  const idx = raw.indexOf(":");
  if (idx === -1) throw new Error(`Día sin ":" separando el weekday: "${raw}"`);
  const weekday = raw.slice(0, idx).trim().toLowerCase();
  const title = raw.slice(idx + 1).trim();
  if (!VALID_WEEKDAYS.has(weekday)) throw new Error(`Weekday inválido: "${weekday}" (en "${raw}")`);
  if (!title) throw new Error(`Día sin título: "${raw}"`);
  return { weekday, title, exercises: [] };
}

/** Semana del JSON original → doc con la forma que escribe `saveRoutine()`. */
function toRoutineDoc(src) {
  const now = Timestamp.now();
  return {
    name: src.nombre.trim(),
    type: (src.tipo || "crossfit").trim(),
    description: "",
    days: src.dias.map(parseDay),
    createdAt: now,
    updatedAt: now,
  };
}

const apply = process.argv.slice(2).some((a) => a === "--yes" || a === "-y");

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

if (!projectId || !clientEmail || !privateKey) {
  console.error(
    "Faltan credenciales admin (FIREBASE_ADMIN_PROJECT_ID / _CLIENT_EMAIL / _PRIVATE_KEY).\n" +
      "Si las tenés en .env.local, corré:\n" +
      "  node --env-file=.env.local scripts/seed-routines.mjs --yes",
  );
  process.exit(1);
}

// Validar/transformar ANTES de tocar la base: si algún día está mal escrito,
// abortamos sin haber borrado nada.
let docs;
try {
  docs = SOURCE.map(toRoutineDoc);
} catch (err) {
  console.error("El set a sembrar es inválido:", err?.message ?? err);
  process.exit(1);
}

initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
const db = getFirestore();
const col = db.collection(COLLECTION);

if (!apply) {
  const existing = await col.get();
  console.log(`DRY RUN — no se escribe nada. Volvé a correr con --yes para aplicar.\n`);
  console.log(`Borraría ${existing.size} doc(s) de "${COLLECTION}":`);
  existing.forEach((d) => console.log(`  - ${d.id}  (${d.data().name ?? d.data().nombre ?? "sin nombre"})`));
  console.log(`\nInsertaría ${docs.length} rutina(s) (IDs autogenerados):`);
  docs.forEach((d) => console.log(`  + ${d.name}  ·  ${d.days.length} día(s): ${d.days.map((x) => x.weekday).join(", ")}`));
  process.exit(0);
}

async function wipeCollection() {
  let deleted = 0;
  for (;;) {
    const snap = await col.limit(400).get();
    if (snap.empty) break;
    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    deleted += snap.size;
  }
  return deleted;
}

try {
  const deleted = await wipeCollection();
  console.log(`Borrados ${deleted} doc(s) de "${COLLECTION}".`);

  const batch = db.batch();
  for (const doc of docs) batch.set(col.doc(), doc);
  await batch.commit();

  console.log(`Insertadas ${docs.length} rutina(s):`);
  docs.forEach((d) => console.log(`  + ${d.name}  (${d.days.length} día/s)`));
  console.log("Listo.");
} catch (err) {
  console.error("Falló el seed:", err?.message ?? err);
  process.exit(1);
}
