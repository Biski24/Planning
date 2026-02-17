import Link from "next/link";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { requireRole } from "@/lib/auth";
import { getAssignments, getEmployees, getWeekByIsoForEditor } from "@/lib/planning-editor";
import { AssignmentEditor } from "../assignment-editor";

export default async function AdminPlanningWeekPage({
  params,
  searchParams,
}: {
  params: Promise<{ isoWeek: string }>;
  searchParams: Promise<{ year?: string }>;
}) {
  const { profile } = await requireRole(["admin"]);
  const { isoWeek } = await params;
  const { year } = await searchParams;

  const week = await getWeekByIsoForEditor(Number(isoWeek), year ? Number(year) : undefined);
  if (!week) notFound();

  const [employees, assignments] = await Promise.all([getEmployees(true), getAssignments(week.id)]);

  return (
    <div>
      <Navbar role={profile.role} />
      <main className="container-page space-y-4">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Planning editor - S{week.iso_week_number}</h1>
            <p className="text-sm text-maif-muted">{week.planning_cycles.year} · {week.start_date} → {week.end_date}</p>
          </div>
          <Link href={`/admin/planning?tab=needs&week=${week.iso_week_number}&year=${week.planning_cycles.year}`} className="btn-secondary">
            Retour besoins
          </Link>
        </header>

        <AssignmentEditor
          weekId={week.id}
          employees={employees.filter((e) => e.is_active).map((e) => ({ id: e.id, full_name: e.full_name }))}
          initialAssignments={assignments as any}
        />
      </main>
    </div>
  );
}
