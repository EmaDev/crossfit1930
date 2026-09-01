/**
 * Nombres de las colecciones de Firestore, centralizados en un solo lugar.
 *
 * La base es COMPARTIDA con otro proyecto: toda colección de esta app lleva el
 * prefijo `crossfit-`. Nunca escribas el string suelto en un query — importá
 * la constante desde acá para que el prefijo sea imposible de olvidar.
 */

const PREFIX = "crossfit-";

export const COLLECTIONS = {
  /** `{yyyy-mm-dd}` (lunes de la semana) → `name`, `type`, `description`, `days[]` */
  routines: `${PREFIX}routines`,
  /** `{uid}_{yyyy-mm-dd}` → marca de asistencia */
  attendance: `${PREFIX}attendance`,
  /** `{uid}` → perfil, PRs, rachas, `lastReadAt` */
  users: `${PREFIX}users`,
  /** auto → `{uid}` + `{wodDate}` + estrellas 1-5 */
  ratings: `${PREFIX}ratings`,
  /** auto → `{wodDate}`, `{uid}`, texto, likes */
  comments: `${PREFIX}comments`,
  /** auto → `{uid}`, modo, config, resultado */
  timerResults: `${PREFIX}timer-results`,
  /** `{uid}` / agregados → ranking pre-calculado */
  leaderboard: `${PREFIX}leaderboard`,
  /** auto → feed broadcast: type, title, description, link, tone, createdAt, actorUid */
  notifications: `${PREFIX}notifications`,
} as const;

export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];

/** Doc ID de una marca de asistencia: un usuario sólo puede marcar una vez por día. */
export const attendanceId = (uid: string, date: string) => `${uid}_${date}`;

/** Doc ID de una calificación: un voto por usuario y por WOD (fecha `yyyy-mm-dd`). */
export const ratingId = (uid: string, wodDate: string) => `${uid}_${wodDate}`;
