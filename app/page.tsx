import { redirect } from "next/navigation";
import { AUTH_DISABLED } from "@/lib/flags";
import { getSessionUser } from "@/lib/auth";

export default async function Home() {
  if (AUTH_DISABLED) {
    redirect("/plannings");
  }
  const user = await getSessionUser();
  redirect(user ? "/plannings" : "/login");
}
