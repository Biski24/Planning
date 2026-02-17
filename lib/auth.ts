import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { Profile, Role } from "@/lib/types";

export async function getSessionUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const supabase = await createServerSupabaseClient();
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
