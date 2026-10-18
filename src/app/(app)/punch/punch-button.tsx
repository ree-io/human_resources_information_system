"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function PunchButton({ clockedIn }: { clockedIn: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function punch() {
    setBusy(true);
    try {
      const res = await fetch("/api/punch", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Punch failed.");
        return;
      }
      toast.success(clockedIn ? "Time out recorded." : "Time in recorded.");
      router.refresh();
    } catch {
      toast.error("Punch failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      onClick={punch}
      disabled={busy}
      size="lg"
      className={`h-20 w-full max-w-sm text-lg font-semibold ${
        clockedIn ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""
      }`}
    >
      {busy
        ? "Recording…"
        : clockedIn
          ? "Punch Out"
          : "Punch In"}
    </Button>
  );
}
