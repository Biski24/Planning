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

  const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
  const profilePayload = {
    full_name: fullName,
    role,
    team_id: teamId || null,
    calendar_feed_token: token,
  };

  let profileId: string | null = null;

  const { data: profile, error: profileError } = await admin.supabase
    .from("profiles")
    .insert(profilePayload)
    .select("id")
    .single();

  if (!profileError && profile?.id) {
    profileId = profile.id;
  } else if (profileError?.code === "23503") {
    // Compatibility fallback when profiles.id still references auth.users(id).
    const tempEmail = `${username}.${Date.now()}@planning.local`;
    const randomPassword = `${crypto.randomUUID()}${crypto.randomUUID()}`;
    const { data: authUser, error: authError } = await admin.supabase.auth.admin.createUser({
      email: tempEmail,
      password: randomPassword,
      email_confirm: true,
      user_metadata: { full_name: fullName, generated: true },
    });

    if (authError || !authUser.user?.id) {
      return redirectBack(request, "/admin?error=create_auth_user_failed");
    }

    const { data: profileWithId, error: profileWithIdError } = await admin.supabase
      .from("profiles")
      .insert({
        id: authUser.user.id,
        ...profilePayload,
      })
      .select("id")
      .single();

    if (profileWithIdError || !profileWithId?.id) {
      return redirectBack(request, "/admin?error=create_profile_failed");
    }
    profileId = profileWithId.id;
  }

  if (!profileId) {
    return redirectBack(request, "/admin?error=create_profile_failed");
  }

  const { error: userError } = await admin.supabase.rpc("create_app_user", {
    p_profile_id: profileId,
    p_username: username,
    p_password: password,
  });

  if (userError) {
    await admin.supabase.from("profiles").delete().eq("id", profileId);
    return redirectBack(request, "/admin?error=create_user_failed");
  }

  return redirectBack(request, "/admin?success=user_created");
}
