import { requireAdminApi, redirectBack } from "@/lib/api-auth";

export async function POST(request: Request) {
  const admin = await requireAdminApi();
  if (admin.error) return admin.error;

  const form = await request.formData();
  const username = String(form.get("username") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "").trim();
  const fullName = String(form.get("full_name") ?? "").trim();
  const role = String(form.get("role") ?? "employee");
  const teamId = String(form.get("team_id") ?? "").trim();

  if (!username || !password || !fullName) {
    return redirectBack(request, "/admin?error=user_missing_fields");
  }

  const { data: profile, error: profileError } = await admin.supabase
    .from("profiles")
    .insert({
      full_name: fullName,
      role,
      team_id: teamId || null,
      calendar_feed_token: crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, ""),
    })
    .select("id")
    .single();

  if (profileError || !profile) {
    return redirectBack(request, "/admin?error=create_profile_failed");
  }

  const { error: userError } = await admin.supabase.rpc("create_app_user", {
    p_profile_id: profile.id,
    p_username: username,
    p_password: password,
  });

  if (userError) {
    await admin.supabase.from("profiles").delete().eq("id", profile.id);
    return redirectBack(request, "/admin?error=create_user_failed");
  }

  return redirectBack(request, "/admin?success=user_created");
}
