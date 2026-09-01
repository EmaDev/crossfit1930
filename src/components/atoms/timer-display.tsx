/** `mm:ss` (o `h:mm:ss` pasada la hora), redondeado hacia arriba al segundo. */
export function formatClock(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const mm = String(m).padStart(h > 0 ? 2 : 1, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${mm}:${ss}`;
}

/**
 * Número gigante monoespaciado — el kit no tiene un display de reloj propio
 * apto para un timer interactivo (`CountdownHero` cuenta a una fecha fija, sin
 * pausa; ver plan Fase 6). Primitivo puro, sin estado.
 */
export function TimerDisplay({
  ms,
  tone = "foreground",
  size = "lg",
}: {
  ms: number;
  tone?: "foreground" | "danger" | "success";
  size?: "md" | "lg";
}) {
  const toneClass = {
    foreground: "text-foreground",
    danger: "text-white",
    success: "text-white",
  }[tone];

  return (
    <span
      className={`font-mono font-black tabular-nums tracking-tight ${toneClass} ${
        size === "lg" ? "text-7xl sm:text-8xl" : "text-5xl"
      }`}
    >
      {formatClock(ms)}
    </span>
  );
}
