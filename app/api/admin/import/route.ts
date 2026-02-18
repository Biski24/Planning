import { addWeeks, getISOWeek, getISOWeekYear, startOfISOWeek } from "date-fns";
import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/api-auth";
import { importExcelPlanning } from "@/lib/import-excel";

function parseStartDate(input: { startDate?: string; isoYear?: string; isoWeek?: string }) {
  if (input.startDate) {
    return startOfISOWeek(new Date(input.startDate));
  }

  const isoYear = Number(input.isoYear ?? 0);
  const isoWeek = Number(input.isoWeek ?? 0);
  if (!isoYear || !isoWeek) return null;

  const jan4 = new Date(Date.UTC(isoYear, 0, 4));
  const mondayWeek1 = startOfISOWeek(jan4);
  return addWeeks(mondayWeek1, isoWeek - 1);
}

export async function POST(request: Request) {
  const admin = await requireAdminApi();
  if (admin.error) return admin.error;

  const form = await request.formData();
  const file = form.get("file") as File | null;
  const startDate = String(form.get("start_date") ?? "").trim();
  const isoYear = String(form.get("iso_year") ?? "").trim();
  const isoWeek = String(form.get("iso_week") ?? "").trim();
  const cycleNumber = Number(form.get("cycle_number") ?? 0);
  const teamId = String(form.get("team_id") ?? "").trim() || null;

  if (!file || cycleNumber <= 0) {
    return NextResponse.redirect(new URL("/admin/import?error=missing_fields", request.url));
  }

  const cycleStartMonday = parseStartDate({ startDate, isoYear, isoWeek });
  if (!cycleStartMonday || Number.isNaN(cycleStartMonday.getTime())) {
    return NextResponse.redirect(new URL("/admin/import?error=invalid_start", request.url));
  }

  const year = getISOWeekYear(cycleStartMonday);

  try {
    const buffer = new Uint8Array(await file.arrayBuffer());
    const summary = await importExcelPlanning({
      fileBuffer: buffer,
      cycleStartMonday,
      cycleNumber,
      year,
      teamId,
    });

    const url = new URL("/admin/import", request.url);
    url.searchParams.set("success", "1");
    url.searchParams.set("employeesCreated", String(summary.employeesCreated));
    url.searchParams.set("assignmentsImported", String(summary.assignmentsImported));
    url.searchParams.set("emptyIgnored", String(summary.emptyCellsIgnored));
    url.searchParams.set("unknown", String(summary.unknownActivitiesCount));
    url.searchParams.set("weeks", summary.weekIsoNumbers.join(","));
    return NextResponse.redirect(url);
  } catch (error) {
    const url = new URL("/admin/import", request.url);
    url.searchParams.set("error", error instanceof Error ? error.message : "import_failed");
    return NextResponse.redirect(url);
  }
}
