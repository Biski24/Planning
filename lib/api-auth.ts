import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { getSessionFromCookies } from "@/lib/session";

export async function requireAdminApi() {
  const session = await getSessionFromCookies();
  if (!session) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const supabase = createAdminClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", session.profileId)
    .maybeSingle();

  if (!profile || profile.role !== "admin") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { supabase, user: { id: profile.id } };
}

export function redirectBack(request: Request, pathname: string) {
  return NextResponse.redirect(new URL(pathname, request.url));
}
