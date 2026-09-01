import Link from "next/link";
import { HistoryIcon } from "@/components/atoms/icons";

/**
 * Acceso a `/historial`, la pantalla anidada. Se monta en dos lugares —
 * Inicio y Perfil — que son las dos puertas de entrada que define el plan.
 */
export function HistorialLink({ label }: { label: string }) {
  return (
    <div className="px-1 pb-6">
      <Link
        href="/historial"
        className="flex items-center gap-3 rounded-xl border border-border bg-surface-alt px-4 py-3 text-sm text-foreground transition-colors hover:border-primary"
      >
        <HistoryIcon />
        <span className="flex-1 font-medium">{label}</span>
        <span className="text-muted">→</span>
      </Link>
    </div>
  );
}
