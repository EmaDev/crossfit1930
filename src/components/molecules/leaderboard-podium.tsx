import { ProfileCard } from "lib-kit-components";
import type { LeaderboardRow } from "@/lib/data/leaderboard";

const PODIUM_ROLE = ["1er lugar", "2do lugar", "3er lugar"];

/**
 * Top-3 con `ProfileCard` (iniciales del kit, sin foto). Sin hooks ni
 * handlers: se renderiza directo desde el Server Component de la pantalla.
 */
export function LeaderboardPodium({ rows }: { rows: LeaderboardRow[] }) {
  const top3 = rows.slice(0, 3);
  if (top3.length === 0) return null;

  return (
    <div className="flex gap-3 overflow-x-auto pb-1">
      {top3.map((row, i) => (
        <div key={row.uid} className="w-[190px] flex-none">
          <ProfileCard
            name={row.name}
            role={PODIUM_ROLE[i]}
            variant={i === 0 ? "gradient" : "outline"}
            stats={[
              { label: "Días", value: row.days },
              { label: "Racha", value: row.currentStreak },
            ]}
          />
        </div>
      ))}
    </div>
  );
}
