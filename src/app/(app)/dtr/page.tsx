import { requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { buildMonthDtr } from "@/lib/dtr";
import { dayKey, formatClock, nowMs } from "@/lib/tz";
import { listCorrections } from "@/lib/corrections";
import { DtrTable, MonthNav, toDtrDays } from "@/components/dtr/dtr-table";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type SearchParams = Promise<{ month?: string }>;

function parseMonth(value: string | undefined, tz: string): { year: number; month: number } {
  const now = dayKey(nowMs(), tz);
  const fallback = { year: Number(now.slice(0, 4)), month: Number(now.slice(5, 7)) };
  if (!value) return fallback;
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return fallback;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return fallback;
  return { year, month };
}

function weekendDaysFor(year: number, month: number): Set<number> {
  const set = new Set<number>();
  for (let d = 1; d <= 31; d++) {
    const date = new Date(Date.UTC(year, month - 1, d, 12));
    if (date.getUTCMonth() !== month - 1) break;
    const day = date.getUTCDay();
    if (day === 0 || day === 6) set.add(d);
  }
  return set;
}

export default async function DtrPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser();
  const { officeTimezone: tz, officeName } = getSettings();
  const { month } = await searchParams;
  const { year, month: m } = parseMonth(month, tz);

  const days = buildMonthDtr(user.id, year, m, tz);
  const todayKey = dayKey(nowMs(), tz);
  const dtrDays = toDtrDays(days, todayKey, weekendDaysFor(year, m));
  const corrections = listCorrections({ userId: user.id });

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {user.fullName}&apos;s DTR
          </h1>
          <p className="text-sm text-muted-foreground">
            {officeName} · times shown in {tz}
          </p>
        </div>
        <MonthNav year={year} month={m} basePath="/dtr" />
      </div>

      <DtrTable days={dtrDays} canReport todayKey={todayKey} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">My correction requests</CardTitle>
        </CardHeader>
        <CardContent>
          {corrections.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              You haven&apos;t requested any corrections.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <th className="px-2 py-2">Day</th>
                    <th className="px-2 py-2">Proposed</th>
                    <th className="px-2 py-2">Reason</th>
                    <th className="px-2 py-2">Status</th>
                    <th className="px-2 py-2">Admin note</th>
                  </tr>
                </thead>
                <tbody>
                  {corrections.map((c) => (
                    <tr key={c.id} className="border-b last:border-0">
                      <td className="whitespace-nowrap px-2 py-2">{c.targetDate}</td>
                      <td className="whitespace-nowrap px-2 py-2 tabular-nums">
                        {formatClock(c.proposedAt, tz)}
                      </td>
                      <td className="max-w-64 px-2 py-2">{c.reason}</td>
                      <td className="px-2 py-2">
                        <Badge
                          variant={
                            c.status === "pending"
                              ? "secondary"
                              : c.status === "approved"
                                ? "default"
                                : "destructive"
                          }
                        >
                          {c.status}
                        </Badge>
                      </td>
                      <td className="max-w-48 px-2 py-2 text-muted-foreground">
                        {c.adminNote ?? (c.oldValue ? `${c.oldValue} → ${c.newValue}` : "")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
