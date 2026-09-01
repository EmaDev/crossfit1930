import Link from "next/link";
import { Card } from "lib-kit-components";

export type MarcaEntry = { dateIso: string; title: string };

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

/** Lista de asistencias marcadas en el mes. Pura: sin hooks, se arma server-side. */
export function HistorialMarcas({
  entries,
  isGuest,
}: {
  entries: MarcaEntry[];
  isGuest: boolean;
}) {
  if (isGuest) {
    return (
      <Card variant="outline" padding="md">
        <p className="font-semibold text-foreground">Todavía no tenés cuenta</p>
        <p className="mt-1 text-sm text-muted">
          Registrate gratis para que cada asistencia que marques quede acá.
        </p>
        <div className="mt-4 flex gap-2">
          <Link
            href="/registro"
            className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-center text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
          >
            Crear cuenta
          </Link>
          <Link
            href="/login"
            className="flex-1 rounded-lg border border-border px-4 py-2.5 text-center text-sm font-semibold text-foreground transition-colors hover:bg-surface-alt"
          >
            Ingresar
          </Link>
        </div>
      </Card>
    );
  }

  if (entries.length === 0) {
    return (
      <p className="px-1 text-sm text-muted">Todavía no marcaste asistencia este mes.</p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {entries.map((e) => (
        <Card key={e.dateIso} variant="outline" padding="sm" className="flex items-center gap-3">
          <div className="flex h-10 w-10 flex-none flex-col items-center justify-center rounded-lg bg-primary/10 text-primary">
            <span className="text-[10px] font-semibold leading-none">
              {new Date(`${e.dateIso}T00:00:00`).toLocaleDateString("es-AR", { month: "short" })}
            </span>
            <span className="text-sm font-bold leading-none">
              {e.dateIso.slice(-2)}
            </span>
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{e.title}</p>
            <p className="text-xs text-muted">
              {cap(new Date(`${e.dateIso}T00:00:00`).toLocaleDateString("es-AR", { weekday: "long" }))}
            </p>
          </div>
        </Card>
      ))}
    </div>
  );
}
