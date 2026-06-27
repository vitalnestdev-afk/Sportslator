"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";
import type { User } from "@supabase/supabase-js";

export function AuthStatus() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const supabase = supabaseBrowser();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!ready) return <span className="font-score text-xs">&nbsp;</span>;
  if (!user)
    return (
      <Link href="/signin" className="font-score text-xs underline hover:text-pitch">
        sign in
      </Link>
    );
  if (user.is_anonymous)
    return (
      <Link href="/signin" className="font-score text-xs underline hover:text-pitch">
        guest · claim
      </Link>
    );
  return (
    <span className="font-score text-xs flex items-center gap-2">
      {user.email?.split("@")[0]}
      <button
        className="underline hover:text-cardred"
        onClick={async () => {
          await supabaseBrowser().auth.signOut();
          router.refresh();
        }}
      >
        out
      </button>
    </span>
  );
}
