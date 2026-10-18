import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { setSetting, isValidTimezone } from "@/lib/settings";

export async function POST(request: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser || sessionUser.role !== "admin") {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  let body: { officeName?: string; officeTimezone?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const officeName = (body.officeName ?? "").trim();
  const officeTimezone = (body.officeTimezone ?? "").trim();

  if (!officeName) {
    return NextResponse.json(
      { error: "Office name is required." },
      { status: 400 },
    );
  }
  if (!isValidTimezone(officeTimezone)) {
    return NextResponse.json(
      { error: "Invalid timezone (use an IANA name like Asia/Manila)." },
      { status: 400 },
    );
  }

  setSetting("officeName", officeName);
  setSetting("officeTimezone", officeTimezone);

  return NextResponse.json({ ok: true });
}
