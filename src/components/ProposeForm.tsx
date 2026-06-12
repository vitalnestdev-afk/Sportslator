"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";
import type { Entity } from "@/lib/types";
import { DIMENSION_ORDER, DIMENSION_LABELS } from "@/lib/types";

const DIMENSION_HINTS: Record<string, string> = {
  pedigree: "history, trophies, old money or new",
  trajectory: "where they're headed and how it feels",
  fanbase: "who follows them and what that says",
  city: "what the place puts in the club",
  aura: "clutch-ness, dread, inevitability",
  style: "how they actually play",
};

export function ProposeForm({
  entities,
  sports,
}: {
  entities: Entity[];
  sports: { id: string; name: string; slug: string }[];
}) {
  const router = useRouter();
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [verdict, setVerdict] = useState("");
  const [dims, setDims] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sportName = (e: Entity) =>
    sports.find((s) => s.id === e.sport_id)?.name ?? "";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const supabase = supabaseBrowser();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      router.push(`/signin?next=/propose`);
      return;
    }
    const ea = entities.find((x) => x.id === a)!;
    const eb = entities.find((x) => x.id === b)!;
    let slug = `${ea.slug}-${eb.slug}`;
    const { data: clash } = await supabase
      .from("comparisons")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (clash) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;

    const { data: comp, error: cErr } = await supabase
      .from("comparisons")
      .insert({
        slug,
        entity_a_id: a,
        entity_b_id: b,
        verdict_text: verdict,
        status: "user",
        created_by: auth.user.id,
      })
      .select("id")
      .single();
    if (cErr || !comp) {
      setError(cErr?.message ?? "Couldn't save the take. Try again.");
      setBusy(false);
      return;
    }
    const rows = DIMENSION_ORDER.filter((d) => dims[d]?.trim()).map((d) => ({
      comparison_id: comp.id,
      dimension: d,
      rationale_text: dims[d].trim(),
    }));
    if (rows.length) {
      const { error: dErr } = await supabase
        .from("comparison_dimensions")
        .insert(rows);
      if (dErr) {
        setError(dErr.message);
        setBusy(false);
        return;
      }
    }
    router.push(`/c/${slug}`);
  }

  const valid =
    a && b && a !== b && verdict.trim().length > 4 &&
    DIMENSION_ORDER.every((d) => dims[d]?.trim());

  const select = (value: string, set: (v: string) => void, label: string) => (
    <label className="flex-1">
      <span className="font-score text-xs uppercase text-ink/60">{label}</span>
      <select
        value={value}
        onChange={(e) => set(e.target.value)}
        required
        className="mt-1 w-full border-2 border-ink bg-whitewash px-2 py-2 rounded-[2px] focus:outline-none focus:border-pitch"
      >
        <option value="">pick a club</option>
        {entities.map((e) => (
          <option key={e.id} value={e.id}>
            {e.name} ({sportName(e)})
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <form onSubmit={submit} className="mt-8 space-y-5">
      <div className="flex gap-3 items-end">
        {select(a, setA, "this club…")}
        <span className="font-display text-2xl pb-2">&asymp;</span>
        {select(b, setB, "…is this club")}
      </div>
      <label className="block">
        <span className="font-score text-xs uppercase text-ink/60">
          the verdict, one line
        </span>
        <input
          value={verdict}
          onChange={(e) => setVerdict(e.target.value)}
          maxLength={140}
          placeholder="Say it like you'd say it in the pub."
          className="mt-1 w-full border-2 border-ink bg-whitewash px-3 py-2 rounded-[2px] focus:outline-none focus:border-pitch"
        />
      </label>
      {DIMENSION_ORDER.map((d) => (
        <label key={d} className="block">
          <span className="font-score text-xs uppercase text-pitch">
            {DIMENSION_LABELS[d]}
          </span>
          <input
            value={dims[d] ?? ""}
            onChange={(e) => setDims({ ...dims, [d]: e.target.value })}
            maxLength={200}
            placeholder={DIMENSION_HINTS[d]}
            className="mt-1 w-full border-2 border-line bg-whitewash px-3 py-2 rounded-[2px] focus:outline-none focus:border-pitch"
          />
        </label>
      ))}
      {error && <p className="text-cardred">{error}</p>}
      <button
        disabled={!valid || busy}
        className="font-display text-lg bg-ink text-whitewash px-6 py-2 rounded-[2px] hover:bg-pitch disabled:opacity-40"
      >
        {busy ? "Publishing…" : "Publish the take"}
      </button>
    </form>
  );
}
