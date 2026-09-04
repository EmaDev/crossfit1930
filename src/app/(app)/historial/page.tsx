import type { TabItem } from "lib-kit-components";
import { getSession } from "@/lib/auth/session";
import { getAttendedDates } from "@/lib/data/attendance";
import { getForgottenDays, getRoutineDaysInRange } from "@/lib/data/historial";
import { boxTodayIso } from "@/lib/data/wods";
import { ForgottenDays } from "@/components/organisms/forgotten-days";
import { HistorialCalendar } from "@/components/organisms/historial-calendar";
import { HistorialMarcas, type MarcaEntry } from "@/components/molecules/historial-marcas";
import { DetailScreen } from "@/components/organisms/detail-screen";

export const metadata = { title: "Historial" };

/** Navega por `?mes=yyyy-mm`: cada mes es un request nuevo, no queda cacheado. */
export const dynamic = "force-dynamic";

const MES_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

function lastDayOfMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return String(new Date(Date.UTC(y, m, 0)).getUTCDate()).padStart(2, "0");
}

/**
 * Pantalla ANIDADA: se llega desde Inicio y desde Perfil, no es un tab del
 * BottomNav. Por eso usa <DetailScreen> (con volver) y no <RootScreen>.
 */
export default async function HistorialPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const { mes } = await searchParams;
  const todayIso = boxTodayIso();
  const month = mes && MES_RE.test(mes) ? mes : todayIso.slice(0, 7);
  const monthStart = `${month}-01`;
  const monthEnd = `${month}-${lastDayOfMonth(month)}`;

  const session = await getSession();
  const [routineDays, attendedDates] = await Promise.all([
    getRoutineDaysInRange(monthStart, monthEnd),
    getAttendedDates(session?.uid ?? null),
  ]);

  // Los olvidados son de la última semana, no del mes que se está mirando: la
  // lista es la misma navegue por donde navegue el calendario. Un invitado no
  // tiene nada que marcar, así que ni se calcula ni se muestra el tab.
  const forgotten = session ? await getForgottenDays(attendedDates, todayIso) : [];

  const titleByDate = new Map(routineDays.map((d) => [d.dateIso, d.day.title]));
  const marcas: MarcaEntry[] = attendedDates
    .filter((d) => d.startsWith(month))
    .sort((a, b) => b.localeCompare(a))
    .map((dateIso) => ({ dateIso, title: titleByDate.get(dateIso) ?? "WOD sin registrar" }));

  const tabs: TabItem[] = [
    { id: "calendario", label: "Calendario" },
    { id: "marcas", label: "Mis marcas" },
    ...(session
      ? [{ id: "olvidados", label: "Olvidados", badge: forgotten.length || undefined }]
      : []),
  ];

  return (
    <DetailScreen
      title="Historial"
      subtitle="Todos los WODs que pasaron por el box"
      tabs={tabs}
      panels={{
        calendario: (
          <div className="pt-1">
            <HistorialCalendar
              month={month}
              routineDays={routineDays}
              attendedDates={attendedDates}
              todayIso={todayIso}
              canMark={!!session}
            />
          </div>
        ),
        marcas: (
          <div className="pt-1">
            <HistorialMarcas entries={marcas} isGuest={!session} />
          </div>
        ),
        olvidados: (
          <div className="pt-1">
            <ForgottenDays days={forgotten} todayIso={todayIso} />
          </div>
        ),
      }}
    />
  );
}
