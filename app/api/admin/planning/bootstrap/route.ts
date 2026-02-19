import { addDays, format, getISOWeek, getISOWeekYear, startOfISOWeek } from "date-fns";
import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/api-auth";
import { generateHalfHourSlots } from "@/lib/planning-editor";

const DEFAULT_EMPLOYEES = [
  "Stéphanie",
  "Sophie",
  "Fahima",
  "Elodie",
  "Nathalie",
  "Amandine",
  "Bastien",
  "Rémi",
  "Argjenta",
  "Myriam",
  "Conseiller 11",
  "Conseiller 12",
  "Conseiller 13",
  "Conseiller 14",
  "Conseiller 15",
  "Conseiller 16",
  "Alternant 1",
  "Alternant 2",
  "Alternant 3",
];

function buildWeekRows(cycleId: string, monday: Date) {
  return [0, 1, 2, 3].map((offset) => {
    const start = addDays(monday, offset * 7);
    return {
      cycle_id: cycleId,
      iso_week_number: getISOWeek(start),
      start_date: format(start, "yyyy-MM-dd"),
      end_date: format(addDays(start, 6), "yyyy-MM-dd"),
    };
  });
}

function buildDefaultNeeds(weekId: string) {
  const slots = generateHalfHourSlots("08:00", "19:30");
  const rows: Array<{
    week_id: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
    category: string;
    required_count: number;
  }> = [];

  for (let day = 1; day <= 6; day += 1) {
    for (const slot of slots) {
      const hour = Number(slot.start.slice(0, 2));
      const minute = Number(slot.start.slice(3, 5));
      const hourValue = hour + minute / 60;

      rows.push({
        week_id: weekId,
        day_of_week: day,
        start_time: slot.start,
        end_time: slot.end,
        category: "CALL",
        required_count: hourValue >= 8 && hourValue < 12 ? 2 : 1,
      });
      rows.push({
        week_id: weekId,
        day_of_week: day,
        start_time: slot.start,
        end_time: slot.end,
        category: "RDV",
        required_count: hourValue >= 13.5 && hourValue < 17 ? 1 : 0,
      });
      rows.push({
        week_id: weekId,
        day_of_week: day,
        start_time: slot.start,
        end_time: slot.end,
        category: "VISIT",
        required_count: hourValue >= 10 && hourValue < 12 ? 1 : 0,
      });
      rows.push({
        week_id: weekId,
        day_of_week: day,
        start_time: slot.start,
        end_time: slot.end,
        category: "LEAD",
        required_count: hourValue >= 14 && hourValue < 16 ? 1 : 0,
      });
    }
  }

  return rows;
}

export async function POST() {
  const admin = await requireAdminApi();
  if (admin.error) return admin.error;

  const employeeRows = DEFAULT_EMPLOYEES.map((full_name) => ({
    full_name,
    type: full_name.startsWith("Alternant") ? "alternant" : "conseiller",
    is_active: true,
  }));
  const { error: employeesError } = await admin.supabase.from("employees").upsert(employeeRows, { onConflict: "full_name" });
  if (employeesError) return NextResponse.json({ error: "employees_failed" }, { status: 400 });

  const { data: activeCycle } = await admin.supabase
    .from("planning_cycles")
    .select("id, start_date")
    .eq("is_active", true)
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  let cycleId = activeCycle?.id ?? null;
  let monday = activeCycle ? startOfISOWeek(new Date(activeCycle.start_date)) : startOfISOWeek(new Date());

  if (!cycleId) {
    const year = getISOWeekYear(monday);
    const cycleNumber = Math.ceil(getISOWeek(monday) / 4);

    const { data: cycle, error: cycleError } = await admin.supabase
      .from("planning_cycles")
      .upsert(
        {
          year,
          cycle_number: cycleNumber,
          start_date: format(monday, "yyyy-MM-dd"),
          end_date: format(addDays(monday, 27), "yyyy-MM-dd"),
          is_active: true,
        },
        { onConflict: "year,cycle_number" }
      )
      .select("id")
      .single();

    if (cycleError || !cycle) return NextResponse.json({ error: "cycle_failed" }, { status: 400 });
    cycleId = cycle.id;
  }

  const weeksToUpsert = buildWeekRows(cycleId, monday);
  const { error: weeksError } = await admin.supabase.from("weeks").upsert(weeksToUpsert, { onConflict: "cycle_id,iso_week_number" });
  if (weeksError) return NextResponse.json({ error: "weeks_failed" }, { status: 400 });

  const { data: weeks, error: weeksReadError } = await admin.supabase
    .from("weeks")
    .select("id")
    .eq("cycle_id", cycleId);
  if (weeksReadError || !weeks) return NextResponse.json({ error: "weeks_read_failed" }, { status: 400 });

  let totalNeeds = 0;
  for (const week of weeks) {
    const rows = buildDefaultNeeds(week.id);
    totalNeeds += rows.length;
    const { error: needError } = await admin.supabase
      .from("need_slots")
      .upsert(rows, { onConflict: "week_id,day_of_week,start_time,category" });
    if (needError) return NextResponse.json({ error: "needs_failed" }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    employees: employeeRows.length,
    weeks: weeks.length,
    needs: totalNeeds,
  });
}
