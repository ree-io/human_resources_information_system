import { db } from "./db";

export const DEFAULT_SETTINGS = {
  officeName: "My Company",
  officeTimezone: "Asia/Manila",
};

export function getSetting(key: string): string | null {
  const row = db
    .prepare("SELECT value FROM settings WHERE key = ?")
    .get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

export function getSettings(): {
  officeName: string;
  officeTimezone: string;
} {
  return {
    officeName: getSetting("officeName") ?? DEFAULT_SETTINGS.officeName,
    officeTimezone:
      getSetting("officeTimezone") ?? DEFAULT_SETTINGS.officeTimezone,
  };
}

export function setSetting(key: string, value: string): void {
  db.prepare(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
  ).run(key, value);
}

export function isValidTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}
