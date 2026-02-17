"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DayTabs } from "@/components/planning/day-tabs";
import { TimeGrid } from "@/components/planning/time-grid";
import { CATEGORY_LABELS, PLANNING_CATEGORIES, generateHalfHourSlots } from "@/lib/planning-editor";

type Need = {
  day_of_week: number;
  start_time: string;
  end_time: string;
  category: string;
  required_count: number;
};

export function NeedsPanel({ weekId, initialNeeds }: { weekId: string; initialNeeds: Need[] }) {
  const router = useRouter();
  const slots = useMemo(() => generateHalfHourSlots(), []);
  const [day, setDay] = useState(1);
  const [state, setState] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    for (const need of initialNeeds) {
      map[`${need.day_of_week}|${need.start_time.slice(0, 5)}|${need.category}`] = need.required_count;
    }
    return map;
  });

  const setCount = (dayOfWeek: number, startTime: string, category: string, value: number) => {
    setState((prev) => ({ ...prev, [`${dayOfWeek}|${startTime}|${category}`]: Math.max(0, value || 0) }));
  };

  async function save() {
    const items = Object.entries(state).map(([key, required_count]) => {
      const [day_of_week, start_time, category] = key.split("|");
      const slot = slots.find((s) => s.start === start_time)!;
      return {
        day_of_week: Number(day_of_week),
        start_time,
        end_time: slot.end,
        category,
        required_count,
      };
    });

    const res = await fetch("/api/admin/planning/needs/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ week_id: weekId, items }),
    });

    if (!res.ok) {
      alert("Sauvegarde besoins impossible");
      return;
    }

    alert("Besoins sauvegardés");
    router.refresh();
  }

  return (
    <section className="card p-4 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Besoins (jour x créneau x activité)</h2>
        <button className="btn-primary" type="button" onClick={save}>
          Sauvegarder (bulk)
        </button>
      </div>

      <DayTabs value={day} onChange={setDay} />

      <TimeGrid
        slots={slots}
        renderRow={(slot) => (
          <div className="grid grid-cols-2 gap-2 rounded-lg border border-maif-border bg-maif-surfaceAlt/70 p-2 md:grid-cols-5">
            {PLANNING_CATEGORIES.slice(0, 5).map((category) => {
              const key = `${day}|${slot.start}|${category}`;
              return (
                <label key={category} className="text-xs">
                  <span className="mb-1 block text-maif-muted">{CATEGORY_LABELS[category]}</span>
                  <input
                    className="input h-9"
                    type="number"
                    min={0}
                    value={state[key] ?? 0}
                    onChange={(e) => setCount(day, slot.start, category, Number(e.target.value))}
                  />
                </label>
              );
            })}
          </div>
        )}
      />
    </section>
  );
}
