import ExcelJS from "exceljs";
import { addDays, format, getISOWeek } from "date-fns";
import { createAdminClient } from "@/lib/supabase-admin";

type ImportParams = {
  fileBuffer: Uint8Array;
  cycleStartMonday: Date;
  cycleNumber: number;
  year: number;
  teamId?: string | null;
};

type ParsedAssignment = {
  weekOffset: number;
  employeeName: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  sourceActivity: string;
  category: string;
  note: string | null;
};

export type ImportSummary = {
  employeesCreated: number;
  employeesReused: number;
  assignmentsImported: number;
  emptyCellsIgnored: number;
  unknownActivitiesCount: number;
  unknownActivities: string[];
  cycleId: string;
  weekIsoNumbers: number[];
};

const DAY_MAP: Record<string, number> = {
  lundi: 1,
  mardi: 2,
  mercredi: 3,
  jeudi: 4,
  vendredi: 5,
  samedi: 6,
  dimanche: 7,
};

const ACTIVITY_MAP: Record<string, string> = {
  visites: "VISIT",
  visite: "VISIT",
  "acc. direct.": "OTHER",
  "acc direct": "OTHER",
  tel: "CALL",
  "tel.": "CALL",
  "tel ": "CALL",
  "tel. ": "CALL",
  "tél": "CALL",
  téléphone: "CALL",
  telephone: "CALL",
  rdv: "RDV",
  "rendez-vous": "RDV",
  "rendez vous": "RDV",
  leads: "LEAD",
  lead: "LEAD",
  async: "ASYNC",
  asynchrones: "ASYNC",
  asynchrone: "ASYNC",
  réunion: "MEETING",
  reunion: "MEETING",
  formation: "TRAINING",
  télétravail: "WFH",
  teletravail: "WFH",
  wfh: "WFH",
  abs: "ABS",
  absence: "ABS",
};

function normalize(value: string) {
  return value
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function cleanText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  if (typeof value === "object" && "richText" in (value as Record<string, unknown>)) {
    const rich = (value as { richText?: Array<{ text?: string }> }).richText ?? [];
    return rich.map((x) => x.text ?? "").join("").trim();
  }
  if (typeof value === "object" && "text" in (value as Record<string, unknown>)) {
    return String((value as { text?: string }).text ?? "").trim();
  }
  if (typeof value === "object" && "result" in (value as Record<string, unknown>)) {
    return cleanText((value as { result?: unknown }).result);
  }
  return String(value).trim();
}

function isPotentialName(value: string) {
  const v = normalize(value);
  if (!v) return false;
  if (Object.keys(DAY_MAP).includes(v)) return false;
  if (/^\d{2}[:h]\d{2}/i.test(v)) return false;
  if (v.includes("semaine") || v.includes("besoin") || v.includes("total")) return false;
  if (v.length < 2) return false;
  return true;
}

function parseTimeRange(raw: string): { start: string; end: string } | null {
  const value = normalize(raw).replace(/h/g, ":").replace(/\s+/g, " ");
  const match = value.match(/(\d{1,2}:\d{2})\s*[-aà]\s*(\d{1,2}:\d{2})/i);
  if (!match) return null;
  const fix = (t: string) => {
    const [h, m] = t.split(":");
    return `${String(Number(h)).padStart(2, "0")}:${m}`;
  };
  return { start: fix(match[1]), end: fix(match[2]) };
}

function parseWeekOffset(raw: string): number | null {
  const value = normalize(raw);
  const match = value.match(/(?:semaine\s*)?([1-4])\b/);
  if (!match) return null;
  const week = Number(match[1]);
  return Number.isNaN(week) ? null : week - 1;
}

function mapActivity(raw: string) {
  const key = normalize(raw);
  const category = ACTIVITY_MAP[key] ?? "OTHER";
  return {
    category,
    sourceActivity: raw,
    note: category === "OTHER" ? `Excel: ${raw}` : null,
  };
}

function findColumnIndexByKeywords(headers: string[], keywords: string[]) {
  return headers.findIndex((header) => {
    const h = normalize(header);
    return keywords.some((keyword) => h.includes(normalize(keyword)));
  });
}

function parseWorkbookDataSheet(workbook: ExcelJS.Workbook) {
  const ws =
    workbook.worksheets.find((sheet) => normalize(sheet.name) === "donnees") ??
    workbook.worksheets.find((sheet) => normalize(sheet.name).includes("donnees"));
  if (!ws) return null;

  const maxHeaderScanRows = Math.min(25, ws.rowCount);
  let headerRowIndex = -1;
  let colWeek = -1;
  let colDay = -1;
  let colEmployee = -1;
  let colActivity = -1;
  let colSlot = -1;

  for (let r = 1; r <= maxHeaderScanRows; r += 1) {
    const row = ws.getRow(r);
    const headers = Array.from({ length: Math.max(row.cellCount, 12) }, (_, i) =>
      cleanText(row.getCell(i + 1).value)
    );

    const week = findColumnIndexByKeywords(headers, ["semaine"]);
    const day = findColumnIndexByKeywords(headers, ["jour"]);
    const employee = findColumnIndexByKeywords(headers, ["conseiller", "employe", "employee", "nom"]);
    const activity = findColumnIndexByKeywords(headers, ["activite", "activité"]);
    const slot = findColumnIndexByKeywords(headers, ["creneau", "créneau", "horaire"]);

    if (week >= 0 && day >= 0 && employee >= 0 && activity >= 0 && slot >= 0) {
      headerRowIndex = r;
      colWeek = week + 1;
      colDay = day + 1;
      colEmployee = employee + 1;
      colActivity = activity + 1;
      colSlot = slot + 1;
      break;
    }
  }

  if (headerRowIndex < 0) {
    return null;
  }

  const parsed: ParsedAssignment[] = [];
  const unknown = new Set<string>();
  let emptyCellsIgnored = 0;

  for (let r = headerRowIndex + 1; r <= ws.rowCount; r += 1) {
    const row = ws.getRow(r);

    const weekOffset = parseWeekOffset(cleanText(row.getCell(colWeek).value));
    const dayOfWeek = DAY_MAP[normalize(cleanText(row.getCell(colDay).value))];
    const employeeName = cleanText(row.getCell(colEmployee).value);
    const activity = cleanText(row.getCell(colActivity).value);
    const slot = parseTimeRange(cleanText(row.getCell(colSlot).value));

    if (weekOffset == null || !dayOfWeek || dayOfWeek > 6 || !employeeName || !slot) continue;
    if (!activity) {
      emptyCellsIgnored += 1;
      continue;
    }

    const mapped = mapActivity(activity);
    if (mapped.category === "OTHER") unknown.add(activity);

    parsed.push({
      weekOffset,
      employeeName,
      dayOfWeek,
      startTime: slot.start,
      endTime: slot.end,
      sourceActivity: mapped.sourceActivity,
      category: mapped.category,
      note: mapped.note,
    });
  }

  return {
    parsed,
    emptyCellsIgnored,
    unknownActivities: Array.from(unknown),
    employeeNames: Array.from(new Set(parsed.map((p) => p.employeeName))),
    source: "donnees" as const,
  };
}

function findHeaderRow(worksheet: ExcelJS.Worksheet) {
  let bestRow = 8;
  let bestScore = 0;

  for (let r = 1; r <= Math.min(40, worksheet.rowCount); r += 1) {
    let score = 0;
    for (let c = 4; c <= 40; c += 1) {
      const text = cleanText(worksheet.getRow(r).getCell(c).value);
      if (isPotentialName(text)) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      bestRow = r;
    }
  }

  return bestRow;
}

function extractEmployeeColumns(worksheet: ExcelJS.Worksheet, headerRow: number) {
  const row = worksheet.getRow(headerRow);
  const cols: Array<{ col: number; name: string }> = [];
  for (let c = 4; c <= 40; c += 1) {
    const text = cleanText(row.getCell(c).value);
    if (isPotentialName(text)) cols.push({ col: c, name: text });
  }
  return cols;
}

function extractWeekSheets(workbook: ExcelJS.Workbook) {
  const weekPatterns = [1, 2, 3, 4].map((i) => new RegExp(`semaine\\s*${i}`, "i"));
  const entries = workbook.worksheets
    .map((ws) => {
      const idx = weekPatterns.findIndex((p) => p.test(ws.name));
      return idx >= 0 ? { weekOffset: idx, ws } : null;
    })
    .filter(Boolean) as Array<{ weekOffset: number; ws: ExcelJS.Worksheet }>;

  return entries.sort((a, b) => a.weekOffset - b.weekOffset).slice(0, 4);
}

function parseWorkbook(fileBuffer: Uint8Array) {
  const workbook = new ExcelJS.Workbook();
  return workbook.xlsx.load(fileBuffer as any).then(() => {
    const parsedFromData = parseWorkbookDataSheet(workbook);
    if (parsedFromData && parsedFromData.parsed.length > 0) {
      return parsedFromData;
    }

    const weekSheets = extractWeekSheets(workbook);
    if (weekSheets.length === 0) {
      throw new Error("Aucun onglet 'Semaine 1..4' détecté");
    }

    const parsed: ParsedAssignment[] = [];
    let emptyCellsIgnored = 0;
    const unknown = new Set<string>();

    for (const { weekOffset, ws } of weekSheets) {
      const headerRow = findHeaderRow(ws);
      const employees = extractEmployeeColumns(ws, headerRow);
      if (employees.length === 0) continue;

      let currentDay = 0;
      for (let r = headerRow + 1; r <= ws.rowCount; r += 1) {
        const row = ws.getRow(r);
        const dayText = cleanText(row.getCell(1).value);
        const dayNormalized = normalize(dayText);
        if (DAY_MAP[dayNormalized]) {
          currentDay = DAY_MAP[dayNormalized];
        }

        const slotRaw = cleanText(row.getCell(3).value);
        const slot = parseTimeRange(slotRaw);
        if (!slot || !currentDay || currentDay > 6) continue;

        for (const employee of employees) {
          const rawActivity = cleanText(row.getCell(employee.col).value);
          if (!rawActivity) {
            emptyCellsIgnored += 1;
            continue;
          }

          const mapped = mapActivity(rawActivity);
          if (mapped.category === "OTHER") unknown.add(rawActivity);

          parsed.push({
            weekOffset,
            employeeName: employee.name,
            dayOfWeek: currentDay,
            startTime: slot.start,
            endTime: slot.end,
            sourceActivity: mapped.sourceActivity,
            category: mapped.category,
            note: mapped.note,
          });
        }
      }
    }

    return {
      parsed,
      emptyCellsIgnored,
      unknownActivities: Array.from(unknown),
      employeeNames: Array.from(new Set(parsed.map((p) => p.employeeName))),
      source: "weeks" as const,
    };
  });
}

export async function importExcelPlanning(params: ImportParams): Promise<ImportSummary> {
  const { fileBuffer, cycleStartMonday, cycleNumber, year, teamId } = params;
  const supabase = createAdminClient();
  const parsedData = await parseWorkbook(fileBuffer);

  const { data: cycle, error: cycleError } = await supabase
    .from("planning_cycles")
    .upsert(
      {
        year,
        cycle_number: cycleNumber,
        start_date: format(cycleStartMonday, "yyyy-MM-dd"),
        end_date: format(addDays(cycleStartMonday, 27), "yyyy-MM-dd"),
        is_active: false,
      },
      { onConflict: "year,cycle_number" }
    )
    .select("id")
    .single();

  if (cycleError || !cycle) throw new Error("Impossible de créer le cycle");

  const weekRows = [0, 1, 2, 3].map((offset) => {
    const weekStart = addDays(cycleStartMonday, offset * 7);
    return {
      cycle_id: cycle.id,
      iso_week_number: getISOWeek(weekStart),
      start_date: format(weekStart, "yyyy-MM-dd"),
      end_date: format(addDays(weekStart, 6), "yyyy-MM-dd"),
    };
  });

  const { error: weekError } = await supabase.from("weeks").upsert(weekRows, {
    onConflict: "cycle_id,iso_week_number",
  });
  if (weekError) throw new Error("Impossible de créer les semaines");

  const { data: weeksData, error: weeksFetchError } = await supabase
    .from("weeks")
    .select("id, start_date")
    .eq("cycle_id", cycle.id)
    .order("start_date", { ascending: true });

  if (weeksFetchError || !weeksData || weeksData.length < 4) {
    throw new Error("Impossible de relire les semaines du cycle");
  }

  const existingEmployees = await supabase
    .from("employees")
    .select("id, full_name")
    .in("full_name", parsedData.employeeNames);

  const existingMap = new Map((existingEmployees.data ?? []).map((e) => [e.full_name, e.id]));
  const missingNames = parsedData.employeeNames.filter((name) => !existingMap.has(name));

  if (missingNames.length > 0) {
    const rows = missingNames.map((full_name) => ({
      full_name,
      type: full_name.toLowerCase().includes("alternant") ? "alternant" : "conseiller",
      team_id: teamId ?? null,
      is_active: true,
    }));

    const { error: insertEmployeesError } = await supabase
      .from("employees")
      .upsert(rows, { onConflict: "full_name" });
    if (insertEmployeesError) throw new Error("Impossible de créer les employés");
  }

  const allEmployees = await supabase
    .from("employees")
    .select("id, full_name")
    .in("full_name", parsedData.employeeNames);
  const employeeMap = new Map((allEmployees.data ?? []).map((e) => [e.full_name, e.id]));

  const assignments = parsedData.parsed
    .map((item) => {
      const employeeId = employeeMap.get(item.employeeName);
      const week = weeksData[item.weekOffset];
      if (!employeeId || !week) return null;
      return {
        week_id: week.id,
        employee_id: employeeId,
        day_of_week: item.dayOfWeek,
        start_time: item.startTime,
        end_time: item.endTime,
        category: item.category,
        notes: item.note,
      };
    })
    .filter(Boolean) as Array<Record<string, unknown>>;

  if (assignments.length === 0) {
    throw new Error("Aucune affectation exploitable trouvée dans le fichier Excel");
  }

  const { error: assignmentError } = await supabase
    .from("assignments")
    .upsert(assignments, { onConflict: "week_id,employee_id,day_of_week,start_time" });

  if (assignmentError) throw new Error("Impossible d'importer les affectations");

  return {
    employeesCreated: missingNames.length,
    employeesReused: parsedData.employeeNames.length - missingNames.length,
    assignmentsImported: assignments.length,
    emptyCellsIgnored: parsedData.emptyCellsIgnored,
    unknownActivitiesCount: parsedData.unknownActivities.length,
    unknownActivities: parsedData.unknownActivities,
    cycleId: cycle.id,
    weekIsoNumbers: weekRows.map((w) => w.iso_week_number),
  };
}
