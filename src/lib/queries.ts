import { supabaseServer } from "./supabase-server";

const configured = () => true;
import type { Entity, EntityType, LeaderboardRow, Dimension, Sport, UserTakeRow } from "./types";

export async function getSports(): Promise<Sport[]> {
  if (!configured()) return [];
  const supabase = await supabaseServer();
  const { data } = await supabase.from("sports").select("*").order("name");
  return (data ?? []) as Sport[];
}

export async function getEntities(type?: Entity["type"]): Promise<Entity[]> {
  if (!configured()) return [];
  const supabase = await supabaseServer();
  let q = supabase.from("entities").select("*").order("name");
  if (type) q = q.eq("type", type);
  const { data } = await q;
  return (data ?? []) as Entity[];
}

export async function searchEntities(opts: {
  q?: string;
  sportSlug?: string;
  type?: EntityType | EntityType[];
  limit?: number;
  offset?: number;
}): Promise<(Entity & { sport: Sport })[]> {
  if (!configured()) return [];
  const supabase = await supabaseServer();
  const limit = opts.limit ?? 80;
  const offset = opts.offset ?? 0;

  const [{ data: sports }, sportFilter] = await Promise.all([
    supabase.from("sports").select("*"),
    opts.sportSlug
      ? supabase.from("sports").select("id").eq("slug", opts.sportSlug).single()
      : Promise.resolve({ data: null }),
  ]);

  let q = supabase.from("entities").select("*").order("name").range(offset, offset + limit - 1);

  if (opts.sportSlug && sportFilter.data?.id) {
    q = q.eq("sport_id", sportFilter.data.id);
  }

  const types = opts.type
    ? Array.isArray(opts.type)
      ? opts.type
      : [opts.type]
    : null;
  if (types?.length === 1) q = q.eq("type", types[0]);
  else if (types?.length) q = q.in("type", types);

  const query = opts.q?.trim();
  if (query) {
    q = q.or(
      `name.ilike.%${query.replace(/[%_]/g, "")}%,disambiguator.ilike.%${query.replace(/[%_]/g, "")}%`
    );
  } else if (!opts.sportSlug) {
    // Avoid dumping entire 100k roster without a filter
    q = q.in("type", ["club"]);
  }

  const { data: rows } = await q;
  if (!rows || !sports) return [];
  const sportById = new Map((sports as Sport[]).map((s) => [s.id, s]));
  return (rows as Entity[])
    .map((e) => ({ ...e, sport: sportById.get(e.sport_id)! }))
    .filter((e) => e.sport);
}

export async function countPeople(opts?: {
  sportSlug?: string;
  type?: Entity["type"];
}): Promise<number> {
  if (!configured()) return 0;
  const supabase = await supabaseServer();
  let q = supabase
    .from("entities")
    .select("id", { count: "exact", head: true })
    .in("type", opts?.type ? [opts.type] : ["player", "coach"]);

  if (opts?.sportSlug) {
    const { data: sport } = await supabase
      .from("sports")
      .select("id")
      .eq("slug", opts.sportSlug)
      .single();
    if (sport) q = q.eq("sport_id", sport.id);
  }
  const { count } = await q;
  return count ?? 0;
}

export async function getPeople(
  opts?: {
    sportSlug?: string;
    type?: Entity["type"];
    q?: string;
    limit?: number;
    offset?: number;
  }
): Promise<(Entity & { sport: Sport })[]> {
  return searchEntities({
    q: opts?.q,
    sportSlug: opts?.sportSlug,
    type: opts?.type ?? ["player", "coach"],
    limit: opts?.limit ?? 120,
    offset: opts?.offset ?? 0,
  });
}

export async function getMyTakes(userId: string): Promise<UserTakeRow[]> {
  if (!configured()) return [];
  const supabase = await supabaseServer();
  const { data: rows } = await supabase
    .from("comparisons")
    .select("id, slug, verdict_text, created_at, entity_a_id, entity_b_id")
    .eq("created_by", userId)
    .neq("status", "hidden")
    .order("created_at", { ascending: false });

  if (!rows?.length) return [];

  const entityIds = [
    ...new Set(rows.flatMap((r) => [r.entity_a_id, r.entity_b_id])),
  ];
  const compIds = rows.map((r) => r.id);

  const [{ data: entities }, { data: votes }] = await Promise.all([
    supabase.from("entities").select("*").in("id", entityIds),
    supabase.from("votes").select("comparison_id, value").in("comparison_id", compIds),
  ]);

  const byId = new Map((entities as Entity[] | null)?.map((e) => [e.id, e]));
  const tallies = new Map<string, { agrees: number; disagrees: number }>();
  for (const id of compIds) tallies.set(id, { agrees: 0, disagrees: 0 });
  for (const v of votes ?? []) {
    const t = tallies.get(v.comparison_id);
    if (!t) continue;
    if (v.value === "agree") t.agrees++;
    else t.disagrees++;
  }

  return rows
    .map((r) => {
      const t = tallies.get(r.id)!;
      return {
        ...r,
        agrees: t.agrees,
        disagrees: t.disagrees,
        net: t.agrees - t.disagrees,
        entity_a: byId.get(r.entity_a_id)!,
        entity_b: byId.get(r.entity_b_id)!,
      };
    })
    .filter((r) => r.entity_a && r.entity_b) as UserTakeRow[];
}

export async function getLeaderboard(): Promise<LeaderboardRow[]> {
  if (!configured()) return [];
  const supabase = await supabaseServer();
  const [{ data: rows }, { data: entities }] = await Promise.all([
    supabase.from("leaderboard").select("*"),
    supabase.from("entities").select("*"),
  ]);
  if (!rows || !entities) return [];
  const byId = new Map((entities as Entity[]).map((e) => [e.id, e]));
  return rows
    .map((r) => ({
      ...r,
      entity_a: byId.get(r.entity_a_id)!,
      entity_b: byId.get(r.entity_b_id)!,
    }))
    .filter((r) => r.entity_a && r.entity_b)
    .sort(
      (a, b) =>
        b.net - a.net ||
        b.agrees + b.disagrees - (a.agrees + a.disagrees) ||
        a.slug.localeCompare(b.slug)
    );
}

export async function getComparison(slug: string) {
  if (!configured()) return null;
  const supabase = await supabaseServer();
  const { data: row } = await supabase
    .from("leaderboard")
    .select("*")
    .eq("slug", slug)
    .single();
  if (!row) return null;
  const [{ data: entities }, { data: dims }] = await Promise.all([
    supabase
      .from("entities")
      .select("*")
      .in("id", [row.entity_a_id, row.entity_b_id]),
    supabase
      .from("comparison_dimensions")
      .select("dimension, rationale_text")
      .eq("comparison_id", row.id),
  ]);
  const byId = new Map((entities as Entity[] | null)?.map((e) => [e.id, e]));
  return {
    ...row,
    entity_a: byId.get(row.entity_a_id)!,
    entity_b: byId.get(row.entity_b_id)!,
    dimensions: (dims ?? []) as Dimension[],
  } as LeaderboardRow & { dimensions: Dimension[] };
}
