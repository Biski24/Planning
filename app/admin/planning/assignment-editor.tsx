"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DayTabs } from "@/components/planning/day-tabs";
import { TimeGrid } from "@/components/planning/time-grid";
import { PlanningCategory, generateHalfHourSlots } from "@/lib/planning-editor";

type Employee = { id: string; full_name: string };
type Assignment = {
  employee_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  category: PlanningCategory;
};

export function AssignmentEditor({
  weekId,
  employees,
  initialAssignments,
}: {
  weekId: string;
  employees: Employee[];
  initialAssignments: Assignment[];
}) {
  const router = useRouter();
  const slots = useMemo(() => generateHalfHourSlots(), []);
  const [day, setDay] = useState(1);
  const [state, setState] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const item of initialAssignments) {
      map[`${item.employee_id}|${item.day_of_week}|${item.start_time.slice(0, 5)}`] = item.category;
    }
    return map;
  });

  const setCell = (employeeId: string, startTime: string, value: string) => {
    setState((prev) => ({ ...prev, [`${employeeId}|${day}|${startTime}`]: value }));
  };

  async function saveDay() {
    const items: Array<{
      employee_id: string;
      day_of_week: number;
      start_time: string;
      end_time: string;
      category: string;
    }> = [];

    const clear: Array<{ employee_id: string; day_of_week: number; start_time: string }> = [];

    for (const employee of employees) {
      for (const slot of slots) {
        const key = `${employee.id}|${day}|${slot.start}`;
        const value = state[key] ?? "";
        if (!value) {
          clear.push({ employee_id: employee.id, day_of_week: day, start_time: slot.start });
        } else {
          items.push({
            employee_id: employee.id,
            day_of_week: day,
            start_time: slot.start,
            end_time: slot.end,
            category: value,
          });
        }
      }
    }

    const res = await fetch("/api/admin/planning/assignments/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ week_id: weekId, items, clear }),
    });

    if (!res.ok) {
      alert("Sauvegarde affectations impossible");
      return;
    }

    alert("Affectations sauvegardées");
    router.refresh();
  }

  return (
    <section className="card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Planning Editor</h2>
        <button className="btn-primary" type="button" onClick={saveDay}>
          Sauvegarder jour
        </button>
      </div>

      <DayTabs value={day} onChange={setDay} />

      <TimeGrid
        slots={slots}
        renderRow={(slot) => (
          <div className="overflow-x-auto rounded-lg border border-maif-border bg-maif-surfaceAlt/70 p-2">
            <div className="min-w-[860px] grid grid-cols-4 gap-2 lg:grid-cols-6">
              {employees.map((employee) => {
                const key = `${employee.id}|${day}|${slot.start}`;
                const value = state[key] ?? "";

                return (
                  <div key={employee.id} className="rounded-lg border border-maif-border bg-white p-2">
                    <p className="mb-1 truncate text-xs text-maif-muted">{employee.full_name}</p>
                    <select
                      className="input h-9"
                      value={value}
                      onChange={(e) => setCell(employee.id, slot.start, e.target.value)}
                    >
                      <option value="">-</option>
                      <option value="VISIT">Visites</option>
                      <option value="CALL">Téléphone</option>
                      <option value="RDV">Rendez-vous</option>
                      <option value="LEAD">Leads</option>
                      <option value="ASYNC">Flux async.</option>
                      <option value="MEETING">Réunion</option>
                      <option value="TRAINING">Formation</option>
                      <option value="WFH">Télétravail</option>
                      <option value="ABS">Absence</option>
                    </select>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      />
    </section>
  );
}
