import type { RoutineDay } from "@/lib/data/wods";

/**
 * Dibuja la planificación de un día en un canvas y devuelve el PNG.
 *
 * Va a canvas y no a una captura del DOM (html2canvas y similares) por tres
 * razones: no suma dependencia, el resultado no depende de cómo se vea la
 * pantalla del usuario (tema, ancho, scroll), y sale siempre a la misma
 * resolución fija, apta para mandar por WhatsApp.
 *
 * Sólo cliente: necesita `document`.
 */

const W = 1080;
const PAD = 72;
const CONTENT_W = W - PAD * 2;
/** Lado de la placa con el logo, arriba a la derecha de la cabecera. */
const LOGO = 148;

/* Paleta fija: la imagen sale igual en tema claro y oscuro. */
const BG = "#0a0a0a";
const RED = "#ef4444";
const WHITE = "#f5f5f5";
const MUTED = "#a3a3a3";
const BORDER = "#262626";

const FONT = (size: number, weight = "400") =>
  `${weight} ${size}px Inter, system-ui, -apple-system, sans-serif`;

type Block = "movilidad" | "fuerza" | "skill" | "wod" | "finisher";

/** Mismo criterio que `ExerciseCard`: el bloque se deduce del nombre. */
function blockOf(name: string): Block {
  const n = name.toLowerCase();
  if (n.includes("movilidad")) return "movilidad";
  if (n.includes("finisher")) return "finisher";
  if (n.includes("metcon") || n.includes("wod")) return "wod";
  if (n.includes("skill")) return "skill";
  return "fuerza";
}

const BLOCK_LABEL: Record<Block, string> = {
  movilidad: "MOVILIDAD",
  fuerza: "FUERZA",
  skill: "SKILL",
  wod: "WOD",
  finisher: "FINISHER",
};

/** Separa "Metcon / WOD (For Time)" en título y formato. */
function splitFormat(name: string): { title: string; format?: string } {
  const m = name.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  return m ? { title: m[1], format: m[2] } : { title: name };
}

/** Corta el texto en líneas que entren en `maxWidth`, midiendo con la fuente activa. */
function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = "";

  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width <= maxWidth || !line) {
      line = next;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Recorta el texto a `maxWidth` con puntos suspensivos, midiendo con la fuente activa. */
function ellipsize(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;

  let cut = text;
  while (cut.length > 1 && ctx.measureText(`${cut}…`).width > maxWidth) {
    cut = cut.slice(0, -1);
  }
  return `${cut.trimEnd()}…`;
}

/** Layout de un ejercicio ya medido, listo para dibujar. */
type Measured = {
  block: Block;
  title: string;
  format?: string;
  titleLines: string[];
  detailLines: string[];
  height: number;
};

const NAME_LH = 50;
const DETAIL_LH = 46;
const EX_GAP = 52;

function measure(ctx: CanvasRenderingContext2D, day: RoutineDay): Measured[] {
  return day.exercises.map((ex) => {
    const { title, format } = splitFormat(ex.name);

    // El badge del formato le come ancho a la primera línea del título.
    ctx.font = FONT(28, "700");
    const badgeW = format ? ctx.measureText(format).width + 40 : 0;

    ctx.font = FONT(40, "600");
    const titleLines = wrap(ctx, title, CONTENT_W - badgeW - 24);

    ctx.font = FONT(32);
    const detailLines = wrap(ctx, ex.detail, CONTENT_W);

    return {
      block: blockOf(ex.name),
      title,
      format,
      titleLines,
      detailLines,
      // 34 = alto de la fila del bloque, 14 = aire entre título y detalle
      height: 34 + titleLines.length * NAME_LH + 14 + detailLines.length * DETAIL_LH,
    };
  });
}

export async function renderDayImage(
  day: RoutineDay,
  routineName: string,
): Promise<Blob> {
  // Sin esto, el primer render puede salir con la fuente de fallback.
  await document.fonts?.ready;
  const logo = await loadLogo();

  const probe = document.createElement("canvas").getContext("2d");
  if (!probe) throw new Error("Canvas 2D no disponible");

  const items = measure(probe, day);

  // Alto total: cabecera + ejercicios + pie.
  const HEADER = 300;
  const FOOTER = 130;
  const body = items.reduce((h, it) => h + it.height + EX_GAP, 0);
  const H = HEADER + body + FOOTER;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D no disponible");

  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);

  /* ---- Cabecera ---- */
  // Barra roja vertical de marca.
  ctx.fillStyle = RED;
  ctx.fillRect(0, 0, 12, H);

  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = RED;
  ctx.font = FONT(30, "800");
  ctx.fillText("CROSSFIT TEAM", PAD, 90);

  ctx.fillStyle = MUTED;
  ctx.font = FONT(28);
  // Se corta antes de llegar a la placa del logo.
  ctx.fillText(ellipsize(ctx, routineName, CONTENT_W - LOGO - 24), PAD, 134);

  ctx.fillStyle = RED;
  ctx.font = FONT(32, "700");
  ctx.fillText(day.weekday.toUpperCase(), PAD, 206);

  ctx.fillStyle = WHITE;
  ctx.font = FONT(58, "800");
  // El título del día podría no entrar en una línea: lo cortamos al ancho útil.
  const [dayTitle] = wrap(ctx, day.title, CONTENT_W);
  ctx.fillText(dayTitle, PAD, 262);

  // Logo arriba a la derecha, sobre una placa clara: la barra y los discos son
  // negros y sobre el fondo oscuro de la imagen no se verían.
  if (logo) {
    const lx = W - PAD - LOGO;
    const ly = 44;

    ctx.fillStyle = WHITE;
    roundRect(ctx, lx, ly, LOGO, LOGO, 34);
    ctx.fill();

    const iw = LOGO * 0.84;
    const ih = (iw * logo.naturalHeight) / logo.naturalWidth;
    ctx.drawImage(logo, lx + (LOGO - iw) / 2, ly + (LOGO - ih) / 2, iw, ih);
  }

  /* ---- Ejercicios ---- */
  let y = HEADER;

  for (const it of items) {
    const isWod = it.block === "wod";

    ctx.fillStyle = isWod ? RED : MUTED;
    ctx.font = FONT(26, "700");
    ctx.fillText(BLOCK_LABEL[it.block], PAD, y);

    if (it.format) {
      ctx.font = FONT(28, "700");
      const tw = ctx.measureText(it.format).width;
      const bx = W - PAD - tw - 32;

      ctx.fillStyle = "rgba(239,68,68,0.15)";
      roundRect(ctx, bx, y - 30, tw + 32, 44, 22);
      ctx.fill();

      ctx.fillStyle = RED;
      ctx.fillText(it.format, bx + 16, y);
    }

    y += 34;

    ctx.fillStyle = WHITE;
    ctx.font = FONT(40, "600");
    for (const line of it.titleLines) {
      ctx.fillText(line, PAD, y + 36);
      y += NAME_LH;
    }

    y += 14;

    ctx.fillStyle = MUTED;
    ctx.font = FONT(32);
    for (const line of it.detailLines) {
      ctx.fillText(line, PAD, y + 30);
      y += DETAIL_LH;
    }

    y += EX_GAP;
  }

  /* ---- Pie ---- */
  ctx.strokeStyle = BORDER;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(PAD, H - 96);
  ctx.lineTo(W - PAD, H - 96);
  ctx.stroke();

  ctx.fillStyle = MUTED;
  ctx.font = FONT(26);
  ctx.fillText("Crossfit team — tu box, siempre a mano", PAD, H - 46);

  return toBlob(canvas);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * Carga el logo para la cabecera. Devuelve `null` si falla (offline, 404): la
 * imagen del WOD tiene que salir igual, sin logo.
 */
async function loadLogo(): Promise<HTMLImageElement | null> {
  try {
    const img = new window.Image();
    img.src = "/logo.png";
    await img.decode();
    return img;
  } catch {
    return null;
  }
}

function toBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("No se pudo generar la imagen"))),
      "image/png",
    ),
  );
}

/** Versión en texto plano, para el fallback de WhatsApp en desktop. */
export function dayAsText(day: RoutineDay, routineName: string): string {
  const lines = [
    `*CROSSFIT TEAM* — ${routineName}`,
    `*${day.weekday.toUpperCase()}: ${day.title}*`,
    "",
  ];

  for (const ex of day.exercises) {
    lines.push(`*${ex.name}*`, ex.detail, "");
  }

  return lines.join("\n").trim();
}
