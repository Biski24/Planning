import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/api-auth";

type AssignmentInput = {
  employee_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  category: string;
  notes?: string | null;
};

export async function POST(request: Request) {
  const admin = await requireAdminApi();
  if (admin.error) return admin.error;

  const body = (await request.json()) as {
    week_id: string;
    items: AssignmentInput[];
    clear?: Array<{ employee_id: string; day_of_week: number; start_time: string }>;
  };

  if (!body.week_id || !Array.isArray(body.items)) {
    return NextResponse.json({ error: "week_id and items required" }, { status: 400 });
  }

  if (Array.isArray(body.clear) && body.clear.length > 0) {
    for (const item of body.clear) {
      await admin.supabase
        .from("assignments")
        .delete()
        .eq("week_id", body.week_id)
        .eq("employee_id", item.employee_id)
        .eq("day_of_week", item.day_of_week)
        .eq("start_time", item.start_time);
    }
  }

  if (body.items.length > 0) {
    const rows = body.items.map((item) => ({ ...item, week_id: body.week_id, notes: item.notes ?? null }));
    const { error } = await admin.supabase
      .from("assignments")
      .upsert(rows, { onConflict: "week_id,employee_id,day_of_week,start_time" });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
