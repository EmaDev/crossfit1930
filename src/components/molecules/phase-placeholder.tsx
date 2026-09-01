import { Card } from "lib-kit-components";

/**
 * Marcador de una pantalla que todavía no tiene su fase construida. Existe
 * para que el shell sea navegable de punta a punta desde la fase 0 y se vea
 * qué falta, en vez de dejar rutas en blanco.
 *
 * Se borra cuando la fase correspondiente entrega su pantalla real.
 */
export function PhasePlaceholder({
  phase,
  title,
  items,
}: {
  phase: string;
  title: string;
  items: string[];
}) {
  return (
    <div className="flex flex-col gap-4 px-4 py-6">
      <Card variant="outline" padding="md">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">{phase}</p>
        <p className="mt-1 font-semibold text-foreground">{title}</p>
        <ul className="mt-3 flex flex-col gap-1.5 text-sm text-muted">
          {items.map((item) => (
            <li key={item}>· {item}</li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
