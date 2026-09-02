// Reset de la colección `crossfit-routines`: BORRA todos los docs existentes y
// luego inserta un set fijo de semanas de rutina. El doc ID de cada una es el
// LUNES de su semana en `yyyy-mm-dd` — así `getRoutine()` y el historial la
// encuentran (con ID autogenerado la app cae al mock).
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

// Semanas a sembrar. Formato del export del panel (`weekday` numérico
// 0=domingo…6=sábado, ejercicios con `name` + `detail`). Al escribir se adapta
// al modelo del código (`src/lib/data/routine-types.ts`): `weekday` pasa a
// string y se descartan `id` / `exerciseId`.
//
// `date` es cualquier fecha dentro de la semana: el doc ID es el LUNES de esa
// semana en `yyyy-mm-dd` (es como `getRoutine()` / historial las buscan).
const SOURCE = [
  {
    name: "Juli | Semana 125",
    type: "crossfit",
    description:
      "Planificación semanal de 5 días con bloques de Entrada en Calor, Skill/Fuerza y Metcon/WOD",
    date: "2026-08-24T15:55:21.080Z",
    days: [
      {
        weekday: 1,
        title: "Snatch & Dual AMRAP",
        exercises: [
          { name: "Entrada en calor (AMRAP 5 min)", detail: "5 buenos días + 5 push back + 5 OH squats + 10 v-ups" },
          { name: "Skill / Fuerza: Squat Snatch + OHS", detail: "2 sets de 2+2 / 6 sets de 1+2" },
          { name: "Metcon 1 (AMRAP 9 min)", detail: "3 wall walks + 6 pull ups + 12 DB snatchs" },
          { name: "Descanso", detail: "2 min de rest" },
          { name: "Metcon 2 (AMRAP 9 min)", detail: "3 hang power snatch + 6 devil press + 12 T2B (a 1 pie diagonal)" },
        ],
      },
      {
        weekday: 2,
        title: "Clean Complex & 20 Rounds Metcon",
        exercises: [
          { name: "Entrada en calor (Tabata)", detail: "High pull con barra + power clean + front squat + hollow rocks" },
          { name: "Skill / Fuerza: Complex Clean", detail: "6-7 sets: 1 power clean + 1 squat clean + 2 front squats" },
          { name: "Metcon (20 Rounds - TC 30 min)", detail: "9 wall balls (9/6 kg) + 6 burpees + 3 hang squat clean (ubk)" },
        ],
      },
      {
        weekday: 3,
        title: "Push Press & Upper Body AMRAP",
        exercises: [
          { name: "Entrada en calor (Tabata)", detail: "Press estricto + shoulder taps + vuelos posteriores con discos chicos + remo con barra" },
          { name: "Skill / Fuerza: Push Press", detail: "10-8-6-4-4-2-2" },
          { name: "Metcon (AMRAP 18 min)", detail: "10 STOH + 10 HSPU + 10 bench press sobre steps c/mancuernas (entre rondas: 20 sit ups)" },
        ],
      },
      {
        weekday: 4,
        title: "Unilateral Deadlift & EMOM Conditioning",
        exercises: [
          { name: "Entrada en calor (Tabata)", detail: "Walk out + goblet squat + peso muerto con barra + isometría de sentadilla contra la pared" },
          { name: "Skill / Fuerza: Deadlift a 1 pie con barra", detail: "2 series de 10 p/pierna + 4 series de 6 p/pierna (rumano estricto, trabajo de abdomen y glúteo/isquio)" },
          { name: "Metcon (EMOM 18 min - 9 rondas)", detail: "Min 1: 12 T2B + 8 flexiones | Min 2: 12 deadlift rumano + 8 sentadillas libres sprint" },
        ],
      },
      {
        weekday: 5,
        title: "Overhead Lunges & Hyrox Day",
        exercises: [
          { name: "Entrada en calor (AMRAP 5 min)", detail: "10 estocadas alternadas con disco + 20\" hollow rocks + 20\" plancha baja + 10 buenos días con disco" },
          { name: "Skill / Fuerza: Estocadas reversa con barra en OH", detail: "8 p/pierna + 6 p/pierna x 2 + 4 p/pierna x 3 (estabilidad, pliometría y core)" },
          { name: "Metcon: Hyrox Day (AMRAP 18-20 min)", detail: "10 p. run + 5 p. estocadas con corebag + 10 p. run + 5 p. burpees broad jump + 10 p. run + 5 p. farmer carry con D KB + 10 goblet squats al finalizar (tramos de 10 m, p = pasadas totales)" },
        ],
      },
    ],
  },
  {
    name: "Jaldin Semana 124",
    type: "crossfit",
    description:
      "Planificación semanal de 4 días (Martes a Viernes): Movilidad, Skill/Fuerza y Metcon/WOD",
    date: "2026-08-18T14:24:35.243Z",
    days: [
      {
        weekday: 2,
        title: "Power Snatch & Conditioning",
        exercises: [
          { name: "Movilidad General (AMRAP 5')", detail: "6 DL snatch + 6 Hang muscle snatch + 6 Good morning + 20 Russian twists + 20 Jumping jacks" },
          { name: "Power Snatch Complex", detail: "4 sets: 1 Low hang snatch + 1 Hang snatch + 1 High snatch | 4 sets: 2 Hang snatch" },
          { name: "Metcon / WOD (For Time)", detail: "18 Shuttle run, 40 DB snatch alt, 12 Burpees OTDB, 18 Shuttle run, 30 OHS, 12 Burpees OTB, 18 Shuttle run, 20 Power snatch, 12 Burpees OTB doble salto" },
          { name: "Finisher", detail: "Tabata Zona media" },
        ],
      },
      {
        weekday: 3,
        title: "Back Squat & Gymnastics / Quads",
        exercises: [
          { name: "Movilidad General (Tabata)", detail: "Back squat, Back lunges, Push ups, CF swing" },
          { name: "Back Squat (Fuerza)", detail: "6-5-4 Reps activación + 5x3" },
          { name: "Metcon / WOD (For Time)", detail: "3 rondas: (15 T2B / 30 K2E + 12 Burpees box jump overs + Front squats [9 / 15 / 21 reps])" },
        ],
      },
      {
        weekday: 4,
        title: "Skill Gimnástico & Doble WOD",
        exercises: [
          { name: "Movilidad General (6/5/4/3/2)", detail: "Hollow rocks, Barbell row, Superman, Kipping" },
          { name: "Skill C2B / D.U / BMU", detail: "Scaled: 4 sets (1' DU + 8 C2B) | ADV: 4 sets (60 DU + 8/6 BMU)" },
          { name: "WOD 1 (AMRAP 10')", detail: "35 D.U / 70 S.S + 7 BMU / 14 Pull ups + 5 Wall walk / 8 Walk out (2' Rest)" },
          { name: "WOD 2 (30/20/10 - TC: 6')", detail: "Sit ups, Kettlebell swing, Walking lunges" },
        ],
      },
      {
        weekday: 5,
        title: "Power Clean Complex & Metcon",
        exercises: [
          { name: "Movilidad General (AMRAP 5')", detail: "6 DL clean + 6 Hang muscle clean + 6 Front squat + 20 Flutter kicks + 20 Mountain climbers" },
          { name: "Power Clean Complex", detail: "4 sets: 1 Low clean + 1 Hang clean + 1 High clean | 4 sets: 2 Hang clean" },
          { name: "Metcon / WOD (4 Rounds - TC: 18')", detail: "12 Hang power clean + 5 Devil press arm left + 12 HSPU / 16 Pike push ups + 5 Devil press arm right + 12 Goblet squat" },
        ],
      },
    ],
  },
  {
    name: "CrossFit WOD",
    type: "crossfit",
    description: "Sesión completa de CrossFit: Warm Up, Skill Gymnastic y WOD",
    date: "2026-09-01T16:52:38.449Z",
    days: [
      { weekday: 1, title: "Descanso", exercises: [] },
      {
        weekday: 2,
        title: "Gymnastics & Metcon",
        exercises: [
          { name: "Warm Up (AMRAP 5')", detail: "5 Walk Out + Push Ups, 10 Ring Rows, 10 Deadlift, 10 Air Squats, 10 V-Ups" },
          { name: "Skill: Gymnastic (Rope Climb / HSW)", detail: "4 Sets — Scaled: 2/1 Rope Climb + 1' Práctica HSW (2 pasadas) | ADV: 3/2 Rope Climb + 10m HSW | RX: 2 Legless Rope Climb + 20m HSW" },
          { name: "WOD (AMRAP 18')", detail: "Escalera ascendente (2/4/6/8/10/12/+2): Burpee Box Jump Overs + T2B / K2E (x2) + DB Snatch Alt. Entre cada set: 1 Rope Climb" },
        ],
      },
      { weekday: 3, title: "Descanso", exercises: [] },
      { weekday: 4, title: "Descanso", exercises: [] },
      { weekday: 5, title: "Descanso", exercises: [] },
      { weekday: 6, title: "Descanso", exercises: [] },
      { weekday: 0, title: "Descanso", exercises: [] },
    ],
  },
];

/**
 * `yyyy-mm-dd` del lunes de la semana a la que pertenece la fecha.
 * Copiado de `src/lib/data/routine-types.ts` (`mondayOfWeek`) para no arrastrar
 * TS/`server-only` a este script suelto.
 */
function mondayOfWeek(isoDate) {
  const [y, m, d] = isoDate.slice(0, 10).split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const dow = date.getUTCDay(); // 0 = domingo
  date.setUTCDate(date.getUTCDate() + (dow === 0 ? -6 : 1 - dow));
  return date.toISOString().slice(0, 10);
}

// Índice → nombre, igual que `WEEKDAY_INDEX` en `src/lib/data/routine-types.ts`.
const WEEKDAY_BY_INDEX = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

/** Semana del export → `{ id, doc }` con la forma que escribe `saveRoutine()`. */
function toRoutineDoc(src) {
  const now = Timestamp.now();
  return {
    id: mondayOfWeek(src.date), // doc ID = lunes de la semana (yyyy-mm-dd)
    doc: {
      name: src.name.trim(),
      type: (src.type || "crossfit").trim(),
      description: (src.description || "").trim(),
      days: src.days.map((d) => {
        const weekday = WEEKDAY_BY_INDEX[d.weekday];
        if (!weekday) throw new Error(`Weekday numérico inválido: ${d.weekday} (en "${src.name}")`);
        const exercises = (d.exercises ?? []).map((e) => ({
          name: e.name.trim(),
          detail: e.detail.trim(),
        }));
        // Sin ejercicios = descanso deliberado (las semanas de ejemplo así lo traen).
        return exercises.length
          ? { weekday, kind: "training", title: d.title.trim(), exercises }
          : { weekday, kind: "descanso", title: d.title.trim() || "Descanso", exercises: [] };
      }),
      createdAt: now,
      updatedAt: now,
    },
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

const dupId = docs.map((d) => d.id).find((id, i, arr) => arr.indexOf(id) !== i);
if (dupId) {
  console.error(`Dos rutinas caen en el mismo lunes (${dupId}); revisá los fechaISO.`);
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
  console.log(`\nInsertaría ${docs.length} rutina(s) (doc ID = lunes de la semana):`);
  docs.forEach(({ id, doc }) =>
    console.log(`  + ${id}  ${doc.name}  ·  ${doc.days.length} día(s): ${doc.days.map((x) => x.weekday).join(", ")}`),
  );
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
  for (const { id, doc } of docs) batch.set(col.doc(id), doc);
  await batch.commit();

  console.log(`Insertadas ${docs.length} rutina(s):`);
  docs.forEach(({ id, doc }) => console.log(`  + ${id}  ${doc.name}  (${doc.days.length} día/s)`));
  console.log("Listo.");
} catch (err) {
  console.error("Falló el seed:", err?.message ?? err);
  process.exit(1);
}
