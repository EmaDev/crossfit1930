"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BottomSheet, CalendarGrid, type CalendarEvent } from "lib-kit-components";
import type { HistorialDay } from "@/lib/data/historial";
import { DayView } from "@/components/organisms/day-view";

/**
 * Calendario mensual de Historial. El mes navega por URL (`?mes=yyyy-mm`), no
 * con estado propio: cada mes es una navegación de Next.js real (server
 * re-fetch de `getRoutineDaysInRange`), coherente con el resto de la app
 * SSR-first — no hay fetch de datos en el cliente acá.
 */
export function HistorialCalendar({
  month,
  routineDays,
  attendedDates,
}: {
  /** `yyyy-mm` del mes que se está mostrando (ya resuelto server-side). */
  month: string;
  routineDays: HistorialDay[];
  attendedDates: string[];
}) {
  const router = useRouter();
  const attended = useMemo(() => new Set(attendedDates), [attendedDates]);
  const byDate = useMemo(
    () => new Map(routineDays.map((d) => [d.dateIso, d])),
    [routineDays],
  );
  const [selected, setSelected] = useState<HistorialDay | null>(null);

  const events: CalendarEvent[] = routineDays.map((d) => ({
    id: d.dateIso,
    title: d.day.title,
    start: new Date(`${d.dateIso}T00:00:00`),
    allDay: true,
    color: attended.has(d.dateIso) ? "success" : "primary",
  }));

  const openDate = (date: Date) => {
    const iso = date.toISOString().slice(0, 10);
    const match = byDate.get(iso);
    if (match) setSelected(match);
  };

  const changeMonth = (next: Date) => {
    const iso = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
    router.push(`/historial?mes=${iso}`);
  };

  return (
    <>
      <CalendarGrid
        month={new Date(`${month}-01T00:00:00`)}
        events={events}
        onDayClick={openDate}
        onEventClick={(e) => openDate(e.start)}
        onMonthChange={changeMonth}
      />

      <BottomSheet
        open={selected != null}
        onClose={() => setSelected(null)}
        title={selected ? new Date(`${selected.dateIso}T00:00:00`).toLocaleDateString("es-AR", {
          weekday: "long",
          day: "numeric",
          month: "long",
        }) : undefined}
        size="lg"
      >
        {selected && <DayView day={selected.day} routineName={selected.routineName} />}
      </BottomSheet>
    </>
  );
}
