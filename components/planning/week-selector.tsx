import Link from "next/link";

export function WeekSelector({
  weeks,
  selected,
  hrefBuilder,
}: {
  weeks: Array<{ iso_week_number: number; year: number }>;
  selected: number;
  hrefBuilder: (isoWeek: number, year: number) => string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {weeks.map((week) => (
        <Link
          key={`${week.year}-${week.iso_week_number}`}
          href={hrefBuilder(week.iso_week_number, week.year)}
          className={
            week.iso_week_number === selected
              ? "btn-primary px-3 py-1 text-xs"
              : "btn-secondary px-3 py-1 text-xs"
          }
        >
          S{week.iso_week_number} ({week.year})
        </Link>
      ))}
    </div>
  );
}
