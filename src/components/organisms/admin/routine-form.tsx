"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  CollapsibleFormSections,
  DatePicker,
  Input,
  Select,
  Switch,
  Textarea,
  useToast,
  type FormSection,
} from "lib-kit-components";
import { saveRoutine, type RoutineInput } from "@/lib/actions/routines";
import {
  ORDERED_WEEKDAYS,
  dayKind,
  type Exercise,
  type Routine,
  type RoutineDay,
  type Weekday,
} from "@/lib/data/routine-types";
import { PlusIcon, TrashIcon } from "@/components/atoms/icons";
import { RoutineJsonIo } from "@/components/molecules/routine-json-io";

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

/**
 * Cada día tiene uno de tres modos:
 * - `training`: hay WOD → se editan título y ejercicios.
 * - `descanso`: descanso deliberado → se guarda igual, sin ejercicios.
 * - `desconocida`: todavía no se pasó la rutina → NO se guarda (default).
 */
type DayMode = "training" | "descanso" | "desconocida";
type DayState = { mode: DayMode; title: string; exercises: Exercise[] };
type DaysState = Record<Weekday, DayState>;

const emptyDay = (): DayState => ({
  mode: "desconocida",
  title: "",
  exercises: [{ ...EMPTY_EXERCISE }],
});

function initialDaysState(routine: Routine | null): DaysState {
  const base = Object.fromEntries(ORDERED_WEEKDAYS.map((w) => [w, emptyDay()])) as DaysState;
  for (const d of routine?.days ?? []) {
    const kind = dayKind(d); // nunca "desconocida": un día en days[] es training o descanso
    base[d.weekday] =
      kind === "training"
        ? {
            mode: "training",
            title: d.title,
            exercises: d.exercises.length ? d.exercises : [{ ...EMPTY_EXERCISE }],
          }
        : { mode: kind, title: d.title, exercises: [{ ...EMPTY_EXERCISE }] };
  }
  return base;
}

const REASON_MESSAGE: Record<string, string> = {
  forbidden: "Tu sesión no tiene permisos de admin.",
  "not-configured": "Firebase no está configurado en este entorno.",
  invalid:
    "Revisá la fecha, el nombre y que cada día con entrenamiento tenga título y al menos un ejercicio.",
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

  const setDayMode = (weekday: Weekday, mode: DayMode) => {
    setDays((prev) => {
      const cur = prev[weekday];
      return {
        ...prev,
        [weekday]: {
          ...cur,
          mode,
          exercises:
            mode === "training" && cur.exercises.length === 0
              ? [{ ...EMPTY_EXERCISE }]
              : cur.exercises,
        },
      };
    });
  };

  const setDayTitle = (weekday: Weekday, title: string) => {
    setDays((prev) => ({ ...prev, [weekday]: { ...prev[weekday], title } }));
  };

  const setExercise = (weekday: Weekday, index: number, patch: Partial<Exercise>) => {
    setDays((prev) => {
      const day = prev[weekday];
      const exercises = day.exercises.map((e, i) => (i === index ? { ...e, ...patch } : e));
      return { ...prev, [weekday]: { ...day, exercises } };
    });
  };

  const addExercise = (weekday: Weekday) => {
    setDays((prev) => {
      const day = prev[weekday];
      return {
        ...prev,
        [weekday]: { ...day, exercises: [...day.exercises, { ...EMPTY_EXERCISE }] },
      };
    });
  };

  const removeExercise = (weekday: Weekday, index: number) => {
    setDays((prev) => {
      const day = prev[weekday];
      const exercises = day.exercises.filter((_, i) => i !== index);
      return { ...prev, [weekday]: { ...day, exercises } };
    });
  };

  /** Vuelca un JSON de semana entera al formulario (reemplaza lo que haya). */
  const importWeek = (routine: Routine) => {
    setName(routine.name);
    setType(routine.type || "crossfit");
    setDescription(routine.description);
    setDays(initialDaysState(routine));
  };

  /** Vuelca un JSON de un día al formulario, respetando su `kind` si lo trae. */
  const importDay = (weekday: Weekday, day: RoutineDay) => {
    const mode: DayMode =
      day.kind === "descanso" ? "descanso" : day.kind === "desconocida" ? "desconocida" : "training";
    setDays((prev) => ({
      ...prev,
      [weekday]: {
        mode,
        title: day.title,
        exercises: day.exercises.length ? day.exercises : [{ ...EMPTY_EXERCISE }],
      },
    }));
  };

  const submit = async () => {
    setSaving(true);
    const input: RoutineInput = {
      name,
      type,
      description,
      days: ORDERED_WEEKDAYS.filter((w) => days[w].mode !== "desconocida").map((w) => {
        const d = days[w];
        return d.mode === "descanso"
          ? { weekday: w, kind: "descanso" as const, title: d.title.trim() || "Descanso", exercises: [] }
          : { weekday: w, kind: "training" as const, title: d.title, exercises: d.exercises };
      }),
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
          <RoutineJsonIo mode="week" onApply={importWeek} />
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
      const isTraining = day.mode === "training";
      const sectionDesc =
        day.mode === "training"
          ? day.title || "Sin título todavía"
          : day.mode === "descanso"
            ? "Descanso"
            : "Desconocida — rutina no cargada";
      return {
        id: weekday,
        title: WEEKDAY_LABEL[weekday],
        description: sectionDesc,
        defaultOpen: isTraining,
        content: (
          <>
            <Switch
              className="sm:col-span-2"
              checked={isTraining}
              onChange={(checked) => setDayMode(weekday, checked ? "training" : "desconocida")}
              label="Hay entrenamiento este día"
            />
            {!isTraining && (
              <Select
                className="sm:col-span-2"
                label="Motivo (sin entrenamiento)"
                value={day.mode}
                onChange={(v) => setDayMode(weekday, v as DayMode)}
                options={[
                  { value: "desconocida", label: "Desconocida — rutina no cargada" },
                  { value: "descanso", label: "Descanso" },
                ]}
                hint="‘Desconocida’ no se guarda; ‘Descanso’ sí y el atleta lo ve con su ícono."
              />
            )}
            <RoutineJsonIo
              mode="day"
              weekday={weekday}
              onApply={(d) => importDay(weekday, d)}
            />
            {isTraining && (
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
