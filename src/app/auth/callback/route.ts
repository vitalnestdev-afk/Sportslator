import { type NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

// OAuth (PKCE) lands here after Google. Exchange the code for a session —
// this also writes the session cookies — then send them home. Works for both
// linkIdentity (guest upgraded in place) and a plain signInWithOAuth sign-in.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await supabaseServer();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, request.url));
  }
  return NextResponse.redirect(new URL("/signin?error=link", request.url));
}
