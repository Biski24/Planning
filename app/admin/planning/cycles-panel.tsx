"use client";

import { useState } from "react";
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
  const [yearSetupLoading, setYearSetupLoading] = useState(false);
  const [yearSetup, setYearSetup] = useState("2026");

  async function createCycle(formData: FormData) {
    const res = await fetch("/api/admin/planning/cycles", { method: "POST", body: formData });
    if (!res.ok) {
      alert("Création cycle impossible");
      return;
    }
    router.refresh();
  }

  async function setupYear() {
    setYearSetupLoading(true);
    const formData = new FormData();
    formData.set("year", yearSetup);
    const res = await fetch("/api/admin/planning/cycles/year", { method: "POST", body: formData });
    const json = await res.json().catch(() => null);
    setYearSetupLoading(false);

    if (!res.ok) {
      alert("Préparation annuelle impossible");
      return;
    }

    alert(
      `Année ${json?.year} prête: ${json?.cycles_created ?? 0} cycles, ${json?.weeks_upserted ?? 0} semaines.`
    );
    router.refresh();
  }

  return (
    <section className="card p-4 space-y-4">
      <h2 className="text-lg font-semibold">Cycles 4 semaines</h2>
      <div className="rounded-lg border border-maif-border bg-maif-surfaceAlt p-3">
        <p className="mb-2 text-sm text-maif-text">
          Préparer automatiquement toute une année: cycles + semaines ISO.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <input
            className="input w-32"
            type="number"
            min={2000}
            max={2100}
            value={yearSetup}
            onChange={(e) => setYearSetup(e.target.value)}
          />
          <button className="btn-primary" type="button" disabled={yearSetupLoading} onClick={setupYear}>
            {yearSetupLoading ? "Préparation..." : "Préparer l'année"}
          </button>
        </div>
      </div>

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
