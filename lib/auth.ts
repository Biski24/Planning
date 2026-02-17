import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase-admin";
import { getSessionFromCookies } from "@/lib/session";
import { Profile, Role } from "@/lib/types";
import { AUTH_DISABLED } from "@/lib/flags";

async function getOrCreateDevProfile(): Promise<Profile> {
  const supabase = createAdminClient();
  const { data: existing } = await supabase
    .from("profiles")
    .select("*")
    .order("role", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (existing) return existing as Profile;

  const token = `${crypto.randomUUID().replace(/-/g, "")}${crypto.randomUUID().replace(/-/g, "")}`;
  const { data: created, error } = await supabase
    .from("profiles")
    .insert({
      full_name: "Dev Admin",
      role: "admin",
      calendar_feed_token: token,
    })
    .select("*")
    .single();

  if (error || !created) {
    throw new Error("Unable to create dev profile");
  }

  return created as Profile;
}

export async function getSessionUser() {
  if (AUTH_DISABLED) {
    const profile = await getOrCreateDevProfile();
    return { id: profile.id };
  }

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
  if (AUTH_DISABLED) {
    const profile = await getOrCreateDevProfile();
    return { user: { id: profile.id }, profile };
  }

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
