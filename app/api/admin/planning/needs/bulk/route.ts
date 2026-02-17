import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/api-auth";

type NeedInput = {
  day_of_week: number;
  start_time: string;
  end_time: string;
  category: string;
  required_count: number;
};

export async function POST(request: Request) {
  const admin = await requireAdminApi();
  if (admin.error) return admin.error;

  const body = (await request.json()) as { week_id: string; items: NeedInput[] };
  if (!body.week_id || !Array.isArray(body.items)) {
    return NextResponse.json({ error: "week_id and items required" }, { status: 400 });
  }

  const rows = body.items.map((item) => ({ ...item, week_id: body.week_id }));
  const { error } = await admin.supabase
    .from("need_slots")
    .upsert(rows, { onConflict: "week_id,day_of_week,start_time,category" });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
