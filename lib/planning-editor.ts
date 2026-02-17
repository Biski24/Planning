import { addDays, format } from "date-fns";
import { createAdminClient } from "@/lib/supabase-admin";

export const PLANNING_CATEGORIES = [
  "VISIT",
  "CALL",
  "RDV",
  "LEAD",
  "ASYNC",
  "MEETING",
  "TRAINING",
  "WFH",
  "ABS",
] as const;

export type PlanningCategory = (typeof PLANNING_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<PlanningCategory, string> = {
  VISIT: "Visites",
  CALL: "Téléphone",
  RDV: "Rendez-vous",
  LEAD: "Leads",
  ASYNC: "Flux async.",
  MEETING: "Réunion",
  TRAINING: "Formation",
  WFH: "Télétravail",
  ABS: "Absence",
};

export type Employee = {
  id: string;
  full_name: string;
  type: "conseiller" | "alternant" | "accueil";
  team_id: string | null;
  is_active: boolean;
};

export type NeedSlot = {
  id: string;
  week_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  category: PlanningCategory;
  required_count: number;
};

export type Assignment = {
  id: string;
  week_id: string;
  employee_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  category: PlanningCategory;
  notes: string | null;
};

export function generateHalfHourSlots(start = "08:00", end = "19:30") {
  const slots: Array<{ start: string; end: string }> = [];
  const [startH, startM] = start.split(":").map(Number);
  const [endH, endM] = end.split(":").map(Number);
  let current = startH * 60 + startM;
  const max = endH * 60 + endM;

  while (current < max) {
    const next = current + 30;
    const toHHMM = (minutes: number) => {
      const h = String(Math.floor(minutes / 60)).padStart(2, "0");
      const m = String(minutes % 60).padStart(2, "0");
      return `${h}:${m}`;
    };
    slots.push({ start: toHHMM(current), end: toHHMM(next) });
    current = next;
  }

  return slots;
}

export function dayLabels() {
  return [
    { day: 1, label: "Lundi" },
    { day: 2, label: "Mardi" },
    { day: 3, label: "Mercredi" },
    { day: 4, label: "Jeudi" },
    { day: 5, label: "Vendredi" },
    { day: 6, label: "Samedi" },
  ];
}

export async function getEmployees(includeInactive = false) {
  const supabase = createAdminClient();
  let query = supabase.from("employees").select("*").order("full_name", { ascending: true });
  if (!includeInactive) query = query.eq("is_active", true);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Employee[];
}

export async function getWeekByIsoForEditor(isoWeek: number, year?: number) {
  const supabase = createAdminClient();
  let query = supabase
    .from("weeks")
    .select("id, iso_week_number, start_date, end_date, planning_cycles!inner(year, cycle_number, is_active)")
    .eq("iso_week_number", isoWeek)
    .order("start_date", { ascending: false })
    .limit(1);

  if (year) query = query.eq("planning_cycles.year", year);
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  const row = data as any;
  if (!row) return null;
  const cycle = Array.isArray(row.planning_cycles) ? row.planning_cycles[0] : row.planning_cycles;
  return {
    id: row.id as string,
    iso_week_number: row.iso_week_number as number,
    start_date: row.start_date as string,
    end_date: row.end_date as string,
    planning_cycles: {
      year: cycle.year as number,
      cycle_number: cycle.cycle_number as number,
      is_active: cycle.is_active as boolean,
    },
  };
}

export async function getNeedSlots(weekId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("need_slots")
    .select("*")
    .eq("week_id", weekId)
    .order("day_of_week", { ascending: true })
    .order("start_time", { ascending: true });
  if (error) throw error;
  return (data ?? []) as NeedSlot[];
}

export async function getAssignments(weekId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("assignments")
    .select("*, employees:employee_id(id, full_name, is_active)")
    .eq("week_id", weekId)
    .order("day_of_week", { ascending: true })
    .order("start_time", { ascending: true });
  if (error) throw error;
  const rows = (data ?? []) as any[];
  return rows.map((row) => ({
    ...row,
    employees: Array.isArray(row.employees) ? row.employees[0] : row.employees,
  })) as Array<Assignment & { employees?: { full_name?: string } | null }>;
}

export async function getWeeksSummary(limit = 24) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("weeks")
    .select("id, iso_week_number, start_date, planning_cycles!inner(year, is_active)")
    .order("start_date", { ascending: false })
    .limit(limit);
  if (error) throw error;
  const rows = (data ?? []) as any[];
  return rows.map((row) => ({
    id: row.id,
    iso_week_number: row.iso_week_number,
    start_date: row.start_date,
    planning_cycles: Array.isArray(row.planning_cycles) ? row.planning_cycles[0] : row.planning_cycles,
  })) as Array<{
    id: string;
    iso_week_number: number;
    start_date: string;
    planning_cycles: { year: number; is_active: boolean };
  }>;
}

export function getCoverage(
  day: number,
  startTime: string,
  category: PlanningCategory,
  needs: NeedSlot[],
  assignments: Assignment[]
) {
  const required = needs
    .filter((n) => n.day_of_week === day && n.start_time.slice(0, 5) === startTime && n.category === category)
    .reduce((acc, n) => acc + n.required_count, 0);

  const coverage = assignments.filter(
    (a) => a.day_of_week === day && a.start_time.slice(0, 5) === startTime && a.category === category
  ).length;

  return { required, coverage, diff: coverage - required };
}

export function isoDayDate(weekStartDate: string, dayOfWeek: number) {
  const monday = new Date(`${weekStartDate}T00:00:00`);
  const date = addDays(monday, dayOfWeek - 1);
  return format(date, "yyyy-MM-dd");
}
