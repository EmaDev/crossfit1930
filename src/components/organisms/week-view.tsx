"use client";

import { useState } from "react";
import { ChipCarousel, type Chip } from "lib-kit-components";

/**
 * Selector de día de la semana + el día elegido debajo.
 *
 * Los chips salen de los días que la rutina realmente trae: la de ejemplo va
 * de martes a viernes, así que NO se dibuja una semana fija de lunes a sábado
 * con huecos. Los paneles llegan ya renderizados desde el Server Component.
 */
export function WeekView({
  days,
  panels,
  initialDay,
}: {
  days: { id: string; label: string; isToday: boolean }[];
  panels: Record<string, React.ReactNode>;
  initialDay: string;
}) {
  const [day, setDay] = useState(initialDay);

  // `sub` sólo se ve en size="lg"/variant="cover": el día de hoy se marca con un punto.
  const chips: Chip[] = days.map((d) => ({
    id: d.id,
    label: d.label,
    icon: d.isToday ? <span className="block h-2 w-2 rounded-full bg-current" /> : undefined,
  }));

  return (
    <div className="flex flex-col gap-4">
      <ChipCarousel
        chips={chips}
        value={day}
        // `clearable={false}`: siempre tiene que haber un día elegido.
        clearable={false}
        onChange={(v) => setDay(v as string)}
        variant="solid"
        size="md"
      />
      {panels[day]}
    </div>
  );
}
