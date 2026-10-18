import { db } from "./db";

export type Punch = {
  id: number;
  userId: number;
  punchedAt: number;
  ip: string | null;
};

type PunchRow = {
  id: number;
  userId: number;
  punchedAt: number;
  ip: string | null;
};

const COLS = "id, user_id AS userId, punched_at AS punchedAt, ip";

export function lastPunch(userId: number): Punch | null {
  const row = db
    .prepare(
      `SELECT ${COLS} FROM punches WHERE user_id = ? ORDER BY punched_at DESC LIMIT 1`,
    )
    .get(userId) as PunchRow | undefined;
  return row ?? null;
}

export function punchesInRange(
  userId: number,
  fromMs: number,
  toMs: number,
): Punch[] {
  return db
    .prepare(
      `SELECT ${COLS} FROM punches
       WHERE user_id = ? AND punched_at >= ? AND punched_at < ?
       ORDER BY punched_at`,
    )
    .all(userId, fromMs, toMs) as PunchRow[];
}

export function punchesForUsersInRange(
  userIds: number[],
  fromMs: number,
  toMs: number,
): Punch[] {
  if (userIds.length === 0) return [];
  const placeholders = userIds.map(() => "?").join(",");
  return db
    .prepare(
      `SELECT ${COLS} FROM punches
       WHERE user_id IN (${placeholders}) AND punched_at >= ? AND punched_at < ?
       ORDER BY punched_at`,
    )
    .all(...userIds, fromMs, toMs) as PunchRow[];
}

export function insertPunch(userId: number, punchedAt: number, ip: string | null): number {
  const result = db
    .prepare(
      "INSERT INTO punches (user_id, punched_at, ip, created_at) VALUES (?, ?, ?, ?)",
    )
    .run(userId, punchedAt, ip, Date.now());
  return Number(result.lastInsertRowid);
}

export function updatePunchTime(punchId: number, punchedAt: number): void {
  db.prepare("UPDATE punches SET punched_at = ? WHERE id = ?").run(
    punchedAt,
    punchId,
  );
}

export function getPunchById(punchId: number): Punch | null {
  const row = db.prepare(`SELECT ${COLS} FROM punches WHERE id = ?`).get(punchId) as
    | PunchRow
    | undefined;
  return row ?? null;
}
