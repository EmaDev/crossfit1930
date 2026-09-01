"use server";

import { Timestamp } from "firebase-admin/firestore";
import { getSession } from "@/lib/auth/session";
import { adminDb, isAdminConfigured } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";

export type TimerMode = "amrap" | "emom" | "tabata" | "fortime";

export type SaveTimerResultInput = {
  mode: TimerMode;
  /** Config con la que se corrió (duración, rondas, work/rest…), para poder repetirla después. */
  config: Record<string, number>;
  /** Resultado libre por modo: rondas de AMRAP, tiempo total de FOR TIME, laps, etc. */
  result: Record<string, number | number[]>;
};

export type SaveTimerResultResult =
  | { ok: true }
  | { ok: false; reason: "guest" | "not-configured" | "error" };

export async function saveTimerResult(
  input: SaveTimerResultInput,
): Promise<SaveTimerResultResult> {
  const session = await getSession();
  if (!session) return { ok: false, reason: "guest" };
  if (!isAdminConfigured()) return { ok: false, reason: "not-configured" };

  try {
    await adminDb()
      .collection(COLLECTIONS.timerResults)
      .add({
        uid: session.uid,
        mode: input.mode,
        config: input.config,
        result: input.result,
        createdAt: Timestamp.now(),
      });
    return { ok: true };
  } catch (err) {
    console.error("[timer-results] no se pudo guardar el resultado:", err);
    return { ok: false, reason: "error" };
  }
}
