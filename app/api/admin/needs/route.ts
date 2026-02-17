import { requireAdminApi, redirectBack } from "@/lib/api-auth";

function toIsoFromLocal(localDateTime: string) {
  return new Date(localDateTime).toISOString();
}

export async function POST(request: Request) {
  const admin = await requireAdminApi();
  if (admin.error) return admin.error;

  const form = await request.formData();
  const action = String(form.get("action") ?? "create");

  if (action === "delete") {
    const needId = String(form.get("need_id") ?? "");
    if (!needId) return redirectBack(request, "/admin?error=missing_need_id");
    await admin.supabase.from("week_needs").delete().eq("id", needId);
    return redirectBack(request, "/admin?success=need_deleted");
  }

  const weekId = String(form.get("week_id") ?? "");
  const startAt = String(form.get("start_at") ?? "");
  const endAt = String(form.get("end_at") ?? "");
  const category = String(form.get("category") ?? "");
  const requiredCount = Number(form.get("required_count") ?? 0);
  const comment = String(form.get("comment") ?? "").trim() || null;

  if (!weekId || !startAt || !endAt || !category || Number.isNaN(requiredCount)) {
    return redirectBack(request, "/admin?error=need_missing_fields");
  }

  const { error } = await admin.supabase.from("week_needs").insert({
    week_id: weekId,
    start_at: toIsoFromLocal(startAt),
    end_at: toIsoFromLocal(endAt),
    category,
    required_count: requiredCount,
    comment,
  });

  if (error) return redirectBack(request, "/admin?error=create_need_failed");

  return redirectBack(request, "/admin?success=need_created");
}
