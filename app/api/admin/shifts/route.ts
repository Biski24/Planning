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
    const shiftId = String(form.get("shift_id") ?? "");
    if (!shiftId) return redirectBack(request, "/admin?error=missing_shift_id");
    await admin.supabase.from("shifts").delete().eq("id", shiftId);
    return redirectBack(request, "/admin?success=shift_deleted");
  }

  if (action === "update") {
    const shiftId = String(form.get("shift_id") ?? "");
    if (!shiftId) return redirectBack(request, "/admin?error=missing_shift_id");

    await admin.supabase
      .from("shifts")
      .update({
        category: String(form.get("category")),
        start_at: toIsoFromLocal(String(form.get("start_at"))),
        end_at: toIsoFromLocal(String(form.get("end_at"))),
        location: String(form.get("location") || "") || null,
        notes: String(form.get("notes") || "") || null,
      })
      .eq("id", shiftId);

    return redirectBack(request, "/admin?success=shift_updated");
  }

  const payload = {
    user_id: String(form.get("user_id")),
    week_id: String(form.get("week_id")),
    category: String(form.get("category")),
    start_at: toIsoFromLocal(String(form.get("start_at"))),
    end_at: toIsoFromLocal(String(form.get("end_at"))),
    location: String(form.get("location") || "") || null,
    notes: String(form.get("notes") || "") || null,
  };

  const { error } = await admin.supabase.from("shifts").insert(payload);

  if (error) return redirectBack(request, "/admin?error=create_shift_failed");

  return redirectBack(request, "/admin?success=shift_created");
}
