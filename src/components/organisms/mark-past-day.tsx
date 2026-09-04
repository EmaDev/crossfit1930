"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, useSnackbar } from "lib-kit-components";
import { markAttendance } from "@/lib/actions/attendance";
import {
  ATTENDANCE_BACKFILL_DAYS,
  isMarkableDate,
} from "@/lib/data/attendance-window";
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
 * Después de marcar hace `router.refresh()`: la racha del header, el color del
 * día en el calendario y la lista de "Mis marcas" salen todos del server.
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
  const router = useRouter();
  const { snack } = useSnackbar();
  const [done, setDone] = useState(attended);
  const [pending, startTransition] = useTransition();

  const mark = () =>
    startTransition(async () => {
      const res = await markAttendance(dateIso);

      // `not-configured` (Firebase sin credenciales en dev) se toma como ok,
      // igual que en <MarkDayDock>: no hay nada que persistir.
      if (res.ok || res.reason === "not-configured") {
        setDone(true);
        snack({ message: "Asistencia marcada. Se sumó a tu racha.", variant: "success" });
        router.refresh();
        return;
      }

      snack({
        message:
          res.reason === "out-of-range"
            ? "Ese día ya no se puede marcar."
            : "No se pudo marcar la asistencia. Probá de nuevo en un momento.",
        variant: "error",
      });
    });

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
