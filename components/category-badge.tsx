import { CATEGORY_META } from "@/lib/constants";
import { ShiftCategory } from "@/lib/types";
import clsx from "clsx";

export function CategoryBadge({ category }: { category: ShiftCategory }) {
  const meta = CATEGORY_META[category];
  return (
    <span className={clsx("inline-flex rounded-full border px-2 py-0.5 text-xs font-medium", meta.className)}>
      {meta.label}
    </span>
  );
}
