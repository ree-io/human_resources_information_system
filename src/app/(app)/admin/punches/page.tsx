import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { listUsers } from "@/lib/users";
import { punchesForUsersInRange } from "@/lib/punches";
import { dayKey, formatDayLabel, nowMs, parseLocalDateTime } from "@/lib/tz";
import { tagKinds } from "@/lib/dtr";
import type { Punch } from "@/lib/punches";

type SearchParams = Promise<{ user?: string; from?: string; to?: string }>;

export default async function PunchLogPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin();
  const { officeTimezone: tz } = getSettings();
  const sp = await searchParams;

  const users = listUsers(true);
  const todayKey = dayKey(nowMs(), tz);
  const defaultFrom = dayKey(nowMs() - 13 * 24 * 60 * 60 * 1000, tz);
  const userFilter = sp.user && sp.user !== "all" ? Number(sp.user) : "all";
  const fromKey = /^\d{4}-\d{2}-\d{2}$/.test(sp.from ?? "") ? sp.from! : defaultFrom;
  const toKey = /^\d{4}-\d{2}-\d{2}$/.test(sp.to ?? "") ? sp.to! : todayKey;

  const fromMs = parseLocalDateTime(fromKey, "00:00", tz);
  const toMs = parseLocalDateTime(toKey, "00:00", tz) + 24 * 60 * 60 * 1000;

  const filteredUsers =
    userFilter === "all" ? users : users.filter((u) => u.id === userFilter);
  const punches = punchesForUsersInRange(
    filteredUsers.map((u) => u.id),
    fromMs,
    Math.max(toMs, fromMs + 1),
  );

  const nameById = new Map(users.map((u) => [u.id, u.fullName]));

  type Entry = {
    id: number;
    dateKey: string;
    time: string;
    employee: string;
    kind: string;
    ip: string | null;
  };

  const byUserDay = new Map<string, Punch[]>();
  for (const p of punches) {
    const key = `${p.userId}|${dayKey(p.punchedAt, tz)}`;
    const list = byUserDay.get(key) ?? [];
    list.push(p);
    byUserDay.set(key, list);
  }

  const entries: Entry[] = [];
  for (const [, list] of byUserDay) {
    const sorted = [...list].sort((a, b) => a.punchedAt - b.punchedAt);
    const tagged = tagKinds(sorted, tz);
    for (const t of tagged) {
      const original = sorted.find((p) => p.id === t.id)!;
      entries.push({
        id: original.id,
        dateKey: dayKey(original.punchedAt, tz),
        time: t.label,
        employee: nameById.get(original.userId) ?? `#${original.userId}`,
        kind: t.kind === "in" ? "Time in" : "Time out",
        ip: original.ip,
      });
    }
  }
  entries.sort((a, b) =>
    a.dateKey === b.dateKey
      ? b.time.localeCompare(a.time)
      : b.dateKey.localeCompare(a.dateKey),
  );

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Punch Log</h1>
          <p className="text-sm text-muted-foreground">
            {entries.length} punches · {formatDayLabel(fromKey)} → {formatDayLabel(toKey)}
          </p>
        </div>
        <form className="flex flex-wrap items-end gap-2" method="get">
          <div className="grid gap-1">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="f-user">
              Employee
            </label>
            <select
              id="f-user"
              name="user"
              defaultValue={String(userFilter)}
              className="h-9 rounded-md border bg-background px-2 text-sm"
            >
              <option value="all">All employees</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullName}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-1">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="f-from">
              From
            </label>
            <input
              id="f-from"
              type="date"
              name="from"
              defaultValue={fromKey}
              className="h-9 rounded-md border bg-background px-2 text-sm"
            />
          </div>
          <div className="grid gap-1">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="f-to">
              To
            </label>
            <input
              id="f-to"
              type="date"
              name="to"
              defaultValue={toKey}
              className="h-9 rounded-md border bg-background px-2 text-sm"
            />
          </div>
          <button
            type="submit"
            className="h-9 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Filter
          </button>
        </form>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-background">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-2.5">Date</th>
              <th className="px-4 py-2.5">Time</th>
              <th className="px-4 py-2.5">Employee</th>
              <th className="px-4 py-2.5">Type</th>
              <th className="px-4 py-2.5">IP</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  No punches in this range.
                </td>
              </tr>
            ) : (
              entries.map((e) => (
                <tr key={e.id} className="border-b last:border-0">
                  <td className="whitespace-nowrap px-4 py-2">{formatDayLabel(e.dateKey)}</td>
                  <td className="whitespace-nowrap px-4 py-2 font-medium tabular-nums">
                    {e.time}
                  </td>
                  <td className="px-4 py-2">{e.employee}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded border px-1.5 py-0.5 text-xs font-medium ${
                        e.kind === "Time in"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
                          : "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300"
                      }`}
                    >
                      {e.kind}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">
                    {e.ip ?? "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
