import Link from "next/link";
import type { UserStats } from "@/lib/data/user-stats";
import { DumbbellIcon, FlameIcon } from "@/components/atoms/icons";

/**
 * Contenido de la card flotante del header: la racha del usuario.
 *
 * Va dentro del slot `card` de <AppHeaderCardSlot>, que aporta el fondo
 * `bg-surface`, el borde y el redondeo — pero NO padding, así que el padding
 * lo pone esta card.
 *
 * Estilo "tipo Duolingo": dos tiles gordas, ícono en un chip de color, número
 * grande y la unidad escrita completa debajo ("días de racha"). La racha
 * máxima no vive acá: es un dato histórico, va en el detalle (<StreakSheet>).
 */
export function StreakCard({ stats }: { stats: UserStats | null }) {
  // Invitado: en vez de ceros deprimentes, la invitación a registrarse.
  if (!stats) return <GuestStreakCard />;

  return (
    <div className="grid grid-cols-2 gap-2.5 p-3">
      <Tile
        icon={<FlameIcon />}
        value={stats.currentStreak}
        label={stats.currentStreak === 1 ? "día de racha" : "días de racha"}
        // Racha en 0 = llama apagada, como en Duolingo: el color se gana.
        tone={stats.currentStreak > 0 ? "streak" : "off"}
        colorValue
      />
      <Tile
        icon={<DumbbellIcon />}
        value={stats.totalDays}
        label={stats.totalDays === 1 ? "día entrenado" : "días entrenados"}
        tone="brand"
      />
    </div>
  );
}

type Tone = "streak" | "brand" | "off";

/** Clases completas por tono: Tailwind no ve las que se arman concatenando. */
const CHIP: Record<Tone, string> = {
  streak: "bg-streak/10 text-streak",
  brand: "bg-primary/10 text-primary",
  off: "bg-muted/10 text-muted",
};

const VALUE: Record<Tone, string> = {
  streak: "text-streak",
  brand: "text-primary",
  off: "text-muted",
};

function Tile({
  icon,
  value,
  label,
  tone,
  colorValue = false,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  tone: Tone;
  /** El número toma el color del tono. Sólo la métrica protagonista. */
  colorValue?: boolean;
}) {
  return (
    // border-b-[3px]: el borde inferior más grueso es lo que le da el aire de
    // botón "3D" de Duolingo sin usar sombras.
    <div className="flex flex-col gap-1.5 rounded-2xl border-2 border-b-[3px] border-border bg-surface-alt p-2.5">
      <div className="flex items-center gap-2">
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${CHIP[tone]}`}
        >
          {icon}
        </span>
        <span
          className={`text-2xl font-extrabold leading-none tabular-nums ${
            colorValue ? VALUE[tone] : "text-foreground"
          }`}
        >
          {value}
        </span>
      </div>
      <span className="text-[11px] font-bold uppercase leading-tight tracking-wide text-muted">
        {label}
      </span>
    </div>
  );
}

function GuestStreakCard() {
  return (
    <div className="flex items-center gap-3 p-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-streak/10 text-streak">
        <FlameIcon className="h-6 w-6" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">Empezá tu racha</p>
        <p className="text-xs text-muted">Registrate y sumá días al ranking del box.</p>
      </div>
      <Link
        href="/login"
        className="shrink-0 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-primary-hover"
      >
        Iniciar sesión
      </Link>
    </div>
  );
}
