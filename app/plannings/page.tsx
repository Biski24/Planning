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
            <h1 className="text-3xl font-bold tracking-tight text-maif-text">Cycles de planning</h1>
            <p className="text-sm text-maif-muted">Cycle actif en premier, historique accessible par année.</p>
          </div>
          <form className="card p-2">
            <label className="mr-2 text-xs text-maif-muted">Année</label>
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
                    <p className="text-xs text-maif-muted">
                      {formatDate(cycle.start_date)} au {formatDate(cycle.end_date)}
                    </p>
                  </div>
                  {cycle.is_active && (
                    <span className="rounded-full border border-maif-primary bg-red-50 px-3 py-1 text-xs font-semibold text-maif-primary">
                      Actif
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {cycleWeeks.map((week) => (
                    <div
                      key={week.id}
                      className={`rounded-xl border p-4 transition ${cycle.is_active ? "border-maif-primary/50 bg-white" : "border-maif-border bg-white"} hover:shadow-sm`}
                    >
                      <p className="text-sm font-semibold text-maif-text">Semaine {week.iso_week_number}</p>
                      <p className="text-xs text-maif-muted">{cycle.year}</p>
                      <p className="mt-2 text-xs text-maif-muted">
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
