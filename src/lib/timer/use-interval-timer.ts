"use client";

import { useMemo } from "react";
import { useStopwatch } from "./use-stopwatch";

/** Una fase dentro de una ronda (ej. "trabajo" y "descanso" en TABATA). */
export type TimerPhase = {
  label: string;
  ms: number;
  tone?: "success" | "danger";
};

/**
 * Convierte el cronómetro base en una cuenta regresiva por intervalos que se
 * repiten `rounds` veces. Cubre los 3 modos de cuenta fija:
 *
 *   - AMRAP: una sola fase, `rounds = 1` (el conteo de rondas es manual, lo
 *     lleva aparte `RoundTapCounter`, no este hook).
 *   - EMOM: una sola fase repetida `rounds` veces (la ronda actual SÍ sale de acá).
 *   - TABATA: dos fases (trabajo/descanso) repetidas `rounds` veces.
 */
export function useIntervalTimer(phases: TimerPhase[], rounds: number) {
  const stopwatch = useStopwatch();

  const roundMs = useMemo(() => phases.reduce((sum, p) => sum + p.ms, 0), [phases]);
  const totalMs = roundMs * Math.max(1, rounds);

  const elapsed = Math.min(stopwatch.elapsedMs, totalMs);
  const finished = stopwatch.started && stopwatch.elapsedMs >= totalMs;

  const round = Math.min(Math.floor(elapsed / roundMs), Math.max(0, rounds - 1));
  const elapsedInRound = elapsed - round * roundMs;

  let phaseIndex = 0;
  let acc = 0;
  for (let i = 0; i < phases.length; i++) {
    if (elapsedInRound < acc + phases[i].ms || i === phases.length - 1) {
      phaseIndex = i;
      break;
    }
    acc += phases[i].ms;
  }
  const phase = phases[phaseIndex] ?? phases[0];
  const phaseElapsedMs = elapsedInRound - acc;
  const phaseRemainingMs = Math.max(0, phase.ms - phaseElapsedMs);

  return {
    ...stopwatch,
    finished,
    totalRemainingMs: Math.max(0, totalMs - elapsed),
    totalMs,
    round: rounds > 1 ? round : 0,
    rounds,
    phase,
    phaseIndex,
    phaseRemainingMs,
  };
}
