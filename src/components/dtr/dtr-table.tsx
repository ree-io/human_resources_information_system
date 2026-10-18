import Link from "next/link";
import { CorrectionDialog, type DialogPunch } from "./correction-dialog";

export type DtrDay = {
  day: number;
  dayKey: string;
  label: string;
  isWeekend: boolean;
  isToday: boolean;
  punches: DialogPunch[];
  firstIn: string | null;
  lastOut: string | null;
  hasUnpairedIn: boolean;
};

function RowActions({ day, todayKey }: { day: DtrDay; todayKey: string }) {
  const reportable = day.punches.length > 0 || day.dayKey <= todayKey;
  if (!reportable) return null;
  return (
    <CorrectionDialog
      dayKey={day.dayKey}
      dayLabel={day.label}
      punches={day.punches}
      trigger="Report incorrect time"
    />
  );
}

export function DtrTable({
  days,
  canReport,
  todayKey,
}: {
  days: DtrDay[];
  canReport: boolean;
  todayKey: string;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border bg-background">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <th className="px-4 py-2.5">Day</th>
            <th className="px-4 py-2.5">Punches</th>
            <th className="px-4 py-2.5">First In</th>
            <th className="px-4 py-2.5">Last Out</th>
            <th className="px-4 py-2.5">Status</th>
            {canReport && <th className="px-4 py-2.5" />}
          </tr>
        </thead>
        <tbody>
          {days.map((day) => (
            <tr
              key={day.dayKey}
              className={`border-b last:border-0 ${
                day.isWeekend ? "bg-muted/20 text-muted-foreground" : ""
              } ${day.isToday ? "bg-blue-50 dark:bg-blue-950/30" : ""}`}
            >
              <td className="whitespace-nowrap px-4 py-2 font-medium">
                {day.label}
                {day.isToday && (
                  <span className="ml-2 rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                    Today
                  </span>
                )}
              </td>
              <td className="px-4 py-2">
                {day.punches.length === 0 ? (
                  <span className="text-muted-foreground">—</span>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {day.punches.map((p, i) => (
                      <span
                        key={p.id}
                        className={`rounded border px-1.5 py-0.5 text-xs tabular-nums ${
                          i % 2 === 0
                            ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
                            : "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300"
                        }`}
                      >
                        {p.kind === "in" ? "IN" : "OUT"} {p.label}
                      </span>
                    ))}
                  </div>
                )}
              </td>
              <td className="px-4 py-2 tabular-nums">
                {day.firstIn ?? <span className="text-muted-foreground">—</span>}
              </td>
              <td className="px-4 py-2 tabular-nums">
                {day.lastOut ?? <span className="text-muted-foreground">—</span>}
              </td>
              <td className="px-4 py-2">
                {day.punches.length === 0 ? (
                  <span className="text-muted-foreground">No punches</span>
                ) : day.hasUnpairedIn ? (
                  <span className="text-xs font-medium text-amber-600">
                    Missing time out
                  </span>
                ) : (
                  <span className="text-xs text-emerald-600">Complete</span>
                )}
              </td>
              {canReport && (
                <td className="px-4 py-2 text-right">
                  <RowActions day={day} todayKey={todayKey} />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function MonthNav({
  year,
  month,
  basePath,
  extraParams,
}: {
  year: number;
  month: number;
  basePath: string;
  extraParams?: Record<string, string>;
}) {
  const prev = month === 1 ? `${year - 1}-12` : `${year}-${String(month - 1).padStart(2, "0")}`;
  const next = month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, "0")}`;
  const href = (m: string) => {
    const params = new URLSearchParams({ ...extraParams, month: m });
    return `${basePath}?${params.toString()}`;
  };
  const monthLabel = new Date(Date.UTC(year, month - 1, 1)).toLocaleString(
    "en-US",
    { month: "long", year: "numeric", timeZone: "UTC" },
  );
  return (
    <div className="flex items-center gap-3">
      <Link
        href={href(prev)}
        className="rounded-md border px-2.5 py-1 text-sm hover:bg-muted"
      >
        ← Prev
      </Link>
      <span className="min-w-36 text-center text-sm font-semibold">
        {monthLabel}
      </span>
      <Link
        href={href(next)}
        className="rounded-md border px-2.5 py-1 text-sm hover:bg-muted"
      >
        Next →
      </Link>
    </div>
  );
}

export function toDtrDays(
  days: {
    day: number;
    dayKey: string;
    label: string;
    punches: { id: number; label: string; kind: "in" | "out" }[];
    firstInMs: number | null;
    lastOutMs: number | null;
    hasUnpairedIn: boolean;
  }[],
  todayKey: string,
  weekendDays: Set<number>,
): DtrDay[] {
  return days.map((d) => ({
    day: d.day,
    dayKey: d.dayKey,
    label: d.label,
    isWeekend: weekendDays.has(d.day),
    isToday: d.dayKey === todayKey,
    punches: d.punches.map((p) => ({ id: p.id, label: p.label, kind: p.kind })),
    firstIn: d.punches.length > 0 ? d.punches[0].label : null,
    lastOut:
      d.punches.length > 0 && !d.hasUnpairedIn
        ? d.punches[d.punches.length - 1].label
        : null,
    hasUnpairedIn: d.hasUnpairedIn,
  }));
}
