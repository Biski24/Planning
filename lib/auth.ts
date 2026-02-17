import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase-admin";
import { getSessionFromCookies } from "@/lib/session";
import { Profile, Role } from "@/lib/types";

export async function getSessionUser() {
  const session = await getSessionFromCookies();
  if (!session) return null;
  return { id: session.profileId };
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  return (data as Profile | null) ?? null;
}

export async function requireUser() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  const profile = await getProfile(user.id);
  if (!profile) {
    redirect("/login?error=profile_missing");
  }

  return { user, profile };
}

export async function requireRole(roles: Role[]) {
  const { user, profile } = await requireUser();
  if (!roles.includes(profile.role)) {
    redirect("/plannings");
  }
  return { user, profile };
}
