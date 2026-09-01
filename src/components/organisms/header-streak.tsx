"use client";

import { useState } from "react";
import type { UserStats } from "@/lib/data/user-stats";
import { StreakCard } from "@/components/molecules/streak-card";
import { StreakSheet } from "@/components/organisms/streak-sheet";

/**
 * Card de racha del header, ahora tocable: abre un BottomSheet con el detalle
 * (racha actual, máxima histórica y el calendario de asistencia).
 *
 * Es cliente por el estado del sheet; recibe `stats` y las fechas ya resueltas
 * por props, así el `page.tsx` sigue siendo Server Component. El sheet se monta
 * recién al abrirse por primera vez.
 *
 * Invitado (`stats === null`): no hay racha que detallar, se muestra la
 * invitación a registrarse tal cual, sin trigger.
 */
export function HeaderStreak({
  stats,
  attendedDates,
}: {
  stats: UserStats | null;
  attendedDates: string[];
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  if (!stats) return <StreakCard stats={null} />;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setMounted(true);
          setOpen(true);
        }}
        aria-label="Ver el detalle de tu racha y asistencia"
        // Sin padding propio: el padding lo pone <StreakCard>, y el hover no
        // puede ser bg-surface-alt porque ahora es el fondo de las tiles.
        className="block w-full rounded-2xl text-left transition-transform active:scale-[0.99]"
      >
        <StreakCard stats={stats} />
      </button>

      {mounted && (
        <StreakSheet
          stats={stats}
          attendedDates={attendedDates}
          open={open}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
