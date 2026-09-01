import type { TabItem } from "lib-kit-components";
import { getSession } from "@/lib/auth/session";
import { getAttendedDates } from "@/lib/data/attendance";
import { getComments } from "@/lib/data/comments";
import { getRatingSummary } from "@/lib/data/ratings";
import { getUserStats } from "@/lib/data/user-stats";
import {
  boxTodayIso,
  dayForToday,
  getCurrentRoutine,
  todayIndex,
  weekdayIndex,
} from "@/lib/data/wods";
import { HistorialLink } from "@/components/molecules/historial-link";
import { RestDayCard } from "@/components/molecules/rest-day-card";
import { HeaderStreak } from "@/components/organisms/header-streak";
import { DayView } from "@/components/organisms/day-view";
import { MarkDayDock } from "@/components/organisms/mark-day-dock";
import { RootScreen } from "@/components/organisms/root-screen";
import { WeekView } from "@/components/organisms/week-view";
import { BoltIcon, CalendarIcon } from "@/components/atoms/icons";

const TABS: TabItem[] = [
  { id: "hoy", label: "Hoy", icon: <BoltIcon /> },
  { id: "semana", label: "Semana", icon: <CalendarIcon /> },
];

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

/**
 * "Hoy" se resuelve por request: si se prerenderizara, la pantalla quedaría
 * clavada en el día del build y nunca pasaría de martes a miércoles.
 */
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [session, routine] = await Promise.all([
    getSession(),
    getCurrentRoutine(),
  ]);
  const todayIso = boxTodayIso();
  const [stats, attendedDates, rating, comments] = await Promise.all([
    getUserStats(session?.uid ?? null),
    getAttendedDates(session?.uid ?? null),
    getRatingSummary(todayIso, session?.uid ?? null),
    getComments(todayIso, session?.uid ?? null),
  ]);

  const todayIdx = todayIndex();
  const today = dayForToday(routine, todayIdx);

  // Si hoy es descanso, ofrecemos el próximo día de la semana que sí entrena.
  const nextDay = routine.days.find((d) => weekdayIndex(d.weekday) > todayIdx);

  // El selector de la semana abre en hoy; si hoy no entrena, en el próximo.
  const initialDay = (today ?? nextDay ?? routine.days[0]).weekday;

  // El botón de "marcar cumplido" sólo tiene sentido si hoy se entrena.
  const doneToday = attendedDates.includes(todayIso);

  const currentUser = session
    ? { name: session.name ?? "Vos", avatar: session.picture ?? undefined }
    : undefined;

  return (
    <>
      <RootScreen
        card={<HeaderStreak stats={stats} attendedDates={attendedDates} />}
        tabs={TABS}
        panels={{
          hoy: (
            <div className="flex flex-col gap-4 pt-1">
              {today ? (
                <DayView
                  day={today}
                  routineName={routine.name}
                  community={{ wodDate: todayIso, rating, comments, currentUser }}
                />
              ) : (
                <RestDayCard
                  nextDay={
                    nextDay
                      ? { label: cap(nextDay.weekday), title: nextDay.title }
                      : undefined
                  }
                />
              )}
              <HistorialLink label="Ver historial de WODs" />
            </div>
          ),
          semana: (
            <div className="pt-1">
              <p className="mb-4 text-sm text-muted">{routine.description}</p>
              <WeekView
                initialDay={initialDay}
                days={routine.days.map((d) => ({
                  id: d.weekday,
                  label: cap(d.weekday),
                  isToday: weekdayIndex(d.weekday) === todayIdx,
                }))}
                panels={Object.fromEntries(
                  routine.days.map((d) => [
                    d.weekday,
                    <DayView
                      key={d.weekday}
                      day={d}
                      routineName={routine.name}
                    />,
                  ]),
                )}
              />
            </div>
          ),
        }}
      />
      {/* Marcar asistencia es sólo para quien tiene cuenta: un invitado no
          tiene racha que sumar, así que no ve el dock. */}
      {today && session && (
        <MarkDayDock sessionTitle={today.title} alreadyDone={doneToday} />
      )}
    </>
  );
}
