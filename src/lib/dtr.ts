import { punchesInRange, type Punch } from "./punches";
import { dayKey, daysInMonth, formatClock, formatDayLabel, parseLocalDateTime } from "./tz";

export type DayPunch = {
  id: number;
  timeMs: number;
  label: string;
  kind: "in" | "out";
};

export type DayDtr = {
  day: number;
  dayKey: string;
  label: string;
  punches: DayPunch[];
  firstInMs: number | null;
  lastOutMs: number | null;
  hasUnpairedIn: boolean;
};

export function tagKinds(punches: Punch[], tz: string): DayPunch[] {
  return punches.map((p, i) => ({
    id: p.id,
    timeMs: p.punchedAt,
    label: formatClock(p.punchedAt, tz),
    kind: i % 2 === 0 ? "in" : "out",
  }));
}

export function pairDay(punches: Punch[], tz: string, key: string, day: number): DayDtr {
  const tagged = tagKinds(punches, tz);
  const hasUnpairedIn = tagged.length > 0 && tagged.length % 2 === 1;
  return {
    day,
    dayKey: key,
    label: formatDayLabel(key),
    punches: tagged,
    firstInMs: tagged.length > 0 ? tagged[0].timeMs : null,
    lastOutMs: hasUnpairedIn ? null : tagged.length > 0 ? tagged[tagged.length - 1].timeMs : null,
    hasUnpairedIn,
  };
}

export function monthRangeUtc(
  year: number,
  month: number,
  tz: string,
): { fromMs: number; toMs: number } {
  const monthStr = String(month).padStart(2, "0");
  const fromMs = parseLocalDateTime(`${year}-${monthStr}-01`, "00:00", tz);
  const next = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const toMs = parseLocalDateTime(next, "00:00", tz);
  return { fromMs, toMs };
}

export function buildMonthDtr(
  userId: number,
  year: number,
  month: number,
  tz: string,
): DayDtr[] {
  const { fromMs, toMs } = monthRangeUtc(year, month, tz);
  const punches = punchesInRange(userId, fromMs, toMs);
  const total = daysInMonth(year, month);
  const byDay = new Map<string, Punch[]>();
  for (const p of punches) {
    const key = dayKey(p.punchedAt, tz);
    const list = byDay.get(key) ?? [];
    list.push(p);
    byDay.set(key, list);
  }
  const days: DayDtr[] = [];
  for (let d = 1; d <= total; d++) {
    const key = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    days.push(pairDay(byDay.get(key) ?? [], tz, key, d));
  }
  return days;
}
