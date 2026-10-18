import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { createCorrection, CorrectionError } from "@/lib/corrections";
import { parseLocalDateTime } from "@/lib/tz";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let body: {
    mode?: string;
    punchId?: number | null;
    targetDate?: string;
    time?: string;
    reason?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const mode = body.mode;
  const targetDate = body.targetDate ?? "";
  const time = body.time ?? "";
  const reason = (body.reason ?? "").trim();

  if (mode !== "adjust" && mode !== "add") {
    return NextResponse.json({ error: "Invalid mode." }, { status: 400 });
  }
  if (reason.length === 0) {
    return NextResponse.json(
      { error: "A reason is required." },
      { status: 400 },
    );
  }

  const { officeTimezone } = getSettings();
  let proposedAt: number;
  try {
    proposedAt = parseLocalDateTime(targetDate, time, officeTimezone);
  } catch {
    return NextResponse.json(
      { error: "Invalid date or time." },
      { status: 400 },
    );
  }

  try {
    const id = createCorrection({
      userId: user.id,
      punchId: mode === "adjust" ? (body.punchId ?? null) : null,
      targetDate,
      proposedAt,
      reason,
    });
    return NextResponse.json({ ok: true, id });
  } catch (err) {
    if (err instanceof CorrectionError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}
