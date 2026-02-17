import Link from "next/link";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { ManagerCoverageView } from "@/components/manager-coverage-view";
import { requireRole } from "@/lib/auth";
import { formatDate } from "@/lib/date";
import { buildCoverage, getNeedsForWeek, getShiftsForWeek, getWeekByIso } from "@/lib/planning";

export default async function ManagerWeekPage({
  params,
  searchParams,
}: {
  params: Promise<{ isoWeek: string }>;
  searchParams: Promise<{ year?: string }>;
}) {
  const { profile } = await requireRole(["admin", "manager"]);
  const { isoWeek } = await params;
  const { year } = await searchParams;

  const week = await getWeekByIso(Number(isoWeek), year ? Number(year) : undefined);
  if (!week) notFound();

  const [needs, shifts] = await Promise.all([
    getNeedsForWeek(week.id),
    getShiftsForWeek({ weekId: week.id, profile }),
  ]);

  const coverage = buildCoverage(needs, shifts);

  return (
    <div>
      <Navbar role={profile.role} />
      <main className="container-page space-y-4">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Vue Manager - Semaine {week.iso_week_number}</h1>
            <p className="text-sm text-maif-muted">
              {week.planning_cycles.year} | {formatDate(week.start_date)} - {formatDate(week.end_date)}
            </p>
          </div>
          <Link href={`/planning/${week.iso_week_number}?year=${week.planning_cycles.year}`} className="btn-secondary">
            Voir planning détaillé
          </Link>
        </header>

        <section className="card p-4">
          <h2 className="mb-3 text-lg font-semibold">Couverture des besoins par créneau</h2>
          <ManagerCoverageView rows={coverage} />
        </section>
      </main>
    </div>
  );
}
