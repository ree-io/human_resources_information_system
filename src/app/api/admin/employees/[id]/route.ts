import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSessionUser } from "@/lib/session";
import { getUserById, updateUser, deleteUserSessions } from "@/lib/users";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Params) {
  const sessionUser = await getSessionUser();
  if (!sessionUser || sessionUser.role !== "admin") {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const { id: idStr } = await ctx.params;
  const id = Number(idStr);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }

  const target = getUserById(id);
  if (!target) {
    return NextResponse.json({ error: "Employee not found." }, { status: 404 });
  }

  let body: {
    fullName?: string;
    email?: string | null;
    role?: string;
    active?: boolean;
    newPassword?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const patch: Parameters<typeof updateUser>[1] = {};

  if (body.fullName !== undefined) {
    const fullName = String(body.fullName).trim();
    if (!fullName) {
      return NextResponse.json({ error: "Name cannot be empty." }, { status: 400 });
    }
    patch.fullName = fullName;
  }
  if (body.email !== undefined) {
    patch.email = String(body.email).trim() || null;
  }
  if (body.role !== undefined) {
    if (body.role !== "admin" && body.role !== "employee") {
      return NextResponse.json({ error: "Invalid role." }, { status: 400 });
    }
    if (target.id === sessionUser.id && body.role !== "admin") {
      return NextResponse.json(
        { error: "You cannot remove your own admin role." },
        { status: 400 },
      );
    }
    patch.role = body.role;
  }
  if (body.active !== undefined) {
    const active = Boolean(body.active);
    if (target.id === sessionUser.id && !active) {
      return NextResponse.json(
        { error: "You cannot deactivate your own account." },
        { status: 400 },
      );
    }
    patch.active = active;
  }
  if (body.newPassword !== undefined) {
    const newPassword = String(body.newPassword);
    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "New password must be at least 8 characters." },
        { status: 400 },
      );
    }
    patch.passwordHash = bcrypt.hashSync(newPassword, 10);
  }

  updateUser(id, patch);
  if (patch.active === false || patch.passwordHash !== undefined) {
    deleteUserSessions(id);
  }

  return NextResponse.json({ ok: true });
}
