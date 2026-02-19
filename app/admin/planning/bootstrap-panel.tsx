"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function BootstrapPanel() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function bootstrap() {
    setLoading(true);
    setMessage(null);
    const res = await fetch("/api/admin/planning/bootstrap", { method: "POST" });
    const json = await res.json().catch(() => null);
    setLoading(false);

    if (!res.ok) {
      setMessage("Initialisation impossible. Réessaie.");
      return;
    }

    setMessage(
      `Initialisation terminée: ${json?.employees ?? 0} employés, ${json?.weeks ?? 0} semaines, ${json?.needs ?? 0} besoins.`
    );
    router.refresh();
  }

  return (
    <section className="card p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Initialisation rapide</h2>
          <p className="text-sm text-maif-muted">
            Crée automatiquement l’équipe, le cycle actif de 4 semaines et des besoins de base.
          </p>
        </div>
        <button className="btn-primary" type="button" onClick={bootstrap} disabled={loading}>
          {loading ? "Initialisation..." : "Tout préparer automatiquement"}
        </button>
      </div>

      {message && <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>}
    </section>
  );
}
