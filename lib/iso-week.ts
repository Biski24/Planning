import { addDays, formatISO, getISOWeek, getISOWeekYear, startOfISOWeek } from "date-fns";

export function getIsoWeekNumber(date: Date): number {
  return getISOWeek(date);
}

export function getIsoWeekYear(date: Date): number {
  return getISOWeekYear(date);
}

export function getMonday(date: Date): Date {
  return startOfISOWeek(date);
}

export function generateFourWeeksFromMonday(monday: Date) {
  const weeks = Array.from({ length: 4 }).map((_, index) => {
    const start = addDays(monday, index * 7);
    const end = addDays(start, 6);
    return {
      iso_week_number: getIsoWeekNumber(start),
      start_date: formatISO(start, { representation: "date" }),
      end_date: formatISO(end, { representation: "date" }),
      iso_year: getIsoWeekYear(start),
    };
  });

  return weeks;
}
