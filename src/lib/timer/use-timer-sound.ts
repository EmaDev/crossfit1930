"use client";

import { useEffect, useRef } from "react";
import { beepCountdown, beepFinish, beepTransition } from "./beep";

/**
 * Beepea las transiciones de fase/ronda y la cuenta 3-2-1 de cualquier
 * `useIntervalTimer`. Un solo hook para AMRAP/EMOM/TABATA: lo único que
 * cambia entre modos es qué `phases`/`rounds` reciben, no cuándo suena.
 */
export function useTimerSound({
  running,
  phaseRemainingMs,
  phaseIndex,
  round,
  finished,
}: {
  running: boolean;
  phaseRemainingMs: number;
  phaseIndex: number;
  round: number;
  finished: boolean;
}) {
  const lastPhaseKey = useRef<string | null>(null);
  const lastSecond = useRef<number | null>(null);
  const finishedFired = useRef(false);

  useEffect(() => {
    if (!running) return;
    const phaseKey = `${round}-${phaseIndex}`;
    if (lastPhaseKey.current !== null && lastPhaseKey.current !== phaseKey) {
      beepTransition();
    }
    lastPhaseKey.current = phaseKey;

    const secondsLeft = Math.ceil(phaseRemainingMs / 1000);
    if (secondsLeft >= 1 && secondsLeft <= 3 && secondsLeft !== lastSecond.current) {
      beepCountdown();
    }
    lastSecond.current = secondsLeft;
  }, [running, phaseRemainingMs, phaseIndex, round]);

  useEffect(() => {
    if (finished && !finishedFired.current) {
      finishedFired.current = true;
      beepFinish();
    }
    if (!finished) finishedFired.current = false;
  }, [finished]);

  useEffect(() => {
    if (!running) lastPhaseKey.current = null;
  }, [running]);
}
