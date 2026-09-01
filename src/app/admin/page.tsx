import Link from "next/link";
import { Button } from "lib-kit-components";
import { currentWeekMondayIso, listRoutineWeeks } from "@/lib/data/wods";
import { PlusIcon } from "@/components/atoms/icons";
import { RoutinesTable } from "@/components/organisms/admin/routines-table";

export const metadata = { title: "Panel de admin" };

/** `force-dynamic`: la lista de semanas cambia con cada alta y no debe quedar cacheada. */
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const weeks = await listRoutineWeeks();
  const nextWeek = currentWeekMondayIso();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {weeks.length} semana{weeks.length === 1 ? "" : "s"} cargada
          {weeks.length === 1 ? "" : "s"}
        </p>
        <Link href={`/admin/rutina/${nextWeek}`}>
          <Button leftIcon={<PlusIcon />} size="sm">
            Nueva semana
          </Button>
        </Link>
      </div>

      <RoutinesTable weeks={weeks} />
    </div>
  );
}
