"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AddPersonForm } from "./AddPersonForm";
import { supabaseBrowser } from "@/lib/supabase-browser";
import type { Entity, EntityType, Sport } from "@/lib/types";
import { entityLabel } from "@/lib/types";

type Props = {
  value: string;
  onChange: (id: string) => void;
  sports: Sport[];
  clubs: Entity[];
  label: string;
  excludeId?: string;
  excludeIds?: string[];
  allowedTypes?: EntityType[];
  onEntityAdded?: (entity: Entity) => void;
};

export function EntityPicker({
  value,
  onChange,
  sports,
  clubs,
  label,
  excludeId,
  excludeIds = [],
  allowedTypes = ["club", "player", "coach"],
  onEntityAdded,
}: Props) {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | EntityType>("all");
  const [sportFilter, setSportFilter] = useState("");
  const [results, setResults] = useState<Entity[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<Entity | null>(null);
  const [adding, setAdding] = useState<{
    sport: Sport;
    type: "player" | "coach";
  } | null>(null);
  const [cache, setCache] = useState<Map<string, Entity>>(() => {
    const m = new Map<string, Entity>();
    for (const c of clubs) m.set(c.id, c);
    return m;
  });

  const sportName = useCallback(
    (e: Entity) => sports.find((s) => s.id === e.sport_id)?.name ?? "",
    [sports]
  );

  const excluded = useMemo(() => {
    const set = new Set(excludeIds);
    if (excludeId) set.add(excludeId);
    return set;
  }, [excludeId, excludeIds]);

  useEffect(() => {
    if (value && cache.has(value)) setSelected(cache.get(value)!);
  }, [value, cache]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2 && !sportFilter) {
      setResults(
        clubs.filter(
          (c) =>
            allowedTypes.includes(c.type) &&
            !excluded.has(c.id) &&
            (typeFilter === "all" || c.type === typeFilter)
        )
      );
      return;
    }

    const t = setTimeout(async () => {
      setSearching(true);
      const supabase = supabaseBrowser();
      let req = supabase
        .from("entities")
        .select("*")
        .order("name")
        .limit(60);

      if (sportFilter) {
        const sport = sports.find((s) => s.slug === sportFilter);
        if (sport) req = req.eq("sport_id", sport.id);
      }

      const types =
        typeFilter === "all"
          ? allowedTypes
          : [typeFilter].filter((t) => allowedTypes.includes(t));
      if (types.length === 1) req = req.eq("type", types[0]);
      else if (types.length) req = req.in("type", types);

      if (q.length >= 2) {
        req = req.or(
          `name.ilike.%${q.replace(/[%_]/g, "")}%,disambiguator.ilike.%${q.replace(/[%_]/g, "")}%`
        );
      }

      const { data } = await req;
      setSearching(false);
      const rows = ((data ?? []) as Entity[]).filter((e) => !excluded.has(e.id));
      setResults(rows);
      setCache((prev) => {
        const next = new Map(prev);
        for (const r of rows) next.set(r.id, r);
        return next;
      });
    }, 250);

    return () => clearTimeout(t);
  }, [query, sportFilter, typeFilter, clubs, allowedTypes, excluded, sports]);

  const displayResults = useMemo(() => {
    if (query.trim().length < 2 && !sportFilter) return results;
    return results;
  }, [query, sportFilter, results]);

  function pick(entity: Entity) {
    setSelected(entity);
    setCache((prev) => new Map(prev).set(entity.id, entity));
    onChange(entity.id);
  }

  function handleAdded(entity: Entity) {
    setAdding(null);
    setQuery("");
    setCache((prev) => new Map(prev).set(entity.id, entity));
    onEntityAdded?.(entity);
    pick(entity);
  }

  const canAddPlayer = allowedTypes.includes("player");
  const canAddCoach = allowedTypes.includes("coach");

  return (
    <div className="flex-1">
      <span className="font-score text-xs uppercase text-ink/60">{label}</span>

      <div className="mt-1 flex flex-wrap gap-2">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as "all" | EntityType)}
          className="border-2 border-line bg-whitewash px-2 py-2 rounded-[2px] font-score text-xs"
          aria-label="Filter by type"
        >
          <option value="all">all types</option>
          {allowedTypes.includes("club") && <option value="club">clubs</option>}
          {allowedTypes.includes("player") && <option value="player">players</option>}
          {allowedTypes.includes("coach") && <option value="coach">coaches</option>}
        </select>
        <select
          value={sportFilter}
          onChange={(e) => setSportFilter(e.target.value)}
          className="border-2 border-line bg-whitewash px-2 py-2 rounded-[2px] font-score text-xs"
          aria-label="Filter by sport"
        >
          <option value="">any sport</option>
          {sports.map((s) => (
            <option key={s.id} value={s.slug}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search 100k+ stars — type a name…"
        className="mt-1 w-full border-2 border-ink bg-whitewash px-3 py-2 rounded-[2px] focus:outline-none focus:border-pitch"
      />

      <p className="mt-1 font-score text-xs text-ink/50">
        {searching
          ? "Searching…"
          : query.trim().length < 2 && !sportFilter
            ? "Showing clubs — type 2+ letters to search the full roster"
            : `${displayResults.length} matches`}
      </p>

      <ul
        className="mt-1 max-h-48 overflow-y-auto border-2 border-line bg-whitewash rounded-[2px] divide-y divide-line"
        role="listbox"
      >
        {displayResults.map((e) => (
          <li key={e.id}>
            <button
              type="button"
              onClick={() => pick(e)}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-chalk ${value === e.id ? "bg-pitch/10 font-semibold" : ""}`}
            >
              {entityLabel(e, sportName(e))}
              {e.status === "user" ? " · suggested" : ""}
            </button>
          </li>
        ))}
        {!searching && displayResults.length === 0 && (
          <li className="px-3 py-4 text-sm text-ink/50">No matches — try adding them below.</li>
        )}
      </ul>

      {selected && value && (
        <p className="mt-1 font-score text-xs text-pitch">
          locked in: {entityLabel(selected, sportName(selected))}
        </p>
      )}

      {(canAddPlayer || canAddCoach) && (
        <div className="mt-2">
          {!adding ? (
            <div className="space-y-1">
              <span className="font-score text-xs text-ink/50 block">missing someone?</span>
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                {sports.flatMap((s) => {
                  const links: React.ReactNode[] = [];
                  if (canAddPlayer)
                    links.push(
                      <button
                        key={`${s.id}-p`}
                        type="button"
                        onClick={() => setAdding({ sport: s, type: "player" })}
                        className="font-score text-xs underline hover:text-pitch"
                      >
                        + {s.name.toLowerCase()} player
                      </button>
                    );
                  if (canAddCoach)
                    links.push(
                      <button
                        key={`${s.id}-c`}
                        type="button"
                        onClick={() => setAdding({ sport: s, type: "coach" })}
                        className="font-score text-xs underline hover:text-pitch"
                      >
                        + {s.name.toLowerCase()} coach
                      </button>
                    );
                  return links;
                })}
              </div>
            </div>
          ) : (
            <AddPersonForm
              sport={adding.sport}
              entityType={adding.type}
              entities={[...cache.values()]}
              onAdded={handleAdded}
              onCancel={() => setAdding(null)}
            />
          )}
        </div>
      )}
    </div>
  );
}
