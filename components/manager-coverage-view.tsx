import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CATEGORY_META } from "@/lib/constants";
import { ShiftCategory } from "@/lib/types";

type CoverageRow = {
  slotKey: string;
  start_at: string;
  end_at: string;
  byCategory: Record<ShiftCategory, { required: number; assigned: number }>;
};

const visibleCategories: ShiftCategory[] = ["VISIT", "CALL", "LEAD", "ADMIN"];

export function ManagerCoverageView({ rows }: { rows: CoverageRow[] }) {
  if (!rows.length) {
    return <p className="text-sm text-slate-400">Aucun besoin configuré sur cette semaine.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-slate-800 text-left text-xs uppercase tracking-wide text-slate-400">
            <th className="px-3 py-2">Jour / Heure</th>
            {visibleCategories.map((cat) => (
              <th key={cat} className="px-3 py-2">
                {CATEGORY_META[cat].label}
              </th>
            ))}
            <th className="px-3 py-2">Ecart total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const gap = visibleCategories.reduce((acc, cat) => {
              const item = row.byCategory[cat];
              return acc + (item.required - item.assigned);
            }, 0);

            return (
              <tr key={row.slotKey} className="border-b border-slate-900/70">
                <td className="px-3 py-2 text-slate-200">
                  {format(new Date(row.start_at), "EEE dd/MM HH:mm", { locale: fr })} -{" "}
                  {format(new Date(row.end_at), "HH:mm", { locale: fr })}
                </td>
                {visibleCategories.map((cat) => {
                  const item = row.byCategory[cat];
                  const delta = item.required - item.assigned;
                  return (
                    <td key={cat} className="px-3 py-2">
                      <span className="text-slate-300">{item.assigned}</span>
                      <span className="text-slate-500"> / {item.required}</span>
                      <span className={delta > 0 ? "ml-2 text-amber-300" : "ml-2 text-emerald-300"}>
                        {delta > 0 ? `-${delta}` : "OK"}
                      </span>
                    </td>
                  );
                })}
                <td className={gap > 0 ? "px-3 py-2 text-amber-300" : "px-3 py-2 text-emerald-300"}>
                  {gap > 0 ? `${gap} manquant(s)` : "Couvert"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
