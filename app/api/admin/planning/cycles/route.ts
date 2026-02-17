import { addDays, endOfDay } from "date-fns";
import { NextResponse } from "next/server";
import { generateFourWeeksFromMonday, getMonday } from "@/lib/iso-week";
import { requireAdminApi } from "@/lib/api-auth";

export async function POST(request: Request) {
  const admin = await requireAdminApi();
  if (admin.error) return admin.error;

  const form = await request.formData();
  const year = Number(form.get("year"));
  const cycleNumber = Number(form.get("cycle_number"));
  const startDate = String(form.get("start_date") ?? "");
  const isActive = String(form.get("is_active") ?? "") === "true";

  if (!year || !cycleNumber || !startDate) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const monday = getMonday(new Date(startDate));
  const fourWeeks = generateFourWeeksFromMonday(monday);
  const endDate = endOfDay(addDays(monday, 27)).toISOString().slice(0, 10);

  if (isActive) {
    await admin.supabase.from("planning_cycles").update({ is_active: false }).eq("is_active", true);
  }

  const { data: cycle, error } = await admin.supabase
    .from("planning_cycles")
    .upsert(
      {
        year,
        cycle_number: cycleNumber,
        start_date: monday.toISOString().slice(0, 10),
        end_date: endDate,
        is_active: isActive,
      },
      { onConflict: "year,cycle_number" }
    )
    .select("id")
    .single();

  if (error || !cycle) return NextResponse.json({ error: "create_cycle_failed" }, { status: 400 });

  const weeksToUpsert = fourWeeks.map((week) => ({
    cycle_id: cycle.id,
    iso_week_number: week.iso_week_number,
    start_date: week.start_date,
    end_date: week.end_date,
  }));

  const { error: weekError } = await admin.supabase
    .from("weeks")
    .upsert(weeksToUpsert, { onConflict: "cycle_id,iso_week_number" });

  if (weekError) return NextResponse.json({ error: "create_weeks_failed" }, { status: 400 });
  return NextResponse.json({ ok: true });
}
