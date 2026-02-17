import { requireAdminApi, redirectBack } from "@/lib/api-auth";

function combineDateAndTime(dateValue: string, timeValue: string) {
  return new Date(`${dateValue}T${timeValue}:00`).toISOString();
}

export async function POST(request: Request) {
  const admin = await requireAdminApi();
  if (admin.error) return admin.error;

  const form = await request.formData();
  const weekId = String(form.get("week_id") ?? "");
  const userId = String(form.get("user_id") ?? "");
  const category = String(form.get("category") ?? "");
  const startTime = String(form.get("start_time") ?? "");
  const endTime = String(form.get("end_time") ?? "");
  const location = String(form.get("location") ?? "").trim() || null;
  const notes = String(form.get("notes") ?? "").trim() || null;

  const selectedDays = [0, 1, 2, 3, 4, 5, 6]
    .map((idx) => ({ idx, checked: form.get(`day_${idx}`) === "on" }))
    .filter((d) => d.checked)
    .map((d) => d.idx);

  if (!weekId || !userId || !category || !startTime || !endTime || selectedDays.length === 0) {
    return redirectBack(request, "/admin?error=bulk_missing_fields");
  }

  const { data: week, error: weekError } = await admin.supabase
    .from("weeks")
    .select("id, start_date")
    .eq("id", weekId)
    .maybeSingle();

  if (weekError || !week) {
    return redirectBack(request, "/admin?error=week_not_found");
  }

  const monday = new Date(week.start_date);
  const shifts = selectedDays.map((dayOffset) => {
    const date = new Date(monday);
    date.setDate(date.getDate() + dayOffset);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    const dateValue = `${y}-${m}-${d}`;

    return {
      user_id: userId,
      week_id: weekId,
      category,
      start_at: combineDateAndTime(dateValue, startTime),
      end_at: combineDateAndTime(dateValue, endTime),
      location,
      notes,
    };
  });

  const { error } = await admin.supabase.from("shifts").insert(shifts);
  if (error) return redirectBack(request, "/admin?error=bulk_create_failed");

  return redirectBack(request, "/admin?success=bulk_created");
}
