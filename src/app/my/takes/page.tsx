import Link from "next/link";
import { redirect } from "next/navigation";
import { Masthead } from "@/components/Masthead";
import { getMyTakes } from "@/lib/queries";
import { supabaseServer } from "@/lib/supabase-server";
import { entityDisplayName } from "@/lib/types";

export default async function MyTakesPage() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/signin?next=/my/takes");

  const takes = await getMyTakes(user.id);

  return (
    <>
      <Masthead />
      <main className="mx-auto w-full max-w-3xl px-4 pb-16 flex-1">
        <h1 className="font-display text-4xl mt-10">My takes</h1>
        <p className="mt-2 text-ink/70">
          Every comparison you&apos;ve published — tap through to edit votes,
          read comments, or share.
        </p>

        {takes.length === 0 ? (
          <p className="mt-8 text-ink/60">
            Nothing here yet.{" "}
            <Link href="/propose" className="underline hover:text-pitch">
              Write your first take
            </Link>
            .
          </p>
        ) : (
          <ul className="mt-8 space-y-3">
            {takes.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/c/${t.slug}`}
                  className="block border-2 border-line bg-whitewash px-4 py-3 rounded-[2px] hover:border-pitch"
                >
                  <p className="font-semibold">
                    {entityDisplayName(t.entity_a)} &asymp;{" "}
                    {entityDisplayName(t.entity_b)}
                  </p>
                  <p className="mt-1 text-sm text-ink/80">{t.verdict_text}</p>
                  <p className="mt-2 font-score text-xs text-ink/50">
                    {new Date(t.created_at).toLocaleDateString()} · {t.agrees}{" "}
                    agree · {t.disagrees} disagree · net {t.net > 0 ? "+" : ""}
                    {t.net}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
