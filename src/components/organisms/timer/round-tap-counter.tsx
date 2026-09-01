"use client";

import { AnimatedCounter, Button } from "lib-kit-components";

/**
 * Tap gigante para contar rondas de AMRAP — a mano, no lo deriva el reloj: el
 * atleta toca cada vez que cierra una vuelta. `AnimatedCounter` del kit le da
 * el efecto "odómetro" al número; el resto (superficie enorme, deshacer) es
 * nuevo, aprobado para este módulo (plan §9).
 */
export function RoundTapCounter({
  count,
  onIncrement,
  onDecrement,
}: {
  count: number;
  onIncrement: () => void;
  onDecrement: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={onIncrement}
        className="flex h-40 w-40 flex-col items-center justify-center gap-1 rounded-full bg-primary text-white shadow-lg transition-transform active:scale-95 sm:h-48 sm:w-48"
      >
        <span className="text-5xl font-black tabular-nums">
          <AnimatedCounter value={count} duration={0.35} />
        </span>
        <span className="text-xs font-semibold uppercase tracking-wide opacity-90">
          rondas — tocá para sumar
        </span>
      </button>
      <Button variant="ghost" size="sm" onClick={onDecrement} disabled={count === 0}>
        Deshacer
      </Button>
    </div>
  );
}
