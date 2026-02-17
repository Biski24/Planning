"use client";

import clsx from "clsx";
import { dayLabels } from "@/lib/planning-editor";

export function DayTabs({
  value,
  onChange,
}: {
  value: number;
  onChange: (day: number) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {dayLabels().map((d) => (
        <button
          key={d.day}
          type="button"
          className={clsx(
            "btn-secondary px-3 py-1 text-xs",
            value === d.day && "border-maif-primary bg-red-50 text-maif-primary"
          )}
          onClick={() => onChange(d.day)}
        >
          {d.label}
        </button>
      ))}
    </div>
  );
}
