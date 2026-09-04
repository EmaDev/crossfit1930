"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BottomSheet, CalendarGrid, type CalendarEvent } from "lib-kit-components";
import type { HistorialDay } from "@/lib/data/historial";
import { DayView } from "@/components/organisms/day-view";
import { MarkPastDay } from "@/components/organisms/mark-past-day";

/**
 * Calendario mensual de Historial. El mes navega por URL (`?mes=yyyy-mm`), no
 * con estado propio: cada mes es una navegación de Next.js real (server
 * re-fetch de `getRoutineDaysInRange`), coherente con el resto de la app
 * SSR-first — no hay fetch de datos en el cliente acá.
 *
 * El sheet de cada día es además donde se recupera una asistencia olvidada
 * (<MarkPastDay>). Se abre para CUALQUIER día ya pasado, tenga rutina cargada o
 * no: si el coach no subió el WOD de ese día el box igual abrió, así que la
 * asistencia se tiene que poder marcar. Un día futuro sin rutina no abre nada
 * —no habría qué mostrar ni qué marcar—.
 */
export function HistorialCalendar({
  month,
  routineDays,
  attendedDates,
  todayIso,
  canMark,
}: {
  /** `yyyy-mm` del mes que se está mostrando (ya resuelto server-side). */
  month: string;
  routineDays: HistorialDay[];
  attendedDates: string[];
  /** Hoy en la zona del box, resuelto en el server. */
  todayIso: string;
  /** `false` para un invitado: no tiene racha que sumar. */
  canMark: boolean;
}) {
  const router = useRouter();
  const attended = useMemo(() => new Set(attendedDates), [attendedDates]);
  const byDate = useMemo(
    () => new Map(routineDays.map((d) => [d.dateIso, d])),
    [routineDays],
  );
  // Sólo la fecha: el WOD de ese día puede no existir (semana sin cargar).
  const [selected, setSelected] = useState<string | null>(null);

  const events: CalendarEvent[] = routineDays.map((d) => ({
    id: d.dateIso,
    title: d.day.title,
    start: new Date(`${d.dateIso}T00:00:00`),
    allDay: true,
    color: attended.has(d.dateIso) ? "success" : "primary",
  }));

  const openDate = (date: Date) => {
    const iso = localIso(date);
    // Un día futuro sólo se abre si tiene WOD cargado (para leer la planificación).
    if (iso > todayIso && !byDate.has(iso)) return;
    setSelected(iso);
  };

  // `null` = día sin rutina cargada (o de una semana que el coach no subió).
  const selectedDay = selected ? byDate.get(selected) ?? null : null;

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
        title={selected ? new Date(`${selected}T00:00:00`).toLocaleDateString("es-AR", {
          weekday: "long",
          day: "numeric",
          month: "long",
        }) : undefined}
        size="lg"
      >
        {selected && (
          <div className="flex flex-col gap-4">
            {selectedDay ? (
              <DayView day={selectedDay.day} routineName={selectedDay.routineName} />
            ) : (
              <p className="rounded-xl border border-border bg-surface-alt px-4 py-5 text-center text-sm text-muted">
                No se cargó el WOD de este día. Si entrenaste igual, marcá tu asistencia.
              </p>
            )}
            {canMark && (
              <MarkPastDay
                // `key`: al cambiar de día el estado local ("marcado") arranca
                // de nuevo desde lo que dice el server para esa fecha.
                key={selected}
                dateIso={selected}
                todayIso={todayIso}
                attended={attended.has(selected)}
              />
            )}
          </div>
        )}
      </BottomSheet>
    </>
  );
}

/**
 * `Date` → `yyyy-mm-dd` con los campos LOCALES. `toISOString()` no sirve acá:
 * convierte a UTC, así que un día del calendario se podría leer como el
 * anterior o el siguiente según la zona del dispositivo — y esta fecha es la
 * que se manda a marcar asistencia.
 */
function localIso(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${m}-${d}`;
}
