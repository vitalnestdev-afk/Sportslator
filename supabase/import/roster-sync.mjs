/**
 * Daily roster sync — one run per 24h (Vercel Hobby: single cron slot).
 */
import { createClient } from "@supabase/supabase-js";
import { fileURLToPath } from "node:url";
import {
  fetchFootballActivePeople,
  fetchNflActivePeople,
  fetchNhlRecentPeople,
  fetchF1People,
  fetchCricketPeople,
  cronGroupForToday,
} from "./sources/extra-sports.mjs";
import {
  parseCsv,
  fetchText,
  fetchGzipCsv,
  fullName,
  inferEra,
  debutYear,
  disambiguateCollisions,
  toPersonRow,
} from "./lib.mjs";

async function importMlbRows() {
  const csv = await fetchText(
    "https://raw.githubusercontent.com/cBrou/baseballdatabank/master/core/People.csv"
  );
  const raw = parseCsv(csv);
  const rows = [];
  for (const p of raw) {
    const name = fullName(p.nameFirst, p.nameLast);
    if (!name) continue;
    const finalY = debutYear(p.finalGame);
    if (finalY && finalY < new Date().getFullYear() - 3) continue;
    rows.push({
      name,
      debutYear: debutYear(p.debut),
      lastSeason: finalY,
      era: inferEra(finalY, 2024),
      disambiguator: debutYear(p.debut) ? `MLB · debut ${debutYear(p.debut)}` : "MLB",
    });
  }
  disambiguateCollisions(rows);
  return rows.map((r) => toPersonRow("mlb", r, ["#041E42", "#BF0D3E"], "player", r.era));
}

async function importNbaActiveRows() {
  const py = await fetchText(
    "https://raw.githubusercontent.com/swar/nba_api/master/src/nba_api/stats/library/data.py"
  );
  const rows = [];
  const lineRe = /^\s*\[\d+,\s*"([^"]*)",\s*"([^"]*)",\s*"([^"]*)",\s*(True|False)\],?\s*$/;
  for (const line of py.split("\n")) {
    const m = line.match(lineRe);
    if (!m) continue;
    const [, last, first, full, activeStr] = m;
    if (activeStr !== "True") continue;
    const name = full || fullName(first, last);
    if (!name) continue;
    rows.push({ name, era: "active", disambiguator: null });
  }
  disambiguateCollisions(rows);
  return rows.map((r) => toPersonRow("nba", r, ["#1D428A", "#FFC72C"], "player", "active"));
}

const FETCHERS = {
  football: fetchFootballActivePeople,
  nfl: fetchNflActivePeople,
  mlb: importMlbRows,
  nba: importNbaActiveRows,
  nhl: fetchNhlRecentPeople,
  cricket: fetchCricketPeople,
  f1: fetchF1People,
};

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

async function tryAcquireLock(supabase, force = false) {
  const { data, error } = await supabase.rpc("try_acquire_roster_sync_lock", {
    p_force: force,
  });
  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.acquired) {
    return {
      acquired: false,
      reason: row?.reason ?? "Sync already ran within the last 24 hours",
    };
  }
  return { acquired: true };
}

async function upsertPeople(supabase, sportSlug, peopleRows) {
  const { data: sport } = await supabase
    .from("sports")
    .select("id")
    .eq("slug", sportSlug)
    .single();
  if (!sport) throw new Error(`Unknown sport: ${sportSlug}`);

  let upserted = 0;
  const batchSize = 200;
  for (let i = 0; i < peopleRows.length; i += batchSize) {
    const batch = peopleRows.slice(i, i + batchSize).map((row) => {
      const [, name, slug, c1, c2, type, era, disambiguator] = row;
      return {
        sport_id: sport.id,
        name,
        slug,
        type,
        status: "seed",
        era: era || null,
        disambiguator: disambiguator || null,
        primary_color: c1,
        secondary_color: c2,
      };
    });

    const { error } = await supabase.from("entities").upsert(batch, {
      onConflict: "sport_id,slug",
      ignoreDuplicates: false,
    });
    if (error) throw error;
    upserted += batch.length;
  }
  return upserted;
}

/**
 * @param {{ force?: boolean }} opts
 * @returns {Promise<object>}
 */
export async function runRosterSync(opts = {}) {
  const supabase = adminClient();
  const lock = await tryAcquireLock(supabase, opts.force);
  if (!lock.acquired) {
    return { ok: true, skipped: true, reason: lock.reason };
  }

  const group = cronGroupForToday();
  const summary = { group, sports: {}, errors: [] };

  try {
    for (const sportSlug of group) {
      const fetcher = FETCHERS[sportSlug];
      if (!fetcher) {
        summary.sports[sportSlug] = { skipped: true, reason: "no fetcher" };
        continue;
      }
      try {
        const rows = await fetcher();
        const count = await upsertPeople(supabase, sportSlug, rows);
        summary.sports[sportSlug] = { upserted: count, fetched: rows.length };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        summary.errors.push({ sport: sportSlug, error: msg });
        summary.sports[sportSlug] = { error: msg };
      }
    }

    await supabase
      .from("roster_sync_state")
      .update({
        last_run_status: summary.errors.length ? "partial" : "ok",
        last_run_summary: summary,
      })
      .eq("id", 1);

    return { ok: true, skipped: false, summary };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await supabase
      .from("roster_sync_state")
      .update({
        last_run_status: "error",
        last_run_summary: { error: msg, partial: summary },
      })
      .eq("id", 1);
    throw e;
  }
}

/** CLI: node supabase/import/roster-sync.mjs [--force] */
const isMain =
  process.argv[1] &&
  fileURLToPath(import.meta.url) === fileURLToPath(process.argv[1]);

if (isMain) {
  runRosterSync({ force: process.argv.includes("--force") })
    .then((r) => {
      console.log(JSON.stringify(r, null, 2));
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
