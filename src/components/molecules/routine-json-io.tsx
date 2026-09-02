"use client";

import { useState } from "react";
import { Button, Textarea, useToast } from "lib-kit-components";
import {
  EXERCISE_SECTIONS,
  ORDERED_WEEKDAYS,
  isExerciseSection,
  type Exercise,
  type ExerciseSection,
  type Routine,
  type RoutineDay,
  type Weekday,
} from "@/lib/data/routine-types";
import { CopyIcon } from "@/components/atoms/icons";

/**
 * Importar una rutina (semana completa o un día suelto) desde un JSON generado
 * afuera —típicamente por una IA a la que se le pasó la estructura esperada—.
 *
 * Muestra el esquema para copiar y un textarea para pegar el resultado. El
 * parseo es TOLERANTE: acepta alias de campo comunes (`nombre`/`titulo`/…),
 * ignora lo que no entiende y devuelve la lista de avisos en un toast, en vez
 * de fallar por un campo de más o de menos. Sólo aborta si el JSON está roto o
 * no tiene forma de rutina.
 *
 * Es presentacional: no escribe nada, sólo llama `onApply` con datos ya
 * normalizados al modelo (`Routine` / `RoutineDay`). Quien lo usa decide qué
 * hacer con eso (acá, volcarlo al estado del formulario de admin).
 */

const WEEKDAYS_HELP = ORDERED_WEEKDAYS.join(" | ");
const SECTIONS_HELP = EXERCISE_SECTIONS.join(" | ");

const WEEK_SCHEMA = `{
  "name": "string",
  "type": "string",
  "description": "string",
  "days": [
    {
      "weekday": "${WEEKDAYS_HELP}",
      "kind": "training | descanso   (opcional, default training)",
      "title": "string",
      "exercises": [
        {
          "name": "string",
          "detail": "string",
          "section": "${SECTIONS_HELP}   (opcional, se deduce del nombre)"
        }
      ]
    }
  ]
}`;

const DAY_SCHEMA = `{
  "weekday": "${WEEKDAYS_HELP}",
  "kind": "training | descanso   (opcional, default training)",
  "title": "string",
  "exercises": [
    {
      "name": "string",
      "detail": "string",
      "section": "${SECTIONS_HELP}   (opcional, se deduce del nombre)"
    }
  ]
}`;

const WEEKDAY_SET = new Set<string>(ORDERED_WEEKDAYS);
const KIND_SET = new Set(["training", "descanso", "desconocida"]);

export type ParseResult<T> =
  | { ok: true; value: T; warnings: string[] }
  | { ok: false; error: string };

/** La IA suele envolver la respuesta en ```json … ```; lo sacamos. */
function stripFences(raw: string): string {
  const t = raw.trim();
  const m = t.match(/^```(?:json|jsonc)?\s*([\s\S]*?)\s*```$/i);
  return (m ? m[1] : t).trim();
}

function asString(v: unknown): string {
  if (typeof v === "string") return v.trim();
  if (v == null) return "";
  return String(v).trim();
}

function normalizeWeekday(v: unknown): Weekday | null {
  const s = asString(v).toLowerCase();
  return WEEKDAY_SET.has(s) ? (s as Weekday) : null;
}

function coerceExercises(v: unknown, warn: (m: string) => void): Exercise[] {
  if (v == null) return [];
  if (!Array.isArray(v)) {
    warn("'exercises' no era una lista; se ignoró");
    return [];
  }
  const out: Exercise[] = [];
  v.forEach((raw, i) => {
    if (raw == null || typeof raw !== "object") {
      warn(`ejercicio #${i + 1} ignorado: no es un objeto`);
      return;
    }
    const e = raw as Record<string, unknown>;
    const name = asString(e.name ?? e.nombre);
    const detail = asString(e.detail ?? e.detalle ?? e.description ?? e.descripción);
    if (!name && !detail) return;
    const rawSection = asString(e.section ?? e.seccion ?? e.sección ?? e.bloque).toLowerCase();
    const section: ExerciseSection | undefined = isExerciseSection(rawSection)
      ? rawSection
      : undefined;
    if (rawSection && !section) {
      warn(`ejercicio #${i + 1}: sección '${rawSection}' desconocida, se dedujo del nombre`);
    }
    out.push({ name, detail, ...(section ? { section } : {}) });
  });
  return out;
}

function coerceDay(raw: unknown, warn: (m: string) => void): RoutineDay | null {
  if (raw == null || typeof raw !== "object") {
    warn("un día se ignoró: no es un objeto");
    return null;
  }
  const d = raw as Record<string, unknown>;
  const rawWeekday = d.weekday ?? d.dia ?? d.día;
  const weekday = normalizeWeekday(rawWeekday);
  if (!weekday) {
    warn(`día ignorado: weekday inválido (${asString(rawWeekday) || "vacío"})`);
    return null;
  }
  const rawKind = asString(d.kind ?? d.tipo ?? d.motivo).toLowerCase();
  const kind = KIND_SET.has(rawKind) ? (rawKind as RoutineDay["kind"]) : undefined;
  return {
    weekday,
    title: asString(d.title ?? d.titulo ?? d.título),
    exercises: coerceExercises(d.exercises ?? d.ejercicios, warn),
    ...(kind ? { kind } : {}),
  };
}

function parseObject(raw: string): { obj: Record<string, unknown> } | { error: string } {
  let data: unknown;
  try {
    data = JSON.parse(stripFences(raw));
  } catch (err) {
    return { error: `JSON inválido: ${(err as Error).message}` };
  }
  if (data == null || typeof data !== "object" || Array.isArray(data)) {
    return { error: "El JSON tiene que ser un objeto." };
  }
  return { obj: data as Record<string, unknown> };
}

export function parseWeekJson(raw: string): ParseResult<Routine> {
  const parsed = parseObject(raw);
  if ("error" in parsed) return { ok: false, error: parsed.error };
  const { obj } = parsed;

  const rawDays = obj.days ?? obj.dias ?? obj.días;
  if (!Array.isArray(rawDays)) {
    return { ok: false, error: "Falta la lista 'days'." };
  }

  const warnings: string[] = [];
  const warn = (m: string) => warnings.push(m);

  const indexByWeekday = new Map<Weekday, number>();
  const days: RoutineDay[] = [];
  for (const entry of rawDays) {
    const day = coerceDay(entry, warn);
    if (!day) continue;
    const existing = indexByWeekday.get(day.weekday);
    if (existing != null) {
      warn(`'${day.weekday}' aparecía más de una vez: se usó el último`);
      days[existing] = day;
    } else {
      indexByWeekday.set(day.weekday, days.length);
      days.push(day);
    }
  }
  days.sort(
    (a, b) => ORDERED_WEEKDAYS.indexOf(a.weekday) - ORDERED_WEEKDAYS.indexOf(b.weekday),
  );

  if (!asString(obj.name ?? obj.nombre)) warn("'name' quedó vacío");
  if (days.length === 0) warn("no se pudo interpretar ningún día");

  return {
    ok: true,
    value: {
      name: asString(obj.name ?? obj.nombre),
      type: asString(obj.type ?? obj.tipo) || "crossfit",
      description: asString(obj.description ?? obj.descripcion ?? obj.descripción),
      days,
    },
    warnings,
  };
}

export function parseDayJson(raw: string, target: Weekday): ParseResult<RoutineDay> {
  const parsed = parseObject(raw);
  if ("error" in parsed) return { ok: false, error: parsed.error };
  const { obj } = parsed;

  const warnings: string[] = [];
  const warn = (m: string) => warnings.push(m);

  // Tolerante: si pegaron una semana entera, sacamos el día pedido.
  const rawDays = obj.days ?? obj.dias ?? obj.días;
  if (Array.isArray(rawDays)) {
    const match = rawDays
      .map((d) => coerceDay(d, () => {}))
      .find((d) => d?.weekday === target);
    if (!match) {
      return { ok: false, error: `El JSON es una semana y no trae el día ${target}.` };
    }
    warn("pegaste una semana entera; se tomó sólo el día pedido");
    return { ok: true, value: match, warnings };
  }

  const payloadWeekday = normalizeWeekday(obj.weekday ?? obj.dia ?? obj.día);
  if (payloadWeekday && payloadWeekday !== target) {
    warn(`el weekday del JSON (${payloadWeekday}) no coincide; se aplicó a ${target}`);
  }

  const rawKind = asString(obj.kind ?? obj.tipo ?? obj.motivo).toLowerCase();
  const kind = KIND_SET.has(rawKind) ? (rawKind as RoutineDay["kind"]) : undefined;

  return {
    ok: true,
    value: {
      weekday: target,
      title: asString(obj.title ?? obj.titulo ?? obj.título),
      exercises: coerceExercises(obj.exercises ?? obj.ejercicios, warn),
      ...(kind ? { kind } : {}),
    },
    warnings,
  };
}

type Props =
  | { mode: "week"; onApply: (routine: Routine) => void }
  | { mode: "day"; weekday: Weekday; onApply: (day: RoutineDay) => void };

export function RoutineJsonIo(props: Props) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");

  const schema = props.mode === "week" ? WEEK_SCHEMA : DAY_SCHEMA;
  const label = props.mode === "week" ? "Importar semana desde JSON" : "Importar día desde JSON";

  const copySchema = async () => {
    try {
      await navigator.clipboard.writeText(schema);
      toast({ title: "Estructura copiada", variant: "success" });
    } catch {
      toast({
        title: "No se pudo copiar",
        description: "Copiala a mano del recuadro.",
        variant: "error",
      });
    }
  };

  const apply = () => {
    if (!text.trim()) {
      toast({ title: "Pegá el JSON primero", variant: "error" });
      return;
    }

    const res =
      props.mode === "week" ? parseWeekJson(text) : parseDayJson(text, props.weekday);

    if (!res.ok) {
      toast({ title: "No se pudo importar", description: res.error, variant: "error" });
      return;
    }

    if (props.mode === "week") props.onApply(res.value as Routine);
    else props.onApply(res.value as RoutineDay);

    toast({
      title: props.mode === "week" ? "Semana importada al formulario" : "Día importado al formulario",
      description: res.warnings.length ? `Avisos: ${res.warnings.join(" · ")}` : undefined,
      variant: res.warnings.length ? "warning" : "success",
      duration: res.warnings.length ? 7000 : undefined,
    });
    setText("");
    setOpen(false);
  };

  return (
    <div className="sm:col-span-2 min-w-0 rounded-lg border border-dashed border-border p-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-sm font-medium text-foreground"
      >
        {label}
        <span aria-hidden className="text-lg leading-none text-muted">
          {open ? "−" : "+"}
        </span>
      </button>

      {open && (
        <div className="mt-3 flex min-w-0 flex-col gap-3">
          <div className="min-w-0">
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-muted">Estructura esperada</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                leftIcon={<CopyIcon />}
                onClick={copySchema}
              >
                Copiar
              </Button>
            </div>
            <pre className="max-w-full overflow-x-auto rounded-md bg-surface-alt p-3 text-xs leading-relaxed text-foreground">
              {schema}
            </pre>
            <p className="mt-1 text-xs text-muted">
              Pasale esta estructura a la IA y pedile que devuelva sólo el JSON, sin texto ni
              markdown alrededor.
            </p>
          </div>

          <Textarea
            label="Pegá acá el JSON generado"
            value={text}
            onChange={(e) => setText(e.target.value)}
            autoResize={false}
            rows={8}
          />
          <Button type="button" variant="outline" size="sm" onClick={apply}>
            Aplicar al formulario
          </Button>
        </div>
      )}
    </div>
  );
}
