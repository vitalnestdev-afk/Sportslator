/**
 * Build player ↔ club membership data from open datasets.
 * Outputs supabase/seed/bulk/memberships-bulk.mjs + supabase/memberships.sql
 *
 * Tuple: [sport, personSlug, clubSlug, seasonStart, seasonEnd, role, isPrimary, source]
 *
 * Run: node supabase/import/build-memberships.mjs
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { fetchGzipCsv, fetchText, parseCsv, slugify } from "./lib.mjs";

const __dir = dirname(fileURLToPath(import.meta.url));
const bulkDir = join(__dir, "../seed/bulk");
const TM_BASE = "https://pub-e682421888d945d684bcae8890b0ec20.r2.dev/data";

function normName(n) {
  return String(n ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseTransferSeason(s) {
  if (!s) return null;
  const m = String(s).match(/(\d{2})\/(\d{2})/);
  if (!m) return null;
  const start = 2000 + Number(m[1]);
  return start > 2030 ? 1900 + Number(m[1]) : start;
}

function loadPersonSlugs(sport, bulkFile) {
  const path = join(bulkDir, bulkFile);
  if (!existsSync(path)) return new Set();
  const text = readFileSync(path, "utf8");
  const slugs = new Set();
  const re = /\["(?:[^"\\]|\\.)*","(?:[^"\\]|\\.)*","([^"]+)"/g;
  let m;
  while ((m = re.exec(text))) slugs.add(m[1]);
  return slugs;
}

function loadClubSlugByExternalRef() {
  const clubsPath = join(__dir, "../seed/clubs.mjs");
  const text = readFileSync(clubsPath, "utf8");
  const map = new Map();
  const rowRe = /\["football","([^"]*)","([^"]*)","[^"]*","[^"]*"(?:,"([^"]*)")?\]/g;
  let m;
  while ((m = rowRe.exec(text))) {
    const [, , slug, ref] = m;
    if (ref) map.set(ref, slug);
  }
  return map;
}

function mergeMembership(store, row) {
  const key = `${row[0]}:${row[1]}:${row[2]}`;
  const existing = store.get(key);
  if (!existing) {
    store.set(key, row);
    return;
  }
  const [, , , s0, s1, , priA, src] = existing;
  const [, , , t0, t1, , priB, ] = row;
  const seasonStart =
    s0 == null ? t0 : t0 == null ? s0 : Math.min(Number(s0), Number(t0));
  const seasonEnd =
    s1 == null ? t1 : t1 == null ? s1 : Math.max(Number(s1), Number(t1));
  existing[3] = seasonStart;
  existing[4] = seasonEnd;
  existing[6] = priA || priB;
  existing[7] = src || existing[7];
}

async function importFootballMemberships(store) {
  console.log("\n⚽ Football memberships (Transfermarkt transfers + squads)…");
  const personSlugs = loadPersonSlugs("football", "football-bulk.mjs");
  const clubByRef = loadClubSlugByExternalRef();

  const playersCsv = await fetchGzipCsv(`${TM_BASE}/players.csv.gz`);
  const players = parseCsv(playersCsv);
  const playerIdToSlug = new Map();
  const playerCurrentClub = new Map();

  for (const p of players) {
    const id = p.player_id?.trim();
    if (!id) continue;
    const code = p.player_code?.trim();
    const nameSlug = slugify(p.name || "");
    let slug = code && personSlugs.has(code) ? code : nameSlug;
    if (!personSlugs.has(slug)) {
      for (const s of personSlugs) {
        if (s.startsWith(nameSlug)) {
          slug = s;
          break;
        }
      }
    }
    if (!personSlugs.has(slug)) continue;
    playerIdToSlug.set(id, slug);
    if (p.current_club_id) playerCurrentClub.set(id, p.current_club_id.trim());
  }

  const clubsCsv = await fetchGzipCsv(`${TM_BASE}/clubs.csv.gz`);
  for (const c of parseCsv(clubsCsv)) {
    if (c.club_id && c.club_code) {
      clubByRef.set(c.club_id.trim(), slugify(c.club_code));
    }
  }

  const slugToClubSlug = new Map();
  for (const [, slug] of clubByRef) slugToClubSlug.set(slug, slug);

  const transfersCsv = await fetchGzipCsv(`${TM_BASE}/transfers.csv.gz`);
  let matched = 0;
  for (const t of parseCsv(transfersCsv)) {
    const pid = t.player_id?.trim();
    const personSlug = playerIdToSlug.get(pid);
    if (!personSlug) continue;

    const season = parseTransferSeason(t.transfer_season);
    for (const clubId of [t.from_club_id?.trim(), t.to_club_id?.trim()]) {
      if (!clubId) continue;
      const clubSlug = clubByRef.get(clubId);
      if (!clubSlug) continue;
      const isPrimary = playerCurrentClub.get(pid) === clubId;
      mergeMembership(store, [
        "football",
        personSlug,
        clubSlug,
        season,
        season,
        null,
        isPrimary,
        "transfermarkt",
      ]);
      matched++;
    }
  }
  console.log(`  ${matched} transfer links, ${store.size} unique memberships so far`);
}

async function importNflMemberships(store) {
  console.log("\n🏈 NFL memberships (nflverse rosters 1990–2025)…");
  const personSlugs = loadPersonSlugs("nfl", "nfl-bulk.mjs");
  const teamsCsv = await fetchText(
    "https://raw.githubusercontent.com/nflverse/nfldata/master/data/teams.csv"
  );
  const abbrevToSlug = new Map();
  for (const row of parseCsv(teamsCsv)) {
    if (row.team && row.hyphenated) abbrevToSlug.set(row.team, row.hyphenated);
  }

  const pairs = new Map();
  for (let year = 1990; year <= 2025; year++) {
    try {
      const csv = await fetchText(
        `https://github.com/nflverse/nflverse-data/releases/download/rosters/roster_${year}.csv`
      );
      for (const row of parseCsv(csv)) {
        const name = (row.full_name || `${row.first_name} ${row.last_name}`).trim();
        const slug = slugify(name);
        if (!personSlugs.has(slug)) continue;
        const team = row.team?.trim();
        const clubSlug = abbrevToSlug.get(team);
        if (!clubSlug) continue;
        const key = `${slug}:${clubSlug}`;
        const cur = pairs.get(key) || { slug, clubSlug, min: year, max: year };
        cur.min = Math.min(cur.min, year);
        cur.max = Math.max(cur.max, year);
        pairs.set(key, cur);
      }
    } catch {
      /* season file may not exist */
    }
  }

  for (const { slug, clubSlug, min, max } of pairs.values()) {
    mergeMembership(store, [
      "nfl",
      slug,
      clubSlug,
      min,
      max,
      null,
      max >= 2024,
      "nflverse",
    ]);
  }
  console.log(`  ${pairs.size} NFL player-team pairs`);
}

async function importMlbMemberships(store) {
  console.log("\n⚾ MLB memberships (Lahman Batting)…");
  const personSlugs = loadPersonSlugs("mlb", "mlb-bulk.mjs");
  const teamsCsv = await fetchText(
    "https://raw.githubusercontent.com/cBrou/baseballdatabank/master/core/Teams.csv"
  );
  const teamIdToName = new Map();
  for (const row of parseCsv(teamsCsv)) {
    if (row.teamID && row.name) {
      teamIdToName.set(row.teamID, row.name);
    }
  }

  const battingCsv = await fetchText(
    "https://raw.githubusercontent.com/cBrou/baseballdatabank/master/core/Batting.csv"
  );
  const peopleCsv = await fetchText(
    "https://raw.githubusercontent.com/cBrou/baseballdatabank/master/core/People.csv"
  );
  const playerIdToSlug = new Map();
  for (const p of parseCsv(peopleCsv)) {
    const name = `${p.nameFirst} ${p.nameLast}`.trim();
    const slug = slugify(name);
    if (personSlugs.has(slug)) playerIdToSlug.set(p.playerID, slug);
  }

  const pairs = new Map();
  for (const row of parseCsv(battingCsv)) {
    const personSlug = playerIdToSlug.get(row.playerID);
    if (!personSlug) continue;
    const teamName = teamIdToName.get(row.teamID);
    if (!teamName) continue;
    const clubSlug = slugify(teamName);
    const year = Number(row.yearID);
    const key = `${personSlug}:${clubSlug}`;
    const cur = pairs.get(key) || { personSlug, clubSlug, min: year, max: year };
    cur.min = Math.min(cur.min, year);
    cur.max = Math.max(cur.max, year);
    pairs.set(key, cur);
  }

  for (const { personSlug, clubSlug, min, max } of pairs.values()) {
    mergeMembership(store, [
      "mlb",
      personSlug,
      clubSlug,
      min,
      max,
      null,
      max >= 2023,
      "lahman",
    ]);
  }
  console.log(`  ${pairs.size} MLB player-team pairs`);
}

function writeOutputs(rows) {
  const bulkPath = join(bulkDir, "memberships-bulk.mjs");
  writeFileSync(
    bulkPath,
    `// AUTO-GENERATED — ${rows.length} memberships · ${new Date().toISOString()}\n\nexport const membershipsBulk = ${JSON.stringify(rows)};\n`
  );
  console.log(`\n✓ ${rows.length} memberships → ${bulkPath}`);

  const sqlPath = join(__dir, "../memberships.sql");
  const q = (s) => `'${String(s ?? "").replace(/'/g, "''")}'`;
  const qi = (v) => (v == null ? "null" : String(v));

  let sql = "-- generated memberships — apply after seed.sql\n";
  const batchSize = 500;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    for (const [sport, personSlug, clubSlug, s0, s1, role, isPrimary, source] of batch) {
      sql += `insert into entity_memberships (person_id, club_id, sport_id, season_start, season_end, role, is_primary, source)
select p.id, c.id, sp.id, ${qi(s0)}, ${qi(s1)}, ${role ? q(role) : "null"}, ${isPrimary ? "true" : "false"}, ${q(source)}
from sports sp
join entities p on p.sport_id = sp.id and p.slug = ${q(personSlug)} and p.type in ('player','coach')
join entities c on c.sport_id = sp.id and c.slug = ${q(clubSlug)} and c.type = 'club'
where sp.slug = ${q(sport)}
on conflict (person_id, club_id, season_start) do nothing;\n`;
    }
  }
  writeFileSync(sqlPath, sql);
  console.log(`✓ memberships.sql (${(sql.length / 1024 / 1024).toFixed(1)} MB) → ${sqlPath}`);
}

async function main() {
  const store = new Map();
  await importFootballMemberships(store);
  await importNflMemberships(store);
  await importMlbMemberships(store);
  const rows = [...store.values()];
  writeOutputs(rows);
  const bySport = {};
  for (const [sport] of rows) bySport[sport] = (bySport[sport] ?? 0) + 1;
  console.log("By sport:", bySport);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
