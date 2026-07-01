/**
 * Build bulk roster seed modules from open datasets.
 *
 * Sources:
 * - Football: Transfermarkt datasets (CC BY-SA, ~37k players)
 * - MLB: Chadwick Baseball Databank / Lahman People.csv (~20k)
 * - NFL: nflverse player registry (~25k)
 * - NBA: Historical player list from open GitHub roster archive
 *
 * Run: node supabase/import/build-bulk.mjs
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  parseCsv,
  fetchText,
  fetchGzipCsv,
  slugify,
  fullName,
  inferEra,
  debutYear,
  disambiguateCollisions,
  toPersonRow,
} from "./lib.mjs";

const __dir = dirname(fileURLToPath(import.meta.url));
const bulkDir = join(__dir, "../seed/bulk");
mkdirSync(bulkDir, { recursive: true });

import {
  fetchNhlPeople,
  fetchF1People,
  fetchCricketPeople,
} from "./sources/extra-sports.mjs";

const COLORS = {
  football: ["#177a3d", "#1a1e1c"],
  mlb: ["#041E42", "#BF0D3E"],
  nfl: ["#013369", "#D50A0A"],
  nba: ["#1D428A", "#FFC72C"],
};

const meta = {
  generatedAt: new Date().toISOString(),
};

function writeModule(name, exportName, rows, source) {
  const path = join(bulkDir, `${name}.mjs`);
  const content = `// AUTO-GENERATED — ${source}\n// ${rows.length} rows · ${meta.generatedAt}\n\nexport const ${exportName} = ${JSON.stringify(rows)};\n`;
  writeFileSync(path, content);
  console.log(`✓ ${exportName}: ${rows.length} → ${path}`);
}

async function importFootball() {
  console.log("\n⚽ Football (Transfermarkt datasets)…");
  const csv = await fetchGzipCsv(
    "https://pub-e682421888d945d684bcae8890b0ec20.r2.dev/data/players.csv.gz"
  );
  const raw = parseCsv(csv);
  const rows = [];
  for (const p of raw) {
    const name = (p.name || fullName(p.first_name, p.last_name)).trim();
    if (!name || name.length < 2) continue;
    const lastSeason = Number(p.last_season) || 0;
    const club = (p.current_club_name || "").trim();
    const caps = Number(p.international_caps) || 0;
    // Include everyone with a recorded career; Transfermarkt covers obscure players well
    if (!lastSeason && !club && !caps) continue;
    rows.push({
      name,
      team: club || null,
      lastSeason,
      debutYear: p.date_of_birth ? debutYear(p.date_of_birth) : null,
      era: inferEra(lastSeason, 2024),
      disambiguator: club || (lastSeason ? `until ${lastSeason}` : null),
    });
  }
  disambiguateCollisions(rows);
  const people = rows.map((r) =>
    toPersonRow("football", r, COLORS.football, "player", r.era)
  );
  writeModule("football-bulk", "footballBulk", people, "transfermarkt-datasets/players.csv.gz");
  return people.length;
}

async function importMlb() {
  console.log("\n⚾ MLB (Lahman / Baseball Databank)…");
  const csv = await fetchText(
    "https://raw.githubusercontent.com/cBrou/baseballdatabank/master/core/People.csv"
  );
  const raw = parseCsv(csv);
  const rows = [];
  for (const p of raw) {
    const name = fullName(p.nameFirst, p.nameLast);
    if (!name || name.length < 2) continue;
    const debut = debutYear(p.debut);
    const finalY = debutYear(p.finalGame);
    rows.push({
      name,
      debutYear: debut,
      lastSeason: finalY,
      era: inferEra(finalY, 2024),
      disambiguator: debut ? `MLB · debut ${debut}` : "MLB",
    });
  }
  disambiguateCollisions(rows);
  const people = rows.map((r) =>
    toPersonRow("mlb", r, COLORS.mlb, "player", r.era)
  );
  writeModule("mlb-bulk", "mlbBulk", people, "cBrou/baseballdatabank People.csv");
  return people.length;
}

async function importNfl() {
  console.log("\n🏈 NFL (nflverse)…");
  const csv = await fetchText(
    "https://github.com/nflverse/nflverse-data/releases/download/players/players.csv"
  );
  const raw = parseCsv(csv);
  const rows = [];
  for (const p of raw) {
    const name = (p.display_name || fullName(p.first_name, p.last_name)).trim();
    if (!name || name.length < 2) continue;
    const team = (p.latest_team || "").trim();
    const pos = (p.position || "").trim();
    const last = Number(p.last_season) || 0;
    const tag = [team, pos].filter(Boolean).join(" · ") || (last ? `until ${last}` : null);
    rows.push({
      name,
      team: tag,
      lastSeason: last,
      era: p.status === "ACT" || inferEra(last, 2024) === "active" ? "active" : "historic",
      disambiguator: tag,
    });
  }
  disambiguateCollisions(rows);
  const people = rows.map((r) =>
    toPersonRow("nfl", r, COLORS.nfl, "player", r.era)
  );
  writeModule("nfl-bulk", "nflBulk", people, "nflverse/nflverse-data players.csv");
  return people.length;
}

async function importNba() {
  console.log("\n🏀 NBA (nba_api static registry)…");
  const py = await fetchText(
    "https://raw.githubusercontent.com/swar/nba_api/master/src/nba_api/stats/library/data.py"
  );
  const rows = [];
  const lineRe = /^\s*\[\d+,\s*"([^"]*)",\s*"([^"]*)",\s*"([^"]*)",\s*(True|False)\],?\s*$/;
  for (const line of py.split("\n")) {
    const m = line.match(lineRe);
    if (!m) continue;
    const [, last, first, full, activeStr] = m;
    const name = full || fullName(first, last);
    if (!name) continue;
    rows.push({
      name,
      era: activeStr === "True" ? "active" : "historic",
      disambiguator: null,
    });
  }
  disambiguateCollisions(rows);
  const people = rows.map((r) =>
    toPersonRow("nba", r, COLORS.nba, "player", r.era)
  );
  writeModule("nba-bulk", "nbaBulk", people, "swar/nba_api stats/library/data.py");
  return people.length;
}

async function importNhl() {
  console.log("\n🏒 NHL (NHL Stats API)…");
  const people = await fetchNhlPeople();
  writeModule("nhl-bulk", "nhlBulk", people, "api.nhle.com stats/rest");
  return people.length;
}

async function importF1() {
  console.log("\n🏎️ F1 (Ergast / jolpi.ca)…");
  const people = await fetchF1People();
  writeModule("f1-bulk", "f1Bulk", people, "api.jolpi.ca/ergast/f1");
  return people.length;
}

async function importCricket() {
  console.log("\n🏏 Cricket (Cricsheet Register)…");
  const people = await fetchCricketPeople();
  writeModule("cricket-bulk", "cricketBulk", people, "cricsheet.org/register/people.csv");
  return people.length;
}

async function main() {
  console.log("Building bulk roster imports…");
  const counts = {};
  counts.football = await importFootball();
  counts.mlb = await importMlb();
  counts.nfl = await importNfl();
  counts.nba = await importNba();
  counts.nhl = await importNhl();
  counts.f1 = await importF1();
  counts.cricket = await importCricket();
  console.log("\nDone:", counts);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  console.log(`Total bulk rows: ${total}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
