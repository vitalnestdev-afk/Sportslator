export type EntityType = "club" | "player";
export type EntityStatus = "seed" | "user";
export type PlayerEra = "active" | "historic";

export type Entity = {
  id: string;
  name: string;
  slug: string;
  type: EntityType;
  status: EntityStatus;
  era: PlayerEra | null;
  primary_color: string;
  secondary_color: string;
  sport_id: string;
  created_by?: string | null;
};

export type Sport = {
  id: string;
  name: string;
  slug: string;
};

export type ResolvePlayerResult = {
  entity_id: string;
  matched_existing: boolean;
  entity_slug: string;
  entity_name: string;
};

export type Dimension = {
  dimension: "pedigree" | "trajectory" | "fanbase" | "city" | "aura" | "style";
  rationale_text: string;
};

export type LeaderboardRow = {
  id: string;
  slug: string;
  verdict_text: string;
  status: string;
  created_at: string;
  agrees: number;
  disagrees: number;
  net: number;
  entity_a: Entity;
  entity_b: Entity;
};

export const DIMENSION_ORDER = [
  "pedigree",
  "trajectory",
  "fanbase",
  "city",
  "aura",
  "style",
] as const;

export const DIMENSION_LABELS: Record<string, string> = {
  pedigree: "Pedigree",
  trajectory: "Trajectory",
  fanbase: "Fanbase",
  city: "City",
  aura: "Aura",
  style: "Style",
};

/** Minimum votes before a take is eligible for the top table. */
export const MIN_VOTES = 3;

export function entityLabel(e: Entity, sportName?: string): string {
  const kind = e.type === "player" ? "player" : "club";
  const era =
    e.type === "player" && e.era
      ? e.era === "active"
        ? " · active"
        : " · historic"
      : "";
  const sport = sportName ? ` (${sportName})` : "";
  return `${e.name}${sport} · ${kind}${era}`;
}

export function entityKindLabel(type: EntityType): string {
  return type === "player" ? "player" : "club";
}
