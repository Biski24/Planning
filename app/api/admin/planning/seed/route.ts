import { NextResponse } from "next/server";
import { getISOWeek, getISOWeekYear, startOfISOWeek } from "date-fns";
import { requireAdminApi } from "@/lib/api-auth";
import { generateFourWeeksFromMonday } from "@/lib/iso-week";

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

export async function POST() {
  const admin = await requireAdminApi();
  if (admin.error) return admin.error;

  const employeeRows = DEFAULT_EMPLOYEES.map((full_name) => ({
    full_name,
    type: full_name.startsWith("Alternant") ? "alternant" : "conseiller",
    is_active: true,
  }));

  await admin.supabase.from("employees").upsert(employeeRows, { onConflict: "full_name" });

  const { data: existingCycle } = await admin.supabase
    .from("planning_cycles")
    .select("id")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (!existingCycle) {
    const monday = startOfISOWeek(new Date());
    const year = getISOWeekYear(monday);
    const cycleNumber = Math.ceil(getISOWeek(monday) / 4);
    const fourWeeks = generateFourWeeksFromMonday(monday);

    const { data: cycle } = await admin.supabase
      .from("planning_cycles")
      .insert({
        year,
        cycle_number: cycleNumber,
        start_date: monday.toISOString().slice(0, 10),
        end_date: new Date(monday.getTime() + 27 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        is_active: true,
      })
      .select("id")
      .single();

    if (cycle?.id) {
      await admin.supabase.from("weeks").insert(
        fourWeeks.map((w) => ({
          cycle_id: cycle.id,
          iso_week_number: w.iso_week_number,
          start_date: w.start_date,
          end_date: w.end_date,
        }))
      );
    }
  }

  return NextResponse.json({ ok: true });
}
