import { supabaseServer } from "./supabase-server";

const configured = () =>
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
import type { Entity, LeaderboardRow, Dimension } from "./types";

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
