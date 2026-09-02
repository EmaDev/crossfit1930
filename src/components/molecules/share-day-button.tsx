"use client";

import { useState } from "react";
import type { RoutineDay } from "@/lib/data/routine-types";
import { ShareDaySheet } from "@/components/organisms/share-day-sheet";
import { ShareIcon } from "@/components/atoms/icons";

/**
 * Disparador de "compartir el día". Es cliente y recibe el día ya resuelto
 * por props, así `DayView` sigue siendo Server Component.
 *
 * El sheet se monta sólo cuando se abrió por primera vez: si no, cada día de
 * la semana montaría su propio BottomSheet cerrado de entrada.
 */
export function ShareDayButton({
  day,
  routineName,
}: {
  day: RoutineDay;
  routineName: string;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setMounted(true);
          setOpen(true);
        }}
        aria-label={`Compartir la planificación del ${day.weekday}`}
        className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-surface px-3 text-xs font-semibold text-foreground transition-colors hover:border-primary hover:text-primary"
      >
        <ShareIcon className="h-4 w-4" />
        Compartir
      </button>

      {mounted && (
        <ShareDaySheet
          day={day}
          routineName={routineName}
          open={open}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
