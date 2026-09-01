"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  CollapsibleFormSections,
  DatePicker,
  Input,
  Switch,
  Textarea,
  useToast,
  type FormSection,
} from "lib-kit-components";
import { saveRoutine, type RoutineInput } from "@/lib/actions/routines";
import {
  ORDERED_WEEKDAYS,
  type Exercise,
  type Routine,
  type Weekday,
} from "@/lib/data/routine-types";
import { PlusIcon, TrashIcon } from "@/components/atoms/icons";

const WEEKDAY_LABEL: Record<Weekday, string> = {
  lunes: "Lunes",
  martes: "Martes",
  miércoles: "Miércoles",
  jueves: "Jueves",
  viernes: "Viernes",
  sábado: "Sábado",
  domingo: "Domingo",
};

const EMPTY_EXERCISE: Exercise = { name: "", detail: "" };

type DayState = { title: string; exercises: Exercise[] } | null;
type DaysState = Record<Weekday, DayState>;

function initialDaysState(routine: Routine | null): DaysState {
  const base = Object.fromEntries(ORDERED_WEEKDAYS.map((w) => [w, null])) as DaysState;
  for (const d of routine?.days ?? []) {
    base[d.weekday] = { title: d.title, exercises: d.exercises.length ? d.exercises : [EMPTY_EXERCISE] };
  }
  return base;
}

const REASON_MESSAGE: Record<string, string> = {
  forbidden: "Tu sesión no tiene permisos de admin.",
  "not-configured": "Firebase no está configurado en este entorno.",
  invalid: "Revisá la fecha, el nombre y que cada día tenga al menos un ejercicio.",
  error: "Algo falló guardando. Probá de nuevo.",
};

export function RoutineForm({
  weekStart,
  initial,
  isNewWeek,
}: {
  weekStart: string;
  initial: Routine | null;
  /** `true` si todavía no hay un doc en esta fecha: se puede elegir otra semana. */
  isNewWeek: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();

  const [date, setDate] = useState<Date>(() => new Date(`${weekStart}T00:00:00`));
  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState(initial?.type ?? "crossfit");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [days, setDays] = useState<DaysState>(() => initialDaysState(initial));
  const [saving, setSaving] = useState(false);

  const toggleDay = (weekday: Weekday, active: boolean) => {
    setDays((prev) => ({
      ...prev,
      [weekday]: active ? { title: "", exercises: [{ ...EMPTY_EXERCISE }] } : null,
    }));
  };

  const setDayTitle = (weekday: Weekday, title: string) => {
    setDays((prev) => ({ ...prev, [weekday]: { ...prev[weekday]!, title } }));
  };

  const setExercise = (weekday: Weekday, index: number, patch: Partial<Exercise>) => {
    setDays((prev) => {
      const day = prev[weekday]!;
      const exercises = day.exercises.map((e, i) => (i === index ? { ...e, ...patch } : e));
      return { ...prev, [weekday]: { ...day, exercises } };
    });
  };

  const addExercise = (weekday: Weekday) => {
    setDays((prev) => {
      const day = prev[weekday]!;
      return { ...prev, [weekday]: { ...day, exercises: [...day.exercises, { ...EMPTY_EXERCISE }] } };
    });
  };

  const removeExercise = (weekday: Weekday, index: number) => {
    setDays((prev) => {
      const day = prev[weekday]!;
      const exercises = day.exercises.filter((_, i) => i !== index);
      return { ...prev, [weekday]: { ...day, exercises } };
    });
  };

  const submit = async () => {
    setSaving(true);
    const input: RoutineInput = {
      name,
      type,
      description,
      days: ORDERED_WEEKDAYS.filter((w) => days[w] != null).map((w) => ({
        weekday: w,
        title: days[w]!.title,
        exercises: days[w]!.exercises,
      })),
    };
    const iso = date.toISOString().slice(0, 10);

    const res = await saveRoutine(iso, input);
    setSaving(false);

    if (!res.ok) {
      toast({
        title: "No se pudo guardar",
        description: REASON_MESSAGE[res.reason],
        variant: "error",
      });
      return;
    }

    toast({
      title: res.created ? "Semana creada" : "Semana actualizada",
      variant: "success",
    });
    router.push("/admin");
    router.refresh();
  };

  const sections: FormSection[] = [
    {
      id: "general",
      title: "Datos de la semana",
      description: "Nombre y descripción tal como los ve el atleta en Inicio.",
      defaultOpen: true,
      content: (
        <>
          {isNewWeek ? (
            <DatePicker
              className="sm:col-span-2"
              label="Semana (elegí el lunes)"
              value={date}
              onChange={(v) => v instanceof Date && setDate(v)}
              disabledDate={(d) => d.getDay() !== 1}
              weekStartsOn={1}
            />
          ) : (
            <div className="sm:col-span-2 text-sm text-muted">
              Semana del{" "}
              <span className="font-medium text-foreground">
                {date.toLocaleDateString("es-AR")}
              </span>{" "}
              — para cambiar la fecha, cargá la semana como nueva.
            </div>
          )}
          <Input label="Nombre de la rutina" value={name} onChange={(e) => setName(e.target.value)} />
          <Input label="Tipo" value={type} onChange={(e) => setType(e.target.value)} hint="Ej. crossfit" />
          <Textarea
            className="sm:col-span-2"
            label="Descripción"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </>
      ),
    },
    ...ORDERED_WEEKDAYS.map((weekday): FormSection => {
      const day = days[weekday];
      return {
        id: weekday,
        title: WEEKDAY_LABEL[weekday],
        description: day ? day.title || "Sin título todavía" : "Día de descanso",
        defaultOpen: day != null,
        content: (
          <>
            <Switch
              className="sm:col-span-2"
              checked={day != null}
              onChange={(checked) => toggleDay(weekday, checked)}
              label="Hay entrenamiento este día"
            />
            {day && (
              <>
                <Input
                  className="sm:col-span-2"
                  label="Título del día"
                  value={day.title}
                  onChange={(e) => setDayTitle(weekday, e.target.value)}
                  placeholder='Ej. "Power Clean Complex & Metcon"'
                />
                {day.exercises.map((exercise, i) => (
                  <div
                    key={i}
                    className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:col-span-2"
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-1">
                        <Input
                          label="Ejercicio"
                          value={exercise.name}
                          onChange={(e) => setExercise(weekday, i, { name: e.target.value })}
                          placeholder="Ej. Metcon / WOD (AMRAP 15')"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Quitar ejercicio"
                        onClick={() => removeExercise(weekday, i)}
                      >
                        <TrashIcon />
                      </Button>
                    </div>
                    <Textarea
                      label="Detalle"
                      value={exercise.detail}
                      onChange={(e) => setExercise(weekday, i, { detail: e.target.value })}
                      placeholder="Reps, escalado (Scaled: … | ADV: …), etc."
                    />
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="sm:col-span-2"
                  leftIcon={<PlusIcon />}
                  onClick={() => addExercise(weekday)}
                >
                  Agregar ejercicio
                </Button>
              </>
            )}
          </>
        ),
      };
    }),
  ];

  return (
    <div className="flex flex-col gap-4 pb-4">
      <CollapsibleFormSections sections={sections} />
      <Button fullWidth loading={saving} onClick={submit}>
        Guardar semana
      </Button>
    </div>
  );
}
