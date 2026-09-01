"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";

/**
 * Cronómetro base: cuenta ARRIBA desde que arranca, con pausa/resume.
 * Todos los modos del timer (Fase 6) se derivan de `elapsedMs` — FOR TIME lo
 * usa directo (stopwatch), AMRAP/EMOM/TABATA lo envuelven con
 * `useIntervalTimer` para convertirlo en cuenta regresiva por intervalos.
 *
 * No usa `setInterval` para acumular tiempo (eso arrastra drift): guarda
 * `startedAt` + tiempo total en pausa y cada tick sólo relee `Date.now()`, así
 * que el valor mostrado es siempre exacto sin importar cuántos frames se
 * perdieron (pestaña en segundo plano, etc.).
 */

type State = {
  startedAt: number | null;
  running: boolean;
  pausedAccumMs: number;
  pausedAt: number | null;
};

const INITIAL: State = { startedAt: null, running: false, pausedAccumMs: 0, pausedAt: null };

export function useStopwatch(tickMs = 200) {
  const [state, setState] = useState<State>(INITIAL);
  const [, forceTick] = useReducer((n: number) => n + 1, 0);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    if (!state.running) return;
    const id = setInterval(forceTick, tickMs);
    return () => clearInterval(id);
  }, [state.running, tickMs]);

  const start = useCallback(() => {
    setState({ startedAt: Date.now(), running: true, pausedAccumMs: 0, pausedAt: null });
  }, []);

  const pause = useCallback(() => {
    setState((s) => (s.running ? { ...s, running: false, pausedAt: Date.now() } : s));
  }, []);

  const resume = useCallback(() => {
    setState((s) => {
      if (s.running || s.startedAt == null) return s;
      const pausedFor = s.pausedAt != null ? Date.now() - s.pausedAt : 0;
      return { ...s, running: true, pausedAccumMs: s.pausedAccumMs + pausedFor, pausedAt: null };
    });
  }, []);

  const reset = useCallback(() => setState(INITIAL), []);

  const now = state.running ? Date.now() : (state.pausedAt ?? state.startedAt ?? Date.now());
  const elapsedMs = state.startedAt == null ? 0 : Math.max(0, now - state.startedAt - state.pausedAccumMs);

  return {
    elapsedMs,
    running: state.running,
    started: state.startedAt != null,
    start,
    pause,
    resume,
    reset,
  };
}
