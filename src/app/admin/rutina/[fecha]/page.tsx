import { notFound } from "next/navigation";
import { getRoutine, isMondayIso } from "@/lib/data/wods";
import { RoutineForm } from "@/components/organisms/admin/routine-form";

export const metadata = { title: "Rutina semanal" };
export const dynamic = "force-dynamic";

export default async function AdminRoutinePage({
  params,
}: {
  params: Promise<{ fecha: string }>;
}) {
  const { fecha } = await params;
  if (!isMondayIso(fecha)) notFound();

  const routine = await getRoutine(fecha);

  return <RoutineForm weekStart={fecha} initial={routine} isNewWeek={routine == null} />;
}
