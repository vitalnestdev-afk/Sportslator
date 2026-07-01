import {
  parseCsv,
  fetchText,
  fetchJson,
  fetchGzipCsv,
  slugify,
  fullName,
  inferEra,
  disambiguateCollisions,
  toPersonRow,
} from "../lib.mjs";

const COLORS = {
  nhl: ["#000000", "#FFFFFF"],
  f1: ["#E10600", "#FFFFFF"],
  cricket: ["#1B4D3E", "#FFC72C"],
  tennis: ["#4E008E", "#FFFFFF"],
  golf: ["#006747", "#FFFFFF"],
};

/** Paginate NHL stats API for one or all seasons. */
async function fetchNhlSkaters(seasonId = null) {
  const rows = [];
  const limit = 1000;
  let start = 0;
  let total = Infinity;
  const seasonExp = seasonId ? `seasonId=${seasonId}` : "gameTypeId=2";
  while (start < total && start < 10000) {
    const url =
      `https://api.nhle.com/stats/rest/en/skater/summary?isAggregate=false&isGame=false` +
      `&sort=[{"property":"skaterFullName","direction":"ASC"}]` +
      `&start=${start}&limit=${limit}&factCayenneExp=gamesPlayed>=1&cayenneExp=${seasonExp}`;
    const json = await fetchJson(url);
    total = json.total ?? 0;
    for (const p of json.data ?? []) {
      const name = (p.skaterFullName || fullName(p.firstName, p.lastName)).trim();
      if (!name) continue;
      const team = (p.teamAbbrevs || "").trim();
      const tag = [team, p.positionCode].filter(Boolean).join(" · ") || "NHL";
      const seasonYear = Number(
        (seasonId ?? p.seasonId)?.toString().slice(0, 4)
      );
      rows.push({
        name,
        team: tag,
        lastSeason: seasonYear || null,
        era: inferEra(seasonYear, 2024),
        disambiguator: tag,
      });
    }
    start += limit;
    if (!(json.data?.length)) break;
  }
  return rows;
}

async function fetchNhlGoalies(seasonId = null) {
  const rows = [];
  const limit = 1000;
  let start = 0;
  let total = Infinity;
  const seasonExp = seasonId ? `seasonId=${seasonId}` : "gameTypeId=2";
  while (start < total && start < 5000) {
    const url =
      `https://api.nhle.com/stats/rest/en/goalie/summary?isAggregate=false&isGame=false` +
      `&sort=[{"property":"goalieFullName","direction":"ASC"}]` +
      `&start=${start}&limit=${limit}&factCayenneExp=gamesPlayed>=1&cayenneExp=${seasonExp}`;
    const json = await fetchJson(url);
    total = json.total ?? 0;
    for (const p of json.data ?? []) {
      const name = (p.goalieFullName || "").trim();
      if (!name) continue;
      const team = (p.teamAbbrevs || "").trim();
      const tag = team ? `${team} · G` : "NHL · G";
      const seasonYear = Number(
        (seasonId ?? p.seasonId)?.toString().slice(0, 4)
      );
      rows.push({
        name,
        team: tag,
        lastSeason: seasonYear || null,
        era: inferEra(seasonYear, 2024),
        disambiguator: tag,
      });
    }
    start += limit;
    if (!(json.data?.length)) break;
  }
  return rows;
}

/** Lighter NHL fetch for daily cron (current + prior season only). */
export async function fetchNhlRecentPeople() {
  const y = new Date().getFullYear();
  const rows = [];
  for (const year of [y - 1, y]) {
    const sid = `${year}${year + 1}`;
    rows.push(...(await fetchNhlSkaters(sid)), ...(await fetchNhlGoalies(sid)));
  }
  disambiguateCollisions(rows);
  return rows.map((r) => toPersonRow("nhl", r, COLORS.nhl, "player", r.era));
}

export async function fetchNhlPeople() {
  const rows = [...(await fetchNhlSkaters()), ...(await fetchNhlGoalies())];
  disambiguateCollisions(rows);
  return rows.map((r) => toPersonRow("nhl", r, COLORS.nhl, "player", r.era));
}

export async function fetchF1People() {
  const rows = [];
  let offset = 0;
  const limit = 100;
  let total = Infinity;
  while (offset < total) {
    const json = await fetchJson(
      `https://api.jolpi.ca/ergast/f1/drivers.json?limit=${limit}&offset=${offset}`
    );
    const drivers = json?.MRData?.DriverTable?.Drivers ?? [];
    total = Number(json?.MRData?.total ?? 0);
    for (const d of drivers) {
      const name = fullName(d.givenName, d.familyName);
      if (!name) continue;
      const birth = d.dateOfBirth ? d.dateOfBirth.slice(0, 4) : null;
      rows.push({
        name,
        era: "historic",
        disambiguator: d.nationality ? `${d.nationality} · F1` : "F1",
        debutYear: birth ? Number(birth) : null,
      });
    }
    offset += limit;
    if (!drivers.length) break;
  }
  disambiguateCollisions(rows);
  return rows.map((r) => toPersonRow("f1", r, COLORS.f1, "player", r.era));
}

export async function fetchCricketPeople() {
  const csv = await fetchText("https://cricsheet.org/register/people.csv");
  const raw = parseCsv(csv);
  const rows = [];
  for (const p of raw) {
    const name = (p.name || p.unique_name || "").trim();
    if (!name || name.length < 2) continue;
    rows.push({
      name,
      era: "historic",
      disambiguator: p.key_cricinfo ? `cricinfo ${p.key_cricinfo}` : "Cricket",
    });
  }
  disambiguateCollisions(rows);
  return rows.map((r) =>
    toPersonRow("cricket", r, COLORS.cricket, "player", r.era)
  );
}

/** Active-only subsets for daily cron (keeps within serverless time limits). */
export async function fetchFootballActivePeople() {
  const csv = await fetchGzipCsv(
    "https://pub-e682421888d945d684bcae8890b0ec20.r2.dev/data/players.csv.gz"
  );
  const raw = parseCsv(csv);
  const minSeason = new Date().getFullYear() - 2;
  const rows = [];
  for (const p of raw) {
    const lastSeason = Number(p.last_season) || 0;
    if (lastSeason < minSeason) continue;
    const name = (p.name || fullName(p.first_name, p.last_name)).trim();
    if (!name) continue;
    const club = (p.current_club_name || "").trim();
    rows.push({
      name,
      team: club || null,
      lastSeason,
      era: "active",
      disambiguator: club || `until ${lastSeason}`,
    });
  }
  disambiguateCollisions(rows);
  return rows.map((r) => toPersonRow("football", r, ["#177a3d", "#1a1e1c"], "player", "active"));
}

export async function fetchNflActivePeople() {
  const csv = await fetchText(
    "https://github.com/nflverse/nflverse-data/releases/download/players/players.csv"
  );
  const raw = parseCsv(csv);
  const minSeason = new Date().getFullYear() - 2;
  const rows = [];
  for (const p of raw) {
    const last = Number(p.last_season) || 0;
    if (p.status !== "ACT" && last < minSeason) continue;
    const name = (p.display_name || "").trim();
    if (!name) continue;
    const tag = [p.latest_team, p.position].filter(Boolean).join(" · ");
    rows.push({
      name,
      team: tag,
      lastSeason: last,
      era: p.status === "ACT" ? "active" : inferEra(last, 2024),
      disambiguator: tag || null,
    });
  }
  disambiguateCollisions(rows);
  return rows.map((r) => toPersonRow("nfl", r, ["#013369", "#D50A0A"], "player", r.era));
}

export const CRON_SPORT_GROUPS = [
  ["football", "nfl"],
  ["mlb", "nba"],
  ["nhl", "cricket"],
  ["f1"],
];

export function cronGroupForToday(date = new Date()) {
  const day = Math.floor(date.getTime() / 86400000);
  return CRON_SPORT_GROUPS[day % CRON_SPORT_GROUPS.length];
}
