import { Card } from "lib-kit-components";
import type { Comment } from "lib-kit-components";
import type { RatingSummary } from "@/lib/data/ratings";
import type { RoutineDay } from "@/lib/data/wods";
import { ExerciseCard } from "@/components/molecules/exercise-card";
import { ShareDayButton } from "@/components/molecules/share-day-button";
import { WodComments } from "@/components/organisms/wod-comments";
import { WodRating } from "@/components/organisms/wod-rating";

/**
 * Un día de la rutina dentro de UNA card claramente identificada: arriba el
 * día bien grande + el título de la sesión, y debajo los bloques en una lista
 * corrida (cada sección con su barra de color a la izquierda, sin cards).
 *
 * Por ahora el formato es fijo. En el segundo MVP el panel de admin va a poder
 * elegir cómo se muestra la planificación (lista corrida vs. bloques en cards).
 *
 * `community` sólo se pasa para el WOD de HOY (tab "Hoy"): agrega debajo el
 * bloque de calificación y los comentarios del box. Los días del tab "Semana"
 * quedan como pura planificación.
 *
 * Sin estado → Server Component. Los datos llegan por props; `WodRating` y
 * `WodComments` son los únicos hijos cliente.
 */

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

export type DayCommunity = {
  wodDate: string;
  rating: RatingSummary;
  comments: Comment[];
  currentUser?: { name: string; avatar?: string };
};

export function DayView({
  day,
  routineName,
  community,
}: {
  day: RoutineDay;
  routineName: string;
  community?: DayCommunity;
}) {
  return (
    <div className="flex flex-col gap-4">
      <Card variant="elevated" padding="none" className="overflow-hidden">
        <header className="flex items-start justify-between gap-3 border-b border-border bg-surface-alt px-4 py-4">
          <div className="min-w-0">
            <h2 className="text-3xl font-black uppercase leading-none tracking-tight text-foreground">
              {cap(day.weekday)}
            </h2>
            <p className="mt-2 text-sm font-medium text-muted">{day.title}</p>
          </div>
          <ShareDayButton day={day} routineName={routineName} />
        </header>

        <div className="flex flex-col gap-5 p-4">
          {day.exercises.map((ex) => (
            <ExerciseCard key={ex.name} exercise={ex} plain />
          ))}
        </div>
      </Card>

      {community && (
        <>
          <WodRating wodDate={community.wodDate} summary={community.rating} />
          <WodComments
            wodDate={community.wodDate}
            comments={community.comments}
            currentUser={community.currentUser}
          />
        </>
      )}
    </div>
  );
}
