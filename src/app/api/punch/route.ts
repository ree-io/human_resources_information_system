import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { lastPunch, insertPunch } from "@/lib/punches";

const COOLDOWN_MS = 60_000;

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const now = Date.now();
  const last = lastPunch(user.id);
  if (last && now - last.punchedAt < COOLDOWN_MS) {
    const waitSec = Math.ceil((COOLDOWN_MS - (now - last.punchedAt)) / 1000);
    return NextResponse.json(
      { error: `Please wait ${waitSec}s before punching again.` },
      { status: 429 },
    );
  }

  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : "local";
  const punchId = insertPunch(user.id, now, ip);

  return NextResponse.json({ ok: true, punchId, punchedAt: now });
}
