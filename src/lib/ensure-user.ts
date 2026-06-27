import { supabaseBrowser } from "./supabase-browser";
import type { User } from "@supabase/supabase-js";

// Guests argue instantly. If there's no session yet, mint an anonymous one so
// the vote/take/comment has a user to attach to. That same anonymous user is
// what the /signin "claim" flow later upgrades in place (Google or email) —
// linking the identity instead of creating a new user keeps their data.
//
// Returns null only if anonymous sign-in itself fails (e.g. the provider is
// disabled); callers fall back to sending the guest to /signin.
export async function ensureUser(): Promise<User | null> {
  const supabase = supabaseBrowser();
  const { data } = await supabase.auth.getUser();
  if (data.user) return data.user;
  // Seed a display name: the profiles row is created by an on-signup trigger
  // off raw_user_meta_data.full_name, and profiles.display_name is NOT NULL —
  // an anonymous user has no email to fall back on, so without this the insert
  // (and the whole sign-in) fails.
  const { data: anon, error } = await supabase.auth.signInAnonymously({
    options: { data: { full_name: "Guest" } },
  });
  if (error) return null;
  return anon.user;
}
