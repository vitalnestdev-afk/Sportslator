"use client";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { Masthead } from "@/components/Masthead";

function SignInForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const params = useSearchParams();
  const next = params.get("next") ?? "/";
  const linkError = params.get("error") === "link";

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const supabase = supabaseBrowser();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${location.origin}/auth/confirm?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) setError(error.message);
    else setSent(true);
  }

  return (
    <main className="mx-auto w-full max-w-md px-4 pb-16 flex-1">
      <h1 className="font-display text-4xl mt-12">Sign in</h1>
      <p className="mt-2 text-ink/70">
        Browsing is free. Arguing needs a name on the team sheet.
      </p>
      {linkError && (
        <p className="mt-4 text-cardred">
          That link was dead or expired. Enter your email and we&apos;ll send a
          fresh one.
        </p>
      )}
      {sent ? (
        <p className="mt-6 border-l-4 border-pitch pl-3">
          Check your inbox — the sign-in link is on its way. You can close this
          tab.
        </p>
      ) : (
        <form onSubmit={send} className="mt-6 flex gap-2">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="flex-1 border-2 border-ink bg-whitewash px-3 py-2 rounded-[2px] focus:outline-none focus:border-pitch"
          />
          <button
            type="submit"
            className="font-display bg-ink text-whitewash px-5 py-2 rounded-[2px] hover:bg-pitch"
          >
            Send link
          </button>
        </form>
      )}
      {error && <p className="mt-3 text-cardred">{error}</p>}
      {/* FUTURE: Google OAuth one-tap once client credentials are configured in Supabase */}
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
