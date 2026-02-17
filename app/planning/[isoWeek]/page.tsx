import { notFound } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/date";
import { getShiftsForWeek, getWeekByIso } from "@/lib/planning";
import { CATEGORY_LABELS, dayLabels, getAssignments, getCoverage, getEmployees, getNeedSlots, generateHalfHourSlots } from "@/lib/planning-editor";

export default async function PlanningWeekPage({
  params,
  searchParams,
}: {
  params: Promise<{ isoWeek: string }>;
  searchParams: Promise<{ year?: string }>;
}) {
  const { profile } = await requireUser();
  const { isoWeek } = await params;
  const { year } = await searchParams;

  const week = await getWeekByIso(Number(isoWeek), year ? Number(year) : undefined);
  if (!week) notFound();

  const [assignments, employees, needs, legacyShifts] = await Promise.all([
    getAssignments(week.id),
    getEmployees(true),
    getNeedSlots(week.id),
    getShiftsForWeek({ weekId: week.id, profile }),
  ]);

  const linkedEmployeeId =
    profile.employee_id ??
    employees.find((e) => e.full_name.toLowerCase() === (profile.full_name ?? "").toLowerCase())?.id ??
    null;

  const filteredAssignments =
    profile.role === "admin" || profile.role === "manager"
      ? assignments
      : assignments.filter((a) => a.employee_id === linkedEmployeeId);

  const slots = generateHalfHourSlots();
  const days = dayLabels();

  return (
    <div>
      <Navbar role={profile.role} />
      <main className="container-page space-y-4">
        <header>
          <h1 className="text-3xl font-bold tracking-tight">Semaine {week.iso_week_number}</h1>
          <p className="text-sm text-maif-muted">
            {week.planning_cycles.year} | {formatDate(week.start_date)} - {formatDate(week.end_date)}
          </p>
        </header>

        <section className="card p-4">
          <h2 className="mb-2 text-lg font-semibold">Affectations planning</h2>
          {filteredAssignments.length === 0 ? (
            <p className="text-sm text-maif-muted">
              Aucune affectation (nouveau module). Affichage legacy: {legacyShifts.length} shift(s).
            </p>
          ) : (
            <div className="space-y-3">
              {days.map((day) => {
                const dayAssignments = filteredAssignments.filter((a) => a.day_of_week === day.day);
                return (
                  <div key={day.day} className="rounded-xl border border-maif-border bg-maif-surfaceAlt/50 p-3">
                    <h3 className="mb-2 text-sm font-semibold text-maif-primary">{day.label}</h3>
                    {dayAssignments.length === 0 ? (
                      <p className="text-xs text-maif-muted">Aucune affectation.</p>
                    ) : (
                      <ul className="space-y-1 text-sm">
                        {dayAssignments.map((assignment) => (
                          <li key={assignment.id}>
                            {assignment.start_time.slice(0, 5)}-{assignment.end_time.slice(0, 5)} ·{" "}
                            {CATEGORY_LABELS[assignment.category]} ·{" "}
                            {(assignment.employees as { full_name?: string } | null)?.full_name ?? "Employé"}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {(profile.role === "admin" || profile.role === "manager") && (
          <section className="card p-4">
            <h2 className="mb-2 text-lg font-semibold">Besoins vs couverture (extrait)</h2>
            <div className="table-shell">
              <table className="table-base text-xs">
                <thead className="sticky top-0 bg-white">
                  <tr>
                    <th className="px-2 py-1">Jour</th>
                    <th className="px-2 py-1">Créneau</th>
                    <th className="px-2 py-1">CALL</th>
                    <th className="px-2 py-1">RDV</th>
                    <th className="px-2 py-1">VISIT</th>
                    <th className="px-2 py-1">LEAD</th>
                  </tr>
                </thead>
                <tbody>
                  {days.slice(0, 6).flatMap((day) =>
                    slots.slice(0, 8).map((slot) => {
                      const call = getCoverage(day.day, slot.start, "CALL", needs as any, assignments as any);
                      const rdv = getCoverage(day.day, slot.start, "RDV", needs as any, assignments as any);
                      const visit = getCoverage(day.day, slot.start, "VISIT", needs as any, assignments as any);
                      const lead = getCoverage(day.day, slot.start, "LEAD", needs as any, assignments as any);
                      return (
                        <tr key={`${day.day}-${slot.start}`}>
                          <td className="px-2 py-1">{day.label}</td>
                          <td className="px-2 py-1">{slot.start}</td>
                          <td className="px-2 py-1">{call.coverage}/{call.required} <span className={call.diff < 0 ? "text-maif-primary font-semibold" : "text-maif-muted"}>({call.diff})</span></td>
                          <td className="px-2 py-1">{rdv.coverage}/{rdv.required} <span className={rdv.diff < 0 ? "text-maif-primary font-semibold" : "text-maif-muted"}>({rdv.diff})</span></td>
                          <td className="px-2 py-1">{visit.coverage}/{visit.required} <span className={visit.diff < 0 ? "text-maif-primary font-semibold" : "text-maif-muted"}>({visit.diff})</span></td>
                          <td className="px-2 py-1">{lead.coverage}/{lead.required} <span className={lead.diff < 0 ? "text-maif-primary font-semibold" : "text-maif-muted"}>({lead.diff})</span></td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
