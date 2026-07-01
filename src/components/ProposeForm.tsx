"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { ensureUser } from "@/lib/ensure-user";
import {
  equivalenceSlug,
  formatEquivalenceSentence,
  MIN_EQUIVALENCE_SLOTS,
} from "@/lib/equivalence";
import type { Competition, Entity, Season, Sport } from "@/lib/types";
import { DIMENSION_ORDER, DIMENSION_LABELS } from "@/lib/types";
import { ContextSelectors } from "./ContextSelectors";
import { EquivalenceBuilder } from "./EquivalenceBuilder";

const DIMENSION_HINTS: Record<string, string> = {
  pedigree: "history, trophies, legacy, peak years",
  trajectory: "where they're headed and how it feels",
  fanbase: "who follows them and what that says",
  city: "what the place puts in the player/club",
  aura: "clutch-ness, dread, inevitability",
  style: "how they actually play",
};

export function ProposeForm({
  clubs,
  sports,
  seasons,
  competitions,
}: {
  clubs: Entity[];
  sports: Sport[];
  seasons: Season[];
  competitions: Competition[];
}) {
  const router = useRouter();
  const [entityCache, setEntityCache] = useState<Map<string, Entity>>(() => {
    const m = new Map<string, Entity>();
    for (const c of clubs) m.set(c.id, c);
    return m;
  });
  const [slots, setSlots] = useState<string[]>(["", ""]);
  const [scopeSport, setScopeSport] = useState("");
  const [seasonId, setSeasonId] = useState("");
  const [competitionId, setCompetitionId] = useState("");
  const [contextNote, setContextNote] = useState("");
  const [verdict, setVerdict] = useState("");
  const [verdictEdited, setVerdictEdited] = useState(false);
  const [dims, setDims] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addEntity(entity: Entity) {
    setEntityCache((prev) => new Map(prev).set(entity.id, entity));
  }

  useEffect(() => {
    if (verdictEdited) return;
    const filled = slots.filter(Boolean);
    if (filled.length < MIN_EQUIVALENCE_SLOTS) return;
    const members = filled
      .map((id) => entityCache.get(id))
      .filter(Boolean) as Entity[];
    if (members.length !== filled.length) return;
    setVerdict(formatEquivalenceSentence(members));
  }, [slots, entityCache, verdictEdited]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const supabase = supabaseBrowser();
    const user = await ensureUser();
    if (!user) {
      router.push(`/signin?next=/propose`);
      return;
    }

    const resolveEntity = async (id: string) => {
      if (entityCache.has(id)) return entityCache.get(id)!;
      const { data } = await supabase.from("entities").select("*").eq("id", id).single();
      return data as Entity;
    };

    const memberIds = slots.filter(Boolean);
    const members = await Promise.all(memberIds.map(resolveEntity));
    if (members.some((m) => !m)) {
      setError("Couldn't resolve selected sides. Try again.");
      setBusy(false);
      return;
    }

    const unique = new Set(memberIds);
    if (unique.size !== memberIds.length) {
      setError("Each slot must be a different entity.");
      setBusy(false);
      return;
    }

    let slug = equivalenceSlug(members);
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
        entity_a_id: members[0].id,
        entity_b_id: members[1].id,
        verdict_text: verdict,
        status: "user",
        created_by: user.id,
        season_id: seasonId || null,
        competition_id: competitionId || null,
        context_note: contextNote.trim() || null,
      })
      .select("id")
      .single();
    if (cErr || !comp) {
      setError(cErr?.message ?? "Couldn't save the take. Try again.");
      setBusy(false);
      return;
    }

    const memberRows = members.map((m, position) => ({
      comparison_id: comp.id,
      entity_id: m.id,
      position,
    }));
    const { error: mErr } = await supabase
      .from("comparison_members")
      .insert(memberRows);
    if (mErr) {
      setError(mErr.message);
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
    setBusy(false);
    router.push(`/c/${slug}`);
  }

  const filledSlots = slots.filter(Boolean);
  const uniqueSlots = new Set(filledSlots);
  const valid =
    filledSlots.length >= MIN_EQUIVALENCE_SLOTS &&
    uniqueSlots.size === filledSlots.length &&
    verdict.trim().length > 4;

  return (
    <form onSubmit={submit} className="mt-8 space-y-5">
      <EquivalenceBuilder
        slots={slots}
        onChange={setSlots}
        clubs={clubs}
        sports={sports}
        onEntityAdded={addEntity}
      />

      <ContextSelectors
        sports={sports}
        seasons={seasons}
        competitions={competitions}
        scopeSport={scopeSport}
        onScopeSportChange={setScopeSport}
        seasonId={seasonId}
        onSeasonChange={setSeasonId}
        competitionId={competitionId}
        onCompetitionChange={setCompetitionId}
        contextNote={contextNote}
        onContextNoteChange={setContextNote}
      />

      <label className="block">
        <span className="font-score text-xs uppercase text-ink/60">
          the verdict — your equivalence sentence
        </span>
        <input
          value={verdict}
          onChange={(e) => {
            setVerdictEdited(true);
            setVerdict(e.target.value);
          }}
          maxLength={200}
          placeholder="Auto-fills from your picks — edit to sharpen the take."
          className="mt-1 w-full border-2 border-ink bg-whitewash px-3 py-2 rounded-[2px] focus:outline-none focus:border-pitch"
        />
      </label>

      <fieldset className="space-y-4">
        <legend className="font-score text-xs uppercase text-ink/60">
          why they&apos;re equivalent (optional — add any that apply)
        </legend>
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
      </fieldset>

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
