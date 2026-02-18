import { Navbar } from "@/components/navbar";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase-admin";

export default async function AdminImportPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    success?: string;
    employeesCreated?: string;
    assignmentsImported?: string;
    emptyIgnored?: string;
    unknown?: string;
    weeks?: string;
  }>;
}) {
  const { profile } = await requireRole(["admin"]);
  const params = await searchParams;

  const supabase = createAdminClient();
  const { data: teams } = await supabase.from("teams").select("id, name").order("name", { ascending: true });

  return (
    <div>
      <Navbar role={profile.role} />
      <main className="container-page space-y-6">
        <header>
          <h1 className="text-3xl font-bold tracking-tight">Import Excel planning</h1>
          <p className="text-sm text-maif-muted">
            Importe 4 semaines d’un fichier .xlsm vers cycle + semaines + affectations.
          </p>
        </header>

        {params.error && (
          <div className="rounded-lg border border-maif-primary/30 bg-red-50 px-4 py-3 text-sm text-maif-primary">
            Erreur: {params.error}
          </div>
        )}

        {params.success && (
          <div className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            Import terminé. Employés créés: {params.employeesCreated ?? 0}, affectations importées: {params.assignmentsImported ?? 0},
            cellules vides ignorées: {params.emptyIgnored ?? 0}, activités inconnues: {params.unknown ?? 0}, semaines ISO: {params.weeks ?? "-"}.
          </div>
        )}

        <section className="card p-4">
          <form action="/api/admin/import" method="post" encType="multipart/form-data" className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="label" htmlFor="file">
                Fichier Excel (.xlsm)
              </label>
              <input className="input" id="file" name="file" type="file" accept=".xlsm,.xlsx" required />
            </div>

            <div>
              <label className="label" htmlFor="start_date">
                Date début cycle (lundi)
              </label>
              <input className="input" id="start_date" name="start_date" type="date" />
            </div>

            <div>
              <label className="label" htmlFor="cycle_number">
                Numéro cycle
              </label>
              <input className="input" id="cycle_number" name="cycle_number" type="number" min={1} required />
            </div>

            <div>
              <label className="label" htmlFor="iso_year">
                OU année ISO
              </label>
              <input className="input" id="iso_year" name="iso_year" type="number" placeholder="2026" />
            </div>

            <div>
              <label className="label" htmlFor="iso_week">
                OU semaine ISO de départ
              </label>
              <input className="input" id="iso_week" name="iso_week" type="number" min={1} max={53} placeholder="5" />
            </div>

            <div className="md:col-span-2">
              <label className="label" htmlFor="team_id">
                Team (optionnel)
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

            <div className="md:col-span-2 flex justify-end">
              <button className="btn-primary" type="submit">
                Importer
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}
