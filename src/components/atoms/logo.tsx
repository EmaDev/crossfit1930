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
 * `barClassName` deja pisar el color SÓLO de la barra (la mancuerna) sin tocar
 * el texto: en el hero el texto hereda el blanco del header pero la barra va en
 * negro fijo (`text-black`), como en el logo original de la marca.
 *
 * Sin estado ni hooks: es Server Component.
 */
export function Logo({
  tone = "brand",
  className = "",
  barClassName = "",
  label = "Crossfit team",
}: {
  tone?: "brand" | "mono";
  className?: string;
  /** Clases para la barra (la mancuerna). Su `fill` es `currentColor`, así que un `text-*` la recolorea. */
  barClassName?: string;
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
      <path d={LOGO_BAR_PATH} fill="currentColor" className={barClassName} />
      <path
        d={LOGO_TEXT_PATH}
        fill={tone === "mono" ? "currentColor" : "var(--color-primary)"}
      />
    </svg>
  );
}
