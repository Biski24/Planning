import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CategoryBadge } from "@/components/category-badge";
import { buildWeekDays, groupShiftsByDay } from "@/lib/planning";
import { ShiftWithProfile, Week } from "@/lib/types";

export function PlanningWeekView({ week, shifts }: { week: Week; shifts: ShiftWithProfile[] }) {
  const byDay = groupShiftsByDay(shifts);
  const days = buildWeekDays(week);

  return (
    <div className="space-y-3">
      {days.map(({ key, date }) => {
        const items = byDay.get(key) ?? [];

        return (
          <section key={key} className="card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-maif-primary">
                {format(date, "EEEE dd MMMM", { locale: fr })}
              </h3>
              <span className="text-xs text-maif-muted">{items.length} créneau(x)</span>
            </div>

            {items.length === 0 ? (
              <p className="text-sm text-maif-muted">Aucun shift.</p>
            ) : (
              <ul className="space-y-2">
                {items.map((shift) => (
                  <li key={shift.id} className="rounded-xl border border-maif-border bg-maif-surfaceAlt/70 p-3 text-sm">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <CategoryBadge category={shift.category} />
                      <span className="text-xs text-maif-muted">
                        {format(new Date(shift.start_at), "HH:mm")} - {format(new Date(shift.end_at), "HH:mm")}
                      </span>
                    </div>
                    <p className="text-sm text-maif-text">
                      {shift.profiles?.full_name ?? "Employé"}
                    </p>
                    {shift.location && <p className="text-xs text-maif-muted">Lieu: {shift.location}</p>}
                    {shift.notes && <p className="text-xs text-maif-muted">{shift.notes}</p>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
