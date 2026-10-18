const dtfCache = new Map<string, Intl.DateTimeFormat>();

export function nowMs(): number {
  return Date.now();
}

function getDtf(tz: string): Intl.DateTimeFormat {
  let fmt = dtfCache.get(tz);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    dtfCache.set(tz, fmt);
  }
  return fmt;
}

export type TzParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

export function tzParts(ms: number, tz: string): TzParts {
  const parts = getDtf(tz).formatToParts(new Date(ms));
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? "0");
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour") % 24,
    minute: get("minute"),
    second: get("second"),
  };
}

export function dayKey(ms: number, tz: string): string {
  const p = tzParts(ms, tz);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

export function formatClock(ms: number, tz: string): string {
  const p = tzParts(ms, tz);
  return `${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}`;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function formatDayLabel(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d, 12));
  return `${DAY_NAMES[date.getUTCDay()]}, ${MONTH_NAMES[m - 1]} ${d}`;
}

export function daysInMonth(year: number, month: number): number {
  for (let d = 1; d <= 31; d++) {
    const probe = new Date(Date.UTC(year, month - 1, d, 12));
    if (probe.getUTCMonth() !== month - 1) return d - 1;
  }
  return 31;
}

export function tzOffsetMs(ms: number, tz: string): number {
  const p = tzParts(ms, tz);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(ms / 1000) * 1000;
}

export function parseLocalDateTime(
  dateStr: string,
  timeStr: string,
  tz: string,
): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    throw new Error(`Invalid date: ${dateStr}`);
  }
  if (!/^\d{2}:\d{2}$/.test(timeStr)) {
    throw new Error(`Invalid time: ${timeStr}`);
  }
  const guess = Date.parse(`${dateStr}T${timeStr}:00Z`);
  if (Number.isNaN(guess)) {
    throw new Error(`Invalid datetime: ${dateStr} ${timeStr}`);
  }
  let ts = guess - tzOffsetMs(guess, tz);
  ts = guess - tzOffsetMs(ts, tz);
  return ts;
}
