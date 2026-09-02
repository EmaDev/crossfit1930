import { Card } from "lib-kit-components";
import { SECTION_LABEL, sectionOf, type Exercise, type ExerciseSection } from "@/lib/data/routine-types";

/**
 * Un ejercicio de la rutina. El coach escribe el formato entre paréntesis
 * dentro del nombre —"Movilidad General (AMRAP 5')", "Metcon / WOD (For Time)"—
 * así que lo separamos para mostrarlo como badge y dejar el título limpio.
 *
 * El `detail` se muestra tal cual viene: el escalado está escrito adentro
 * ("15 T2B / 30 K2E", "Scaled: … | ADV: …") y no hay forma confiable de
 * separarlo automáticamente sin romper los casos donde la barra es una lista.
 *
 * El TÍTULO grande de la card es la sección (Calentamiento, Skill, Fuerza,
 * WOD…), que ahora elige el coach en el panel —`sectionOf` cae en la deducción
 * por nombre sólo en rutinas viejas—; el nombre concreto queda debajo.
 */

/**
 * Cada sección con su color (tokens en `globals.css`). Clases literales —nada
 * de `text-block-${section}`— para que el scanner de Tailwind las detecte.
 */
const BLOCK_TEXT: Record<ExerciseSection, string> = {
  calentamiento: "text-block-calentamiento",
  fuerza: "text-block-fuerza",
  skill: "text-block-skill",
  wod: "text-block-wod",
  finisher: "text-block-finisher",
};

const BLOCK_BORDER: Record<ExerciseSection, string> = {
  calentamiento: "border-block-calentamiento",
  fuerza: "border-block-fuerza",
  skill: "border-block-skill",
  wod: "border-block-wod",
  finisher: "border-block-finisher",
};

/** Separa "Metcon / WOD (For Time)" en título y formato. */
function splitFormat(name: string): { title: string; format?: string } {
  const m = name.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  return m ? { title: m[1], format: m[2] } : { title: name };
}

export function ExerciseCard({
  exercise,
  /** "Ver todo junto": sin `Card`, sólo la barra de color a la izquierda. */
  plain = false,
}: {
  exercise: Exercise;
  plain?: boolean;
}) {
  const block = sectionOf(exercise);
  const { title, format } = splitFormat(exercise.name);
  const isWod = block === "wod";

  const content = (
    <>
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
        <h3
          className={`text-md font-extrabold uppercase leading-none tracking-tight ${BLOCK_TEXT[block]}`}
        >
          {SECTION_LABEL[block]}
        </h3>
        {format && (
          <span
            className={`rounded-full border border-current/40 px-2.5 py-0.5 font-mono text-[11px] font-semibold ${BLOCK_TEXT[block]}`}
          >
            {format}
          </span>
        )}
      </div>

      {title && title.trim() !== SECTION_LABEL[block] && (
        <p className="mt-1 text-sm font-semibold leading-snug text-foreground">{title}</p>
      )}

      <p className="mt-1 text-sm leading-relaxed text-muted">{exercise.detail}</p>
    </>
  );

  if (plain) {
    return <div className={`border-l-[3px] pl-4 ${BLOCK_BORDER[block]}`}>{content}</div>;
  }

  return (
    <Card
      variant={isWod ? "elevated" : "outline"}
      padding="md"
      className={`border-l-4 ${BLOCK_BORDER[block]}`}
    >
      {content}
    </Card>
  );
}
