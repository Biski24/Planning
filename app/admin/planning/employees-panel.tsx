"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type EmployeeRow = {
  id: string;
  full_name: string;
  type: "conseiller" | "alternant" | "accueil";
  is_active: boolean;
};

export function EmployeesPanel({ employees }: { employees: EmployeeRow[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function createEmployee(formData: FormData) {
    setLoading(true);
    const res = await fetch("/api/admin/planning/employees", { method: "POST", body: formData });
    setLoading(false);
    if (!res.ok) {
      alert("Création employé impossible");
      return;
    }
    router.refresh();
  }

  async function toggleEmployee(id: string, isActive: boolean) {
    const res = await fetch("/api/admin/planning/employees", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, is_active: !isActive }),
    });
    if (!res.ok) {
      alert("Mise à jour impossible");
      return;
    }
    router.refresh();
  }

  async function seedDefaults() {
    const res = await fetch("/api/admin/planning/seed", { method: "POST" });
    if (!res.ok) {
      alert("Seed impossible");
      return;
    }
    router.refresh();
  }

  return (
    <section className="card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Employés</h2>
        <button className="btn-secondary" onClick={seedDefaults} type="button">
          Seed employés par défaut
        </button>
      </div>

      <form
        className="grid grid-cols-1 gap-3 md:grid-cols-3"
        action={async (fd) => {
          await createEmployee(fd);
        }}
      >
        <input className="input" name="full_name" placeholder="Nom" required />
        <select className="input" name="type" defaultValue="conseiller">
          <option value="conseiller">Conseiller</option>
          <option value="alternant">Alternant</option>
          <option value="accueil">Accueil</option>
        </select>
        <button className="btn-primary" type="submit" disabled={loading}>
          Ajouter
        </button>
      </form>

      <div className="space-y-2">
        {employees.map((employee) => (
          <div key={employee.id} className="flex items-center justify-between rounded-lg border border-slate-800 p-3 text-sm">
            <p>
              {employee.full_name} · {employee.type} · {employee.is_active ? "actif" : "inactif"}
            </p>
            <button
              className="btn-secondary"
              type="button"
              onClick={() => toggleEmployee(employee.id, employee.is_active)}
            >
              {employee.is_active ? "Désactiver" : "Activer"}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
