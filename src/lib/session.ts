import { cookies } from "next/headers";
import { connection } from "next/server";
import { randomBytes } from "node:crypto";
import { db } from "./db";

const COOKIE_NAME = "hris_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type SessionUser = {
  id: number;
  username: string;
  fullName: string;
  role: "admin" | "employee";
};

export async function getSessionUser(): Promise<SessionUser | null> {
  // Defer to request time (Dynamic stage). With Cache Components +
  // partialPrefetching, sync IO like Date.now() below is flagged during the
  // static/prefetch stages of a navigation; awaiting connection() moves this
  // read into the request stage, which is where a session lookup belongs.
  await connection();

  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;

  const row = db
    .prepare(
      `SELECT u.id, u.username, u.full_name AS fullName, u.role, s.expires_at AS expiresAt
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token = ? AND u.active = 1`,
    )
    .get(token) as
    | {
        id: number;
        username: string;
        fullName: string;
        role: string;
        expiresAt: number;
      }
    | undefined;

  if (!row) return null;
  if (row.expiresAt < Date.now()) {
    db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
    return null;
  }

  return {
    id: row.id,
    username: row.username,
    fullName: row.fullName,
    role: row.role === "admin" ? "admin" : "employee",
  };
}

export function createSession(userId: number): string {
  const token = randomBytes(32).toString("hex");
  const now = Date.now();
  db.prepare(
    "INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
  ).run(token, userId, now, now + SESSION_TTL_MS);
  return token;
}

export function deleteSession(token: string): void {
  db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
}

export async function setSessionCookie(token: string): Promise<void> {
  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
}

export async function clearSessionCookie(): Promise<void> {
  (await cookies()).delete(COOKIE_NAME);
}
