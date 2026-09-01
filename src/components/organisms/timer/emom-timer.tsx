"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BottomSheet, Button, Input, useImmersive, useSnackbar } from "lib-kit-components";
import { saveTimerResult } from "@/lib/actions/timer-results";
import { useIntervalTimer } from "@/lib/timer/use-interval-timer";
import { useTimerSound } from "@/lib/timer/use-timer-sound";
import { useGuestGate } from "@/components/molecules/guest-gate";
import { TimerDisplay } from "@/components/atoms/timer-display";

/** EMOM: una sola fase repetida `rounds` veces — la ronda la lleva el reloj, no el atleta. */
export function EmomTimer() {
  const router = useRouter();
  const { snack } = useSnackbar();
  const { requireAuth } = useGuestGate();

  const [intervalSec, setIntervalSec] = useState(60);
  const [rounds, setRounds] = useState(10);
  const [showSave, setShowSave] = useState(false);
  const [saving, setSaving] = useState(false);

  const timer = useIntervalTimer([{ label: "EMOM", ms: (intervalSec || 1) * 1000 }], rounds);
  useTimerSound({
    running: timer.running,
    phaseRemainingMs: timer.phaseRemainingMs,
    phaseIndex: timer.phaseIndex,
    round: timer.round,
    finished: timer.finished,
  });
  useImmersive({ keepAwake: true, hideAddressBar: false, trackViewportHeight: false, disabled: !timer.running });

  useEffect(() => {
    if (timer.finished) setShowSave(true);
  }, [timer.finished]);

  const reset = () => {
    timer.reset();
    setShowSave(false);
  };

  const save = () =>
    requireAuth(async () => {
      setSaving(true);
      const res = await saveTimerResult({
        mode: "emom",
        config: { intervalMs: intervalSec * 1000, rounds },
        result: { rounds },
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

  if (!timer.started) {
    return (
      <div className="flex flex-col items-center gap-6 pt-6">
        <div className="flex items-end gap-3">
          <Input
            label="Intervalo (seg)"
            type="number"
            min={5}
            value={intervalSec}
            onChange={(e) => setIntervalSec(Math.max(5, Number(e.target.value)))}
            className="w-32"
          />
          <Input
            label="Rondas"
            type="number"
            min={1}
            value={rounds}
            onChange={(e) => setRounds(Math.max(1, Number(e.target.value)))}
            className="w-28"
          />
        </div>
        <Button size="lg" fullWidth onClick={timer.start}>
          Empezar EMOM
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 pt-8">
      <p className="text-lg font-semibold text-muted">
        Ronda {timer.round + 1} / {timer.rounds}
      </p>
      <TimerDisplay ms={timer.phaseRemainingMs} tone={timer.phaseRemainingMs <= 3000 ? "danger" : "foreground"} />
      <Button variant="ghost" onClick={reset}>
        Reiniciar
      </Button>

      <BottomSheet
        open={showSave}
        onClose={() => setShowSave(false)}
        title="¡EMOM completo!"
        description={`${rounds} rondas de ${intervalSec}s.`}
        size="sm"
        footer={
          <Button fullWidth loading={saving} onClick={save}>
            Guardar resultado
          </Button>
        }
      >
        <p className="text-sm text-muted">Se guarda con la config con la que corriste.</p>
      </BottomSheet>
    </div>
  );
}
