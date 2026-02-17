import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/date";
import { getCycles, getWeeksByCycleIds } from "@/lib/planning";

export default async function PlanningsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const { profile } = await requireUser();
  const { year } = await searchParams;

  const cycles = await getCycles();
  const cycleIds = cycles.map((c) => c.id);
  const weeks = await getWeeksByCycleIds(cycleIds);
  const years = Array.from(new Set(cycles.map((c) => c.year))).sort((a, b) => b - a);

  const filteredCycles = year
    ? cycles.filter((cycle) => cycle.year === Number(year))
    : cycles;

  return (
    <div>
      <Navbar role={profile.role} />
      <main className="container-page space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Cycles de planning</h1>
            <p className="text-sm text-slate-400">Cycle actif en premier, historique accessible par année.</p>
          </div>
          <form className="card p-2">
            <label className="mr-2 text-xs text-slate-400">Année</label>
            <select className="input inline-block w-auto" name="year" defaultValue={year ?? ""}>
              <option value="">Toutes</option>
              {years.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
            <button className="btn-primary ml-2" type="submit">
              Filtrer
            </button>
          </form>
        </header>

        <section className="space-y-4">
          {filteredCycles.map((cycle) => {
            const cycleWeeks = weeks.filter((week) => week.cycle_id === cycle.id);
            return (
              <article key={cycle.id} className="card p-4">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-semibold">
                      {cycle.year} - Cycle {cycle.cycle_number}
                    </h2>
                    <p className="text-xs text-slate-400">
                      {formatDate(cycle.start_date)} au {formatDate(cycle.end_date)}
                    </p>
                  </div>
                  {cycle.is_active && (
                    <span className="rounded-full border border-electric bg-electric/20 px-3 py-1 text-xs text-electricSoft">
                      Actif
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {cycleWeeks.map((week) => (
                    <div
                      key={week.id}
                      className="rounded-lg border border-slate-700 bg-slate-900/60 p-4 transition hover:border-electric"
                    >
                      <p className="text-sm font-semibold">Semaine {week.iso_week_number}</p>
                      <p className="text-xs text-slate-400">{cycle.year}</p>
                      <p className="mt-2 text-xs text-slate-500">
                        {formatDate(week.start_date)} - {formatDate(week.end_date)}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Link
                          href={`/planning/${week.iso_week_number}?year=${cycle.year}`}
                          className="btn-secondary px-3 py-1 text-xs"
                        >
                          Planning
                        </Link>
                        {(profile.role === "admin" || profile.role === "manager") && (
                          <Link
                            href={`/manager/${week.iso_week_number}?year=${cycle.year}`}
                            className="btn-primary px-3 py-1 text-xs"
                          >
                            Vue manager
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            );
          })}
        </section>
      </main>
    </div>
  );
}
