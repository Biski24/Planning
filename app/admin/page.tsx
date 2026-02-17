import { Navbar } from "@/components/navbar";
import { requireRole } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase-server";

type YearRel = { year: number } | { year: number }[] | null;
type NameRel = { full_name: string | null } | { full_name: string | null }[] | null;
type WeekRel = { iso_week_number: number } | { iso_week_number: number }[] | null;

type WeekRow = {
  id: string;
  iso_week_number: number;
  start_date: string;
  planning_cycles: YearRel;
};

type ShiftRow = {
  id: string;
  category: string;
  profiles: NameRel;
  weeks: WeekRel;
};

function getYear(value: YearRel): number | undefined {
  if (!value) return undefined;
  return Array.isArray(value) ? value[0]?.year : value.year;
}

function getName(value: NameRel): string | null | undefined {
  if (!value) return undefined;
  return Array.isArray(value) ? value[0]?.full_name : value.full_name;
}

function getIsoWeek(value: WeekRel): number | undefined {
  if (!value) return undefined;
  return Array.isArray(value) ? value[0]?.iso_week_number : value.iso_week_number;
}

export default async function AdminPage() {
  const { profile } = await requireRole(["admin"]);
  const supabase = await createServerSupabaseClient();

  const [{ data: teams }, { data: users }, { data: weeks }, { data: shifts }] = await Promise.all([
    supabase.from("teams").select("*").order("name", { ascending: true }),
    supabase.from("profiles").select("id, full_name, team_id").order("full_name", { ascending: true }),
    supabase
      .from("weeks")
      .select("id, iso_week_number, start_date, planning_cycles!inner(year)")
      .order("start_date", { ascending: false })
      .limit(30),
    supabase
      .from("shifts")
      .select("id, category, start_at, end_at, profiles:user_id(full_name), weeks!inner(iso_week_number)")
      .order("start_at", { ascending: false })
      .limit(20),
  ]);

  const safeWeeks = (weeks ?? []) as WeekRow[];
  const safeShifts = (shifts ?? []) as ShiftRow[];

  const normalizedWeeks = safeWeeks.map((week) => ({
    ...week,
    cycleYear: getYear(week.planning_cycles),
  }));

  const normalizedShifts = safeShifts.map((shift) => ({
    ...shift,
    profileName: getName(shift.profiles),
    isoWeek: getIsoWeek(shift.weeks),
  }));

  return (
    <div>
      <Navbar role={profile.role} />
      <main className="container-page space-y-6">
        <header>
          <h1 className="text-2xl font-bold">Admin</h1>
          <p className="text-sm text-slate-400">Gestion des cycles et des shifts.</p>
        </header>

        <section className="card p-4">
          <h2 className="mb-3 text-lg font-semibold">Créer un cycle (4 semaines)</h2>
          <form action="/api/admin/cycles" method="post" className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div>
              <label className="label" htmlFor="year">
                Année
              </label>
              <input className="input" id="year" name="year" type="number" required />
            </div>
            <div>
              <label className="label" htmlFor="cycle_number">
                Numéro cycle
              </label>
              <input className="input" id="cycle_number" name="cycle_number" type="number" min={1} required />
            </div>
            <div>
              <label className="label" htmlFor="start_date">
                Lundi (start_date)
              </label>
              <input className="input" id="start_date" name="start_date" type="date" required />
            </div>
            <div className="flex items-end">
              <label className="inline-flex items-center gap-2 text-sm text-slate-300">
                <input type="checkbox" name="is_active" value="true" />
                Activer le cycle
              </label>
            </div>
            <div className="md:col-span-4">
              <button className="btn-primary" type="submit">
                Créer le cycle
              </button>
            </div>
          </form>
        </section>

        <section className="card p-4">
          <h2 className="mb-3 text-lg font-semibold">Créer / modifier un shift</h2>
          <form action="/api/admin/shifts" method="post" className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <input type="hidden" name="action" value="create" />
            <div>
              <label className="label">Employé</label>
              <select className="input" name="user_id" required>
                <option value="">Sélectionner</option>
                {(users ?? []).map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.full_name ?? user.id}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Semaine</label>
              <select className="input" name="week_id" required>
                <option value="">Sélectionner</option>
                {normalizedWeeks.map((week) => (
                  <option key={week.id} value={week.id}>
                    S{week.iso_week_number} - {week.cycleYear} ({week.start_date})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Catégorie</label>
              <select className="input" name="category" required>
                <option value="VISIT">VISIT</option>
                <option value="CALL">CALL</option>
                <option value="LEAD">LEAD</option>
                <option value="ADMIN">ADMIN</option>
                <option value="ABS">ABS</option>
                <option value="WFH">WFH</option>
              </select>
            </div>
            <div>
              <label className="label">Début</label>
              <input className="input" name="start_at" type="datetime-local" required />
            </div>
            <div>
              <label className="label">Fin</label>
              <input className="input" name="end_at" type="datetime-local" required />
            </div>
            <div>
              <label className="label">Lieu</label>
              <input className="input" name="location" type="text" />
            </div>
            <div className="md:col-span-3">
              <label className="label">Notes</label>
              <textarea className="input min-h-20" name="notes" />
            </div>
            <div className="md:col-span-3">
              <button className="btn-primary" type="submit">
                Enregistrer shift
              </button>
            </div>
          </form>

          <h3 className="mt-6 mb-2 text-sm font-semibold text-slate-300">Derniers shifts</h3>
          <div className="space-y-2">
            {normalizedShifts.map((shift) => (
              <form key={shift.id} action="/api/admin/shifts" method="post" className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800 p-3 text-sm">
                <input type="hidden" name="action" value="delete" />
                <input type="hidden" name="shift_id" value={shift.id} />
                <p>
                  {shift.profileName ?? "-"} | S{shift.isoWeek} | {shift.category}
                </p>
                <button className="btn-secondary text-red-300" type="submit">
                  Supprimer
                </button>
              </form>
            ))}
          </div>
        </section>

        <section className="card p-4">
          <h2 className="mb-2 text-lg font-semibold">Import CSV (stub)</h2>
          <form action="/api/admin/import-csv" method="post">
            <button className="btn-secondary" type="submit">
              Endpoint prêt (TODO import)
            </button>
          </form>
          <p className="mt-2 text-xs text-slate-500">Team disponible: {(teams ?? []).map((t) => t.name).join(", ") || "-"}</p>
        </section>
      </main>
    </div>
  );
}
