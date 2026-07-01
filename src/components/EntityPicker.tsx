"use client";

import { useMemo, useState } from "react";
import { AddPlayerForm } from "./AddPlayerForm";
import type { Entity, EntityType, Sport } from "@/lib/types";
import { entityLabel } from "@/lib/types";

type Props = {
  value: string;
  onChange: (id: string) => void;
  entities: Entity[];
  sports: Sport[];
  label: string;
  excludeId?: string;
  allowedTypes?: EntityType[];
  onEntityAdded?: (entity: Entity) => void;
  extraEntities?: Entity[];
};

export function EntityPicker({
  value,
  onChange,
  entities,
  sports,
  label,
  excludeId,
  allowedTypes = ["club", "player"],
  onEntityAdded,
  extraEntities = [],
}: Props) {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | EntityType>("all");
  const [addingForSport, setAddingForSport] = useState<Sport | null>(null);

  const allEntities = useMemo(() => {
    const byId = new Map<string, Entity>();
    for (const e of [...entities, ...extraEntities]) byId.set(e.id, e);
    return [...byId.values()];
  }, [entities, extraEntities]);

  const sportName = (e: Entity) =>
    sports.find((s) => s.id === e.sport_id)?.name ?? "";

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allEntities
      .filter((e) => allowedTypes.includes(e.type))
      .filter((e) => e.id !== excludeId)
      .filter((e) => typeFilter === "all" || e.type === typeFilter)
      .filter(
        (e) =>
          !q ||
          e.name.toLowerCase().includes(q) ||
          sportName(e).toLowerCase().includes(q)
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allEntities, allowedTypes, excludeId, typeFilter, query, sports]);

  const selected = allEntities.find((e) => e.id === value);

  function handleAdded(entity: Entity) {
    setAddingForSport(null);
    setQuery("");
    onEntityAdded?.(entity);
    onChange(entity.id);
  }

  const canAddPlayer = allowedTypes.includes("player");

  return (
    <div className="flex-1">
      <span className="font-score text-xs uppercase text-ink/60">{label}</span>

      <div className="mt-1 flex gap-2">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as "all" | EntityType)}
          className="border-2 border-line bg-whitewash px-2 py-2 rounded-[2px] font-score text-xs focus:outline-none focus:border-pitch"
          aria-label="Filter by type"
        >
          <option value="all">all</option>
          {allowedTypes.includes("club") && <option value="club">clubs</option>}
          {allowedTypes.includes("player") && (
            <option value="player">players</option>
          )}
        </select>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="search…"
          className="flex-1 border-2 border-line bg-whitewash px-2 py-2 rounded-[2px] font-score text-xs focus:outline-none focus:border-pitch"
        />
      </div>

      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        size={6}
        className="mt-1 w-full border-2 border-ink bg-whitewash px-2 py-1 rounded-[2px] focus:outline-none focus:border-pitch"
      >
        <option value="">pick a club or player</option>
        {filtered.map((e) => (
          <option key={e.id} value={e.id}>
            {entityLabel(e, sportName(e))}
            {e.status === "user" ? " · suggested" : ""}
          </option>
        ))}
      </select>

      {selected && (
        <p className="mt-1 font-score text-xs text-ink/50">
          selected: {entityLabel(selected, sportName(selected))}
        </p>
      )}

      {canAddPlayer && (
        <div className="mt-2">
          {!addingForSport ? (
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              <span className="font-score text-xs text-ink/50">
                missing a player?
              </span>
              {sports.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setAddingForSport(s)}
                  className="font-score text-xs underline hover:text-pitch"
                >
                  add {s.name.toLowerCase()} player
                </button>
              ))}
            </div>
          ) : (
            <AddPlayerForm
              sport={addingForSport}
              entities={allEntities}
              onAdded={handleAdded}
              onCancel={() => setAddingForSport(null)}
            />
          )}
        </div>
      )}
    </div>
  );
}
