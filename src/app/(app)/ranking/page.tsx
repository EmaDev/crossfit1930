import type { TabItem } from "lib-kit-components";
import { getSession } from "@/lib/auth/session";
import { getLeaderboard, type LeaderboardRow } from "@/lib/data/leaderboard";
import { getUserStats } from "@/lib/data/user-stats";
import { LeaderboardPodium } from "@/components/molecules/leaderboard-podium";
import { LeaderboardTable } from "@/components/organisms/leaderboard-table";
import { StreakCard } from "@/components/molecules/streak-card";
import { RootScreen } from "@/components/organisms/root-screen";

export const metadata = { title: "Ranking" };

/** El ranking cambia con cada asistencia marcada: no puede quedar cacheado. */
export const dynamic = "force-dynamic";

/** Los filtros del leaderboard son los tabs de la propia pantalla. */
const TABS: TabItem[] = [
  { id: "historico", label: "Histórico" },
  { id: "anio", label: "Este año" },
  { id: "mes", label: "Este mes" },
];

export default async function RankingPage() {
  const [session, board] = await Promise.all([getSession(), getLeaderboard()]);
  const stats = await getUserStats(session?.uid ?? null);
  const currentUid = session?.uid ?? null;

  const panel = (rows: LeaderboardRow[]) => (
    <div className="flex flex-col gap-4 pt-1">
      <LeaderboardPodium rows={rows} />
      <LeaderboardTable rows={rows} currentUid={currentUid} />
    </div>
  );

  return (
    <RootScreen
      heroTitle="Ranking"
      card={<StreakCard stats={stats} />}
      tabs={TABS}
      panels={{
        historico: panel(board.historico),
        anio: panel(board.anio),
        mes: panel(board.mes),
      }}
    />
  );
}
