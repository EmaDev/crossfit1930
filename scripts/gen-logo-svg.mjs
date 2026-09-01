// Vectoriza el logo de la marca: de `assets/logo.png` (el único original) sale
// `public/logo.svg` y el `d=` de los dos trazos que usa <Logo> en la app.
//
// El PNG tiene dos capas de color bien separadas —el texto rojo y la barra en
// negros/grises fotográficos—, así que se traza cada una por separado y el
// resultado son DOS paths: el consumidor puede pintarlos distinto o los dos
// con `currentColor` (versión monocromática, la que va sobre el hero).
//
// Cómo traza, sin dependencias:
//   1. Clasifica cada píxel opaco en "texto" o "barra" por color.
//   2. Marching squares con interpolación lineal sobre el alfa de cada clase:
//      el contorno queda en subpíxel, no en la escalera del umbral duro.
//   3. Encadena los segmentos sueltos en bucles cerrados por sus extremos.
//   4. Simplifica cada bucle con Douglas–Peucker.
//
// Los detalles internos de los discos (reflejos, el aro) NO sobreviven: la
// barra queda como silueta maciza. Es a propósito —es lo único que funciona en
// monocromo sobre cualquier fondo— y a 40px de alto no se distingue.
//
// Uso: npm run gen-logo-svg
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decodePng, trim } from "./lib/png.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** Alfa a partir del cual un píxel es tinta. */
const ALPHA = 128;

/** Tolerancia de Douglas–Peucker, en píxeles del original (1074px de ancho).
 *  A 40px de alto en pantalla el original se reduce ~15x: 1.2px de error son
 *  0.08px reales, invisibles, y recortan el archivo a la mitad. */
const EPSILON = 1.2;

/** Borde vacío que se agrega alrededor para que ningún contorno quede abierto. */
const PAD = 1;

/**
 * Clasifica un píxel de tinta. Tres resultados, no dos:
 *
 * - `"text"`: rojo saturado → "CROSSFIT TEAM".
 * - `"bar"`: neutro oscuro o medio → la barra y los discos.
 * - `null`: neutro CASI BLANCO. El original esconde arte blanco opaco (un
 *   "19:30" sobre la barra) que no se ve contra un fondo blanco pero
 *   reaparecería en cuanto se recolorea el trazo. Fuera.
 */
function classify(r, g, b) {
  if (r > 100 && r - Math.max(g, b) > 40) return "text";
  const lum = (r + g + b) / 3;
  if (lum > 200 && Math.abs(r - b) < 30) return null;
  return "bar";
}

/* ------------------------------------------------------------ clasificación */

/**
 * Campo escalar de pertenencia a una clase: el alfa del píxel si es de la
 * clase, 0 si no. Marching squares interpola sobre esto, así que el borde
 * entre clases queda en el medio en vez de pisarse.
 *
 * Va con un borde de un píxel vacío alrededor: la imagen viene recortada al
 * ras de la tinta, así que los discos tocan los cuatro bordes y sus contornos
 * quedarían ABIERTOS. Un contorno abierto se cierra con una diagonal falsa y,
 * peor, descuadra el relleno even-odd del resto del trazo.
 */
function classField(img, want) {
  const w = img.w + 2 * PAD;
  const h = img.h + 2 * PAD;
  const f = new Float32Array(w * h);

  for (let y = 0; y < img.h; y++) {
    for (let x = 0; x < img.w; x++) {
      const o = (y * img.w + x) * 4;
      const a = img.data[o + 3];
      if (a < ALPHA) continue;
      if (classify(img.data[o], img.data[o + 1], img.data[o + 2]) === want) {
        f[(y + PAD) * w + (x + PAD)] = a;
      }
    }
  }
  return { f, w, h };
}

/** Color promedio de una clase, para los valores de marca del SVG. */
function averageColor(img, want) {
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  for (let i = 0; i < img.w * img.h; i++) {
    const o = i * 4;
    if (img.data[o + 3] < ALPHA) continue;
    if (classify(img.data[o], img.data[o + 1], img.data[o + 2]) !== want) continue;
    r += img.data[o];
    g += img.data[o + 1];
    b += img.data[o + 2];
    n++;
  }
  const hex = (v) => Math.round(v / n).toString(16).padStart(2, "0");
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

/**
 * Rellena los huecos cerrados del campo: inunda el vacío desde el borde y lo
 * que no se moja es un hueco interior.
 *
 * Sólo se usa en la barra, que es silueta maciza a propósito: los reflejos
 * claros de los discos, ya descartados por `classify`, dejarían motitas
 * transparentes adentro. El texto NO pasa por acá — le vaciaría la O y la A.
 */
function fillHoles(f, w, h, T) {
  const outside = new Uint8Array(w * h);
  const stack = [];

  for (let x = 0; x < w; x++) {
    stack.push(x, x + (h - 1) * w);
  }
  for (let y = 0; y < h; y++) {
    stack.push(y * w, y * w + w - 1);
  }

  while (stack.length) {
    const i = stack.pop();
    if (outside[i] || f[i] >= T) continue;
    outside[i] = 1;
    const x = i % w;
    const y = (i - x) / w;
    if (x > 0) stack.push(i - 1);
    if (x < w - 1) stack.push(i + 1);
    if (y > 0) stack.push(i - w);
    if (y < h - 1) stack.push(i + w);
  }

  let filled = 0;
  for (let i = 0; i < f.length; i++) {
    if (f[i] < T && !outside[i]) {
      f[i] = 255;
      filled++;
    }
  }
  return filled;
}

/* -------------------------------------------------------- marching squares */

/**
 * Segmentos del contorno al nivel `T`. Cada celda del retículo aporta 0, 1 o 2
 * segmentos; los extremos se interpolan linealmente entre las esquinas, que es
 * lo que le saca la escalera al contorno.
 *
 * Los puntos de una arista compartida se calculan desde las MISMAS dos
 * esquinas en las dos celdas vecinas, así que salen bit a bit idénticos y se
 * pueden encadenar comparando coordenadas.
 */
function marchingSquares(f, w, h, T) {
  const segments = [];
  const at = (x, y) => f[y * w + x];
  // Punto interpolado sobre una arista, entre dos esquinas con sus valores.
  const lerp = (x0, y0, v0, x1, y1, v1) => {
    const t = (T - v0) / (v1 - v0);
    return [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t];
  };

  for (let y = 0; y < h - 1; y++) {
    for (let x = 0; x < w - 1; x++) {
      const tl = at(x, y);
      const tr = at(x + 1, y);
      const br = at(x + 1, y + 1);
      const bl = at(x, y + 1);

      const code =
        (tl >= T ? 8 : 0) | (tr >= T ? 4 : 0) | (br >= T ? 2 : 0) | (bl >= T ? 1 : 0);
      if (code === 0 || code === 15) continue;

      const top = () => lerp(x, y, tl, x + 1, y, tr);
      const right = () => lerp(x + 1, y, tr, x + 1, y + 1, br);
      const bottom = () => lerp(x, y + 1, bl, x + 1, y + 1, br);
      const left = () => lerp(x, y, tl, x, y + 1, bl);

      switch (code) {
        case 1:
        case 14:
          segments.push([left(), bottom()]);
          break;
        case 2:
        case 13:
          segments.push([bottom(), right()]);
          break;
        case 3:
        case 12:
          segments.push([left(), right()]);
          break;
        case 4:
        case 11:
          segments.push([top(), right()]);
          break;
        case 6:
        case 9:
          segments.push([top(), bottom()]);
          break;
        case 7:
        case 8:
          segments.push([left(), top()]);
          break;
        // Sillas de montar: las dos esquinas en diagonal están dentro y hay dos
        // formas de unir los cuatro puntos. Decide el promedio del centro.
        case 5:
        case 10: {
          const center = (tl + tr + br + bl) / 4 >= T;
          if ((code === 5) === center) {
            segments.push([left(), top()], [bottom(), right()]);
          } else {
            segments.push([left(), bottom()], [top(), right()]);
          }
          break;
        }
      }
    }
  }
  return segments;
}

/* ------------------------------------------------------- encadenado y podado */

const key = (p) => `${p[0]},${p[1]}`;

/**
 * Une los segmentos sueltos en bucles cerrados. Cada punto pertenece a
 * exactamente dos segmentos (está sobre una arista que comparten dos celdas),
 * así que alcanza con caminar de vecino en vecino sin repetir.
 */
function chainLoops(segments) {
  const adj = new Map();
  const add = (p, seg) => {
    const k = key(p);
    if (!adj.has(k)) adj.set(k, []);
    adj.get(k).push(seg);
  };
  for (const seg of segments) {
    add(seg[0], seg);
    add(seg[1], seg);
  }

  const used = new Set();
  const loops = [];

  for (const seed of segments) {
    if (used.has(seed)) continue;
    used.add(seed);

    const loop = [seed[0], seed[1]];
    let current = seed[1];

    for (;;) {
      const next = (adj.get(key(current)) ?? []).find((s) => !used.has(s));
      if (!next) break;
      used.add(next);
      current = key(next[0]) === key(current) ? next[1] : next[0];
      loop.push(current);
    }

    // Los bucles de 3 puntos son ruido del antialias, no forma.
    if (loop.length > 3) loops.push(loop);
  }
  return loops;
}

/** Douglas–Peucker sobre una polilínea abierta. */
function simplifyLine(pts, eps) {
  if (pts.length < 3) return pts;

  const [ax, ay] = pts[0];
  const [bx, by] = pts[pts.length - 1];
  const dx = bx - ax;
  const dy = by - ay;
  const len = Math.hypot(dx, dy);

  let worst = 0;
  let idx = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const [px, py] = pts[i];
    // Distancia punto-recta; si los extremos coinciden, distancia al extremo.
    const d =
      len === 0
        ? Math.hypot(px - ax, py - ay)
        : Math.abs(dy * px - dx * py + bx * ay - by * ax) / len;
    if (d > worst) {
      worst = d;
      idx = i;
    }
  }

  if (worst <= eps) return [pts[0], pts[pts.length - 1]];
  return [
    ...simplifyLine(pts.slice(0, idx + 1), eps).slice(0, -1),
    ...simplifyLine(pts.slice(idx), eps),
  ];
}

/**
 * Douglas–Peucker sobre un bucle cerrado. Se parte en dos polilíneas por el
 * punto más lejano al primero: si no, los dos extremos serían el mismo punto y
 * el algoritmo colapsaría el bucle entero.
 */
function simplifyLoop(loop, eps) {
  const pts = loop.slice(0, -1); // el último repite el primero
  if (pts.length < 4) return pts;

  let far = 0;
  let best = -1;
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i][0] - pts[0][0], pts[i][1] - pts[0][1]);
    if (d > best) {
      best = d;
      far = i;
    }
  }

  const a = simplifyLine(pts.slice(0, far + 1), eps);
  const b = simplifyLine([...pts.slice(far), pts[0]], eps);
  return [...a.slice(0, -1), ...b.slice(0, -1)];
}

/* ------------------------------------------------------------------- salida */

const num = (v) => {
  const r = Math.round(v * 10) / 10;
  return String(Number.isInteger(r) ? r : r).replace(/^0\./, ".").replace(/^-0\./, "-.");
};

function toPathData(loops) {
  return loops
    .map((loop) => {
      let d = `M${num(loop[0][0])} ${num(loop[0][1])}`;
      for (let i = 1; i < loop.length; i++) {
        d += `L${num(loop[i][0])} ${num(loop[i][1])}`;
      }
      return `${d}Z`;
    })
    .join("");
}

function tracePath(img, want, { solid = false } = {}) {
  const { f, w, h } = classField(img, want);
  if (solid) {
    const filled = fillHoles(f, w, h, ALPHA);
    console.log(`  ${want}: ${filled} px de huecos interiores rellenados`);
  }
  const segments = marchingSquares(f, w, h, ALPHA);
  const loops = chainLoops(segments).map((l) => simplifyLoop(l, EPSILON));
  const points = loops.reduce((n, l) => n + l.length, 0);
  return { d: toPathData(loops), loops: loops.length, points };
}

/* -------------------------------------------------------------------- main */

const img = trim(decodePng(readFileSync(resolve(root, "assets/logo.png"))));
console.log(`logo recortado: ${img.w}x${img.h}`);

const text = tracePath(img, "text");
const bar = tracePath(img, "bar", { solid: true });
const textColor = averageColor(img, "text");
const barColor = averageColor(img, "bar");

console.log(`texto: ${text.loops} contornos, ${text.points} puntos (${textColor})`);
console.log(`barra: ${bar.loops} contornos, ${bar.points} puntos (${barColor})`);

// `evenodd`: los contrapunzones (la O, la R, el hueco entre barra y discos)
// vienen como contornos propios y así se recortan solos.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${img.w + 2 * PAD} ${img.h + 2 * PAD}" fill-rule="evenodd" role="img" aria-label="Crossfit team">
<path fill="${barColor}" d="${bar.d}"/>
<path fill="${textColor}" d="${text.d}"/>
</svg>
`;

mkdirSync(resolve(root, "public"), { recursive: true });
writeFileSync(resolve(root, "public/logo.svg"), svg);
console.log(`wrote public/logo.svg (${(svg.length / 1000).toFixed(1)} kB)`);

// El componente <Logo> necesita los mismos trazos para poder pintarlos con
// `currentColor`: un <img> externo no hereda color.
writeFileSync(
  resolve(root, "src/components/atoms/logo-paths.ts"),
  `// GENERADO por scripts/gen-logo-svg.mjs — no editar a mano.
// Trazos del logo de la marca, vectorizados desde \`assets/logo.png\`.

/** Caja del trazo original, ya recortada. */
export const LOGO_VIEW_BOX = "0 0 ${img.w + 2 * PAD} ${img.h + 2 * PAD}";

/** Color de marca de cada capa, promediado del original. */
export const LOGO_COLORS = { text: "${textColor}", bar: "${barColor}" } as const;

/** La barra con sus discos, como silueta maciza. */
export const LOGO_BAR_PATH =
  "${bar.d}";

/** "CROSSFIT TEAM". */
export const LOGO_TEXT_PATH =
  "${text.d}";
`,
);
console.log("wrote src/components/atoms/logo-paths.ts");
