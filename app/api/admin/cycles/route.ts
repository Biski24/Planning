import { addDays, endOfDay, getDay } from "date-fns";
import { generateFourWeeksFromMonday, getMonday } from "@/lib/iso-week";
import { requireAdminApi, redirectBack } from "@/lib/api-auth";

export async function POST(request: Request) {
  const admin = await requireAdminApi();
  if (admin.error) return admin.error;

  const form = await request.formData();
  const year = Number(form.get("year"));
  const cycleNumber = Number(form.get("cycle_number"));
  const startDate = String(form.get("start_date"));
  const isActive = String(form.get("is_active")) === "true";

  if (!year || !cycleNumber || !startDate) {
    return redirectBack(request, "/admin?error=missing_fields");
  }

  const monday = getMonday(new Date(startDate));
  if (getDay(new Date(startDate)) !== 1) {
    return redirectBack(request, "/admin?error=start_date_must_be_monday");
  }

  const fourWeeks = generateFourWeeksFromMonday(monday);
  const endDate = endOfDay(addDays(monday, 27)).toISOString().slice(0, 10);

  if (isActive) {
    await admin.supabase.from("planning_cycles").update({ is_active: false }).eq("is_active", true);
  }

  const { data: cycle, error } = await admin.supabase
    .from("planning_cycles")
    .insert({
      year,
      cycle_number: cycleNumber,
      start_date: monday.toISOString().slice(0, 10),
      end_date: endDate,
      is_active: isActive,
    })
    .select("id")
    .single();

  if (error || !cycle) {
    return redirectBack(request, "/admin?error=create_cycle_failed");
  }

  const weeksToInsert = fourWeeks.map((week) => ({
    cycle_id: cycle.id,
    iso_week_number: week.iso_week_number,
    start_date: week.start_date,
    end_date: week.end_date,
  }));

  const { error: weekError } = await admin.supabase.from("weeks").insert(weeksToInsert);

  if (weekError) {
    return redirectBack(request, "/admin?error=create_weeks_failed");
  }

  return redirectBack(request, "/admin?success=cycle_created");
}
