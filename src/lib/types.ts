export type EntityType = "club" | "player" | "coach";
export type EntityStatus = "seed" | "user";
export type PersonEra = "active" | "historic";

export type Entity = {
  id: string;
  name: string;
  slug: string;
  type: EntityType;
  status: EntityStatus;
  era: PersonEra | null;
  disambiguator: string | null;
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

export type ResolvePersonResult = {
  entity_id: string;
  matched_existing: boolean;
  entity_slug: string;
  entity_name: string;
  entity_disambiguator?: string | null;
};

/** @deprecated use ResolvePersonResult */
export type ResolvePlayerResult = ResolvePersonResult;

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

export type UserTakeRow = {
  id: string;
  slug: string;
  verdict_text: string;
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

const TYPE_LABELS: Record<EntityType, string> = {
  club: "club",
  player: "player",
  coach: "coach",
};

export function entityDisplayName(e: Pick<Entity, "name" | "disambiguator">): string {
  if (e.disambiguator?.trim()) return `${e.name} (${e.disambiguator})`;
  return e.name;
}

export function entityLabel(e: Entity, sportName?: string): string {
  const kind = TYPE_LABELS[e.type];
  const era =
    e.type !== "club" && e.era
      ? e.era === "active"
        ? " · active"
        : " · historic"
      : "";
  const sport = sportName ? ` (${sportName})` : "";
  return `${entityDisplayName(e)}${sport} · ${kind}${era}`;
}

export function entityKindLabel(type: EntityType): string {
  return TYPE_LABELS[type];
}

export function isPersonType(type: EntityType): boolean {
  return type === "player" || type === "coach";
}
