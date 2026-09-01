"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BottomSheet, Button, Input, useImmersive, useSnackbar } from "lib-kit-components";
import { saveTimerResult } from "@/lib/actions/timer-results";
import { useIntervalTimer } from "@/lib/timer/use-interval-timer";
import { useTimerSound } from "@/lib/timer/use-timer-sound";
import { useGuestGate } from "@/components/molecules/guest-gate";
import { TimerDisplay } from "@/components/atoms/timer-display";

/**
 * TABATA: dos fases (trabajo/descanso) repetidas `rounds` veces, con el fondo
 * a pantalla completa en verde/rojo (plan §9) — se lee de un vistazo desde
 * lejos, que es el punto de un timer de gimnasio.
 */
export function TabataTimer() {
  const router = useRouter();
  const { snack } = useSnackbar();
  const { requireAuth } = useGuestGate();

  const [workSec, setWorkSec] = useState(20);
  const [restSec, setRestSec] = useState(10);
  const [rounds, setRounds] = useState(8);
  const [showSave, setShowSave] = useState(false);
  const [saving, setSaving] = useState(false);

  const timer = useIntervalTimer(
    [
      { label: "Trabajo", ms: (workSec || 1) * 1000, tone: "success" },
      { label: "Descanso", ms: (restSec || 1) * 1000, tone: "danger" },
    ],
    rounds,
  );
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
        mode: "tabata",
        config: { workMs: workSec * 1000, restMs: restSec * 1000, rounds },
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
        <div className="flex flex-wrap items-end justify-center gap-3">
          <Input
            label="Trabajo (seg)"
            type="number"
            min={1}
            value={workSec}
            onChange={(e) => setWorkSec(Math.max(1, Number(e.target.value)))}
            className="w-28"
          />
          <Input
            label="Descanso (seg)"
            type="number"
            min={1}
            value={restSec}
            onChange={(e) => setRestSec(Math.max(1, Number(e.target.value)))}
            className="w-28"
          />
          <Input
            label="Rondas"
            type="number"
            min={1}
            value={rounds}
            onChange={(e) => setRounds(Math.max(1, Number(e.target.value)))}
            className="w-24"
          />
        </div>
        <Button size="lg" fullWidth onClick={timer.start}>
          Empezar TABATA
        </Button>
      </div>
    );
  }

  const bgClass = timer.phase.tone === "success" ? "bg-success" : "bg-danger";

  return (
    <>
      <div className={`fixed inset-0 z-40 flex flex-col items-center justify-center gap-4 ${bgClass}`}>
        <p className="text-lg font-bold uppercase tracking-widest text-white/90">
          {timer.phase.label}
        </p>
        <TimerDisplay ms={timer.phaseRemainingMs} tone={timer.phase.tone} />
        <p className="text-white/90">
          Ronda {timer.round + 1} / {timer.rounds}
        </p>
        <Button variant="secondary" className="mt-6" onClick={reset}>
          Salir
        </Button>
      </div>

      <BottomSheet
        open={showSave}
        onClose={() => setShowSave(false)}
        title="¡TABATA completo!"
        description={`${rounds} rondas de ${workSec}s / ${restSec}s.`}
        size="sm"
        footer={
          <Button fullWidth loading={saving} onClick={save}>
            Guardar resultado
          </Button>
        }
      >
        <p className="text-sm text-muted">Se guarda con la config con la que corriste.</p>
      </BottomSheet>
    </>
  );
}
