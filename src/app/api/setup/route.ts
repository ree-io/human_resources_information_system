import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { countUsers, createUser, getUserByUsername } from "@/lib/users";
import { createSession, setSessionCookie } from "@/lib/session";

export async function POST(request: Request) {
  if (countUsers() > 0) {
    return NextResponse.json(
      { error: "Initial admin already exists." },
      { status: 409 },
    );
  }

  let body: {
    fullName?: string;
    username?: string;
    password?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const fullName = (body.fullName ?? "").trim();
  const username = (body.username ?? "").trim().toLowerCase();
  const password = body.password ?? "";

  if (!fullName || !username || !password) {
    return NextResponse.json(
      { error: "All fields are required." },
      { status: 400 },
    );
  }
  if (!/^[a-z0-9_.-]{3,32}$/.test(username)) {
    return NextResponse.json(
      { error: "Username must be 3-32 characters: letters, numbers, _ . -" },
      { status: 400 },
    );
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 },
    );
  }
  if (getUserByUsername(username)) {
    return NextResponse.json(
      { error: "That username is already taken." },
      { status: 409 },
    );
  }

  const id = createUser({
    username,
    fullName,
    email: null,
    passwordHash: bcrypt.hashSync(password, 10),
    role: "admin",
  });

  const token = createSession(id);
  await setSessionCookie(token);

  return NextResponse.json({ ok: true, redirect: "/admin" });
}
