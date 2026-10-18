import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { deleteSession, clearSessionCookie } from "@/lib/session";

export async function POST() {
  const token = (await cookies()).get("hris_session")?.value;
  if (token) deleteSession(token);
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
