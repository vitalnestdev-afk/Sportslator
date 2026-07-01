import { Masthead } from "@/components/Masthead";
import { ProposeForm } from "@/components/ProposeForm";
import { getCompetitions, getSeasons } from "@/lib/queries";
import { supabaseServer } from "@/lib/supabase-server";
import type { Entity } from "@/lib/types";

export default async function ProposePage() {
  const supabase = await supabaseServer();
  const [{ data: clubs }, { data: sports }, seasons, competitions] =
    await Promise.all([
      supabase.from("entities").select("*").eq("type", "club").order("name"),
      supabase.from("sports").select("*"),
      getSeasons(),
      getCompetitions(),
    ]);
  return (
    <>
      <Masthead />
      <main className="mx-auto w-full max-w-3xl px-4 pb-16 flex-1">
        <h1 className="font-display text-4xl mt-10">New take</h1>
        <p className="mt-2 text-ink/70">
          Build an equivalence sentence: pick clubs, players, or coaches across
          any sport — as many slots as you need. Narrow it with a season,
          competition, or era. The crowd decides if you&apos;re right.
        </p>
        <ProposeForm
          clubs={(clubs ?? []) as Entity[]}
          sports={sports ?? []}
          seasons={seasons}
          competitions={competitions}
        />
      </main>
    </>
  );
}
