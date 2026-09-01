"use client";

import { useRouter } from "next/navigation";
import { ArrowLeftIcon } from "@/components/atoms/icons";

/**
 * Botón de retroceso para las pantallas que quedan FUERA de los tabs del
 * BottomNav (auth y las que vengan). Las pantallas de detalle dentro de la app
 * ya traen su flecha en el `AppHeader` del kit; este es para las que no llevan
 * header, como el login, donde una barra entera duplicaría el título de la
 * `AuthCard` y le robaría el centrado a la columna.
 *
 * Se posiciona solo, absoluto arriba a la izquierda y por encima del contenido
 * (el contenedor padre tiene que ser `relative`); `className` permite pisarlo.
 */
export function BackButton({
  fallback = "/",
  label = "Volver",
  className = "",
}: {
  /** Adónde ir si no hay historial al que volver (entrada directa por URL). */
  fallback?: string;
  /** Nombre accesible del botón. */
  label?: string;
  className?: string;
}) {
  const router = useRouter();

  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => {
        // Entrar directo al login por URL (o desde la pantalla de instalación
        // de la PWA) deja el historial vacío: ahí `back()` no haría nada y el
        // usuario quedaría trabado, así que vamos al destino de respaldo.
        if (window.history.length > 1) router.back();
        else router.push(fallback);
      }}
      // `--sa-top` es lo que publica <SafeArea> del kit; el env() es el respaldo
      // para las pantallas que no viven dentro del shell.
      className={`absolute left-4 top-[calc(var(--sa-top,env(safe-area-inset-top))+1rem)] z-20 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface/80 text-foreground backdrop-blur-sm transition-[transform,color,border-color] duration-200 hover:border-primary hover:text-primary active:scale-90 ${className}`}
    >
      <ArrowLeftIcon />
    </button>
  );
}
