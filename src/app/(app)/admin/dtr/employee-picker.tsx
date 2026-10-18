"use client";

import { useRouter } from "next/navigation";

export function EmployeePicker({
  users,
  selectedId,
  month,
}: {
  users: { id: number; fullName: string }[];
  selectedId: number;
  month: string;
}) {
  const router = useRouter();

  return (
    <form
      method="get"
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        const params = new URLSearchParams();
        params.set("user", String(data.get("user")));
        params.set("month", String(data.get("month")));
        router.push(`/admin/dtr?${params.toString()}`);
      }}
    >
      <input type="hidden" name="month" value={month} />
      <select
        name="user"
        defaultValue={String(selectedId)}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="h-9 rounded-md border bg-background px-2 text-sm"
      >
        {users.map((u) => (
          <option key={u.id} value={u.id}>
            {u.fullName}
          </option>
        ))}
      </select>
    </form>
  );
}
