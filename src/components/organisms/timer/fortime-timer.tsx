"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BottomSheet, Button, Card, useImmersive, useSnackbar } from "lib-kit-components";
import { saveTimerResult } from "@/lib/actions/timer-results";
import { beepCountdown, beepFinish } from "@/lib/timer/beep";
import { useStopwatch } from "@/lib/timer/use-stopwatch";
import { useGuestGate } from "@/components/molecules/guest-gate";
import { formatClock, TimerDisplay } from "@/components/atoms/timer-display";

/** FOR TIME: cronómetro que sube, con vueltas — no hay duración fija que configurar. */
export function ForTimeTimer() {
  const router = useRouter();
  const { snack } = useSnackbar();
  const { requireAuth } = useGuestGate();
  const stopwatch = useStopwatch();

  const [laps, setLaps] = useState<number[]>([]);
  const [showSave, setShowSave] = useState(false);
  const [saving, setSaving] = useState(false);
  const [finalMs, setFinalMs] = useState(0);

  useImmersive({
    keepAwake: true,
    hideAddressBar: false,
    trackViewportHeight: false,
    disabled: !stopwatch.running,
  });

  const lap = () => {
    setLaps((l) => [...l, stopwatch.elapsedMs]);
    beepCountdown();
  };

  const finish = () => {
    setFinalMs(stopwatch.elapsedMs);
    stopwatch.pause();
    beepFinish();
    setShowSave(true);
  };

  const reset = () => {
    stopwatch.reset();
    setLaps([]);
    setShowSave(false);
  };

  const save = () =>
    requireAuth(async () => {
      setSaving(true);
      const res = await saveTimerResult({
        mode: "fortime",
        config: {},
        result: { totalMs: finalMs, laps },
      });
      setSaving(false);
      if (!res.ok) {
        snack({ message: "No se pudo guardar el resultado.", variant: "error" });
        return;
      }
      snack({ message: "Resultado guardado.", variant: "success" });
      setShowSave(false);
      reset();
      router.refresh();
    }, "Registrate para guardar tus resultados del timer.");

  if (!stopwatch.started) {
    return (
      <div className="flex flex-col items-center gap-6 pt-10">
        <TimerDisplay ms={0} />
        <Button size="lg" fullWidth onClick={stopwatch.start}>
          Empezar
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 pt-6">
      <TimerDisplay ms={stopwatch.elapsedMs} />

      <div className="flex gap-3">
        <Button variant="outline" onClick={lap} disabled={!stopwatch.running}>
          Vuelta
        </Button>
        <Button variant="danger" onClick={finish} disabled={!stopwatch.running}>
          Terminar
        </Button>
      </div>

      {laps.length > 0 && (
        <div className="flex w-full max-w-sm flex-col gap-2">
          {laps
            .map((t, i) => ({ n: i + 1, split: t - (laps[i - 1] ?? 0), total: t }))
            .reverse()
            .map((l) => (
              <Card key={l.n} variant="outline" padding="sm" className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted">Vuelta {l.n}</span>
                <span className="font-mono text-sm text-foreground">{formatClock(l.split)}</span>
                <span className="font-mono text-sm text-muted">{formatClock(l.total)}</span>
              </Card>
            ))}
        </div>
      )}

      <BottomSheet
        open={showSave}
        onClose={() => setShowSave(false)}
        title="¡Listo!"
        size="sm"
        footer={
          <Button fullWidth loading={saving} onClick={save}>
            Guardar resultado
          </Button>
        }
      >
        <div className="text-center">
          <p className="font-mono text-5xl font-black tabular-nums text-foreground">
            {formatClock(finalMs)}
          </p>
          <p className="text-sm text-muted">
            {laps.length > 0 ? `${laps.length} vueltas` : "tiempo total"}
          </p>
        </div>
      </BottomSheet>
    </div>
  );
}
