/** Seed row helper: [sport, name, slug, c1, c2, type, era] */
export function person(
  sport,
  name,
  slug,
  c1,
  c2,
  type = "player",
  era = "active"
) {
  return [sport, name, slug, c1, c2, type, era];
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
};

export function sportDefault(sport) {
  return sportColors[sport] ?? ["#177a3d", "#1a1e1c"];
}

/** Convert legacy player rows (no type field) to full person rows. */
export function fromLegacyPlayer(row) {
  const [sport, name, slug, c1, c2, era] = row;
  return person(sport, name, slug, c1, c2, "player", era);
}
