import { addDays, endOfDay, formatISO, startOfDay } from "date-fns";
import { createAdminClient } from "@/lib/supabase-admin";
import { PlanningCycle, Profile, ShiftCategory, ShiftWithProfile, Week, WeekNeed } from "@/lib/types";

export async function getCycles() {
  const supabase = createAdminClient();
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

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("weeks")
    .select("*")
    .in("cycle_id", cycleIds)
    .order("start_date", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Week[];
}

export async function getWeekByIso(isoWeek: number, isoYear?: number) {
  const supabase = createAdminClient();
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
  const supabase = createAdminClient();

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

export async function getNeedsForWeek(weekId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("week_needs")
    .select("*")
    .eq("week_id", weekId)
    .order("start_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as WeekNeed[];
}

type SlotCoverage = {
  slotKey: string;
  start_at: string;
  end_at: string;
  byCategory: Record<ShiftCategory, { required: number; assigned: number }>;
};

export function buildCoverage(needs: WeekNeed[], shifts: ShiftWithProfile[]) {
  const slots = new Map<string, SlotCoverage>();

  const ensureSlot = (startAt: string, endAt: string) => {
    const key = `${startAt}|${endAt}`;
    if (!slots.has(key)) {
      slots.set(key, {
        slotKey: key,
        start_at: startAt,
        end_at: endAt,
        byCategory: {
          VISIT: { required: 0, assigned: 0 },
          CALL: { required: 0, assigned: 0 },
          LEAD: { required: 0, assigned: 0 },
          ADMIN: { required: 0, assigned: 0 },
          ABS: { required: 0, assigned: 0 },
          WFH: { required: 0, assigned: 0 },
        },
      });
    }
    return slots.get(key)!;
  };

  for (const need of needs) {
    const slot = ensureSlot(need.start_at, need.end_at);
    slot.byCategory[need.category].required += need.required_count;
  }

  for (const shift of shifts) {
    for (const slot of slots.values()) {
      const shiftStart = new Date(shift.start_at).getTime();
      const shiftEnd = new Date(shift.end_at).getTime();
      const slotStart = new Date(slot.start_at).getTime();
      const slotEnd = new Date(slot.end_at).getTime();
      const overlaps = shiftStart < slotEnd && shiftEnd > slotStart;
      if (overlaps) {
        slot.byCategory[shift.category].assigned += 1;
      }
    }
  }

  return Array.from(slots.values()).sort(
    (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
  );
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
