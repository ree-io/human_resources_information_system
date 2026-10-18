import type { ReactNode } from "react";
import { requireUser } from "@/lib/auth";
import { pendingCorrectionCount } from "@/lib/corrections";
import { Nav } from "./nav";

export default async function AppLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireUser();
  const pendingCount =
    user.role === "admin" ? pendingCorrectionCount() : 0;

  return (
    <div className="flex min-h-full flex-col">
      <Nav
        user={{ fullName: user.fullName, role: user.role }}
        pendingCount={pendingCount}
      />
      <main className="mx-auto w-full max-w-5xl flex-1 p-6">{children}</main>
    </div>
  );
}
