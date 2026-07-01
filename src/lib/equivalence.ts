import type { Entity } from "./types";
import { entityDisplayName } from "./types";

export const MAX_EQUIVALENCE_SLOTS = 5;
export const MIN_EQUIVALENCE_SLOTS = 2;

/** Stable slug from ordered member slugs (sorted so A≈B = B≈A). */
export function equivalenceSlug(members: Pick<Entity, "slug">[]): string {
  return [...members]
    .map((m) => m.slug)
    .sort()
    .join("-");
}

/** Human-readable equivalence sentence: "A ≈ B ≈ C" */
export function formatEquivalenceSentence(
  members: Pick<Entity, "name" | "disambiguator">[]
): string {
  return members.map(entityDisplayName).join(" ≈ ");
}

export function contextLabel(parts: {
  season?: { label: string } | null;
  competition?: { name: string } | null;
  contextNote?: string | null;
}): string | null {
  const bits: string[] = [];
  if (parts.competition?.name) bits.push(parts.competition.name);
  if (parts.season?.label) bits.push(parts.season.label);
  if (parts.contextNote?.trim()) bits.push(parts.contextNote.trim());
  return bits.length ? bits.join(" · ") : null;
}
