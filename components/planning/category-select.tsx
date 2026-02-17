"use client";

import { CATEGORY_LABELS, PLANNING_CATEGORIES, PlanningCategory } from "@/lib/planning-editor";

export function CategorySelect({
  value,
  onChange,
  name,
}: {
  value?: PlanningCategory;
  onChange?: (value: PlanningCategory) => void;
  name?: string;
}) {
  return (
    <select
      className="input"
      value={value}
      name={name}
      onChange={(e) => onChange?.(e.target.value as PlanningCategory)}
      required
    >
      {PLANNING_CATEGORIES.map((cat) => (
        <option key={cat} value={cat}>
          {CATEGORY_LABELS[cat]}
        </option>
      ))}
    </select>
  );
}
