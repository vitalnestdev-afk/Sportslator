import { Masthead } from "@/components/Masthead";
import { ProposeForm } from "@/components/ProposeForm";
import { supabaseServer } from "@/lib/supabase-server";
import type { Entity } from "@/lib/types";

export default async function ProposePage() {
  const supabase = await supabaseServer();
  const [{ data: entities }, { data: sports }] = await Promise.all([
    supabase.from("entities").select("*").order("name"),
    supabase.from("sports").select("*"),
  ]);
  return (
    <>
      <Masthead />
      <main className="mx-auto w-full max-w-2xl px-4 pb-16 flex-1">
        <h1 className="font-display text-4xl mt-10">New take</h1>
        <p className="mt-2 text-ink/70">
          Pick two clubs, make the case across all six dimensions. It goes live
          immediately — the crowd decides if you&apos;re right.
        </p>
        <ProposeForm
          entities={(entities ?? []) as Entity[]}
          sports={sports ?? []}
        />
      </main>
    </>
  );
}
