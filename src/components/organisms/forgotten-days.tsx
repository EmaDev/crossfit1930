"use client";

import { Button, Card } from "lib-kit-components";
import { ATTENDANCE_BACKFILL_DAYS } from "@/lib/data/attendance-window";
import type { ForgottenDay } from "@/lib/data/historial";
import { useMarkAttendance } from "@/lib/hooks/use-mark-attendance";
import { CheckIcon } from "@/components/atoms/icons";

/**
 * "Olvidados": los días de la última semana que quedaron sin marcar, cada uno
 * con su botón para recuperar la asistencia.
 *
 * Es el atajo para el caso real —"me olvidé de marcar el martes"—, sin tener
 * que buscar el día en el calendario. La lista la arma el server
 * (`getForgottenDays`), así que también aparecen los días SIN rutina cargada:
 * que el coach no la haya subido no significa que no se haya entrenado. Los
 * únicos que no están son los descansos que el coach marcó a propósito.
 *
 * Al marcar, el `router.refresh()` del hook rearma la lista desde el server y
 * el día desaparece solo.
 */
export function ForgottenDays({
  days,
  todayIso,
}: {
  days: ForgottenDay[];
  /** Hoy en la zona del box, resuelto en el server. */
  todayIso: string;
}) {
  if (days.length === 0) {
    return (
      <p className="px-1 text-sm text-muted">
        No te quedó ningún día sin marcar en la última semana. Impecable.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="px-1 text-xs text-muted">
        Días de los últimos {ATTENDANCE_BACKFILL_DAYS} sin asistencia marcada. Si entrenaste
        alguno, sumalo ahora.
      </p>
      {days.map((day) => (
        <ForgottenDayRow key={day.dateIso} day={day} todayIso={todayIso} />
      ))}
    </div>
  );
}

function ForgottenDayRow({ day, todayIso }: { day: ForgottenDay; todayIso: string }) {
  const { done, pending, mark } = useMarkAttendance(day.dateIso, false);
  const date = new Date(`${day.dateIso}T00:00:00`);

  return (
    <Card variant="outline" padding="sm" className="flex items-center gap-3">
      <div className="flex h-10 w-10 flex-none flex-col items-center justify-center rounded-lg bg-primary/10 text-primary">
        <span className="text-[10px] font-semibold leading-none">
          {date.toLocaleDateString("es-AR", { month: "short" })}
        </span>
        <span className="text-sm font-bold leading-none">{day.dateIso.slice(-2)}</span>
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {day.dateIso === todayIso
            ? "Hoy"
            : cap(date.toLocaleDateString("es-AR", { weekday: "long" }))}
        </p>
        <p className="truncate text-xs text-muted">
          {/* Sin rutina cargada no hay título, pero el día se marca igual. */}
          {day.title ?? "Sin WOD cargado"}
        </p>
      </div>

      {done ? (
        <span className="flex flex-none items-center gap-1.5 pr-1 text-xs font-semibold text-success">
          <CheckIcon width={14} height={14} />
          Marcado
        </span>
      ) : (
        <Button variant="primary" size="sm" loading={pending} onClick={mark} className="flex-none">
          Marcar
        </Button>
      )}
    </Card>
  );
}

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
