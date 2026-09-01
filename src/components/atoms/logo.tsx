import { LOGO_BAR_PATH, LOGO_TEXT_PATH, LOGO_VIEW_BOX } from "./logo-paths";

/**
 * El logo de la marca, vectorizado (ver `scripts/gen-logo-svg.mjs`). Va inline
 * y no como `<img src="/logo.svg">` porque un `<img>` no hereda `currentColor`:
 * es justamente lo que hace que este logo no necesite placa blanca detrás.
 *
 * Dos tonos:
 *
 * - `brand` (por defecto): el texto toma `--color-primary` —el rojo del tema,
 *   que ya se aclara solo en oscuro— y la barra toma `currentColor`, así que
 *   con `text-foreground` queda negra en claro y blanca en oscuro.
 * - `mono`: todo `currentColor`. Es el que va sobre el degradado del hero,
 *   donde el rojo de la marca se perdería contra el fondo.
 *
 * Sin estado ni hooks: es Server Component.
 */
export function Logo({
  tone = "brand",
  className = "",
  label = "Crossfit team",
}: {
  tone?: "brand" | "mono";
  className?: string;
  /** Nombre accesible. Pasá `""` si el logo es decorativo y el texto ya está al lado. */
  label?: string;
}) {
  return (
    <svg
      viewBox={LOGO_VIEW_BOX}
      // Los contrapunzones (la O, la R, la A) vienen como contornos propios.
      fillRule="evenodd"
      className={className}
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
    >
      <path d={LOGO_BAR_PATH} fill="currentColor" />
      <path
        d={LOGO_TEXT_PATH}
        fill={tone === "mono" ? "currentColor" : "var(--color-primary)"}
      />
    </svg>
  );
}
