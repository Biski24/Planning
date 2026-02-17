import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function POST(request: Request) {
  const form = await request.formData();
  const email = String(form.get("email") ?? "");
  const password = String(form.get("password") ?? "");
  const next = String(form.get("next") ?? "/plannings");

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    const url = new URL("/login", request.url);
    url.searchParams.set("error", error.message);
    return NextResponse.redirect(url);
  }

  return NextResponse.redirect(new URL(next, request.url));
}
