import { addDays, format, getISOWeek, getISOWeekYear, startOfISOWeek } from "date-fns";
import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/api-auth";

function getIsoYearMondays(year: number) {
  const mondays: Date[] = [];
  let monday = startOfISOWeek(new Date(Date.UTC(year, 0, 4)));
  while (getISOWeekYear(monday) === year) {
    mondays.push(monday);
    monday = addDays(monday, 7);
  }
  return mondays;
}

export async function POST(request: Request) {
  const admin = await requireAdminApi();
  if (admin.error) return admin.error;

  const form = await request.formData();
  const year = Number(form.get("year") ?? 2026);
  if (!year || year < 2000 || year > 2100) {
    return NextResponse.json({ error: "invalid_year" }, { status: 400 });
  }

  const mondays = getIsoYearMondays(year);
  if (mondays.length === 0) {
    return NextResponse.json({ error: "no_weeks_for_year" }, { status: 400 });
  }

  let cyclesCreated = 0;
  let weeksUpserted = 0;

  for (let i = 0; i < mondays.length; i += 4) {
    const cycleMondays = mondays.slice(i, i + 4);
    const cycleNumber = Math.floor(i / 4) + 1;
    const start = cycleMondays[0];
    const lastMonday = cycleMondays[cycleMondays.length - 1];
    const end = addDays(lastMonday, 6);

    const { data: cycle, error: cycleError } = await admin.supabase
      .from("planning_cycles")
      .upsert(
        {
          year,
          cycle_number: cycleNumber,
          start_date: format(start, "yyyy-MM-dd"),
          end_date: format(end, "yyyy-MM-dd"),
          is_active: false,
        },
        { onConflict: "year,cycle_number" }
      )
      .select("id")
      .single();

    if (cycleError || !cycle) {
      return NextResponse.json({ error: "cycle_upsert_failed" }, { status: 400 });
    }

    cyclesCreated += 1;

    const weekRows = cycleMondays.map((monday) => ({
      cycle_id: cycle.id,
      iso_week_number: getISOWeek(monday),
      start_date: format(monday, "yyyy-MM-dd"),
      end_date: format(addDays(monday, 6), "yyyy-MM-dd"),
    }));

    const { error: weeksError } = await admin.supabase
      .from("weeks")
      .upsert(weekRows, { onConflict: "cycle_id,iso_week_number" });

    if (weeksError) {
      return NextResponse.json({ error: "weeks_upsert_failed" }, { status: 400 });
    }

    weeksUpserted += weekRows.length;
  }

  return NextResponse.json({
    ok: true,
    year,
    cycles_created: cyclesCreated,
    weeks_upserted: weeksUpserted,
  });
}
