"use client";

import { useState } from "react";
import { ShuffleIcon, TargetIcon } from "@/components/atoms/icons";

type Benchmark = {
  name: string;
  /** Formato (y duración si aplica), en el mismo idioma que los tabs del timer. */
  format: string;
  /** El WOD entero en una línea. */
  moves: string;
};

/**
 * Los clásicos "benchmark" de CrossFit — las Girls y algún Hero — para tener
 * siempre algo a mano que cronometrar sin ponerse a pensar. Se toca la card y
 * rota al siguiente: el orden es fijo, sólo cambia el punto de arranque según
 * el día (así el server y el cliente renderizan el mismo primero).
 */
const BENCHMARKS: Benchmark[] = [
  { name: "Cindy", format: "AMRAP 20'", moves: "5 dominadas · 10 flexiones · 15 sentadillas" },
  { name: "Fran", format: "FOR TIME", moves: "21-15-9 · thrusters 43 kg + dominadas" },
  { name: "Annie", format: "FOR TIME", moves: "50-40-30-20-10 · dobles de soga + abdominales" },
  { name: "Helen", format: "FOR TIME", moves: "3 rondas · 400 m + 21 kb swings + 12 dominadas" },
  { name: "Grace", format: "FOR TIME", moves: "30 clean & jerk · 61 kg" },
  { name: "Chelsea", format: "EMOM 30'", moves: "por minuto · 5 dominadas · 10 flexiones · 15 sentadillas" },
  { name: "Tabata Mix", format: "TABATA", moves: "8×20/10 · dominadas · flexiones · abdominales · sentadillas" },
  { name: "Death by Burpees", format: "EMOM", moves: "+1 burpee cada minuto hasta fallar" },
  { name: "Barbara", format: "FOR TIME", moves: "5 rondas · 20-30-40-50 · pull · push · abs · squat" },
  { name: "Mary", format: "AMRAP 20'", moves: "5 hspu · 10 pistols · 15 dominadas" },
];

/** Índice de arranque estable por día: no cambia entre server y cliente ni por request. */
const seedIndex = () => Math.floor(Date.now() / 86_400_000) % BENCHMARKS.length;

/**
 * Contenido de la card flotante del header del Timer. El slot aporta fondo,
 * borde y redondeo; el padding lo pone esta card, igual que <StreakCard>.
 */
export function BenchmarkCard() {
  const [index, setIndex] = useState(seedIndex);
  const wod = BENCHMARKS[index];

  return (
    <button
      type="button"
      onClick={() => setIndex((n) => (n + 1) % BENCHMARKS.length)}
      aria-label={`WOD para cronometrar: ${wod.name}. Tocá para ver otro.`}
      className="flex w-full items-start gap-3 p-3 text-left transition-transform active:scale-[0.99]"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <TargetIcon className="h-5 w-5" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-[15px] font-extrabold leading-tight text-foreground">
            {wod.name}
          </span>
          <span className="shrink-0 rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
            {wod.format}
          </span>
        </span>
        <span className="mt-1 block truncate text-xs text-muted">{wod.moves}</span>
        <span className="mt-1 text-[10px] font-bold uppercase tracking-wide text-muted/80">
          Benchmark · tocá para otro
        </span>
      </span>

      <ShuffleIcon className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
    </button>
  );
}
