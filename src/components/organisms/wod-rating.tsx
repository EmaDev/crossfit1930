"use client";

import { useState, useTransition } from "react";
import { StarRatingWidget, useSnackbar } from "lib-kit-components";
import { rateWod } from "@/lib/actions/ratings";
import type { RatingSummary } from "@/lib/data/ratings";
import { useGuestGate } from "@/components/molecules/guest-gate";

/**
 * Bloque de calificación del WOD: arriba el resumen (promedio + distribución)
 * del `StarRatingWidget` en modo lectura, y debajo el voto propio interactivo.
 *
 * Cliente: puntuar es una escritura (pasa por el guest gate) y se refleja
 * optimista mientras la Server Action persiste y revalida la home.
 */
export function WodRating({
  wodDate,
  summary,
}: {
  wodDate: string;
  summary: RatingSummary;
}) {
  const { requireAuth } = useGuestGate();
  const { snack } = useSnackbar();
  const [mine, setMine] = useState(summary.mine ?? 0);
  const [, startTransition] = useTransition();

  const submit = (next: number) =>
    requireAuth(() => {
      const prev = mine;
      setMine(next);
      startTransition(async () => {
        const res = await rateWod(wodDate, next);
        if (!res.ok && res.reason !== "not-configured") {
          setMine(prev);
          snack({
            message: "No se pudo guardar tu puntaje. Probá de nuevo.",
            variant: "error",
          });
        }
      });
    }, "Registrate para puntuar el WOD.");

  return (
    <section className="rounded-2xl border border-border bg-surface p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
        Qué le pareció al box
      </h3>

      <div className="mt-3">
        {summary.count > 0 ? (
          <StarRatingWidget
            readOnly
            average={summary.average}
            count={summary.count}
            distribution={summary.distribution}
          />
        ) : (
          <p className="text-sm text-muted">
            Todavía nadie puntuó este WOD. Sé el primero.
          </p>
        )}
      </div>

      <div className="mt-4 border-t border-border pt-3">
        <p className="mb-1.5 text-sm font-medium text-foreground">Tu puntaje</p>
        <StarRatingWidget value={mine} onChange={submit} />
      </div>
    </section>
  );
}
