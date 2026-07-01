/** Client-side slug preview (server canonicalizes via RPC). */
export function slugifyName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function normalizeName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "");
}

/** Score local candidates before hitting the server (UI hints only). */
export function scorePlayerMatch(input: string, candidate: { name: string }): number {
  const a = normalizeName(input);
  const b = normalizeName(candidate.name);
  if (!a || !b) return 0;
  if (a === b) return 100;
  if (b.includes(a) || a.includes(b)) return 80;
  const aParts = a.split(/\s+/);
  const bParts = b.split(/\s+/);
  const overlap = aParts.filter((p) => bParts.some((q) => q === p || q.includes(p) || p.includes(q)));
  if (overlap.length) return 50 + overlap.length * 10;
  return 0;
}
