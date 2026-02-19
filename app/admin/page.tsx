import { Navbar } from "@/components/navbar";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase-admin";
import Link from "next/link";

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

type NeedWeekRel = { iso_week_number: number } | { iso_week_number: number }[] | null;
type NeedRow = {
  id: string;
  category: string;
  required_count: number;
  weeks: NeedWeekRel;
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

function getNeedIsoWeek(value: NeedWeekRel): number | undefined {
  if (!value) return undefined;
  return Array.isArray(value) ? value[0]?.iso_week_number : value.iso_week_number;
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { profile } = await requireRole(["admin"]);
  const { error, success } = await searchParams;
  const supabase = createAdminClient();

  const [{ data: teams }, { data: users }, { data: weeks }, { data: shifts }, { data: needs }] = await Promise.all([
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
    supabase
      .from("week_needs")
      .select("id, category, required_count, start_at, end_at, weeks!inner(iso_week_number)")
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
  const safeNeeds = (needs ?? []) as NeedRow[];
  const normalizedNeeds = safeNeeds.map((need) => ({
    ...need,
    isoWeek: getNeedIsoWeek(need.weeks),
  }));

  return (
    <div>
      <Navbar role={profile.role} />
      <main className="container-page space-y-6">
        <header>
          <h1 className="text-3xl font-bold tracking-tight">Admin</h1>
          <p className="text-sm text-maif-muted">Gestion des cycles et des shifts.</p>
          <div className="mt-3">
            <div className="flex flex-wrap gap-2">
              <Link href="/admin/planning" className="btn-primary">
                Ouvrir Admin Planning (nouveau module)
              </Link>
              <Link href="/admin/import" className="btn-secondary">
                Importer un planning Excel
              </Link>
            </div>
          </div>
        </header>

        {error && (
          <div className="rounded-lg border border-maif-primary/30 bg-red-50 px-4 py-3 text-sm text-maif-primary">
            Erreur: {error}
          </div>
        )}

        {success && (
          <div className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            Succès: {success}
          </div>
        )}

        <section className="card p-4">
          <h2 className="mb-3 text-lg font-semibold">Créer un utilisateur (identifiant + mdp)</h2>
          <form action="/api/admin/users" method="post" className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <label className="label" htmlFor="username">
                Identifiant (prénom/login)
              </label>
              <input className="input" id="username" name="username" type="text" required />
            </div>
            <div>
              <label className="label" htmlFor="password">
                Mot de passe
              </label>
              <input className="input" id="password" name="password" type="text" required />
            </div>
            <div>
              <label className="label" htmlFor="full_name">
                Nom affiché
              </label>
              <input className="input" id="full_name" name="full_name" type="text" required />
            </div>
            <div>
              <label className="label" htmlFor="role">
                Rôle
              </label>
              <select className="input" id="role" name="role" defaultValue="employee">
                <option value="admin">admin</option>
                <option value="manager">manager</option>
                <option value="employee">employee</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="team_id">
                Équipe
              </label>
              <select className="input" id="team_id" name="team_id">
                <option value="">Aucune</option>
                {(teams ?? []).map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-3">
              <button className="btn-primary" type="submit">
                Créer utilisateur
              </button>
            </div>
          </form>
        </section>

        <section className="card p-4">
          <h2 className="mb-3 text-lg font-semibold">Besoins par créneau (comme Excel)</h2>
          <form action="/api/admin/needs" method="post" className="grid grid-cols-1 gap-3 md:grid-cols-3">
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
              <label className="label">Début créneau</label>
              <input className="input" name="start_at" type="datetime-local" required />
            </div>
            <div>
              <label className="label">Fin créneau</label>
              <input className="input" name="end_at" type="datetime-local" required />
            </div>
            <div>
              <label className="label">Activité</label>
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
              <label className="label">Besoin à couvrir</label>
              <input className="input" name="required_count" type="number" min={0} required />
            </div>
            <div>
              <label className="label">Commentaire</label>
              <input className="input" name="comment" type="text" />
            </div>
            <div className="md:col-span-3">
              <button className="btn-primary" type="submit">
                Ajouter besoin
              </button>
            </div>
          </form>

          <h3 className="mt-6 mb-2 text-sm font-semibold text-slate-300">Derniers besoins</h3>
          <div className="space-y-2">
            {normalizedNeeds.map((need) => (
              <form key={String(need.id)} action="/api/admin/needs" method="post" className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800 p-3 text-sm">
                <input type="hidden" name="action" value="delete" />
                <input type="hidden" name="need_id" value={String(need.id)} />
                <p>
                  S{String(need.isoWeek)} | {String(need.category)} | besoin {String(need.required_count)}
                </p>
                <button className="btn-secondary text-red-300" type="submit">
                  Supprimer
                </button>
              </form>
            ))}
          </div>
        </section>

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
          <h2 className="mb-3 text-lg font-semibold">Création rapide planning (lot)</h2>
          <p className="mb-3 text-sm text-slate-400">
            Génère des shifts sur plusieurs jours d’une semaine en un seul enregistrement.
          </p>
          <form action="/api/admin/planning-bulk" method="post" className="grid grid-cols-1 gap-3 md:grid-cols-3">
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
              <label className="label">Heure début</label>
              <input className="input" type="time" name="start_time" defaultValue="09:00" required />
            </div>
            <div>
              <label className="label">Heure fin</label>
              <input className="input" type="time" name="end_time" defaultValue="12:00" required />
            </div>
            <div>
              <label className="label">Lieu</label>
              <input className="input" type="text" name="location" />
            </div>
            <div className="md:col-span-3">
              <label className="label">Jours</label>
              <div className="flex flex-wrap gap-3 rounded-lg border border-slate-800 p-3 text-sm">
                <label className="inline-flex items-center gap-2"><input type="checkbox" name="day_0" defaultChecked />Lun</label>
                <label className="inline-flex items-center gap-2"><input type="checkbox" name="day_1" defaultChecked />Mar</label>
                <label className="inline-flex items-center gap-2"><input type="checkbox" name="day_2" defaultChecked />Mer</label>
                <label className="inline-flex items-center gap-2"><input type="checkbox" name="day_3" defaultChecked />Jeu</label>
                <label className="inline-flex items-center gap-2"><input type="checkbox" name="day_4" defaultChecked />Ven</label>
                <label className="inline-flex items-center gap-2"><input type="checkbox" name="day_5" />Sam</label>
                <label className="inline-flex items-center gap-2"><input type="checkbox" name="day_6" />Dim</label>
              </div>
            </div>
            <div className="md:col-span-3">
              <label className="label">Notes</label>
              <input className="input" type="text" name="notes" />
            </div>
            <div className="md:col-span-3">
              <button className="btn-primary" type="submit">
                Générer planning semaine
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
