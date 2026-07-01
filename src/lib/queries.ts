import { supabaseServer } from "./supabase-server";

const configured = () => true;
import type {
  Entity,
  EntityType,
  LeaderboardRow,
  Dimension,
  Sport,
  UserTakeRow,
  Season,
  Competition,
  MembershipClub,
} from "./types";
import { formatEquivalenceSentence } from "./equivalence";

export async function getSports(): Promise<Sport[]> {
  if (!configured()) return [];
  const supabase = await supabaseServer();
  const { data } = await supabase.from("sports").select("*").order("name");
  return (data ?? []) as Sport[];
}

export async function getSeasons(): Promise<Season[]> {
  if (!configured()) return [];
  const supabase = await supabaseServer();
  const { data } = await supabase
    .from("seasons")
    .select("*")
    .order("year_start", { ascending: false });
  return (data ?? []) as Season[];
}

export async function getCompetitions(): Promise<Competition[]> {
  if (!configured()) return [];
  const supabase = await supabaseServer();
  const { data } = await supabase.from("competitions").select("*").order("name");
  return (data ?? []) as Competition[];
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

export function membersLabel(members: Entity[]): string {
  return formatEquivalenceSentence(members);
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

  const [{ data: entities }, { data: votes }, { data: memberRows }] =
    await Promise.all([
      supabase.from("entities").select("*").in("id", entityIds),
      supabase.from("votes").select("comparison_id, value").in("comparison_id", compIds),
      supabase
        .from("comparison_members")
        .select("comparison_id, entity_id, position")
        .in("comparison_id", compIds)
        .order("position"),
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

  const membersByComp = new Map<string, Entity[]>();
  for (const m of memberRows ?? []) {
    const entity = byId.get(m.entity_id);
    if (!entity) continue;
    const list = membersByComp.get(m.comparison_id) ?? [];
    list.push(entity);
    membersByComp.set(m.comparison_id, list);
  }

  return rows
    .map((r) => {
      const t = tallies.get(r.id)!;
      const members =
        membersByComp.get(r.id) ??
        ([byId.get(r.entity_a_id), byId.get(r.entity_b_id)].filter(Boolean) as Entity[]);
      return {
        ...r,
        agrees: t.agrees,
        disagrees: t.disagrees,
        net: t.agrees - t.disagrees,
        entity_a: byId.get(r.entity_a_id)!,
        entity_b: byId.get(r.entity_b_id)!,
        members,
      };
    })
    .filter((r) => r.entity_a && r.entity_b) as UserTakeRow[];
}

export async function getLeaderboard(): Promise<LeaderboardRow[]> {
  if (!configured()) return [];
  const supabase = await supabaseServer();
  const { data: rows } = await supabase.from("leaderboard").select("*");
  if (!rows?.length) return [];

  const compIds = rows.map((r) => r.id);
  const { data: memberRows } = await supabase
    .from("comparison_members")
    .select("comparison_id, entity_id, position")
    .in("comparison_id", compIds)
    .order("position");

  const entityIds = new Set<string>();
  for (const r of rows) {
    entityIds.add(r.entity_a_id);
    entityIds.add(r.entity_b_id);
  }
  for (const m of memberRows ?? []) entityIds.add(m.entity_id);

  const { data: entities } = await supabase
    .from("entities")
    .select("*")
    .in("id", [...entityIds]);

  const byId = new Map((entities as Entity[] | null)?.map((e) => [e.id, e]));
  const membersByComp = new Map<string, Entity[]>();
  for (const m of memberRows ?? []) {
    const entity = byId.get(m.entity_id);
    if (!entity) continue;
    const list = membersByComp.get(m.comparison_id) ?? [];
    list.push(entity);
    membersByComp.set(m.comparison_id, list);
  }

  return rows
    .map((r) => {
      const members =
        membersByComp.get(r.id) ??
        ([byId.get(r.entity_a_id), byId.get(r.entity_b_id)].filter(Boolean) as Entity[]);
      return {
        ...r,
        members,
        entity_a: members[0] ?? byId.get(r.entity_a_id)!,
        entity_b: members[1] ?? byId.get(r.entity_b_id)!,
      };
    })
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

  const [{ data: memberRows }, { data: dims }, seasonQ, compQ] = await Promise.all([
    supabase
      .from("comparison_members")
      .select("entity_id, position")
      .eq("comparison_id", row.id)
      .order("position"),
    supabase
      .from("comparison_dimensions")
      .select("dimension, rationale_text")
      .eq("comparison_id", row.id),
    row.season_id
      ? supabase.from("seasons").select("*").eq("id", row.season_id).single()
      : Promise.resolve({ data: null }),
    row.competition_id
      ? supabase.from("competitions").select("*").eq("id", row.competition_id).single()
      : Promise.resolve({ data: null }),
  ]);

  const memberIds =
    memberRows?.length
      ? memberRows.map((m) => m.entity_id)
      : [row.entity_a_id, row.entity_b_id];

  const { data: entities } = await supabase
    .from("entities")
    .select("*")
    .in("id", memberIds);

  const byId = new Map((entities as Entity[] | null)?.map((e) => [e.id, e]));
  const members = memberIds
    .map((id) => byId.get(id))
    .filter(Boolean) as Entity[];

  return {
    ...row,
    entity_a: members[0] ?? byId.get(row.entity_a_id)!,
    entity_b: members[1] ?? byId.get(row.entity_b_id)!,
    members,
    season: seasonQ.data as Season | null,
    competition: compQ.data as Competition | null,
    dimensions: (dims ?? []) as Dimension[],
  } as LeaderboardRow & {
    members: Entity[];
    dimensions: Dimension[];
    season: Season | null;
    competition: Competition | null;
  };
}

export async function getClubs(opts?: {
  sportSlug?: string;
  q?: string;
  limit?: number;
}): Promise<Entity[]> {
  if (!configured()) return [];
  const supabase = await supabaseServer();
  let q = supabase
    .from("entities")
    .select("*")
    .eq("type", "club")
    .order("name")
    .limit(opts?.limit ?? 500);

  if (opts?.sportSlug) {
    const { data: sport } = await supabase
      .from("sports")
      .select("id")
      .eq("slug", opts.sportSlug)
      .single();
    if (sport) q = q.eq("sport_id", sport.id);
  }
  if (opts?.q?.trim()) {
    q = q.ilike("name", `%${opts.q.replace(/[%_]/g, "")}%`);
  }
  const { data } = await q;
  return (data ?? []) as Entity[];
}

export async function getMembershipClubs(
  personId: string,
  limit = 14
): Promise<MembershipClub[]> {
  if (!configured()) return [];
  const supabase = await supabaseServer();
  const { data: rows } = await supabase
    .from("entity_memberships")
    .select("is_primary, season_start, season_end, club_id")
    .eq("person_id", personId)
    .order("is_primary", { ascending: false })
    .limit(limit);

  if (!rows?.length) return [];
  const clubIds = rows.map((r) => r.club_id);
  const { data: clubs } = await supabase
    .from("entities")
    .select("*")
    .in("id", clubIds);

  const byId = new Map((clubs as Entity[] | null)?.map((c) => [c.id, c]));
  return rows
    .map((r) => {
      const club = byId.get(r.club_id);
      if (!club) return null;
      return {
        ...club,
        is_primary: r.is_primary,
        season_start: r.season_start,
        season_end: r.season_end,
      };
    })
    .filter(Boolean) as MembershipClub[];
}

async function hydrateLeaderboardRows(
  rows: Record<string, unknown>[]
): Promise<LeaderboardRow[]> {
  if (!rows.length) return [];
  const supabase = await supabaseServer();
  const compIds = rows.map((r) => r.id as string);
  const { data: memberRows } = await supabase
    .from("comparison_members")
    .select("comparison_id, entity_id, position")
    .in("comparison_id", compIds)
    .order("position");

  const entityIds = new Set<string>();
  for (const r of rows) {
    entityIds.add(r.entity_a_id as string);
    entityIds.add(r.entity_b_id as string);
  }
  for (const m of memberRows ?? []) entityIds.add(m.entity_id);

  const { data: entities } = await supabase
    .from("entities")
    .select("*")
    .in("id", [...entityIds]);

  const byId = new Map((entities as Entity[] | null)?.map((e) => [e.id, e]));
  const membersByComp = new Map<string, Entity[]>();
  for (const m of memberRows ?? []) {
    const entity = byId.get(m.entity_id);
    if (!entity) continue;
    const list = membersByComp.get(m.comparison_id) ?? [];
    list.push(entity);
    membersByComp.set(m.comparison_id, list);
  }

  return rows
    .map((r) => {
      const members =
        membersByComp.get(r.id as string) ??
        ([byId.get(r.entity_a_id as string), byId.get(r.entity_b_id as string)].filter(
          Boolean
        ) as Entity[]);
      return {
        ...r,
        members,
        entity_a: members[0] ?? byId.get(r.entity_a_id as string)!,
        entity_b: members[1] ?? byId.get(r.entity_b_id as string)!,
      } as LeaderboardRow;
    })
    .filter((r) => r.entity_a && r.entity_b);
}

export async function getTakes(opts?: {
  sportSlug?: string;
  seasonId?: string;
  competitionId?: string;
  entityId?: string;
  q?: string;
  limit?: number;
  offset?: number;
}): Promise<{ rows: LeaderboardRow[]; total: number }> {
  if (!configured()) return { rows: [], total: 0 };
  const supabase = await supabaseServer();
  const limit = opts?.limit ?? 40;
  const offset = opts?.offset ?? 0;

  let comparisonIds: string[] | null = null;
  if (opts?.entityId) {
    const { data: mem } = await supabase
      .from("comparison_members")
      .select("comparison_id")
      .eq("entity_id", opts.entityId);
    comparisonIds = [...new Set((mem ?? []).map((m) => m.comparison_id))];
    if (!comparisonIds.length) return { rows: [], total: 0 };
  }

  let q = supabase.from("leaderboard").select("*", { count: "exact" });
  if (comparisonIds) q = q.in("id", comparisonIds);
  if (opts?.seasonId) q = q.eq("season_id", opts.seasonId);
  if (opts?.competitionId) q = q.eq("competition_id", opts.competitionId);
  if (opts?.q?.trim()) {
    q = q.ilike("verdict_text", `%${opts.q.replace(/[%_]/g, "")}%`);
  }

  const { data: raw, count } = await q
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  let rows = await hydrateLeaderboardRows(raw ?? []);

  if (opts?.sportSlug) {
    const { data: sport } = await supabase
      .from("sports")
      .select("id")
      .eq("slug", opts.sportSlug)
      .single();
    if (sport) {
      rows = rows.filter((r) =>
        (r.members ?? [r.entity_a, r.entity_b]).some((e) => e.sport_id === sport.id)
      );
    }
  }

  rows.sort(
    (a, b) =>
      b.net - a.net ||
      b.agrees + b.disagrees - (a.agrees + a.disagrees) ||
      a.slug.localeCompare(b.slug)
  );

  return { rows, total: count ?? rows.length };
}

export async function searchEntitiesForFilter(
  q: string,
  limit = 20
): Promise<Entity[]> {
  if (!configured() || !q.trim()) return [];
  const supabase = await supabaseServer();
  const { data } = await supabase
    .from("entities")
    .select("*")
    .or(
      `name.ilike.%${q.replace(/[%_]/g, "")}%,disambiguator.ilike.%${q.replace(/[%_]/g, "")}%`
    )
    .order("name")
    .limit(limit);
  return (data ?? []) as Entity[];
}
