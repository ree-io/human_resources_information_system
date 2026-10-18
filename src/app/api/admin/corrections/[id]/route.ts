import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import {
  approveCorrection,
  rejectCorrection,
  CorrectionError,
} from "@/lib/corrections";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, ctx: Params) {
  const sessionUser = await getSessionUser();
  if (!sessionUser || sessionUser.role !== "admin") {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const { id: idStr } = await ctx.params;
  const id = Number(idStr);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }

  let body: { action?: string; note?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { officeTimezone } = getSettings();

  try {
    if (body.action === "approve") {
      approveCorrection(id, sessionUser.id, officeTimezone);
    } else if (body.action === "reject") {
      rejectCorrection(id, sessionUser.id, body.note ?? "");
    } else {
      return NextResponse.json({ error: "Invalid action." }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof CorrectionError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}
