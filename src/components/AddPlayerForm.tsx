"use client";

import { useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { ensureUser } from "@/lib/ensure-user";
import { scorePlayerMatch } from "@/lib/entities";
import type { Entity, ResolvePlayerResult, Sport } from "@/lib/types";

type Props = {
  sport: Sport;
  entities: Entity[];
  onAdded: (entity: Entity) => void;
  onCancel: () => void;
};

export function AddPlayerForm({ sport, entities, onAdded, onCancel }: Props) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ResolvePlayerResult | null>(null);

  const sportPlayers = useMemo(
    () => entities.filter((e) => e.sport_id === sport.id && e.type === "player"),
    [entities, sport.id]
  );

  const suggestions = useMemo(() => {
    const trimmed = name.trim();
    if (trimmed.length < 2) return [];
    return sportPlayers
      .map((p) => ({ player: p, score: scorePlayerMatch(trimmed, p) }))
      .filter((x) => x.score >= 50)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);
  }, [name, sportPlayers]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setBusy(true);

    const supabase = supabaseBrowser();
    const user = await ensureUser();
    if (!user) {
      setError("Sign in to suggest a player.");
      setBusy(false);
      return;
    }

    const { data, error: rpcErr } = await supabase.rpc("resolve_or_create_player", {
      p_sport_slug: sport.slug,
      p_name: name.trim(),
    });

    setBusy(false);
    if (rpcErr) {
      setError(rpcErr.message);
      return;
    }

    const row = (Array.isArray(data) ? data[0] : data) as ResolvePlayerResult | undefined;
    if (!row?.entity_id) {
      setError("Couldn't save the player. Try again.");
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
      type: "player",
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
        Suggest a {sport.name} player
      </p>
      <p className="text-sm text-ink/70">
        Missing someone? Add them here. If someone already suggested the same
        player under a different spelling, we&apos;ll link your take to the
        original.
      </p>
      <input
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          setResult(null);
        }}
        placeholder="e.g. Lamine Yamal, Yamal, Messi…"
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
            {suggestions.map(({ player }) => (
              <li key={player.id}>
                <button
                  type="button"
                  onClick={() => onAdded(player)}
                  className="underline hover:text-pitch text-left"
                >
                  {player.name}
                  {player.status === "user" && (
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
          Matched existing player: <strong>{result.entity_name}</strong>. Your
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
          {busy ? "Checking…" : "Add player"}
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
