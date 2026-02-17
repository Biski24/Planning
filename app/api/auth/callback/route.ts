import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { createSessionToken, SESSION_COOKIE_NAME } from "@/lib/session";

export async function POST(request: Request) {
  const form = await request.formData();
  const identifier = String(form.get("identifier") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const next = String(form.get("next") ?? "/plannings");

  if (!identifier || !password) {
    const url = new URL("/login", request.url);
    url.searchParams.set("error", "identifiant_ou_mdp_invalide");
    return NextResponse.redirect(url);
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("authenticate_app_user", {
    p_username: identifier,
    p_password: password,
  });

  const user = Array.isArray(data) ? data[0] : null;

  if (error || !user?.profile_id) {
    const url = new URL("/login", request.url);
    url.searchParams.set("error", "identifiant_ou_mdp_invalide");
    return NextResponse.redirect(url);
  }

  const sessionToken = await createSessionToken(user.profile_id);
  const response = NextResponse.redirect(new URL(next, request.url));
  response.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });

  return response;
}
