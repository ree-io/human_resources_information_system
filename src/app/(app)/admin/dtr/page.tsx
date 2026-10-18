import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { listUsers } from "@/lib/users";
import { buildMonthDtr } from "@/lib/dtr";
import { dayKey, nowMs } from "@/lib/tz";
import { DtrTable, MonthNav, toDtrDays } from "@/components/dtr/dtr-table";
import { EmployeePicker } from "./employee-picker";

type SearchParams = Promise<{ user?: string; month?: string }>;

function parseMonth(value: string | undefined, tz: string): { year: number; month: number } {
  const now = dayKey(Date.now(), tz);
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

export default async function AdminDtrPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin();
  const { officeTimezone: tz, officeName } = getSettings();
  const sp = await searchParams;

  const users = listUsers(true);
  const selected =
    sp.user && users.some((u) => String(u.id) === sp.user)
      ? users.find((u) => String(u.id) === sp.user)!
      : users[0];
  const { year, month: m } = parseMonth(sp.month, tz);

  if (!selected) {
    return (
      <div className="grid gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">DTR View</h1>
        <p className="text-sm text-muted-foreground">
          No employees yet — add one from the Employees screen.
        </p>
      </div>
    );
  }

  const days = buildMonthDtr(selected.id, year, m, tz);
  const todayKey = dayKey(nowMs(), tz);
  const dtrDays = toDtrDays(days, todayKey, weekendDaysFor(year, m));

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">DTR View</h1>
          <p className="text-sm text-muted-foreground">
            {officeName} · times shown in {tz}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <EmployeePicker
            users={users.map((u) => ({ id: u.id, fullName: u.fullName }))}
            selectedId={selected.id}
            month={`${year}-${String(m).padStart(2, "0")}`}
          />
          <MonthNav
            year={year}
            month={m}
            basePath="/admin/dtr"
            extraParams={{ user: String(selected.id) }}
          />
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-lg font-semibold">{selected.fullName}</h2>
        <DtrTable days={dtrDays} canReport={false} todayKey={todayKey} />
      </div>
    </div>
  );
}
