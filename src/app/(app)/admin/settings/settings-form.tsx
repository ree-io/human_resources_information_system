"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TIMEZONES = [
  "Asia/Manila",
  "Asia/Tokyo",
  "Asia/Singapore",
  "Asia/Kolkata",
  "UTC",
  "Europe/London",
  "America/New_York",
  "America/Los_Angeles",
];

export function SettingsForm({
  officeName,
  officeTimezone,
}: {
  officeName: string;
  officeTimezone: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(officeName);
  const [tz, setTz] = useState(officeTimezone);
  const [busy, setBusy] = useState(false);

  const tzOptions = TIMEZONES.includes(officeTimezone)
    ? TIMEZONES
    : [officeTimezone, ...TIMEZONES];

  async function submit() {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ officeName: name, officeTimezone: tz }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not save settings.");
        return;
      }
      toast.success("Settings saved.");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle>Office</CardTitle>
        <CardDescription>
          Times are stored in UTC and displayed in this timezone.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="office-name">Office name</Label>
          <Input
            id="office-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label>Timezone</Label>
          <Select
            value={tz}
            onValueChange={(v) => {
              if (v) setTz(v);
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {tzOptions.map((z) => (
                <SelectItem key={z} value={z}>
                  {z}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={submit} disabled={busy || !name.trim()}>
          {busy ? "Saving…" : "Save settings"}
        </Button>
      </CardFooter>
    </Card>
  );
}
