"use client";

import { useRouter } from "next/navigation";

type Cycle = {
  id: string;
  year: number;
  cycle_number: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
};

export function CyclesPanel({ cycles }: { cycles: Cycle[] }) {
  const router = useRouter();

  async function createCycle(formData: FormData) {
    const res = await fetch("/api/admin/planning/cycles", { method: "POST", body: formData });
    if (!res.ok) {
      alert("Création cycle impossible");
      return;
    }
    router.refresh();
  }

  return (
    <section className="card p-4 space-y-4">
      <h2 className="text-lg font-semibold">Cycles 4 semaines</h2>
      <form
        className="grid grid-cols-1 gap-3 md:grid-cols-4"
        action={async (fd) => {
          await createCycle(fd);
        }}
      >
        <input className="input" type="number" name="year" placeholder="Année" required />
        <input className="input" type="number" name="cycle_number" placeholder="Cycle #" required />
        <input className="input" type="date" name="start_date" required />
        <label className="inline-flex items-center gap-2 text-sm">
          <input type="checkbox" name="is_active" value="true" /> Actif
        </label>
        <div className="md:col-span-4">
          <button className="btn-primary" type="submit">
            Créer/mettre à jour cycle
          </button>
        </div>
      </form>

      <div className="space-y-2 text-sm">
        {cycles.map((cycle) => (
          <div key={cycle.id} className="rounded-lg border border-slate-800 p-3">
            {cycle.year} - Cycle {cycle.cycle_number} ({cycle.start_date} → {cycle.end_date}) {cycle.is_active ? "· Actif" : ""}
          </div>
        ))}
      </div>
    </section>
  );
}
