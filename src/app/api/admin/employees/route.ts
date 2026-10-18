import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSessionUser } from "@/lib/session";
import { createUser, getUserByUsername } from "@/lib/users";

export async function POST(request: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser || sessionUser.role !== "admin") {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  let body: {
    fullName?: string;
    username?: string;
    email?: string;
    tempPassword?: string;
    role?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const fullName = (body.fullName ?? "").trim();
  const username = (body.username ?? "").trim().toLowerCase();
  const email = (body.email ?? "").trim() || null;
  const tempPassword = body.tempPassword ?? "";
  const role = body.role === "admin" ? "admin" : "employee";

  if (!fullName || !username || !tempPassword) {
    return NextResponse.json(
      { error: "Name, username, and temporary password are required." },
      { status: 400 },
    );
  }
  if (!/^[a-z0-9_.-]{3,32}$/.test(username)) {
    return NextResponse.json(
      { error: "Username must be 3-32 characters: letters, numbers, _ . -" },
      { status: 400 },
    );
  }
  if (tempPassword.length < 8) {
    return NextResponse.json(
      { error: "Temporary password must be at least 8 characters." },
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
    email,
    passwordHash: bcrypt.hashSync(tempPassword, 10),
    role,
  });
  return NextResponse.json({ ok: true, id });
}
