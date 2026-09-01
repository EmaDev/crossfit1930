"use client";

import { DataTable, type Column } from "lib-kit-components";
import type { LeaderboardRow } from "@/lib/data/leaderboard";

type Row = LeaderboardRow & { pos: number };

/**
 * `DataTable` no expone un hook para colorear la fila entera (por eso el plan
 * preveía `AnimatedTable` de fallback, que tampoco lo tiene): al usuario
 * logueado se lo destaca con una etiqueta "Vos" + negrita en su celda, no con
 * un fondo de fila.
 */
export function LeaderboardTable({
  rows,
  currentUid,
}: {
  rows: LeaderboardRow[];
  currentUid: string | null;
}) {
  const data: Row[] = rows.map((r, i) => ({ ...r, pos: i + 1 }));

  const columns: Column<Row>[] = [
    { key: "pos", header: "#", width: "48px", align: "center" },
    {
      key: "name",
      header: "Atleta",
      render: (r) => (
        <span className={r.uid === currentUid ? "font-semibold text-primary" : ""}>
          {r.name}
          {r.uid === currentUid && (
            <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
              Vos
            </span>
          )}
        </span>
      ),
    },
    { key: "days", header: "Días", align: "right", width: "72px" },
    { key: "currentStreak", header: "Racha actual", align: "right", width: "110px", hideOnMobile: true },
    { key: "maxStreak", header: "Racha máx", align: "right", width: "100px", hideOnMobile: true },
  ];

  return (
    <DataTable
      columns={columns}
      rows={data}
      rowKey={(r) => r.uid}
      searchable
      searchPlaceholder="Buscar atleta…"
      pageSize={15}
      emptyState={<p className="text-sm text-muted">Todavía no hay marcas de asistencia.</p>}
      caption="Ranking de asistencia"
    />
  );
}
