"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export type CorrectionRow = {
  id: number;
  userName: string;
  mode: string;
  targetDate: string;
  targetLabel: string;
  proposedTime: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  adminNote: string | null;
  oldValue: string | null;
  newValue: string | null;
  reviewedByName: string | null;
};

function ApproveButton({ row }: { row: CorrectionRow }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function approve() {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/corrections/${row.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not approve.");
        return;
      }
      toast.success("Correction approved and applied.");
      setOpen(false);
      router.refresh();
    } catch {
      toast.error("Could not reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button size="sm" onClick={() => setOpen(true)}>
        Approve
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Approve correction?</DialogTitle>
          <DialogDescription>
            This applies the change to {row.userName}&apos;s punch log and records
            the audit trail.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2 rounded-lg border bg-muted/40 p-3 text-sm">
          <div>
            <span className="font-medium">{row.targetLabel}</span> · {row.mode}
          </div>
          <div>
            Proposed time: <span className="font-medium tabular-nums">{row.proposedTime}</span>
          </div>
          <div className="text-muted-foreground">Reason: {row.reason}</div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={approve} disabled={busy}>
            {busy ? "Approving…" : "Approve & apply"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RejectButton({ row }: { row: CorrectionRow }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function reject() {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/corrections/${row.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", note }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not reject.");
        return;
      }
      toast.success("Request rejected.");
      setOpen(false);
      setNote("");
      router.refresh();
    } catch {
      toast.error("Could not reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        Reject
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reject request</DialogTitle>
          <DialogDescription>
            {row.userName} will see your note with the decision.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Label htmlFor={`reject-note-${row.id}`}>Note (required)</Label>
          <Textarea
            id={`reject-note-${row.id}`}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Clock shows you left later — please resubmit with the correct time"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={reject}
            disabled={busy || note.trim().length === 0}
          >
            {busy ? "Rejecting…" : "Reject request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CorrectionsClient({
  rows,
  showAll,
}: {
  rows: CorrectionRow[];
  showAll: boolean;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border bg-background px-6 py-12 text-center text-sm text-muted-foreground">
        {showAll ? "No correction requests yet." : "No pending requests — all caught up."}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border bg-background">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <th className="px-4 py-2.5">Employee</th>
            <th className="px-4 py-2.5">Day</th>
            <th className="px-4 py-2.5">Request</th>
            <th className="px-4 py-2.5">Proposed</th>
            <th className="px-4 py-2.5">Reason</th>
            <th className="px-4 py-2.5">Status</th>
            <th className="px-4 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b align-top last:border-0">
              <td className="whitespace-nowrap px-4 py-3 font-medium">
                {row.userName}
              </td>
              <td className="whitespace-nowrap px-4 py-3">{row.targetLabel}</td>
              <td className="whitespace-nowrap px-4 py-3">{row.mode}</td>
              <td className="whitespace-nowrap px-4 py-3 font-medium tabular-nums">
                {row.proposedTime}
              </td>
              <td className="max-w-56 px-4 py-3 text-muted-foreground">
                {row.reason}
              </td>
              <td className="px-4 py-3">
                <Badge
                  variant={
                    row.status === "pending"
                      ? "secondary"
                      : row.status === "approved"
                        ? "default"
                        : "destructive"
                  }
                >
                  {row.status}
                </Badge>
                {row.status !== "pending" && (
                  <div className="mt-1 max-w-56 text-xs text-muted-foreground">
                    {row.adminNote
                      ? `Note: ${row.adminNote}`
                      : row.oldValue && row.newValue
                        ? `${row.oldValue} → ${row.newValue}`
                        : ""}
                    {row.reviewedByName && (
                      <div>by {row.reviewedByName}</div>
                    )}
                  </div>
                )}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right">
                {row.status === "pending" && (
                  <div className="flex justify-end gap-2">
                    <ApproveButton row={row} />
                    <RejectButton row={row} />
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
