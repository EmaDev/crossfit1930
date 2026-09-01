"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { BottomSheet, CalendarGrid, StatCard, type CalendarEvent } from "lib-kit-components";
import type { UserStats } from "@/lib/data/user-stats";
import { FlameIcon, TrophyIcon } from "@/components/atoms/icons";

/**
 * Detalle de racha: dos tarjetas (racha actual / máxima histórica) y, debajo,
 * un calendario mensual con cada día asistido marcado, navegable entre meses.
 *
 * Se abre desde la card del header (<HeaderStreak>). Recibe todo por props;
 * las fechas llegan como `yyyy-mm-dd` desde `getAttendedDates`.
 *
 * OJO — va en un portal a `document.body` a propósito: el <BottomSheet> del kit
 * se posiciona con `position: fixed` y NO usa portal, y su trigger vive dentro
 * de la card flotante de <AppHeaderCardSlot>, que está envuelta en un
 * `transform: translateY(...)`. Un ancestro con transform pasa a ser el bloque
 * contenedor de sus hijos `fixed`, así que sin el portal el sheet se dibuja
 * dentro del header (calendario recortado arriba, backdrop del tamaño de la
 * card) en vez de sobre el viewport.
 */
export function StreakSheet({
  stats,
  attendedDates,
  open,
  onClose,
}: {
  stats: UserStats;
  attendedDates: string[];
  open: boolean;
  onClose: () => void;
}) {
  // El calendario se maneja controlado para poder navegar meses sin recargar.
  const [month, setMonth] = useState(() => new Date());

  // El portal necesita `document`: recién después de montar en el cliente.
  const [canPortal, setCanPortal] = useState(false);
  useEffect(() => setCanPortal(true), []);

  const events = useMemo<CalendarEvent[]>(
    () =>
      attendedDates.map((date) => ({
        id: date,
        // Una celda del calendario mide ~36px de ancho en mobile: cualquier
        // texto más largo que esto sale truncado ("Asis…").
        title: "✓",
        start: parseLocalDate(date),
        allDay: true,
        color: "success",
      })),
    [attendedDates],
  );

  if (!canPortal) return null;

  return createPortal(
    <BottomSheet
      open={open}
      onClose={onClose}
      snapPoints={[0.75, 0.95]}
      title="Tu racha"
      description={`${stats.totalDays} ${stats.totalDays === 1 ? "día" : "días"} de entrenamiento en total`}
    >
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="Racha actual"
            value={stats.currentStreak}
            footnote={stats.currentStreak === 1 ? "día seguido" : "días seguidos"}
            icon={<FlameIcon />}
            tone="primary"
          />
          <StatCard
            label="Máxima histórica"
            value={stats.maxStreak}
            footnote="tu mejor marca"
            icon={<TrophyIcon />}
            tone="neutral"
          />
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
            Días asistidos
          </p>
          {attendedDates.length === 0 ? (
            <p className="rounded-xl border border-border bg-surface-alt px-4 py-6 text-center text-sm text-muted">
              Todavía no marcaste asistencia. Cuando entrenes, tus días aparecen acá.
            </p>
          ) : (
            <CalendarGrid
              month={month}
              onMonthChange={setMonth}
              events={events}
              weekStartsOn={1}
              maxPerDay={1}
              cellMinHeight={44}
            />
          )}
        </div>
      </div>
    </BottomSheet>,
    document.body,
  );
}

/** `yyyy-mm-dd` → Date en la zona local, sin el corrimiento de `new Date("...")` (que lo interpreta UTC). */
function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}
