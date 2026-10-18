import { db } from "./db";

export type User = {
  id: number;
  username: string;
  fullName: string;
  email: string | null;
  role: "admin" | "employee";
  active: boolean;
  createdAt: number;
};

type UserRow = {
  id: number;
  username: string;
  fullName: string;
  email: string | null;
  role: string;
  active: number;
  createdAt: number;
};

function toUser(row: UserRow): User {
  return {
    id: row.id,
    username: row.username,
    fullName: row.fullName,
    email: row.email,
    role: row.role === "admin" ? "admin" : "employee",
    active: row.active === 1,
    createdAt: row.createdAt,
  };
}

const COLS = `id, username, full_name AS fullName, email, role, active, created_at AS createdAt`;

export function countUsers(): number {
  const row = db.prepare("SELECT COUNT(*) AS n FROM users").get() as { n: number };
  return row.n;
}

export function listUsers(includeInactive = true): User[] {
  const sql = includeInactive
    ? `SELECT ${COLS} FROM users ORDER BY full_name`
    : `SELECT ${COLS} FROM users WHERE active = 1 ORDER BY full_name`;
  return (db.prepare(sql).all() as UserRow[]).map(toUser);
}

export function getUserById(id: number): User | null {
  const row = db.prepare(`SELECT ${COLS} FROM users WHERE id = ?`).get(id) as
    | UserRow
    | undefined;
  return row ? toUser(row) : null;
}

export function getUserByUsername(username: string): (User & { passwordHash: string }) | null {
  const row = db
    .prepare(
      `SELECT ${COLS}, password_hash AS passwordHash FROM users WHERE username = ?`,
    )
    .get(username) as (UserRow & { passwordHash: string }) | undefined;
  return row ? { ...toUser(row), passwordHash: row.passwordHash } : null;
}

export function createUser(input: {
  username: string;
  fullName: string;
  email: string | null;
  passwordHash: string;
  role: "admin" | "employee";
}): number {
  const result = db
    .prepare(
      `INSERT INTO users (username, full_name, email, password_hash, role, active, created_at)
       VALUES (?, ?, ?, ?, ?, 1, ?)`,
    )
    .run(
      input.username,
      input.fullName,
      input.email,
      input.passwordHash,
      input.role,
      Date.now(),
    );
  return Number(result.lastInsertRowid);
}

export function updateUser(
  id: number,
  patch: {
    fullName?: string;
    email?: string | null;
    role?: "admin" | "employee";
    active?: boolean;
    passwordHash?: string;
  },
): void {
  const sets: string[] = [];
  const values: unknown[] = [];
  if (patch.fullName !== undefined) {
    sets.push("full_name = ?");
    values.push(patch.fullName);
  }
  if (patch.email !== undefined) {
    sets.push("email = ?");
    values.push(patch.email);
  }
  if (patch.role !== undefined) {
    sets.push("role = ?");
    values.push(patch.role);
  }
  if (patch.active !== undefined) {
    sets.push("active = ?");
    values.push(patch.active ? 1 : 0);
  }
  if (patch.passwordHash !== undefined) {
    sets.push("password_hash = ?");
    values.push(patch.passwordHash);
  }
  if (sets.length === 0) return;
  values.push(id);
  db.prepare(`UPDATE users SET ${sets.join(", ")} WHERE id = ?`).run(...values);
}

export function deleteUserSessions(userId: number): void {
  db.prepare("DELETE FROM sessions WHERE user_id = ?").run(userId);
}
