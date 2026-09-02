"use client";

import { useCallback, useEffect, useState } from "react";
import { BottomSheet, Button, Spinner, useSnackbar } from "lib-kit-components";
import type { RoutineDay } from "@/lib/data/routine-types";
import { dayAsText, renderDayImage } from "@/lib/share/wod-image";
import { CheckIcon, CopyIcon, WhatsappIcon } from "@/components/atoms/icons";

/**
 * Sheet para compartir la planificación de un día como imagen.
 *
 * Sobre WhatsApp: **no se puede adjuntar una imagen a un `wa.me/?text=`** —
 * ese link sólo lleva texto. La única vía web para mandar un archivo a
 * WhatsApp es `navigator.share({ files })`, que abre la hoja nativa del
 * sistema (WhatsApp aparece ahí). Por eso:
 *
 *   - Mobile con Web Share nivel 2 → hoja nativa con la imagen adjunta.
 *   - Sin soporte (típicamente desktop) → WhatsApp Web con la rutina en texto,
 *     y el botón de copiar para pegar la imagen a mano.
 */
export function ShareDaySheet({
  day,
  routineName,
  open,
  onClose,
}: {
  day: RoutineDay;
  routineName: string;
  open: boolean;
  onClose: () => void;
}) {
  const { snack } = useSnackbar();
  const [blob, setBlob] = useState<Blob | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);

  // La imagen se genera al ABRIR el sheet, no al tocar "WhatsApp". Dos razones:
  // no dibujar 5 canvas al cargar la pantalla si el usuario no comparte nada, y
  // sobre todo que `navigator.share` exige activación de usuario vigente — si
  // la generáramos dentro del handler, el `await` la consumiría y iOS la rechaza.
  useEffect(() => {
    if (!open || blob) return;

    let alive = true;
    setError(false);

    renderDayImage(day, routineName)
      .then((b) => {
        if (!alive) return;
        setBlob(b);
        setUrl(URL.createObjectURL(b));
      })
      .catch(() => alive && setError(true));

    return () => {
      alive = false;
    };
  }, [open, blob, day, routineName]);

  // Liberar el object URL al desmontar; si no, queda el blob retenido.
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);

  const fileName = `crossfit-team-${day.weekday}.png`;

  const shareWhatsapp = useCallback(async () => {
    const text = dayAsText(day, routineName);

    if (blob) {
      const file = new File([blob], fileName, { type: "image/png" });
      // `canShare` con files es lo que distingue Web Share nivel 2 del nivel 1.
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], text });
          return;
        } catch (err) {
          // El usuario canceló la hoja: no es un error que valga avisar.
          if ((err as Error)?.name === "AbortError") return;
        }
      }
    }

    // Fallback: WhatsApp sólo con el texto (un link no puede llevar la imagen).
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
    snack({
      message: "WhatsApp abre con el texto. Copiá la imagen y pegala en el chat.",
      duration: 6000,
    });
  }, [blob, day, routineName, fileName, snack]);

  const copyImage = useCallback(async () => {
    if (!blob) return;

    try {
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Firefox y los contextos no seguros no soportan copiar imágenes.
      const ok = await navigator.clipboard
        .writeText(dayAsText(day, routineName))
        .then(() => true)
        .catch(() => false);

      snack({
        message: ok
          ? "Tu navegador no copia imágenes: copiamos la rutina en texto."
          : "No se pudo copiar. Mantené presionada la imagen para guardarla.",
        variant: ok ? undefined : "error",
        duration: 6000,
      });
    }
  }, [blob, day, routineName, snack]);

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      snapPoints={[0.75, 0.95]}
      title="Compartir la planificación"
      description={`${day.weekday} · ${day.title}`}
      footer={
        <div className="flex gap-2">
          <Button
            fullWidth
            // `success` aporta forma, sombra y el hover:brightness; el color va
            // inline porque una clase de Tailwind empataría en especificidad
            // con el `bg-success` de la variante y ganaría la que el bundler
            // ponga última en el CSS. El estilo inline no deja esa duda.
            variant="success"
            style={{
              backgroundColor: "var(--color-whatsapp)",
              color: "var(--color-whatsapp-fg)",
            }}
            disabled={!blob && !error}
            onClick={shareWhatsapp}
            leftIcon={<WhatsappIcon />}
          >
            WhatsApp
          </Button>
          <Button
            fullWidth
            variant="outline"
            disabled={!blob}
            onClick={copyImage}
            leftIcon={copied ? <CheckIcon /> : <CopyIcon />}
          >
            {copied ? "¡Copiada!" : "Copiar imagen"}
          </Button>
        </div>
      }
    >
      <div className="flex min-h-56 items-center justify-center rounded-xl border border-border bg-surface-alt p-3">
        {error ? (
          <p className="px-6 py-10 text-center text-sm text-muted">
            No se pudo generar la imagen. Podés compartir la rutina en texto igual.
          </p>
        ) : url ? (
          <img
            src={url}
            alt={`Planificación del ${day.weekday}: ${day.title}`}
            className="max-h-[46vh] w-auto rounded-lg shadow-lg"
          />
        ) : (
          <span className="flex flex-col items-center gap-3 py-12 text-sm text-muted">
            <Spinner />
            Generando la imagen…
          </span>
        )}
      </div>
    </BottomSheet>
  );
}
