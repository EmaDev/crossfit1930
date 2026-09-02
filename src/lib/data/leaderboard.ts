import "server-only";

import { adminDb, isAdminConfigured } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { boxTodayIso } from "@/lib/data/wods";

/**
 * Ranking de asistencia/rachas (Fase 4). Sin `crossfit-leaderboard`
 * pre-calculado todavía: para un solo box (decenas/centenas de atletas)
 * alcanza con leer `crossfit-users` completo y, para año/mes, un rango sobre
 * `crossfit-attendance` — recalcular on-write agregaría una escritura extra a
 * `markAttendance` que hoy no hace falta. Si el box crece mucho, ahí sí migra
 * a la colección agregada que ya prevé el modelo de datos (plan §4).
 *
 * "Racha actual"/"Racha máx" son globales (viven en `crossfit-users`, las
 * mantiene `markAttendance`): no varían por período, sólo "Días".
 */

export type LeaderboardRow = {
  uid: string;
  name: string;
  days: number;
  currentStreak: number;
  maxStreak: number;
};

export type Leaderboard = {
  historico: LeaderboardRow[];
  anio: LeaderboardRow[];
  mes: LeaderboardRow[];
};

const EMPTY: Leaderboard = { historico: [], anio: [], mes: [] };

type UserBase = {
  uid: string;
  name: string;
  currentStreak: number;
  maxStreak: number;
  totalDays: number;
};

function sortRows(rows: LeaderboardRow[]): LeaderboardRow[] {
  return rows.sort(
    (a, b) =>
      b.days - a.days ||
      b.currentStreak - a.currentStreak ||
      a.name.localeCompare(b.name, "es"),
  );
}

export async function getLeaderboard(): Promise<Leaderboard> {
  if (!isAdminConfigured()) return EMPTY;

  try {
    const db = adminDb();
    const todayIso = boxTodayIso();
    const year = todayIso.slice(0, 4);
    const yearStart = `${year}-01-01`;
    const monthStart = todayIso.slice(0, 7) + "-01";

    const [usersSnap, attendanceSnap] = await Promise.all([
      db.collection(COLLECTIONS.users).get(),
      db.collection(COLLECTIONS.attendance).where("date", ">=", yearStart).get(),
    ]);

    const users: UserBase[] = usersSnap.docs
      .filter((doc) => doc.data().admin !== true) // los admin no van al ranking
      .map((doc) => {
        const d = doc.data();
        const name: string = (d.name as string | undefined)?.trim() || "Atleta";
        return {
          uid: doc.id,
          name,
          currentStreak: d.current_streak ?? 0,
          maxStreak: d.max_streak ?? 0,
          totalDays: d.total_attended_days ?? 0,
        };
      });

    const yearCount = new Map<string, number>();
    const monthCount = new Map<string, number>();
    for (const doc of attendanceSnap.docs) {
      const d = doc.data() as { uid?: string; date?: string };
      if (!d.uid || !d.date) continue;
      yearCount.set(d.uid, (yearCount.get(d.uid) ?? 0) + 1);
      if (d.date >= monthStart) monthCount.set(d.uid, (monthCount.get(d.uid) ?? 0) + 1);
    }

    const build = (days: (u: UserBase) => number): LeaderboardRow[] =>
      sortRows(
        users.map((u) => ({
          uid: u.uid,
          name: u.name,
          days: days(u),
          currentStreak: u.currentStreak,
          maxStreak: u.maxStreak,
        })),
      );

    return {
      historico: build((u) => u.totalDays),
      anio: build((u) => yearCount.get(u.uid) ?? 0),
      mes: build((u) => monthCount.get(u.uid) ?? 0),
    };
  } catch (err) {
    console.error("[leaderboard] no se pudo armar el ranking:", err);
    return EMPTY;
  }
}
