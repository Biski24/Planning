import { NextResponse } from "next/server";
import { addMonths } from "date-fns";
import { createAdminClient } from "@/lib/supabase-admin";
import { addShiftEvents, createCalendar } from "@/lib/ics";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
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

  const now = new Date();
  const from = addMonths(now, -6).toISOString();
  const to = addMonths(now, 6).toISOString();

  const { data: shifts, error } = await admin
    .from("shifts")
    .select("*")
    .eq("user_id", profile.id)
    .gte("start_at", from)
    .lte("end_at", to)
    .order("start_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "Failed to load shifts" }, { status: 500 });
  }

  const calendar = createCalendar(`Planning ${profile.full_name ?? "Employé"}`);
  addShiftEvents(calendar, shifts ?? []);

  return new NextResponse(calendar.toString(), {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Cache-Control": "private, max-age=300",
      "Content-Disposition": 'inline; filename="planning-feed.ics"',
    },
  });
}
