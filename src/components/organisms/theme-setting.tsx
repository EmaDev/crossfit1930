"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { SunIcon, MoonIcon } from "@/components/atoms/icons";

const OPTS = [
  { value: "system", label: "Sistema", icon: null },
  { value: "light", label: "Claro", icon: <SunIcon /> },
  { value: "dark", label: "Oscuro", icon: <MoonIcon /> },
] as const;

/** Selector de tema (Sistema / Claro / Oscuro) para la pantalla de ajustes. */
export function ThemeSetting() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const current = mounted ? theme ?? "system" : "system";

  return (
    <div className="px-4 py-5">
      <p className="mb-2 text-sm font-semibold text-foreground">Tema</p>
      <div className="grid grid-cols-3 gap-2">
        {OPTS.map((o) => {
          const active = current === o.value;
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => setTheme(o.value)}
              className={
                "flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-xs font-medium transition-colors " +
                (active
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-surface text-muted hover:text-foreground")
              }
            >
              <span className="flex h-5 w-5 items-center justify-center">{o.icon}</span>
              {o.label}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-muted">
        La paleta roja sobre negro se adapta sola en ambos temas.
      </p>
    </div>
  );
}
