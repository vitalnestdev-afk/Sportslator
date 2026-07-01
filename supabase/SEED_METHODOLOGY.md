# Seed roster methodology

How the Sportslator people database was built — what sports were included, how stars were selected, and how the data is organised.

## Sport selection (9 total)

Sports were chosen by cross-referencing **global viewership**, **star-power density** (how many household names exist), and **cross-sport comparison potential** (fans already argue equivalences across these worlds).

| Sport | Slug | Rationale |
|-------|------|-----------|
| Football | `football` | Largest global sport; anchor sport for the product |
| NBA | `nba` | Original cross-sport pair with football |
| NFL | `nfl` | #1 US sport by revenue and viewership |
| NHL | `nhl` | Major North American league with deep legend tier |
| Cricket | `cricket` | ~2.5B fan base; dominant in India, UK, Australia, Pakistan |
| Formula 1 | `f1` | Premium global individual sport; driver personalities drive fandom |
| Tennis | `tennis` | Top-tier individual sport (Open Era GOAT debates) |
| Golf | `golf` | Major individual sport with generational icons (Nicklaus, Tiger) |
| MLB | `mlb` | Historic American institution; distinct from NFL/NBA culturally |

Sports **not** included in v1 of this expansion (candidates for a future pass): rugby union, boxing/UFC, athletics/Olympics, esports.

## Entity types

| Type | Covers |
|------|--------|
| `player` | Athletes, drivers, golfers, cricketers |
| `coach` | Football managers, NBA/NFL/MLB/NHL head coaches, F1 team principals |
| `club` | Teams/franchises (existing seed only) |

People who played **and** managed (e.g. Zidane, Cruyff) appear as **separate entities** with distinct slugs (`zinedine-zidane` as player, `zinedine-zidane-manager` as coach) so takes can compare them in either role.

## Selection criteria per person

Each roster entry was chosen if they met **at least one** of:

1. **Global or national icon** — name recognition beyond hardcore fans
2. **GOAT-tier or generational** — central to "best ever" debates in their sport
3. **Currently elite** — top-10 calibre in 2024–2026 seasons
4. **Historic anchor** — defines an era (Bradman, Gretzky, Senna, Ferguson)

Target roster size per sport:

| Sport | Players | Coaches | Notes |
|-------|---------|---------|-------|
| Football | 55 | 35 | Existing player seed + new managers |
| NBA | 55 | 30 | Existing player seed + head coaches |
| NFL | 65 | 25 | QBs weighted heavily (face of the league) |
| NHL | 65 | 25 | Balanced forwards, D, goalies |
| Cricket | 75 | 25 | All major nations represented |
| F1 | 55 | 15 | Drivers + team principals (Newey, Wolff, etc.) |
| Tennis | 60 | — | Individual sport; no coach seed |
| Golf | 50 | — | Individual sport; no coach seed |
| MLB | 65 | 25 | Players + managers |

**Total: ~725 people** (545 players + 180 coaches) as of this seed generation.

## File structure

```
supabase/
  seed/
    sports.mjs       — sport definitions
    helpers.mjs      — person() row builder + colour defaults
    index.mjs        — merges all rosters
    nfl.mjs          — per-sport roster files
    nhl.mjs
    cricket.mjs
    f1.mjs
    tennis.mjs
    golf.mjs
    mlb.mjs
    coaches.mjs      — football + NBA coaches
  players-seed.mjs   — legacy football + NBA players (merged via index)
  gen-seed-sql.mjs   — generates seed.sql
  validate-seed.mjs  — duplicate slug checker
```

Row format: `[sportSlug, name, slug, primaryColor, secondaryColor, type, era]`

## Community additions & dedup

User submissions use the same `resolve_or_create_person` RPC as before:

- Match by slug, exact name, alias, or partial name **within the same sport and type**
- Duplicate spellings become aliases on the canonical entity
- All takes referencing either spelling share the same `entity_id`

## Regenerating after edits

```bash
cd supabase
node validate-seed.mjs   # check for duplicate slugs
node gen-seed-sql.mjs    # write seed.sql
```

Then apply `seed.sql` to Supabase (after migration `003_multi_sport_coaches.sql`).
