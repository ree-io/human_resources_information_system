import { requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { punchesInRange } from "@/lib/punches";
import { dayKey, formatDayLabel, nowMs, parseLocalDateTime } from "@/lib/tz";
import { tagKinds } from "@/lib/dtr";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PunchButton } from "./punch-button";

export default async function PunchPage() {
  const user = await requireUser();
  const { officeTimezone: tz, officeName } = getSettings();

  const today = dayKey(nowMs(), tz);
  const fromMs = parseLocalDateTime(today, "00:00", tz);
  const punches = punchesInRange(user.id, fromMs, fromMs + 24 * 60 * 60 * 1000);
  const tagged = tagKinds(punches, tz);
  const clockedIn = punches.length % 2 === 1;

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Punch</h1>
        <p className="text-sm text-muted-foreground">
          {officeName} · {formatDayLabel(today)}
        </p>
      </div>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>
            {clockedIn ? "You are clocked in" : "You are clocked out"}
          </CardTitle>
          <CardDescription>
            {tagged.length === 0
              ? "No punches recorded today yet."
              : clockedIn
                ? `Clocked in since ${tagged[tagged.length - 1].label}`
                : `Last punch at ${tagged[tagged.length - 1].label} (${tagged[tagged.length - 1].kind === "in" ? "time in" : "time out"})`}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-6">
          <PunchButton clockedIn={clockedIn} />
        </CardContent>
      </Card>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle className="text-base">Today&apos;s punches</CardTitle>
        </CardHeader>
        <CardContent>
          {tagged.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing recorded yet.</p>
          ) : (
            <ul className="divide-y">
              {tagged.map((p, i) => (
                <li key={p.id} className="flex items-center justify-between py-2 text-sm">
                  <span className="font-medium uppercase text-muted-foreground">
                    {i + 1}. {p.kind === "in" ? "Time in" : "Time out"}
                  </span>
                  <span className="tabular-nums">{p.label}</span>
                </li>
              ))}
            </ul>
          )}
          {clockedIn && (
            <p className="mt-3 text-xs text-amber-600">
              Still clocked in — remember to punch out before you finish.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
