// Lectura de PNG compartida por los scripts de generación de assets
// (`gen-icons.mjs`, `gen-logo-svg.mjs`). Sin dependencias: decodifica a mano
// con el zlib de Node.
import { deflateSync, inflateSync } from "node:zlib";

/** Imagen en memoria: RGBA de 8 bits, sin premultiplicar. */
export const image = (w, h, fill) => {
  const data = Buffer.alloc(w * h * 4);
  if (fill) {
    for (let o = 0; o < data.length; o += 4) {
      data[o] = fill[0];
      data[o + 1] = fill[1];
      data[o + 2] = fill[2];
      data[o + 3] = 255;
    }
  }
  return { w, h, data };
};

/** Decodifica PNG de 8 bits sin entrelazado (gris, gris+alfa, RGB o RGBA). */
export function decodePng(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error("no es un PNG");

  let off = 8;
  let ihdr;
  const idat = [];

  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString("ascii", off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === "IHDR") {
      ihdr = {
        w: data.readUInt32BE(0),
        h: data.readUInt32BE(4),
        depth: data[8],
        color: data[9],
        interlace: data[12],
      };
    } else if (type === "IDAT") idat.push(data);
    else if (type === "IEND") break;
    off += 12 + len;
  }

  const CHANNELS = { 0: 1, 2: 3, 4: 2, 6: 4 };
  const ch = CHANNELS[ihdr.color];
  if (!ch || ihdr.depth !== 8 || ihdr.interlace !== 0) {
    throw new Error(`PNG no soportado (color ${ihdr.color}, depth ${ihdr.depth})`);
  }

  const raw = inflateSync(Buffer.concat(idat));
  const stride = ihdr.w * ch;
  const lines = Buffer.alloc(ihdr.h * stride);
  let p = 0;

  for (let y = 0; y < ihdr.h; y++) {
    const filter = raw[p++];
    const line = raw.subarray(p, p + stride);
    p += stride;
    const cur = lines.subarray(y * stride, (y + 1) * stride);
    const prev = y > 0 ? lines.subarray((y - 1) * stride, y * stride) : null;

    for (let i = 0; i < stride; i++) {
      const a = i >= ch ? cur[i - ch] : 0;
      const b = prev ? prev[i] : 0;
      const c = prev && i >= ch ? prev[i - ch] : 0;
      let v = line[i];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const pred = a + b - c;
        const pa = Math.abs(pred - a);
        const pb = Math.abs(pred - b);
        const pc = Math.abs(pred - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      cur[i] = v & 255;
    }
  }

  // Normalizamos a RGBA.
  const img = image(ihdr.w, ihdr.h);
  for (let i = 0, o = 0; i < ihdr.w * ihdr.h; i++, o += 4) {
    const s = i * ch;
    if (ch === 4) {
      img.data[o] = lines[s];
      img.data[o + 1] = lines[s + 1];
      img.data[o + 2] = lines[s + 2];
      img.data[o + 3] = lines[s + 3];
    } else if (ch === 3) {
      img.data[o] = lines[s];
      img.data[o + 1] = lines[s + 1];
      img.data[o + 2] = lines[s + 2];
      img.data[o + 3] = 255;
    } else if (ch === 2) {
      img.data[o] = img.data[o + 1] = img.data[o + 2] = lines[s];
      img.data[o + 3] = lines[s + 1];
    } else {
      img.data[o] = img.data[o + 1] = img.data[o + 2] = lines[s];
      img.data[o + 3] = 255;
    }
  }
  return img;
}

/** Recorta el margen transparente: el logo original trae mucho aire alrededor. */
export function trim(img, threshold = 8) {
  let minX = img.w;
  let minY = img.h;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < img.h; y++) {
    for (let x = 0; x < img.w; x++) {
      if (img.data[(y * img.w + x) * 4 + 3] <= threshold) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) return img;

  const out = image(maxX - minX + 1, maxY - minY + 1);
  for (let y = 0; y < out.h; y++) {
    const from = ((y + minY) * img.w + minX) * 4;
    img.data.copy(out.data, y * out.w * 4, from, from + out.w * 4);
  }
  return out;
}

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

export function encodePng(img, level = 9) {
  const stride = img.w * 4;
  const raw = Buffer.alloc(img.h * (stride + 1));
  for (let y = 0; y < img.h; y++) {
    raw[y * (stride + 1)] = 0; // filtro "none" por scanline
    img.data.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(img.w, 0);
  ihdr.writeUInt32BE(img.h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
