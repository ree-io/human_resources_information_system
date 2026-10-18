import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { listCorrections, pendingCorrectionCount } from "@/lib/corrections";
import { formatClock, formatDayLabel } from "@/lib/tz";
import Link from "next/link";
import { CorrectionsClient, type CorrectionRow } from "./corrections-client";

type SearchParams = Promise<{ status?: string }>;

export default async function CorrectionsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin();
  const { officeTimezone: tz } = getSettings();
  const sp = await searchParams;
  const showAll = sp.status === "all";

  const corrections = listCorrections(showAll ? {} : { status: "pending" });
  const pendingCount = pendingCorrectionCount();

  const rows: CorrectionRow[] = corrections.map((c) => ({
    id: c.id,
    userName: c.userName,
    mode: c.punchId === null ? "Missing punch" : "Adjust punch",
    targetDate: c.targetDate,
    targetLabel: formatDayLabel(c.targetDate),
    proposedTime: formatClock(c.proposedAt, tz),
    reason: c.reason,
    status: c.status,
    adminNote: c.adminNote,
    oldValue: c.oldValue,
    newValue: c.newValue,
    reviewedByName: c.reviewedByName,
  }));

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Corrections queue</h1>
          <p className="text-sm text-muted-foreground">
            {pendingCount} pending request{pendingCount === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex gap-1 rounded-lg border bg-background p-1 text-sm">
          <Link
            href="/admin/corrections"
            className={`rounded-md px-3 py-1 font-medium ${
              !showAll ? "bg-muted" : "text-muted-foreground hover:bg-muted/60"
            }`}
          >
            Pending
          </Link>
          <Link
            href="/admin/corrections?status=all"
            className={`rounded-md px-3 py-1 font-medium ${
              showAll ? "bg-muted" : "text-muted-foreground hover:bg-muted/60"
            }`}
          >
            All
          </Link>
        </div>
      </div>

      <CorrectionsClient rows={rows} showAll={showAll} />
    </div>
  );
}
