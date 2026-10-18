"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type NavUser = { fullName: string; role: "admin" | "employee" };

const EMPLOYEE_LINKS = [
  { href: "/punch", label: "Punch" },
  { href: "/dtr", label: "My DTR" },
];

const ADMIN_LINKS = [
  { href: "/admin/employees", label: "Employees" },
  { href: "/admin/punches", label: "Punch Log" },
  { href: "/admin/corrections", label: "Corrections" },
  { href: "/admin/dtr", label: "DTR View" },
  { href: "/admin/settings", label: "Settings" },
];

export function Nav({
  user,
  pendingCount,
}: {
  user: NavUser;
  pendingCount: number;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const links =
    user.role === "admin" ? [...EMPLOYEE_LINKS, ...ADMIN_LINKS] : EMPLOYEE_LINKS;

  async function logout() {
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (res.ok) {
        router.push("/login");
        router.refresh();
      } else {
        toast.error("Logout failed.");
      }
    } catch {
      toast.error("Logout failed.");
    }
  }

  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex w-full max-w-5xl items-center gap-6 px-6 py-3">
        <Link href="/" className="font-semibold tracking-tight">
          HRIS DTR
        </Link>
        <nav className="flex flex-1 items-center gap-1">
          {links.map((link) => {
            const active =
              pathname === link.href || pathname.startsWith(link.href + "/");
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                }`}
              >
                {link.label}
                {link.href === "/admin/corrections" && pendingCount > 0 && (
                  <Badge variant="destructive" className="px-1.5 text-[10px]">
                    {pendingCount}
                  </Badge>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-muted-foreground sm:block">
            {user.fullName}
            {user.role === "admin" && (
              <span className="ml-1 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase">
                admin
              </span>
            )}
          </span>
          <Button variant="outline" size="sm" onClick={logout}>
            Sign out
          </Button>
        </div>
      </div>
    </header>
  );
}
