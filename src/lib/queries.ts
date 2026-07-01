import { supabaseServer } from "./supabase-server";

const configured = () => true;
import type { Entity, LeaderboardRow, Dimension, Sport } from "./types";

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

export async function getPeople(
  opts?: { sportSlug?: string; type?: Entity["type"] }
): Promise<(Entity & { sport: Sport })[]> {
  if (!configured()) return [];
  const supabase = await supabaseServer();
  const [{ data: sports }, { data: rows }] = await Promise.all([
    supabase.from("sports").select("*"),
    (() => {
      let q = supabase
        .from("entities")
        .select("*")
        .in("type", opts?.type ? [opts.type] : ["player", "coach"])
        .order("name");
      return q;
    })(),
  ]);
  if (!rows || !sports) return [];
  const sportById = new Map((sports as Sport[]).map((s) => [s.id, s]));
  return (rows as Entity[])
    .map((p) => ({ ...p, sport: sportById.get(p.sport_id)! }))
    .filter(
      (p) =>
        p.sport &&
        (!opts?.sportSlug || p.sport.slug === opts.sportSlug)
    );
}

/** @deprecated use getPeople */
export async function getPlayers(sportSlug?: string) {
  return getPeople({ sportSlug, type: "player" });
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
