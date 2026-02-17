import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { requireUser } from "@/lib/auth";
import { getCycles, getWeeksByCycleIds } from "@/lib/planning";

export default async function MePage() {
  const { profile } = await requireUser();
  const cycles = await getCycles();
  const weeks = await getWeeksByCycleIds(cycles.map((c) => c.id));
  const activeWeeks = weeks.filter((w) => cycles.find((c) => c.id === w.cycle_id)?.is_active).slice(0, 4);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const feedUrl = `${appUrl}/api/ics/feed?token=${profile.calendar_feed_token}`;

  return (
    <div>
      <Navbar role={profile.role} />
      <main className="container-page space-y-6">
        <header>
          <h1 className="text-2xl font-bold">Mon profil</h1>
          <p className="text-sm text-slate-400">Exportez votre agenda personnel au format iCalendar.</p>
        </header>

        <section className="card p-4 text-sm">
          <p>
            <span className="text-slate-400">Nom:</span> {profile.full_name ?? "-"}
          </p>
          <p>
            <span className="text-slate-400">Rôle:</span> {profile.role}
          </p>
        </section>

        <section className="card p-4">
          <h2 className="mb-2 text-lg font-semibold">Abonnement agenda (.ics)</h2>
          <p className="mb-4 text-sm text-slate-400">
            URL privée à copier dans Google Calendar / Apple Calendar (abonnement):
          </p>
          <code className="block overflow-x-auto rounded-lg border border-slate-700 bg-slate-900/60 p-3 text-xs">
            {feedUrl}
          </code>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href={feedUrl} className="btn-primary">
              Télécharger mon feed
            </Link>
          </div>
        </section>

        <section className="card p-4">
          <h2 className="mb-2 text-lg font-semibold">Télécharger une semaine</h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {activeWeeks.map((week) => {
              const cycle = cycles.find((c) => c.id === week.cycle_id);
              return (
                <Link
                  key={week.id}
                  className="btn-secondary justify-start"
                  href={`/api/ics/week?week=${week.iso_week_number}&year=${cycle?.year}&token=${profile.calendar_feed_token}`}
                >
                  Semaine {week.iso_week_number} ({cycle?.year})
                </Link>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
