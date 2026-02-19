import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { WeekSelector } from "@/components/planning/week-selector";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase-admin";
import { getNeedSlots, getWeekByIsoForEditor, getWeeksSummary } from "@/lib/planning-editor";
import { EmployeesPanel } from "./employees-panel";
import { CyclesPanel } from "./cycles-panel";
import { NeedsPanel } from "./needs-panel";
import { BootstrapPanel } from "./bootstrap-panel";

const TABS = ["employees", "cycles", "needs"] as const;

type Tab = (typeof TABS)[number];

export default async function AdminPlanningPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; week?: string; year?: string }>;
}) {
  const { profile } = await requireRole(["admin"]);
  const supabase = createAdminClient();
  const { tab, week, year } = await searchParams;
  const currentTab = (TABS.includes((tab as Tab) ?? "employees") ? tab : "employees") as Tab;

  const [employeesRes, cyclesRes, weeksSummary] = await Promise.all([
    supabase.from("employees").select("id, full_name, type, is_active").order("full_name", { ascending: true }),
    supabase.from("planning_cycles").select("*").order("year", { ascending: false }).order("cycle_number", { ascending: false }),
    getWeeksSummary(120),
  ]);

  const selectedWeek =
    currentTab === "needs"
      ? await getWeekByIsoForEditor(
          Number(week ?? weeksSummary[0]?.iso_week_number ?? 0),
          Number(year ?? weeksSummary[0]?.planning_cycles.year ?? 0)
        )
      : null;

  const needs = selectedWeek ? await getNeedSlots(selectedWeek.id) : [];

  return (
    <div>
      <Navbar role={profile.role} />
      <main className="container-page space-y-4">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Admin Planning</h1>
            <p className="text-sm text-maif-muted">Employés, cycles, besoins et édition hebdomadaire.</p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/planning?tab=employees" className={currentTab === "employees" ? "btn-primary" : "btn-secondary"}>
              Employés
            </Link>
            <Link href="/admin/planning?tab=cycles" className={currentTab === "cycles" ? "btn-primary" : "btn-secondary"}>
              Cycles 4 semaines
            </Link>
            <Link href="/admin/planning?tab=needs" className={currentTab === "needs" ? "btn-primary" : "btn-secondary"}>
              Besoins
            </Link>
          </div>
        </header>

        <BootstrapPanel />

        {currentTab === "employees" && <EmployeesPanel employees={(employeesRes.data ?? []) as any} />}
        {currentTab === "cycles" && <CyclesPanel cycles={(cyclesRes.data ?? []) as any} />}

        {currentTab === "needs" && (
          <section className="space-y-3">
            <WeekSelector
              weeks={weeksSummary.map((w) => ({ iso_week_number: w.iso_week_number, year: w.planning_cycles.year }))}
              selected={selectedWeek?.iso_week_number ?? 0}
              hrefBuilder={(iso, y) => `/admin/planning?tab=needs&week=${iso}&year=${y}`}
            />

            {selectedWeek ? (
              <>
                <div className="card p-3 text-sm text-maif-text">
                  S{selectedWeek.iso_week_number} ({selectedWeek.planning_cycles.year}) · {selectedWeek.start_date} → {selectedWeek.end_date}
                  <Link
                    href={`/admin/planning/${selectedWeek.iso_week_number}?year=${selectedWeek.planning_cycles.year}`}
                    className="btn-primary ml-3 px-3 py-1 text-xs"
                  >
                    Ouvrir planning editor
                  </Link>
                </div>
                <NeedsPanel weekId={selectedWeek.id} initialNeeds={needs as any} />
              </>
            ) : (
              <p className="text-sm text-maif-muted">Aucune semaine disponible. Crée un cycle d’abord.</p>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
