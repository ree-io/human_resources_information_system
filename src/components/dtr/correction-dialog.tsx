"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type DialogPunch = {
  id: number;
  label: string;
  kind: "in" | "out";
};

export function CorrectionDialog({
  dayKey,
  dayLabel,
  punches,
  trigger,
}: {
  dayKey: string;
  dayLabel: string;
  punches: DialogPunch[];
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"adjust" | "add">(
    punches.length > 0 ? "adjust" : "add",
  );
  const [punchId, setPunchId] = useState<string>(
    punches.length > 0 ? String(punches[0].id) : "",
  );
  const [time, setTime] = useState<string>(
    punches.length > 0 ? punches[0].label : "17:00",
  );
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  function pickPunch(value: string) {
    setPunchId(value);
    const punch = punches.find((p) => String(p.id) === value);
    if (punch) setTime(punch.label);
  }

  async function submit() {
    setBusy(true);
    try {
      const res = await fetch("/api/corrections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          punchId: mode === "adjust" ? Number(punchId) : null,
          targetDate: dayKey,
          time,
          reason,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not submit request.");
        return;
      }
      toast.success("Correction request submitted.");
      setOpen(false);
      setReason("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="link"
            className="h-auto p-0 text-xs text-blue-600"
          />
        }
      >
        {trigger}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report incorrect time</DialogTitle>
          <DialogDescription>
            {dayLabel} — the admin will review your request.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label>What is wrong?</Label>
            <Select
              value={mode}
              onValueChange={(v) => {
                if (v === "adjust" || v === "add") setMode(v);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {punches.length > 0 && (
                  <SelectItem value="adjust">Adjust an existing punch</SelectItem>
                )}
                <SelectItem value="add">A punch is missing</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {mode === "adjust" && punches.length > 0 && (
            <div className="grid gap-2">
              <Label>Which punch?</Label>
              <Select
                value={punchId}
                onValueChange={(v) => {
                  if (v) pickPunch(v);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select punch" />
                </SelectTrigger>
                <SelectContent>
                  {punches.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.kind === "in" ? "Time in" : "Time out"} · {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid gap-2">
            <Label htmlFor="corr-time">
              {mode === "add" ? "Correct time" : "Corrected time"}
            </Label>
            <Input
              id="corr-time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="corr-reason">Reason</Label>
            <Textarea
              id="corr-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Forgot to punch out — left at 5:30 PM"
              required
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy || reason.trim().length === 0}>
            {busy ? "Submitting…" : "Submit request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
