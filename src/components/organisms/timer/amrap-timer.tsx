"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BottomSheet, Button, Input, useImmersive, useSnackbar } from "lib-kit-components";
import { saveTimerResult } from "@/lib/actions/timer-results";
import { useIntervalTimer } from "@/lib/timer/use-interval-timer";
import { useTimerSound } from "@/lib/timer/use-timer-sound";
import { useGuestGate } from "@/components/molecules/guest-gate";
import { TimerDisplay } from "@/components/atoms/timer-display";
import { RoundTapCounter } from "@/components/organisms/timer/round-tap-counter";

/**
 * AMRAP: cuenta regresiva de UNA sola fase (`useIntervalTimer` con 1 ronda) +
 * contador de rondas manual (`RoundTapCounter`) — el reloj no puede saber
 * cuántas rondas hizo el atleta, eso se toca a mano.
 */
export function AmrapTimer() {
  const router = useRouter();
  const { snack } = useSnackbar();
  const { requireAuth } = useGuestGate();

  const [minutes, setMinutes] = useState(15);
  const [seconds, setSeconds] = useState(0);
  const [rounds, setRounds] = useState(0);
  const [extraReps, setExtraReps] = useState(0);
  const [showSave, setShowSave] = useState(false);
  const [saving, setSaving] = useState(false);

  const totalMs = (minutes * 60 + seconds) * 1000;
  const timer = useIntervalTimer([{ label: "AMRAP", ms: totalMs || 1 }], 1);
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
    setRounds(0);
    setExtraReps(0);
    setShowSave(false);
  };

  const save = () =>
    requireAuth(async () => {
      setSaving(true);
      const res = await saveTimerResult({
        mode: "amrap",
        config: { totalMs },
        result: { rounds, extraReps },
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
            label="Minutos"
            type="number"
            min={0}
            value={minutes}
            onChange={(e) => setMinutes(Math.max(0, Number(e.target.value)))}
            className="w-28"
          />
          <Input
            label="Segundos"
            type="number"
            min={0}
            max={59}
            value={seconds}
            onChange={(e) => setSeconds(Math.min(59, Math.max(0, Number(e.target.value))))}
            className="w-28"
          />
        </div>
        <Button size="lg" fullWidth onClick={timer.start} disabled={totalMs === 0}>
          Empezar AMRAP
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-8 pt-6">
      <TimerDisplay ms={timer.phaseRemainingMs} tone={timer.phaseRemainingMs <= 3000 ? "danger" : "foreground"} />
      <RoundTapCounter
        count={rounds}
        onIncrement={() => setRounds((r) => r + 1)}
        onDecrement={() => setRounds((r) => Math.max(0, r - 1))}
      />
      <Button variant="ghost" onClick={reset}>
        Reiniciar
      </Button>

      <BottomSheet
        open={showSave}
        onClose={() => setShowSave(false)}
        title="¡Tiempo!"
        description="Guardá cuántas rondas hiciste."
        size="sm"
        footer={
          <Button fullWidth loading={saving} onClick={save}>
            Guardar resultado
          </Button>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="text-center">
            <p className="text-5xl font-black tabular-nums text-foreground">{rounds}</p>
            <p className="text-sm text-muted">rondas completas</p>
          </div>
          <Input
            label="Reps extra (opcional)"
            type="number"
            min={0}
            value={extraReps}
            onChange={(e) => setExtraReps(Math.max(0, Number(e.target.value)))}
          />
        </div>
      </BottomSheet>
    </div>
  );
}
