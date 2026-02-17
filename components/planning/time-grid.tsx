"use client";

import { ReactNode } from "react";

export function TimeGrid({
  slots,
  renderRow,
}: {
  slots: Array<{ start: string; end: string }>;
  renderRow: (slot: { start: string; end: string }) => ReactNode;
}) {
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[780px] space-y-2">
        {slots.map((slot) => (
          <div key={`${slot.start}-${slot.end}`} className="grid grid-cols-[100px_1fr] gap-2">
            <div className="rounded-lg border border-maif-border bg-maif-surface px-2 py-2 text-xs font-medium text-maif-muted">
              {slot.start} - {slot.end}
            </div>
            <div>{renderRow(slot)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
