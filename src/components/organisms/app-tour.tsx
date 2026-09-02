"use client";

import { useEffect, useState } from "react";
import { CoachMark, type CoachMarkStep } from "lib-kit-components";

/**
 * El tour de onboarding de la app: explica, uno por uno, los botones del
 * marco (header, tabs, dock y BottomNav) resaltándolos sobre la pantalla real.
 *
 * Lo dispara el botón de ayuda (?) del header de <RootScreen>. No se abre
 * solo: es a pedido, así que no hay nada que recordar en localStorage.
 *
 * Los targets son selectores CSS resueltos contra el DOM real —no refs—
 * porque los botones viven en componentes distintos (el dock y el BottomNav
 * cuelgan del AppShell, fuera de este árbol). Cada pantalla raíz muestra un
 * subconjunto distinto de estos elementos (sólo Inicio tiene racha tocable y
 * dock de asistencia), por eso los pasos se filtran contra lo que realmente
 * está en pantalla al abrir el tour: un target ausente dejaría un paso con
 * fondo negro y sin recorte.
 */

/** `aria-label` que el kit le pone al botón `leading` del header (hardcodeado). */
const LEADING_LABEL = 'header button[aria-label="Menú"]';

const ALL_STEPS: (CoachMarkStep & { target: string })[] = [
  {
    target: "#tour-streak",
    title: "Tu racha",
    description:
      "Tocá la card para abrir el calendario: vas a ver los días que entrenaste, tu racha actual y tu récord.",
    side: "bottom",
  },
  {
    target: "#tour-tabs",
    title: "Hoy y la semana",
    description:
      "Cambiá entre el WOD de hoy y la planificación completa de la semana.",
    side: "bottom",
  },
  {
    target: '[data-tour="marcar-dia"]',
    title: "Marcá el día cumplido",
    description:
      "Cuando termines el entrenamiento, tocá acá para sumar el día a tu racha.",
    side: "top",
  },
  {
    target: ".tour-bottom-nav",
    title: "El menú de abajo",
    description: "Inicio, Ranking, Timer y Perfil, siempre a mano.",
    side: "top",
  },
  {
    target: 'header button[aria-label^="Notificaciones"]',
    title: "Novedades del box",
    description:
      "Acá caen los WODs nuevos y la actividad de la comunidad. El punto rojo avisa si hay algo sin leer.",
    side: "bottom",
    align: "end",
  },
  {
    target: 'header button[aria-label^="Cambiar a tema"]',
    title: "Claro u oscuro",
    description: "Cambiá el tema de la app con un toque. Queda guardado.",
    side: "bottom",
    align: "end",
  },
  {
    target: LEADING_LABEL,
    title: "Tu perfil",
    description: "Tus datos, tus marcas personales y los ajustes de la app.",
    side: "bottom",
    align: "start",
  },
  {
    target: 'header button[aria-label="Cómo funciona la app"]',
    title: "¿Te perdiste?",
    description: "Volvé a este tour cuando quieras desde este botón.",
    side: "bottom",
    align: "end",
  },
];

/** Está en el DOM y ocupa lugar: el BottomNav, por ejemplo, no existe en desktop. */
function isOnScreen(sel: string): boolean {
  const el = document.querySelector(sel);
  if (!el) return false;
  const { width, height } = el.getBoundingClientRect();
  return width > 0 && height > 0;
}

export function AppTour({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [steps, setSteps] = useState<CoachMarkStep[]>([]);

  // Se recalcula en cada apertura, no al montar: entre un tour y el siguiente
  // el usuario pudo cambiar de pantalla o marcar el día (y perder el dock).
  useEffect(() => {
    if (!open) return;
    setSteps(ALL_STEPS.filter((s) => isOnScreen(s.target)));
  }, [open]);

  if (!open || steps.length === 0) return null;

  return (
    <CoachMark
      open
      steps={steps}
      onClose={onClose}
      finishLabel="Listo"
      skipLabel="Cerrar"
    />
  );
}
