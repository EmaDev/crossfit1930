import type { TabItem } from "lib-kit-components";
import { getSession } from "@/lib/auth/session";
import { getAttendedDates } from "@/lib/data/attendance";
import { getRoutineDaysInRange } from "@/lib/data/historial";
import { boxTodayIso } from "@/lib/data/wods";
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
const TABS: TabItem[] = [
  { id: "calendario", label: "Calendario" },
  { id: "marcas", label: "Mis marcas" },
];

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

  const titleByDate = new Map(routineDays.map((d) => [d.dateIso, d.day.title]));
  const marcas: MarcaEntry[] = attendedDates
    .filter((d) => d.startsWith(month))
    .sort((a, b) => b.localeCompare(a))
    .map((dateIso) => ({ dateIso, title: titleByDate.get(dateIso) ?? "WOD sin registrar" }));

  return (
    <DetailScreen
      title="Historial"
      subtitle="Todos los WODs que pasaron por el box"
      tabs={TABS}
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
      }}
    />
  );
}
