import type { ReactNode } from "react";
import { Card } from "lib-kit-components";
import { HelpCircleIcon, MoonIcon } from "@/components/atoms/icons";

/**
 * Un día sin WOD. Dos motivos, cada uno con su ícono:
 * - `descanso`: descanso deliberado (luna).
 * - `desconocida`: todavía no se pasó la rutina de ese día (signo de pregunta).
 *
 * `note` es el texto de contexto de abajo (ej. cuál es el próximo día que
 * entrena); lo arma quien la usa porque depende de la pantalla.
 */
export function RestDayCard({
  kind = "descanso",
  note,
}: {
  kind?: "descanso" | "desconocida";
  note?: ReactNode;
}) {
  const isRest = kind === "descanso";

  return (
    <Card variant="outline" padding="lg">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-alt text-muted">
          {isRest ? <MoonIcon /> : <HelpCircleIcon />}
        </span>
        <p className="font-semibold text-foreground">
          {isRest ? "Día de descanso" : "Rutina no cargada"}
        </p>
        {note && <p className="text-sm text-muted">{note}</p>}
      </div>
    </Card>
  );
}
