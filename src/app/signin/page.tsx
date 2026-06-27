"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { Masthead } from "@/components/Masthead";

function SignInForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // null while we don't yet know; true once we've confirmed a guest session.
  const [isGuest, setIsGuest] = useState<boolean | null>(null);
  const params = useSearchParams();
  const next = params.get("next") ?? "/";
  const linkError = params.get("error") === "link";

  useEffect(() => {
    supabaseBrowser()
      .auth.getUser()
      .then(({ data }) => setIsGuest(!!data.user?.is_anonymous));
  }, []);

  // Primary path. Google never touches email and is one tap.
  async function withGoogle() {
    setError(null);
    const supabase = supabaseBrowser();
    const redirectTo = `${location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    const { data } = await supabase.auth.getUser();

    if (data.user?.is_anonymous) {
      // Upgrade the guest in place — link Google to the existing user so their
      // votes/takes/comments come with them.
      const { error } = await supabase.auth.linkIdentity({
        provider: "google",
        options: { redirectTo },
      });
      // That Google identity already lives on another account — just sign in.
      if (error) {
        await supabase.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo },
        });
      }
    } else {
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });
    }
  }

  // Fallback path for people who refuse Google.
  async function withEmail(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const supabase = supabaseBrowser();
    const emailRedirectTo = `${location.origin}/auth/confirm?next=${encodeURIComponent(next)}`;
    const { data } = await supabase.auth.getUser();

    const { error } = data.user?.is_anonymous
      ? // Converts the guest: sends a confirmation that attaches this email.
        await supabase.auth.updateUser({ email }, { emailRedirectTo })
      : await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo } });

    if (error) setError(error.message);
    else setSent(true);
  }

  return (
    <main className="mx-auto w-full max-w-md px-4 pb-16 flex-1">
      {isGuest ? (
        <>
          <h1 className="font-display text-4xl mt-12">
            Put a name on the team sheet
          </h1>
          <p className="mt-2 text-ink/70">
            Arguing as a guest. Claim your account to keep your takes, votes and
            comments — they carry over.
          </p>
        </>
      ) : (
        <>
          <h1 className="font-display text-4xl mt-12">Sign in</h1>
          <p className="mt-2 text-ink/70">
            Browsing is free. Arguing needs a name on the team sheet.
          </p>
        </>
      )}

      {linkError && (
        <p className="mt-4 text-cardred">
          That link was dead or expired. Try Google, or enter your email for a
          fresh one.
        </p>
      )}

      {sent ? (
        <p className="mt-6 border-l-4 border-pitch pl-3">
          Check your inbox — the link is on its way. You can close this tab.
        </p>
      ) : (
        <div className="mt-6">
          <button
            onClick={withGoogle}
            className="font-display w-full bg-ink text-whitewash px-5 py-3 rounded-[2px] hover:bg-pitch"
          >
            Continue with Google
          </button>

          <p className="mt-6 font-score text-xs uppercase text-ink/50">
            or use your email
          </p>
          <form onSubmit={withEmail} className="mt-2 flex gap-2">
            <input
              type="email"
              required
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              placeholder="you@example.com"
              className="flex-1 border-2 border-ink bg-whitewash px-3 py-2 rounded-[2px] focus:outline-none focus:border-pitch"
            />
            <button
              type="submit"
              className="font-display border-2 border-ink px-5 py-2 rounded-[2px] hover:border-pitch hover:text-pitch"
            >
              Send link
            </button>
          </form>
        </div>
      )}
      {error && <p className="mt-3 text-cardred">{error}</p>}
    </main>
  );
}

export default function SignInPage() {
  return (
    <>
      <Masthead />
      <Suspense>
        <SignInForm />
      </Suspense>
    </>
  );
}
