"use client";

import { useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { ensureUser } from "@/lib/ensure-user";
import { scorePlayerMatch } from "@/lib/entities";
import type { Entity, EntityType, ResolvePersonResult, Sport } from "@/lib/types";
import { entityKindLabel } from "@/lib/types";

type Props = {
  sport: Sport;
  entityType: Extract<EntityType, "player" | "coach">;
  entities: Entity[];
  onAdded: (entity: Entity) => void;
  onCancel: () => void;
};

export function AddPersonForm({
  sport,
  entityType,
  entities,
  onAdded,
  onCancel,
}: Props) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ResolvePersonResult | null>(null);

  const kind = entityKindLabel(entityType);

  const sportPeople = useMemo(
    () =>
      entities.filter(
        (e) => e.sport_id === sport.id && e.type === entityType
      ),
    [entities, sport.id, entityType]
  );

  const suggestions = useMemo(() => {
    const trimmed = name.trim();
    if (trimmed.length < 2) return [];
    return sportPeople
      .map((p) => ({ person: p, score: scorePlayerMatch(trimmed, p) }))
      .filter((x) => x.score >= 50)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);
  }, [name, sportPeople]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setBusy(true);

    const supabase = supabaseBrowser();
    const user = await ensureUser();
    if (!user) {
      setError("Sign in to suggest someone.");
      setBusy(false);
      return;
    }

    const { data, error: rpcErr } = await supabase.rpc("resolve_or_create_person", {
      p_sport_slug: sport.slug,
      p_name: name.trim(),
      p_entity_type: entityType,
    });

    setBusy(false);
    if (rpcErr) {
      setError(rpcErr.message);
      return;
    }

    const row = (Array.isArray(data) ? data[0] : data) as
      | ResolvePersonResult
      | undefined;
    if (!row?.entity_id) {
      setError("Couldn't save. Try again.");
      return;
    }

    setResult(row);

    const existing = entities.find((x) => x.id === row.entity_id);
    if (existing) {
      onAdded(existing);
      return;
    }

    onAdded({
      id: row.entity_id,
      name: row.entity_name,
      slug: row.entity_slug,
      type: entityType,
      status: row.matched_existing ? "seed" : "user",
      era: null,
      primary_color: "#177a3d",
      secondary_color: "#1a1e1c",
      sport_id: sport.id,
    });
  }

  return (
    <form
      onSubmit={submit}
      className="mt-2 border-2 border-pitch bg-whitewash p-4 rounded-[2px] space-y-3"
    >
      <p className="font-score text-xs uppercase text-pitch">
        Suggest a {sport.name} {kind}
      </p>
      <p className="text-sm text-ink/70">
        Missing someone? Add them here. If someone already suggested the same{" "}
        {kind} under a different spelling, we&apos;ll link your take to the
        original.
      </p>
      <input
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          setResult(null);
        }}
        placeholder={
          entityType === "coach"
            ? "e.g. Pep Guardiola, Popovich…"
            : "e.g. Mahomes, Kohli, Verstappen…"
        }
        maxLength={80}
        required
        autoFocus
        className="w-full border-2 border-ink bg-chalk px-3 py-2 rounded-[2px] focus:outline-none focus:border-pitch"
      />

      {suggestions.length > 0 && !result && (
        <div className="text-sm">
          <p className="font-score text-xs uppercase text-ink/50 mb-1">
            Already in the database?
          </p>
          <ul className="space-y-1">
            {suggestions.map(({ person }) => (
              <li key={person.id}>
                <button
                  type="button"
                  onClick={() => onAdded(person)}
                  className="underline hover:text-pitch text-left"
                >
                  {person.name}
                  {person.status === "user" && (
                    <span className="text-ink/50"> · community-added</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {result?.matched_existing && (
        <p className="text-sm text-pitch">
          Matched existing {kind}: <strong>{result.entity_name}</strong>. Your
          take will use the canonical entry.
        </p>
      )}

      {error && <p className="text-cardred text-sm">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy || name.trim().length < 2}
          className="font-display text-sm bg-ink text-whitewash px-4 py-1.5 rounded-[2px] hover:bg-pitch disabled:opacity-40"
        >
          {busy ? "Checking…" : `Add ${kind}`}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="font-score text-xs underline text-ink/60 hover:text-ink"
        >
          cancel
        </button>
      </div>
    </form>
  );
}

/** @deprecated use AddPersonForm */
export const AddPlayerForm = AddPersonForm;
