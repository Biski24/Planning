import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/api-auth";

export async function POST() {
  const admin = await requireAdminApi();
  if (admin.error) return admin.error;

  return NextResponse.json({
    ok: true,
    message: "CSV import endpoint stub ready. TODO: parser + validation + upsert.",
  });
}
