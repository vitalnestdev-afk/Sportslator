# Sportslator Full Expansion Plan

Research-backed plan for maximum quality and scope. Executed in phases on branch `cursor/full-expansion-0c61`.

## Goals

1. **Structured player ↔ club links** — not just disambiguator text
2. **Comprehensive competitions** — domestic leagues, cups, continental, international per sport
3. **Teams everywhere** — expand from 202 clubs to 500+ where open data exists
4. **Browse & filter takes** — sport, season, competition, entity, search
5. **Smarter propose flow** — suggest clubs when a player is picked

---

## Data sources (open, no API keys)

| Domain | Source | URL | Why |
|--------|--------|-----|-----|
| Football clubs, comps, transfers | Transfermarkt datasets | `pub-e682421888d945d684bcae8890b0ec20.r2.dev/data/*.csv.gz` | 400+ clubs, 40+ comps, 87k transfers, weekly updates |
| Football structure | openfootball/leagues | GitHub | Canonical league/cup names per country |
| NFL rosters | nflverse-data | `releases/download/rosters/roster_{year}.csv` | Player–team–season 1920–2026 |
| NFL teams | nflverse load_teams | colors, abbreviations | Already seeded; map abbrev → entity |
| MLB affiliations | Lahman Batting + Teams | baseballdatabank | playerID–teamID–year back to 1871 |
| NBA | nba_api + future roster CSV | Existing player list | Current-only until roster bulk added |
| NHL | NHL Stats API | Existing bulk | Team from career totals |
| Cricket | Cricsheet register | Existing | Team in disambiguator; IPL/nations as clubs |
| StatsBomb | competitions.json | Reference only | Cross-check competition naming |

---

## Phase 1 — Schema: `entity_memberships`

```sql
entity_memberships (
  person_id → entities (player/coach)
  club_id   → entities (club)
  sport_id  → sports
  season_start, season_end int nullable
  role text nullable          -- QB, Attack, etc.
  is_primary boolean          -- current/main club
  source text                 -- transfermarkt | nflverse | lahman
)
```

**Why:** Enables club roster views, “player at X” filters, and scoped takes without parsing disambiguator strings.

**RLS:** Public read; inserts via service role / import scripts only (no user-facing membership CRUD in v1).

---

## Phase 2 — Competitions expansion

| Sport | Target count | Sources |
|-------|--------------|---------|
| Football | 80+ | TM competitions.csv.gz + manual cups (FA Cup, Copa del Rey, DFB-Pokal, etc.) |
| NBA | 8 | Regular, Playoffs, Finals, IST, etc. |
| NFL | 6 | Regular, Playoffs, Super Bowl, Pro Bowl |
| NHL | 6 | Regular, Playoffs, Stanley Cup |
| MLB | 6 | Regular, World Series, All-Star |
| Cricket | 15 | Tests, ODIs, T20, IPL, BBL, CPL, Ashes, etc. |
| F1 | 8 | Constructors, Drivers, Sprint, per-GP optional |
| Rugby | 10 | Six Nations, RWC, Champions Cup, URC, etc. |
| Tennis | 12 | Grand Slams, Masters, Davis Cup, Laver Cup |
| Golf | 10 | Majors, Ryder Cup, Players, FedEx |
| MMA | 8 | UFC, Bellator, PFL weight classes as scope |
| Boxing | 8 | Weight divisions + sanctioning bodies as scope |

**Build script:** `supabase/import/build-competitions.mjs` merges TM + curated `competitions.mjs`.

---

## Phase 3 — Clubs expansion

| Sport | From | Target |
|-------|------|--------|
| Football | TM clubs.csv.gz | 400+ (slug = `club_code`) |
| NBA/NFL/NHL/MLB | Existing + nflverse teams | Complete pro leagues |
| Cricket | Nations + IPL + BBL franchises | 40+ |
| F1 | All historical constructors worth naming | 20+ |

Merge strategy: curated colors for top clubs; generated palette for long tail.

---

## Phase 4 — Membership import pipeline

**Script:** `supabase/import/build-memberships.mjs`

| Sport | Logic | Est. rows |
|-------|-------|-----------|
| Football | TM transfers: distinct (player_name→slug, club_code→slug), + current_club | ~150k pairs |
| NFL | Rosters 1990–2025: distinct (player, team abbrev), season range | ~80k pairs |
| MLB | Lahman Batting: distinct (playerID, teamID), year min/max | ~100k pairs |

Output: `supabase/seed/bulk/memberships-bulk.mjs` + optional `memberships.sql` for psql.

**Matching:** Person/club slugs generated with same `slugify` + `disambiguateCollisions` rules as roster import.

---

## Phase 5 — UI

### `/takes` browse page
- Filters: sport, season, competition, entity (search), member count
- Sort: net, recent, most votes
- Pagination (40/page)

### Homepage
- Optional filter bar (sport, competition) — same query layer

### EntityPicker
- When type=player and slot filled: show “played for” club chips to quick-fill next slot
- Fetch memberships via Supabase join (limit 12)

### Player browse (`/players`)
- Filter by club dropdown (clubs in sport)

---

## Phase 6 — Cron / sync

Extend `roster-sync.mjs` to refresh `is_primary` memberships for active players (football + NFL daily group).

---

## Out of scope (future)

- Full per-season membership for every NFL year back to 1920 in seed (use import script)
- User-submitted membership edits
- Graph/transitive equivalence merging
- Second database (memberships in DuckDB file for analytics) — optional later

---

## Execution order

1. Migration 007 + schema.sql
2. build-competitions.mjs → regenerate competitions seed
3. build-clubs-extended.mjs → merge TM football clubs
4. build-memberships.mjs → bulk memberships
5. gen-seed-sql.mjs updates
6. queries + `/takes` + filters + EntityPicker memberships
7. npm run seed:import && seed:gen && build
