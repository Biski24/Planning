import ical, { ICalCalendarMethod } from "ical-generator";
import { Shift } from "@/lib/types";

export function createCalendar(name: string) {
  return ical({
    name,
    method: ICalCalendarMethod.PUBLISH,
    timezone: "Europe/Paris",
  });
}

export function addShiftEvents(calendar: ReturnType<typeof createCalendar>, shifts: Shift[]) {
  shifts.forEach((shift) => {
    const uid = `${shift.id}@planning-agence`;
    calendar.createEvent({
      id: uid,
      start: new Date(shift.start_at),
      end: new Date(shift.end_at),
      summary: `Planning - ${shift.category}`,
      description: shift.notes ?? `Catégorie: ${shift.category}`,
      location: shift.location ?? undefined,
    });
  });

  return calendar;
}
