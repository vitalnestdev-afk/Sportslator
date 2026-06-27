"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { ensureUser } from "@/lib/ensure-user";
import { VoteBar } from "./VoteBar";

type V = "agree" | "disagree";

export function VoteButtons({
  comparisonId,
  agrees,
  disagrees,
}: {
  comparisonId: string;
  agrees: number;
  disagrees: number;
}) {
  const router = useRouter();
  const [mine, setMine] = useState<V | null>(null);
  // optimistic deltas
  const [delta, setDelta] = useState({ agree: 0, disagree: 0 });

  useEffect(() => {
    const supabase = supabaseBrowser();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: v } = await supabase
        .from("votes")
        .select("value")
        .eq("comparison_id", comparisonId)
        .eq("user_id", data.user.id)
        .maybeSingle();
      if (v) setMine(v.value as V);
    });
  }, [comparisonId]);

  async function vote(value: V) {
    const supabase = supabaseBrowser();
    const user = await ensureUser();
    if (!user) {
      router.push(`/signin?next=${encodeURIComponent(location.pathname)}`);
      return;
    }
    const prev = mine;
    if (prev === value) return;
    setMine(value);
    setDelta((d) => ({
      agree: d.agree + (value === "agree" ? 1 : 0) - (prev === "agree" ? 1 : 0),
      disagree:
        d.disagree + (value === "disagree" ? 1 : 0) - (prev === "disagree" ? 1 : 0),
    }));
    const { error } = await supabase
      .from("votes")
      .upsert(
        { comparison_id: comparisonId, user_id: user.id, value },
        { onConflict: "comparison_id,user_id" }
      );
    if (error) {
      setMine(prev);
      setDelta({ agree: 0, disagree: 0 });
    } else {
      router.refresh();
    }
  }

  const btn = (value: V, label: string, activeClass: string) => (
    <button
      onClick={() => vote(value)}
      aria-pressed={mine === value}
      className={`font-display text-lg px-5 py-2 rounded-[2px] border-2 transition-colors ${
        mine === value
          ? activeClass
          : "border-ink bg-whitewash hover:border-pitch"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div>
      <VoteBar agrees={agrees + delta.agree} disagrees={disagrees + delta.disagree} />
      <div className="mt-3 flex gap-3">
        {btn("agree", "Agree", "border-pitch bg-pitch text-whitewash")}
        {btn("disagree", "Call it wrong", "border-cardred bg-cardred text-whitewash")}
      </div>
    </div>
  );
}
