# Seed roster methodology

How the Sportslator people database is built, maintained, and deployed.

## Scale (current generation)

| Layer | Count | Source |
|-------|------:|--------|
| **Total people** | ~100,600 | curated + open-data bulk |
| Football players | ~48,400 | Transfermarkt datasets |
| MLB players | ~20,400 | Lahman / Baseball Databank |
| NFL players | ~25,100 | nflverse |
| NBA players | ~6,300 | nba_api static registry |
| Curated (all sports) | ~880 | hand-picked stars + coaches |
| Clubs | 47 | original Sportslator seed |
| Sports | 12 | see below |

## Sport list (12)

Football, NBA, NFL, NHL, Cricket, F1, Tennis, Golf, MLB, Rugby, MMA, Boxing.

## Open-data import pipeline

Bulk rosters are generated from public datasets — not scraped live at runtime.

| Sport | Dataset | URL / project |
|-------|---------|---------------|
| Football | Transfermarkt datasets | `transfermarkt-datasets` on GitHub / R2 CSV |
| MLB | Lahman Baseball Databank | `cBrou/baseballdatabank` People.csv |
| NFL | nflverse player registry | `nflverse/nflverse-data` releases |
| NBA | nba_api static player list | `swar/nba_api` stats/library/data.py |

### Regenerate bulk imports

```bash
npm run seed:import    # fetch open data → supabase/seed/bulk/*.mjs
npm run seed:validate  # check for duplicate slugs
npm run seed:gen       # write supabase/seed.sql (~30MB)
```

Curated stars in `supabase/seed/*.mjs` take precedence over bulk rows on slug collision.

## Disambiguation

Many players share names within a sport. We store an optional **`disambiguator`** field:

- Shown in UI as `Name (Team)` — e.g. `John Smith (Arsenal)`
- Used in slug generation when names collide: `john-smith-arsenal`
- Bulk import auto-assigns team / debut year / career span as disambiguator
- User submissions can provide a team/club identifier in the add-person form
- Dedup RPC only auto-matches by name alone when the name is **unique within that sport**

## Selection criteria (curated tier)

Curated entries (non-bulk) are chosen for global icon status, GOAT-tier legacy, current elite level, or era-defining impact. See per-sport files in `supabase/seed/`.

## Community additions

`resolve_or_create_person` RPC handles user-submitted players/coaches with the same dedup rules plus alias linking.

## Deploy

1. Run migrations through `004_disambiguator_bulk.sql`
2. Apply `supabase/seed.sql` (large — ~100k INSERTs, consider running via `psql` not the Supabase SQL editor UI)
3. Optional: re-run import pipeline quarterly to refresh active rosters

## File structure

```
supabase/
  import/
    build-bulk.mjs     ← fetch open datasets
    lib.mjs            ← CSV parse, slugify, collision handling
  seed/
    bulk/              ← generated bulk modules (git-tracked)
    index.mjs          ← merges curated + bulk
    *.mjs              ← per-sport curated rosters
  gen-seed-sql.mjs
  validate-seed.mjs
  seed.sql             ← generated (~30MB)
```
