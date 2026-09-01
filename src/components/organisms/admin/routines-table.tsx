"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Column } from "lib-kit-components";
import type { RoutineWeekSummary } from "@/lib/data/wods";

/**
 * `DataTable` es cliente y sus props (`columns`, `onRowClick`) llevan
 * funciones: no pueden definirse en el `page.tsx` (Server Component) y
 * cruzar el límite RSC, por eso este wrapper recibe sólo datos serializables.
 */
export function RoutinesTable({ weeks }: { weeks: RoutineWeekSummary[] }) {
  const router = useRouter();

  const columns: Column<RoutineWeekSummary>[] = [
    {
      key: "weekStart",
      header: "Semana",
      width: "140px",
      render: (r) => new Date(`${r.weekStart}T00:00:00`).toLocaleDateString("es-AR"),
    },
    { key: "name", header: "Rutina" },
    {
      key: "dayCount",
      header: "Días cargados",
      align: "right",
      width: "140px",
      render: (r) => `${r.dayCount}`,
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={weeks}
      rowKey={(r) => r.weekStart}
      searchable
      searchPlaceholder="Buscar rutina…"
      pageSize={10}
      onRowClick={(r) => router.push(`/admin/rutina/${r.weekStart}`)}
      emptyState={
        <p className="text-sm text-muted">
          Todavía no cargaste ninguna semana. Empezá por &ldquo;Nueva semana&rdquo;.
        </p>
      }
      caption="Rutinas semanales cargadas"
    />
  );
}
