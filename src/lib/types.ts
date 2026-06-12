export type Entity = {
  id: string;
  name: string;
  slug: string;
  primary_color: string;
  secondary_color: string;
  sport_id: string;
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
