import { requireAdmin } from "@/lib/auth";
import { listUsers } from "@/lib/users";
import { EmployeesClient } from "./employees-client";

export default async function EmployeesPage() {
  await requireAdmin();
  const users = listUsers(true);

  return (
    <div className="grid gap-6">
      <EmployeesClient
        users={users.map((u) => ({
          id: u.id,
          username: u.username,
          fullName: u.fullName,
          email: u.email,
          role: u.role,
          active: u.active,
        }))}
      />
    </div>
  );
}
