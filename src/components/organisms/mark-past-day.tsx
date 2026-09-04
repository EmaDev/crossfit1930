"use client";

import { Button } from "lib-kit-components";
import {
  ATTENDANCE_BACKFILL_DAYS,
  isMarkableDate,
} from "@/lib/data/attendance-window";
import { useMarkAttendance } from "@/lib/hooks/use-mark-attendance";
import { CheckIcon } from "@/components/atoms/icons";

/**
 * Marcar la asistencia de un día que quedó SIN marcar — el olvido típico: se
 * entrenó el martes y nadie tocó el dock.
 *
 * Vive al pie del BottomSheet de un día en Historial (ver <HistorialCalendar>),
 * que es el único lugar donde el usuario ya está mirando un día puntual del
 * pasado. El día de HOY lo sigue marcando el dock de la pantalla Inicio; acá
 * también se puede, porque el sheet de hoy se abre igual.
 *
 * Estados que puede mostrar:
 *   - ya marcado → confirmación, sin acción
 *   - dentro de la ventana → botón
 *   - más viejo que la ventana → aviso de por qué ya no se puede
 *   - futuro → nada (todavía no se entrenó)
 *
 * La lista de olvidados del tab de Historial (<ForgottenDays>) hace lo mismo
 * fila por fila; los dos comparten `useMarkAttendance`.
 */
export function MarkPastDay({
  dateIso,
  todayIso,
  attended,
}: {
  /** `yyyy-mm-dd` del día que muestra el sheet. */
  dateIso: string;
  /** Hoy en la zona del box, resuelto en el server (no `new Date()` del browser). */
  todayIso: string;
  attended: boolean;
}) {
  const { done, pending, mark } = useMarkAttendance(dateIso, attended);

  if (done) {
    return (
      <p className="flex items-center justify-center gap-2 rounded-xl border border-success/40 bg-success/10 px-4 py-3 text-sm font-semibold text-success">
        <CheckIcon width={16} height={16} />
        Asistencia marcada
      </p>
    );
  }

  // Un día que todavía no pasó no se marca: no hay nada que recordar.
  if (dateIso > todayIso) return null;

  if (!isMarkableDate(dateIso, todayIso)) {
    return (
      <p className="rounded-xl border border-border bg-surface-alt px-4 py-3 text-center text-xs text-muted">
        Este día ya cerró: la asistencia se puede marcar hasta{" "}
        {ATTENDANCE_BACKFILL_DAYS} días después.
      </p>
    );
  }

  const isToday = dateIso === todayIso;

  return (
    <Button
      variant="primary"
      fullWidth
      loading={pending}
      leftIcon={<CheckIcon width={18} height={18} />}
      onClick={mark}
    >
      {isToday ? "Marcar día cumplido" : "Marcar que entrené este día"}
    </Button>
  );
}
