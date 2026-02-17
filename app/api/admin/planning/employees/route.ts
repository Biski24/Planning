import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/api-auth";

export async function POST(request: Request) {
  const admin = await requireAdminApi();
  if (admin.error) return admin.error;

  const form = await request.formData();
  const fullName = String(form.get("full_name") ?? "").trim();
  const type = String(form.get("type") ?? "conseiller");
  const teamId = String(form.get("team_id") ?? "").trim() || null;

  if (!fullName) return NextResponse.json({ error: "full_name required" }, { status: 400 });

  const { error } = await admin.supabase.from("employees").insert({
    full_name: fullName,
    type,
    team_id: teamId,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function PATCH(request: Request) {
  const admin = await requireAdminApi();
  if (admin.error) return admin.error;

  const body = (await request.json()) as { id: string; is_active?: boolean; full_name?: string; type?: string };
  if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const payload: Record<string, unknown> = {};
  if (typeof body.is_active === "boolean") payload.is_active = body.is_active;
  if (body.full_name) payload.full_name = body.full_name;
  if (body.type) payload.type = body.type;

  const { error } = await admin.supabase.from("employees").update(payload).eq("id", body.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
