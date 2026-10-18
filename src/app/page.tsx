import { redirect } from "next/navigation";
import { countUsers } from "@/lib/users";
import { getSessionUser } from "@/lib/session";

export default async function Home() {
  if (countUsers() === 0) redirect("/setup");

  const user = await getSessionUser();
  if (!user) redirect("/login");

  redirect(user.role === "admin" ? "/admin" : "/punch");
}
