"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useSnackbar } from "lib-kit-components";
import { markAttendance } from "@/lib/actions/attendance";

/**
 * Marcar la asistencia de UN día concreto, con su estado y su feedback.
 *
 * Lo comparten las dos puntas que recuperan un olvido —el botón del sheet de
 * un día (<MarkPastDay>) y cada fila del tab "Olvidados" (<ForgottenDays>)—,
 * que muestran cosas distintas pero hacen exactamente lo mismo: llamar a la
 * action, avisar, y refrescar para que la racha del header, el calendario y la
 * lista se rearmen desde el server.
 *
 * `done` arranca en `attended` y es local: el día que se acaba de marcar queda
 * confirmado en pantalla sin esperar a que termine el refresh.
 */
export function useMarkAttendance(dateIso: string, attended: boolean) {
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

  return { done, pending, mark };
}
