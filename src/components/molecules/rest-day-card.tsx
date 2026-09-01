import { Card } from "lib-kit-components";
import { CalendarIcon } from "@/components/atoms/icons";

/**
 * Hoy no hay WOD. No es un error ni un vacío: la rutina de ejemplo entrena
 * de martes a viernes, así que lunes, sábado y domingo son días de descanso.
 * Por eso muestra el próximo día en vez de una pantalla de "sin resultados".
 */
export function RestDayCard({ nextDay }: { nextDay?: { label: string; title: string } }) {
  return (
    <Card variant="outline" padding="lg">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-alt text-muted">
          <CalendarIcon />
        </span>
        <p className="font-semibold text-foreground">Hoy toca descanso</p>
        {nextDay ? (
          <p className="text-sm text-muted">
            El próximo entrenamiento es el{" "}
            <span className="font-medium text-foreground">{nextDay.label}</span>:{" "}
            {nextDay.title}.
          </p>
        ) : (
          <p className="text-sm text-muted">No hay más entrenamientos esta semana.</p>
        )}
      </div>
    </Card>
  );
}
