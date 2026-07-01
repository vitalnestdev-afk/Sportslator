/**
 * Build competitions seed from Transfermarkt + curated non-football entries.
 * Run: node supabase/import/build-competitions.mjs
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { fetchGzipCsv, parseCsv, slugify } from "./lib.mjs";
import { competitions as curated } from "../seed/competitions.mjs";

const __dir = dirname(fileURLToPath(import.meta.url));
const TM_URL =
  "https://pub-e682421888d945d684bcae8890b0ec20.r2.dev/data/competitions.csv.gz";

const TYPE_TO_SCOPE = {
  domestic_league: "domestic",
  domestic_cup: "knockout",
  domestic_super_cup: "knockout",
  international_cup: "continental",
  uefa_champions_league: "continental",
  uefa_champions_league_qualifying: "continental",
  uefa_europa_league: "continental",
  national_team_competition: "international",
  world_cup: "international",
  afc_asian_cup: "international",
  africa_cup_of_nations: "international",
  other: "domestic",
};

function tmScope(row) {
  const sub = row.sub_type || "";
  const type = row.type || "";
  return TYPE_TO_SCOPE[sub] || TYPE_TO_SCOPE[type] || "domestic";
}

function displayName(row) {
  const raw = row.name || row.competition_code || "";
  return raw
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
    .replace(/\bUefa\b/g, "UEFA")
    .replace(/\bFa\b/g, "FA")
    .replace(/\bDfb\b/g, "DFB");
}

/** Non-football competitions preserved across rebuilds */
const EXTRA_CURATED = [
  ["nba", "Regular Season", "nba-regular-season", "domestic"],
  ["nba", "Playoffs", "nba-playoffs", "knockout"],
  ["nba", "NBA Finals", "nba-finals", "knockout"],
  ["nba", "In-Season Tournament", "nba-in-season-tournament", "knockout"],
  ["nfl", "Regular Season", "nfl-regular-season", "domestic"],
  ["nfl", "Playoffs", "nfl-playoffs", "knockout"],
  ["nfl", "Super Bowl", "super-bowl", "knockout"],
  ["nhl", "Regular Season", "nhl-regular-season", "domestic"],
  ["nhl", "Stanley Cup Playoffs", "stanley-cup-playoffs", "knockout"],
  ["nhl", "Stanley Cup Final", "stanley-cup-final", "knockout"],
  ["mlb", "Regular Season", "mlb-regular-season", "domestic"],
  ["mlb", "World Series", "world-series", "knockout"],
  ["cricket", "Test Cricket", "test-cricket", "international"],
  ["cricket", "ODI World Cup", "odi-world-cup", "international"],
  ["cricket", "T20 World Cup", "t20-world-cup", "international"],
  ["cricket", "IPL", "ipl", "domestic"],
  ["cricket", "The Ashes", "the-ashes", "international"],
  ["cricket", "Big Bash League", "bbl", "domestic"],
  ["f1", "Constructors' Championship", "f1-constructors", "domestic"],
  ["f1", "Drivers' Championship", "f1-drivers", "domestic"],
  ["f1", "Sprint Race", "f1-sprint", "knockout"],
  ["rugby", "Six Nations", "six-nations", "international"],
  ["rugby", "Rugby World Cup", "rugby-world-cup", "international"],
  ["rugby", "Champions Cup", "rugby-champions-cup", "continental"],
  ["rugby", "United Rugby Championship", "urc", "domestic"],
  ["tennis", "Australian Open", "australian-open", "knockout"],
  ["tennis", "French Open", "french-open", "knockout"],
  ["tennis", "Wimbledon", "wimbledon", "knockout"],
  ["tennis", "US Open", "us-open-tennis", "knockout"],
  ["tennis", "ATP Finals", "atp-finals", "knockout"],
  ["tennis", "Davis Cup", "davis-cup", "international"],
  ["tennis", "Laver Cup", "laver-cup", "international"],
  ["golf", "The Masters", "the-masters", "knockout"],
  ["golf", "PGA Championship", "pga-championship", "knockout"],
  ["golf", "US Open", "us-open-golf", "knockout"],
  ["golf", "The Open", "the-open", "knockout"],
  ["golf", "Ryder Cup", "ryder-cup", "international"],
  ["golf", "Players Championship", "players-championship", "knockout"],
  ["mma", "UFC", "ufc", "domestic"],
  ["mma", "Bellator", "bellator", "domestic"],
  ["mma", "PFL", "pfl", "domestic"],
  ["mma", "ONE Championship", "one-championship", "domestic"],
  ["boxing", "Heavyweight", "boxing-heavyweight", "domestic"],
  ["boxing", "Middleweight", "boxing-middleweight", "domestic"],
  ["boxing", "Welterweight", "boxing-welterweight", "domestic"],
  ["boxing", "Lightweight", "boxing-lightweight", "domestic"],
];

async function main() {
  console.log("Fetching Transfermarkt competitions…");
  const csv = await fetchGzipCsv(TM_URL);
  const rows = parseCsv(csv);

  const seen = new Set();
  const out = [];

  for (const row of rows) {
    const slug = slugify(row.competition_code || row.competition_id);
    if (!slug || seen.has(`football:${slug}`)) continue;
    seen.add(`football:${slug}`);
    out.push(["football", displayName(row), slug, tmScope(row)]);
  }

  for (const row of EXTRA_CURATED) {
    const [sport, name, slug, scope] = row;
    const key = `${sport}:${slug}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }

  for (const row of curated) {
    const [sport, name, slug, scope] = row;
    const key = `${sport}:${slug}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }

  out.sort((a, b) => a[0].localeCompare(b[0]) || a[2].localeCompare(b[2]));

  const path = join(__dir, "../seed/competitions.mjs");
  const content = `/** AUTO-GENERATED + curated — ${out.length} competitions */\n/** [sport_slug, name, slug, scope] */\nexport const competitions = ${JSON.stringify(out, null, 2)};\n`;
  writeFileSync(path, content);

  const bySport = {};
  for (const [sport] of out) bySport[sport] = (bySport[sport] ?? 0) + 1;
  console.log(`✓ ${out.length} competitions → ${path}`);
  console.log("  by sport:", bySport);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
