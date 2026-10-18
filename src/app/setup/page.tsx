import { redirect } from "next/navigation";
import { countUsers } from "@/lib/users";
import { SetupForm } from "./setup-form";

export default async function SetupPage() {
  if (countUsers() > 0) redirect("/login");

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <SetupForm />
    </main>
  );
}
