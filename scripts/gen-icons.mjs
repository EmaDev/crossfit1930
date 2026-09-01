// Genera todos los assets de marca a partir del logo original (`assets/logo.png`):
// íconos PWA, ícono maskable, apple-touch-icon, favicon.ico, el logo recortado
// para usar dentro de la app y las splash screens de iOS.
//
// Sin dependencias: decodifica/codifica PNG a mano (zlib de Node) y escala con
// filtro de caja sobre alfa premultiplicado.
//
// Uso: npm run gen-icons
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decodePng, encodePng, image, trim } from "./lib/png.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/* El logo tiene la barra y los discos en negro: sobre el fondo oscuro del tema
   desaparecerían, así que todos los íconos van sobre blanco. */
const WHITE = [255, 255, 255];
const DARK = [10, 10, 10]; // igual que background_color del manifest

/* ------------------------------------------------------------------ PNG I/O */

/* ------------------------------------------------------------- composición */

/** Reescala con filtro de caja sobre alfa premultiplicado (evita halos). */
function resize(img, w, h) {
  const out = image(w, h);
  const sx = img.w / w;
  const sy = img.h / h;

  for (let y = 0; y < h; y++) {
    const y0 = Math.floor(y * sy);
    const y1 = Math.min(img.h, Math.max(y0 + 1, Math.ceil((y + 1) * sy)));
    for (let x = 0; x < w; x++) {
      const x0 = Math.floor(x * sx);
      const x1 = Math.min(img.w, Math.max(x0 + 1, Math.ceil((x + 1) * sx)));
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      let n = 0;

      for (let yy = y0; yy < y1; yy++) {
        for (let xx = x0; xx < x1; xx++) {
          const o = (yy * img.w + xx) * 4;
          const al = img.data[o + 3] / 255;
          r += img.data[o] * al;
          g += img.data[o + 1] * al;
          b += img.data[o + 2] * al;
          a += al;
          n++;
        }
      }

      const o = (y * w + x) * 4;
      if (a > 0) {
        out.data[o] = Math.round(r / a);
        out.data[o + 1] = Math.round(g / a);
        out.data[o + 2] = Math.round(b / a);
        out.data[o + 3] = Math.round((a / n) * 255);
      }
    }
  }
  return out;
}

/** Escala el logo para que entre completo en boxW × boxH. */
function fit(img, boxW, boxH) {
  const scale = Math.min(boxW / img.w, boxH / img.h);
  return resize(
    img,
    Math.max(1, Math.round(img.w * scale)),
    Math.max(1, Math.round(img.h * scale)),
  );
}

/** Pega src sobre dst en (dx, dy) con alpha blending. */
function draw(dst, src, dx, dy) {
  for (let y = 0; y < src.h; y++) {
    const ty = dy + y;
    if (ty < 0 || ty >= dst.h) continue;
    for (let x = 0; x < src.w; x++) {
      const tx = dx + x;
      if (tx < 0 || tx >= dst.w) continue;
      const s = (y * src.w + x) * 4;
      const d = (ty * dst.w + tx) * 4;
      const sa = src.data[s + 3] / 255;
      if (sa === 0) continue;
      const da = dst.data[d + 3] / 255;
      const oa = sa + da * (1 - sa);
      for (let k = 0; k < 3; k++) {
        dst.data[d + k] = Math.round(
          (src.data[s + k] * sa + dst.data[d + k] * da * (1 - sa)) / oa,
        );
      }
      dst.data[d + 3] = Math.round(oa * 255);
    }
  }
}

/** Rectángulo redondeado antialiaseado, para el tile de las splash de iOS. */
function roundedRect(w, h, radius, color) {
  const out = image(w, h);
  const hx = w / 2;
  const hy = h / 2;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const qx = Math.abs(x + 0.5 - hx) - (hx - radius);
      const qy = Math.abs(y + 0.5 - hy) - (hy - radius);
      const d =
        Math.min(Math.max(qx, qy), 0) +
        Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) -
        radius;
      const cov = Math.min(1, Math.max(0, 0.5 - d));
      const o = (y * w + x) * 4;
      out.data[o] = color[0];
      out.data[o + 1] = color[1];
      out.data[o + 2] = color[2];
      out.data[o + 3] = Math.round(cov * 255);
    }
  }
  return out;
}

/** Ícono cuadrado: logo centrado sobre un fondo sólido, con inset de margen. */
function squareIcon(logo, size, { bg = WHITE, inset = 0.06 } = {}) {
  const canvas = image(size, size, bg);
  const box = Math.round(size * (1 - inset * 2));
  const art = fit(logo, box, box);
  draw(canvas, art, Math.round((size - art.w) / 2), Math.round((size - art.h) / 2));
  return canvas;
}

/** Splash de iOS: fondo del tema + tile blanco con el logo, centrado. */
function splash(logo, w, h) {
  const canvas = image(w, h, DARK);
  const side = Math.round(Math.min(w, h) * 0.46);
  const tile = roundedRect(side, side, Math.round(side * 0.22), WHITE);
  const art = fit(logo, Math.round(side * 0.82), Math.round(side * 0.82));
  draw(tile, art, Math.round((side - art.w) / 2), Math.round((side - art.h) / 2));
  draw(canvas, tile, Math.round((w - side) / 2), Math.round((h - side) / 2));
  return canvas;
}

/** ICO con PNGs embebidos (soportado por todos los navegadores actuales). */
function encodeIco(pngs) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(1, 2); // tipo: ícono
  header.writeUInt16LE(pngs.length, 4);

  let offset = 6 + pngs.length * 16;
  const entries = pngs.map(({ size, png }) => {
    const e = Buffer.alloc(16);
    e[0] = size >= 256 ? 0 : size;
    e[1] = size >= 256 ? 0 : size;
    e.writeUInt16LE(1, 4); // planos
    e.writeUInt16LE(32, 6); // bits por píxel
    e.writeUInt32LE(png.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += png.length;
    return e;
  });

  return Buffer.concat([header, ...entries, ...pngs.map((p) => p.png)]);
}

/* ------------------------------------------------------------------ salidas */

const write = (rel, buf) => {
  const out = resolve(root, rel);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, buf);
  console.log("wrote", rel, `(${(buf.length / 1024).toFixed(1)} kB)`);
};

const logo = trim(decodePng(readFileSync(resolve(root, "assets/logo.png"))));
console.log(`logo recortado: ${logo.w}x${logo.h}`);

// Logo suelto (fondo transparente) para usar dentro de la app.
write("public/logo.png", encodePng(fit(logo, 720, 720)));

// Íconos de instalación + apple-touch.
write("public/icons/192.png", encodePng(squareIcon(logo, 192)));
write("public/icons/512.png", encodePng(squareIcon(logo, 512)));
write("public/apple-touch-icon.png", encodePng(squareIcon(logo, 180)));

// Maskable: Android recorta hasta un 20% de cada borde, el logo va más chico.
write("public/icons/maskable-512.png", encodePng(squareIcon(logo, 512, { inset: 0.2 })));

// Favicon: varios tamaños en un solo .ico, con poco margen para que se lea.
write(
  "public/favicon.ico",
  encodeIco(
    [16, 32, 48].map((size) => ({
      size,
      png: encodePng(squareIcon(logo, size, { inset: 0.04 })),
    })),
  ),
);

/* Splash screens de iOS (sólo retrato: el manifest fija orientation).
   El media query tiene que coincidir exacto con el dispositivo o iOS lo ignora. */
const IOS_SPLASH = [
  { w: 1290, h: 2796 }, // 15/16 Pro Max, 14 Pro Max
  { w: 1179, h: 2556 }, // 15/16 Pro, 14 Pro
  { w: 1284, h: 2778 }, // 12/13 Pro Max, 14 Plus
  { w: 1170, h: 2532 }, // 12/13/14
  { w: 1125, h: 2436 }, // X, XS, 11 Pro, 13 mini
  { w: 1242, h: 2688 }, // XS Max, 11 Pro Max
  { w: 828, h: 1792 }, // XR, 11
  { w: 750, h: 1334 }, // SE 2/3, 8
  { w: 1536, h: 2048 }, // iPad 9.7"
  { w: 1668, h: 2388 }, // iPad Pro 11"
];

for (const s of IOS_SPLASH) {
  write(`public/splash/${s.w}x${s.h}.png`, encodePng(splash(logo, s.w, s.h), 6));
}
