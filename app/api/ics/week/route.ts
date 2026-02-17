import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { addShiftEvents, createCalendar } from "@/lib/ics";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const week = Number(url.searchParams.get("week"));
  const year = Number(url.searchParams.get("year"));

  if (!token || !week || !year) {
    return NextResponse.json({ error: "token, week and year are required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("id, full_name")
    .eq("calendar_feed_token", token)
    .maybeSingle();

  if (!profile) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const { data: selectedWeek } = await admin
    .from("weeks")
    .select("id, iso_week_number, planning_cycles!inner(year)")
    .eq("iso_week_number", week)
    .eq("planning_cycles.year", year)
    .maybeSingle();

  if (!selectedWeek) {
    return NextResponse.json({ error: "Week not found" }, { status: 404 });
  }

  const { data: shifts, error } = await admin
    .from("shifts")
    .select("*")
    .eq("user_id", profile.id)
    .eq("week_id", selectedWeek.id)
    .order("start_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "Failed to load shifts" }, { status: 500 });
  }

  const calendar = createCalendar(`Planning S${week}`);
  addShiftEvents(calendar, shifts ?? []);

  return new NextResponse(calendar.toString(), {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="planning-${year}-S${week}.ics"`,
    },
  });
}
