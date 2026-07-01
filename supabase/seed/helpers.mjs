/** Seed row: [sport, name, slug, c1, c2, type, era, disambiguator?] */
export function person(
  sport,
  name,
  slug,
  c1,
  c2,
  type = "player",
  era = "active",
  disambiguator = null
) {
  const row = [sport, name, slug, c1, c2, type, era];
  if (disambiguator) row.push(disambiguator);
  return row;
}

/** Default brand colours per sport for individuals without a team crest. */
export const sportColors = {
  football: ["#177a3d", "#1a1e1c"],
  nba: ["#1D428A", "#FFC72C"],
  nfl: ["#013369", "#D50A0A"],
  nhl: ["#000000", "#FFFFFF"],
  cricket: ["#1B4D3E", "#FFC72C"],
  f1: ["#E10600", "#FFFFFF"],
  tennis: ["#4E008E", "#FFFFFF"],
  golf: ["#006747", "#FFFFFF"],
  mlb: ["#041E42", "#BF0D3E"],
  rugby: ["#006857", "#FFFFFF"],
  mma: ["#D20A0A", "#111111"],
  boxing: ["#8B0000", "#FFD700"],
};

export function sportDefault(sport) {
  return sportColors[sport] ?? ["#177a3d", "#1a1e1c"];
}

/** Convert legacy player rows (no type/disambiguator) to full person rows. */
export function fromLegacyPlayer(row) {
  const [sport, name, slug, c1, c2, era] = row;
  return person(sport, name, slug, c1, c2, "player", era);
}

/** Merge curated + bulk; curated wins on slug collision. */
export function mergePeople(curated, bulk) {
  const seen = new Set(curated.map((r) => `${r[0]}/${r[2]}`));
  const out = [...curated];
  for (const row of bulk) {
    const key = `${row[0]}/${row[2]}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

export function personKey(row) {
  return `${row[0]}/${row[2]}`;
}
