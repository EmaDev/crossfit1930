"use client";

import { useState, useTransition } from "react";
import { Modal, SuccessPage, useSnackbar } from "lib-kit-components";
import { markAttendance } from "@/lib/actions/attendance";
import { AttendanceDock } from "@/components/molecules/attendance-dock";

/**
 * La acción de "marcar el día" de la pantalla Hoy: estado, persistencia y
 * celebración. La UI la pone <AttendanceDock>, que es sólo presentacional.
 *
 * Al confirmarse abre un popup con la pantalla de éxito animada del kit
 * (`SuccessPage`), igual que la de un pago exitoso.
 *
 * Sólo se monta con sesión iniciada (lo decide `page.tsx`): a un invitado no
 * se le ofrece marcar asistencia, así que acá no hay guest gate. Si Firebase
 * todavía no está configurado, igual muestra la animación —no hay nada que
 * persistir— para poder probar el flujo en dev.
 */
export function MarkDayDock({
  sessionTitle,
  alreadyDone,
}: {
  sessionTitle: string;
  alreadyDone: boolean;
}) {
  const { snack } = useSnackbar();
  const [done, setDone] = useState(alreadyDone);
  const [showSuccess, setShowSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  const mark = () =>
    startTransition(async () => {
      const res = await markAttendance();

      if (res.ok || res.reason === "not-configured") {
        setDone(true);
        setShowSuccess(true);
        return;
      }

      snack({
        message: "No se pudo marcar el día. Probá de nuevo en un momento.",
        variant: "error",
      });
    });

  const status = pending ? "pending" : done ? "done" : "idle";

  return (
    <>
      <AttendanceDock
        status={status}
        title={COPY[status].title}
        hint={COPY[status].hint}
        onPress={() => (done ? setShowSuccess(true) : mark())}
      />

      <Modal open={showSuccess} onClose={() => setShowSuccess(false)} showClose={false} size="sm">
        <SuccessPage
          variant="card"
          tone="success"
          confetti="burst"
          title={alreadyDone && done ? "Ya lo tenías" : "¡Día cumplido!"}
          headline={sessionTitle}
          description={
            alreadyDone && done
              ? "Ya habías marcado tu asistencia de hoy. Seguí así."
              : "Registramos tu asistencia de hoy. Seguí sumando días a tu racha."
          }
          primary={{ label: "Listo", onClick: () => setShowSuccess(false) }}
        />
      </Modal>
    </>
  );
}

const COPY = {
  idle: { title: "Marcar día cumplido", hint: "Sumá el día a tu racha" },
  pending: { title: "Marcando…", hint: "Un segundo" },
  done: { title: "¡Día cumplido!", hint: "Ver detalle" },
} as const;
