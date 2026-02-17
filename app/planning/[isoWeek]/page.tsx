import { notFound } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { PlanningWeekView } from "@/components/planning-week-view";
import { requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/date";
import { getShiftsForWeek, getWeekByIso } from "@/lib/planning";

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

  const shifts = await getShiftsForWeek({ weekId: week.id, profile });

  return (
    <div>
      <Navbar role={profile.role} />
      <main className="container-page space-y-4">
        <header>
          <h1 className="text-2xl font-bold">Semaine {week.iso_week_number}</h1>
          <p className="text-sm text-slate-400">
            {week.planning_cycles.year} | {formatDate(week.start_date)} - {formatDate(week.end_date)}
          </p>
        </header>
        <PlanningWeekView week={week} shifts={shifts} />
      </main>
    </div>
  );
}
