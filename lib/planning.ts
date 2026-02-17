import { addDays, endOfDay, formatISO, startOfDay } from "date-fns";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { PlanningCycle, Profile, ShiftWithProfile, Week } from "@/lib/types";

export async function getCycles() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("planning_cycles")
    .select("*")
    .order("is_active", { ascending: false })
    .order("year", { ascending: false })
    .order("cycle_number", { ascending: false });

  if (error) throw error;
  return (data ?? []) as PlanningCycle[];
}

export async function getWeeksByCycleIds(cycleIds: string[]) {
  if (!cycleIds.length) return [] as Week[];

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("weeks")
    .select("*")
    .in("cycle_id", cycleIds)
    .order("start_date", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Week[];
}

export async function getWeekByIso(isoWeek: number, isoYear?: number) {
  const supabase = await createServerSupabaseClient();
  let query = supabase.from("weeks").select("*, planning_cycles!inner(year, is_active)").eq("iso_week_number", isoWeek);
  if (isoYear) {
    query = query.eq("planning_cycles.year", isoYear);
  }

  const { data, error } = await query.order("start_date", { ascending: false }).limit(1).maybeSingle();
  if (error) throw error;
  return data as (Week & { planning_cycles: Pick<PlanningCycle, "year" | "is_active"> }) | null;
}

export async function getShiftsForWeek(options: {
  weekId: string;
  profile: Profile;
}) {
  const { weekId, profile } = options;
  const supabase = await createServerSupabaseClient();

  let query = supabase
    .from("shifts")
    .select("*, profiles:user_id(id, full_name, team_id)")
    .eq("week_id", weekId)
    .order("start_at", { ascending: true });

  if (profile.role === "employee") {
    query = query.eq("user_id", profile.id);
  } else if (profile.role === "manager") {
    query = query.eq("profiles.team_id", profile.team_id ?? "");
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as ShiftWithProfile[];
}

export function groupShiftsByDay(shifts: ShiftWithProfile[]) {
  const grouped = new Map<string, ShiftWithProfile[]>();

  for (const shift of shifts) {
    const key = formatISO(new Date(shift.start_at), { representation: "date" });
    const current = grouped.get(key) ?? [];
    current.push(shift);
    grouped.set(key, current);
  }

  return grouped;
}

export function weekDateRange(week: Week) {
  return {
    from: startOfDay(new Date(week.start_date)),
    to: endOfDay(new Date(week.end_date)),
  };
}

export function buildWeekDays(week: Week) {
  const start = new Date(week.start_date);
  return Array.from({ length: 7 }).map((_, index) => {
    const date = addDays(start, index);
    return {
      key: formatISO(date, { representation: "date" }),
      date,
    };
  });
}
