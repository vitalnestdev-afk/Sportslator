/**
 * Import Transfermarkt clubs into football club seed (slug = club_code).
 * Merges with curated clubs.mjs — curated slugs win on name collision.
 * Run: node supabase/import/build-clubs-tm.mjs
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { fetchGzipCsv, parseCsv, slugify } from "./lib.mjs";
import {
  footballClubs,
  nbaClubs,
  nflClubs,
  nhlClubs,
  mlbClubs,
  cricketClubs,
  f1Constructors,
  rugbyClubs,
} from "../seed/clubs.mjs";

const __dir = dirname(fileURLToPath(import.meta.url));
const TM_URL =
  "https://pub-e682421888d945d684bcae8890b0ec20.r2.dev/data/clubs.csv.gz";

/** Curated slug when TM club_code differs but it's the same club */
const TM_CODE_TO_CURATED_SLUG = {
  "fc-arsenal": "arsenal",
  "fc-chelsea": "chelsea",
  "fc-liverpool": "liverpool",
  "fc-bayern-munchen": "bayern-munich",
  "fc-barcelona": "barcelona",
  "fc-internazionale-milano": "inter-milan",
  "fc-juventus": "juventus",
  "fc-porto": "porto",
  "fc-schalke-04": null,
};

const PALETTE = [
  ["#177a3d", "#1a1e1c"],
  ["#1a1e1c", "#177a3d"],
  ["#003087", "#FFFFFF"],
  ["#C8102E", "#FFFFFF"],
  ["#034694", "#FFFFFF"],
  ["#000000", "#FFFFFF"],
  ["#DC052D", "#FFFFFF"],
  ["#004170", "#FFFFFF"],
];

function hashColor(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

function normName(n) {
  return String(n ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\b(fc|cf|sc|ac|fk|sk)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function main() {
  console.log("Fetching Transfermarkt clubs…");
  const csv = await fetchGzipCsv(TM_URL);
  const rows = parseCsv(csv);

  const curatedByNorm = new Map();
  for (const [, name, slug] of footballClubs) {
    curatedByNorm.set(normName(name), slug);
  }

  const curatedSlugs = new Set(footballClubs.map((c) => c[2]));
  const externalRefs = new Map();
  const tmFootball = [];
  const seenSlug = new Set(curatedSlugs);

  for (const row of rows) {
    const clubId = row.club_id?.trim();
    const code = row.club_code?.trim();
    const name = row.name?.trim();
    if (!code || !name) continue;

    let slug = TM_CODE_TO_CURATED_SLUG[code] ?? code;
    if (slug === null) continue;

    const curatedMatch = curatedByNorm.get(normName(name));
    if (curatedMatch) {
      slug = curatedMatch;
      if (clubId) externalRefs.set(slug, clubId);
      continue;
    }

    if (seenSlug.has(slug)) continue;
    seenSlug.add(slug);

    const [p, s] = hashColor(name);
    tmFootball.push(["football", name, slug, p, s, clubId || null]);
    if (clubId) externalRefs.set(slug, clubId);
  }

  const mergedFootball = footballClubs.map((row) => {
    const slug = row[2];
    const ref = externalRefs.get(slug);
    return ref ? [...row, ref] : row;
  });

  for (const row of tmFootball) {
    if (!mergedFootball.some((c) => c[2] === row[2])) mergedFootball.push(row);
  }

  mergedFootball.sort((a, b) => a[1].localeCompare(b[1]));

  const clubsPath = join(__dir, "../seed/clubs.mjs");
  const content = `/** Club/team entities — [sport, name, slug, primary, secondary, external_ref?] */
export const footballClubs = ${JSON.stringify(mergedFootball, null, 2)};

export const nbaClubs = ${JSON.stringify(nbaClubs, null, 2)};
export const nflClubs = ${JSON.stringify(nflClubs, null, 2)};
export const nhlClubs = ${JSON.stringify(nhlClubs, null, 2)};
export const mlbClubs = ${JSON.stringify(mlbClubs, null, 2)};
export const cricketClubs = ${JSON.stringify(cricketClubs, null, 2)};
export const f1Constructors = ${JSON.stringify(f1Constructors, null, 2)};
export const rugbyClubs = ${JSON.stringify(rugbyClubs, null, 2)};

export const clubs = [
  ...footballClubs,
  ...nbaClubs,
  ...nflClubs,
  ...nhlClubs,
  ...mlbClubs,
  ...cricketClubs,
  ...f1Constructors,
  ...rugbyClubs,
];
`;
  writeFileSync(clubsPath, content);
  console.log(
    `✓ football clubs: ${mergedFootball.length} (${tmFootball.length} from TM) → ${clubsPath}`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
