import { db } from "./db";
import { insertPunch, updatePunchTime, getPunchById } from "./punches";
import { formatClock } from "./tz";

export type CorrectionStatus = "pending" | "approved" | "rejected";

export type Correction = {
  id: number;
  userId: number;
  userName: string;
  punchId: number | null;
  targetDate: string;
  proposedAt: number;
  reason: string;
  status: CorrectionStatus;
  adminNote: string | null;
  reviewedBy: number | null;
  reviewedByName: string | null;
  reviewedAt: number | null;
  oldValue: string | null;
  newValue: string | null;
  createdAt: number;
};

type Row = {
  id: number;
  userId: number;
  userName: string;
  punchId: number | null;
  targetDate: string;
  proposedAt: number;
  reason: string;
  status: string;
  adminNote: string | null;
  reviewedBy: number | null;
  reviewedByName: string | null;
  reviewedAt: number | null;
  oldValue: string | null;
  newValue: string | null;
  createdAt: number;
};

const COLS = `
  c.id, c.user_id AS userId, u.full_name AS userName,
  c.punch_id AS punchId, c.target_date AS targetDate, c.proposed_at AS proposedAt,
  c.reason, c.status, c.admin_note AS adminNote,
  c.reviewed_by AS reviewedBy, ru.full_name AS reviewedByName,
  c.reviewed_at AS reviewedAt, c.old_value AS oldValue, c.new_value AS newValue,
  c.created_at AS createdAt
`;

function toCorrection(row: Row): Correction {
  return {
    ...row,
    status: row.status as CorrectionStatus,
  };
}

export function listCorrections(filter: {
  status?: CorrectionStatus;
  userId?: number;
}): Correction[] {
  const where: string[] = [];
  const values: unknown[] = [];
  if (filter.status) {
    where.push("c.status = ?");
    values.push(filter.status);
  }
  if (filter.userId) {
    where.push("c.user_id = ?");
    values.push(filter.userId);
  }
  const sql = `
    SELECT ${COLS}
    FROM corrections c
    JOIN users u ON u.id = c.user_id
    LEFT JOIN users ru ON ru.id = c.reviewed_by
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY
      CASE c.status WHEN 'pending' THEN 0 ELSE 1 END,
      c.created_at DESC
  `;
  return (db.prepare(sql).all(...values) as Row[]).map(toCorrection);
}

export function pendingCorrectionCount(): number {
  const row = db
    .prepare("SELECT COUNT(*) AS n FROM corrections WHERE status = 'pending'")
    .get() as { n: number };
  return row.n;
}

export class CorrectionError extends Error {}

export function createCorrection(input: {
  userId: number;
  punchId: number | null;
  targetDate: string;
  proposedAt: number;
  reason: string;
}): number {
  if (input.reason.trim().length === 0) {
    throw new CorrectionError("A reason is required.");
  }
  if (input.proposedAt > Date.now()) {
    throw new CorrectionError("The proposed time must be in the past.");
  }
  if (input.punchId !== null) {
    const punch = getPunchById(input.punchId);
    if (!punch || punch.userId !== input.userId) {
      throw new CorrectionError("Punch not found.");
    }
    const pending = db
      .prepare(
        "SELECT COUNT(*) AS n FROM corrections WHERE punch_id = ? AND status = 'pending'",
      )
      .get(input.punchId) as { n: number };
    if (pending.n > 0) {
      throw new CorrectionError("This punch already has a pending request.");
    }
  }
  const result = db
    .prepare(
      `INSERT INTO corrections
         (user_id, punch_id, target_date, proposed_at, reason, status, created_at)
       VALUES (?, ?, ?, ?, ?, 'pending', ?)`,
    )
    .run(
      input.userId,
      input.punchId,
      input.targetDate,
      input.proposedAt,
      input.reason.trim(),
      Date.now(),
    );
  return Number(result.lastInsertRowid);
}

export function approveCorrection(
  correctionId: number,
  adminId: number,
  tz: string,
): void {
  const row = db
    .prepare("SELECT * FROM corrections WHERE id = ?")
    .get(correctionId) as
    | {
        id: number;
        user_id: number;
        punch_id: number | null;
        proposed_at: number;
        status: string;
      }
    | undefined;
  if (!row) throw new CorrectionError("Request not found.");
  if (row.status !== "pending") {
    throw new CorrectionError("Request is no longer pending.");
  }
  if (row.proposed_at > Date.now()) {
    throw new CorrectionError("The proposed time must be in the past.");
  }

  const now = Date.now();
  let oldValue: string;
  let newValue: string;

  if (row.punch_id !== null) {
    const punch = getPunchById(row.punch_id);
    if (!punch) throw new CorrectionError("Original punch no longer exists.");
    oldValue = `${punch.punchedAt} (${formatClock(punch.punchedAt, tz)})`;
    newValue = `${row.proposed_at} (${formatClock(row.proposed_at, tz)})`;
    updatePunchTime(row.punch_id, row.proposed_at);
  } else {
    oldValue = "(missing punch)";
    const newPunchId = insertPunch(row.user_id, row.proposed_at, null);
    newValue = `punch #${newPunchId} added at ${row.proposed_at} (${formatClock(row.proposed_at, tz)})`;
  }

  db.prepare(
    `UPDATE corrections
     SET status = 'approved', reviewed_by = ?, reviewed_at = ?, old_value = ?, new_value = ?
     WHERE id = ?`,
  ).run(adminId, now, oldValue, newValue, correctionId);
}

export function rejectCorrection(
  correctionId: number,
  adminId: number,
  note: string,
): void {
  if (note.trim().length === 0) {
    throw new CorrectionError("A note is required when rejecting a request.");
  }
  const row = db
    .prepare("SELECT status FROM corrections WHERE id = ?")
    .get(correctionId) as { status: string } | undefined;
  if (!row) throw new CorrectionError("Request not found.");
  if (row.status !== "pending") {
    throw new CorrectionError("Request is no longer pending.");
  }
  db.prepare(
    `UPDATE corrections
     SET status = 'rejected', reviewed_by = ?, reviewed_at = ?, admin_note = ?
     WHERE id = ?`,
  ).run(adminId, Date.now(), note.trim(), correctionId);
}
