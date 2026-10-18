import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getUserByUsername, getUserById } from "@/lib/users";
import { createSession, setSessionCookie } from "@/lib/session";

export async function POST(request: Request) {
  let body: { username?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const username = (body.username ?? "").trim();
  const password = body.password ?? "";
  if (!username || !password) {
    return NextResponse.json(
      { error: "Username and password are required." },
      { status: 400 },
    );
  }

  const user = getUserByUsername(username);
  if (!user || !user.active || !(await bcrypt.compare(password, user.passwordHash))) {
    return NextResponse.json(
      { error: "Invalid username or password." },
      { status: 401 },
    );
  }

  const token = createSession(user.id);
  await setSessionCookie(token);

  const fresh = getUserById(user.id);
  return NextResponse.json({
    ok: true,
    redirect: fresh?.role === "admin" ? "/admin" : "/punch",
  });
}
