"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { InstallButton, PwaInstallPrompt, usePwaInstall } from "lib-kit-components";

/**
 * Instalación de la PWA, en Ajustes.
 *
 * `hideWhenUnavailable` de <InstallButton> sólo puede esconder el <button>:
 * el título y la descripción de la fila son NUESTROS, así que con la app ya
 * instalada quedaba "Instalar la app / Se abre a pantalla completa…" colgado
 * sin nada al lado (y en standalone, peor: el kit renderiza un chip verde
 * "App instalada", que en una pantalla de ajustes es puro relleno). Por eso la
 * fila entera se monta o no según `usePwaInstall`.
 *
 * En iOS NO existe el evento `beforeinstallprompt`: ahí el botón cambia el
 * texto a "Cómo instalar" y lo único que hace al tocarlo es llamar a
 * `onIosClick`. Sin ese handler el botón queda mudo — por eso abrimos nosotros
 * el sheet con los pasos (Compartir → Agregar a inicio → Agregar).
 */
export function InstallSetting() {
  const pwa = usePwaInstall({
    delay: 0,
    // Bucket de snooze PROPIO, que nadie escribe: acá nunca se llama a
    // `dismiss()`. Con la clave default, un "Ahora no" en el banner del
    // <AppShell> apagaba `canInstall` por 14 días y se llevaba puesta esta
    // fila — justo el lugar al que el usuario viene a instalar a propósito.
    storageKey: "pwa-install-dismissed:ajustes",
  });

  // `PwaInstallPrompt` con `forcePlatform` arranca visible y se cierra con
  // estado INTERNO: no expone `open`/`onClose`. La única forma de volver a
  // abrirlo después de que el usuario lo cierre es remontarlo, así que la key
  // cambia en cada click.
  const [openKey, setOpenKey] = useState<number | null>(null);

  // El sheet del kit se posiciona con `fixed` y sin portal: lo montamos en
  // <body> para que no dependa de los `transform` de los paneles del tab.
  const [canPortal, setCanPortal] = useState(false);
  useEffect(() => setCanPortal(true), []);

  // Ya instalada, o el navegador no la ofrece: no hay nada que ajustar acá.
  // Incluye el caso "el usuario acaba de instalarla" — el hook escucha
  // `appinstalled` y pone `isStandalone`, así que la fila se va sola.
  if (!pwa.canInstall) return null;

  return (
    <div className="flex items-center justify-between gap-4 px-4 py-5">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">Instalar la app</p>
        <p className="mt-1 text-xs text-muted">
          Se abre a pantalla completa y queda en tu pantalla de inicio.
        </p>
      </div>
      <InstallButton
        size="sm"
        variant="outline"
        onIosClick={() => setOpenKey(Date.now())}
        // La fila ya decidió que hay algo que ofrecer: el botón no puede
        // volver a decidirlo por su cuenta y dejarla vacía. Su `usePwaInstall`
        // interno usa la clave de snooze default, que sí puede estar marcada.
        hideWhenUnavailable={false}
      />

      {canPortal &&
        openKey !== null &&
        createPortal(
          <PwaInstallPrompt
            key={openKey}
            appName="Crossfit team"
            tagline="Instalá el box en tu teléfono"
            forcePlatform="ios"
          />,
          document.body,
        )}
    </div>
  );
}
